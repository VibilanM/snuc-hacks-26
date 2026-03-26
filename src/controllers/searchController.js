import { getJson } from "serpapi";
import supabase from "../db/supabase.js";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const DEMO_MODE = process.env.DEMO_MODE === "true";

const DEMO_COMPETITORS = [
    {
        name: "Antigravity",
        urls: {
            official_site: "https://antigravity.google",
            reviews: "https://antigravity.google/changelog",
            discussions: "https://www.reddit.com/r/AntigravityAI/",
        },
        changelog_current: "https://antigravity.google/changelog",
        changelog_previous: "https://antigravity.google",
    },
    {
        name: "VS Code",
        urls: {
            official_site: "https://code.visualstudio.com",
            reviews: "https://code.visualstudio.com/updates/v1_110",
            discussions: "https://www.reddit.com/r/vscode/",
        },
        changelog_current: "https://code.visualstudio.com/updates/v1_110",
        changelog_previous: "https://code.visualstudio.com/updates/v1_109",
    },
];

async function serpSearch(query) {
    const response = await getJson({
        engine: "google",
        q: query,
        api_key: SERPAPI_KEY,
    });
    return response;
}

function extractCompetitorNames(response, organisationName) {
    const competitors = new Set();
    const orgLower = organisationName.toLowerCase();
    const results = response.organic_results || [];

    for (const result of results) {
        const source = (result.source || "").trim();
        const title = (result.title || "").trim();

        const titleParts = title.split(/\s+vs\.?\s+|\s*[-\u2013|:,]\s*/i);
        for (const part of titleParts) {
            const cleaned = part.trim();
            if (
                cleaned.length > 1 &&
                cleaned.length < 40 &&
                !cleaned.toLowerCase().includes(orgLower) &&
                !cleaned.match(/^(top|best|\d+|alternatives?|competitors?|comparison|review|vs|and|the|for|in|to)$/i) &&
                cleaned.match(/^[A-Z]/)
            ) {
                competitors.add(cleaned);
                if (competitors.size >= 3) return [...competitors];
            }
        }

        if (
            source &&
            source.length > 1 &&
            source.length < 40 &&
            !source.toLowerCase().includes(orgLower) &&
            !source.match(/^(google|wikipedia|youtube|reddit|quora|linkedin|forbes|techcrunch)$/i)
        ) {
            competitors.add(source);
            if (competitors.size >= 3) return [...competitors];
        }
    }

    return [...competitors].slice(0, 3);
}

const searchCompetitors = async (req, res) => {
    try {
        const { organisationName, industry, product } = req.body;

        if (!organisationName || !industry || !product) {
            return res.status(400).json({ error: "Missing required fields: organisationName, industry, product" });
        }

        if (DEMO_MODE) {
            console.log("[search] DEMO_MODE: using hardcoded competitors (Antigravity, VS Code)");

            const competitors = [];

            for (const demo of DEMO_COMPETITORS) {
                const { data: competitorData, error: competitorError } = await supabase
                    .from('competitors')
                    .insert([{ name: demo.name, domain: product, industry }])
                    .select()
                    .single();

                if (competitorError) {
                    console.error(`Error inserting competitor ${demo.name}:`, competitorError.message);
                } else if (competitorData) {
                    const { error: sourceError } = await supabase
                        .from('sources')
                        .insert([{
                            competitor_id: competitorData.id,
                            type: 'changelog',
                            urls: {
                                ...demo.urls,
                                changelog_current: demo.changelog_current,
                                changelog_previous: demo.changelog_previous,
                            }
                        }]);

                    if (sourceError) {
                        console.error(`Error inserting source for ${demo.name}:`, sourceError.message);
                    }
                }

                competitors.push({
                    id: competitorData.id,
                    name: demo.name,
                    ...demo.urls,
                });
            }

            return res.status(200).json({ competitors });
        }

        const competitorQuery = `top 3 alternatives to ${organisationName} for ${product} in ${industry}`;
        const competitorResponse = await serpSearch(competitorQuery);
        const competitorNames = extractCompetitorNames(competitorResponse, organisationName);

        if (competitorNames.length === 0) {
            return res.status(404).json({ error: "Could not find any competitors for the given input." });
        }

        const competitors = [];

        for (const name of competitorNames) {
            const [siteResponse, reviewResponse, discussionResponse] = await Promise.all([
                serpSearch(`${name} official website`),
                serpSearch(`${name} ${product} reviews`),
                serpSearch(`${name} ${product} discussion forum`),
            ]);

            const siteResults = siteResponse.organic_results || [];
            const reviewResults = reviewResponse.organic_results || [];
            const discussionResults = discussionResponse.organic_results || [];

            const competitorUrls = {
                official_site: siteResults[0]?.link || "Not found",
                reviews: reviewResults[0]?.link || "Not found",
                discussions: discussionResults[0]?.link || "Not found",
            };

            const { data: competitorData, error: competitorError } = await supabase
                .from('competitors')
                .insert([{ name, domain: product, industry }])
                .select()
                .single();

            if (competitorError) {
                console.error(`Error inserting competitor ${name}:`, competitorError.message);
            } else if (competitorData) {
                const { error: sourceError } = await supabase
                    .from('sources')
                    .insert([{
                        competitor_id: competitorData.id,
                        type: 'initial',
                        urls: competitorUrls
                    }]);

                if (sourceError) {
                    console.error(`Error inserting source for ${name}:`, sourceError.message);
                }
            }

            competitors.push({
                name,
                ...competitorUrls
            });
        }

        res.status(200).json({ competitors });

    } catch (error) {
        console.error("Error in searchCompetitors:", error);
        res.status(500).json({ error: "An error occurred while searching for competitors." });
    }
};

export { searchCompetitors };
