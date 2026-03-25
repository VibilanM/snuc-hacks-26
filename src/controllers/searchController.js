import { getJson } from "serpapi";

const SERPAPI_KEY = "b48662dff83bec42b41f6eac6ff8f1cd25dd37c332395773f303d48ccd2fca00";

/**
 * Helper: run a Google search via SerpAPI and return the full response.
 */
async function serpSearch(query) {
    const response = await getJson({
        engine: "google",
        q: query,
        api_key: SERPAPI_KEY,
    });
    return response;
}

/**
 * Extract up to 3 competitor names from SerpAPI organic results.
 * Uses the "source" field and title parsing from organic results.
 */
function extractCompetitorNames(response, organisationName) {
    const competitors = new Set();
    const orgLower = organisationName.toLowerCase();
    const results = response.organic_results || [];

    for (const result of results) {
        const source = (result.source || "").trim();
        const title = (result.title || "").trim();

        // Extract names from title — often formatted as "X vs Y" or list items
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

        // Also consider the "source" field
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

/**
 * POST /search
 * Body: { organisationName, industry, product }
 * Returns competitor URLs.
 */
const searchCompetitors = async (req, res) => {
    try {
        const { organisationName, industry, product } = req.body;

        if (!organisationName || !industry || !product) {
            return res.status(400).json({ error: "Missing required fields: organisationName, industry, product" });
        }

        // Step 1: Find competitors
        const competitorQuery = `top 3 alternatives to ${organisationName} for ${product} in ${industry}`;
        const competitorResponse = await serpSearch(competitorQuery);
        const competitorNames = extractCompetitorNames(competitorResponse, organisationName);

        if (competitorNames.length === 0) {
            return res.status(404).json({ error: "Could not find any competitors for the given input." });
        }

        // Step 2: For each competitor, find official site, reviews, and discussions
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

            competitors.push({
                name,
                official_site: siteResults[0]?.link || "Not found",
                reviews: reviewResults[0]?.link || "Not found",
                discussions: discussionResults[0]?.link || "Not found",
            });
        }

        res.status(200).json({ competitors });

    } catch (error) {
        console.error("Error in searchCompetitors:", error);
        res.status(500).json({ error: "An error occurred while searching for competitors." });
    }
};

export { searchCompetitors };
