import supabase from "../db/supabase.js";
import { scrapeOfficialSite, scrapeReviews, scrapeDiscussions } from "../utils/scraper.js";
import { normalizeData } from "../utils/normalizer.js";

function computeTrendDirection(oldFreq, newFreq) {
    if (oldFreq === 0) return "steady growth";
    const ratio = newFreq / oldFreq;
    if (ratio >= 2) return "exponential growth";
    if (ratio > 1.2) return "steady growth";
    if (ratio >= 0.8) return "stable";
    if (ratio >= 0.5) return "steady decline";
    return "decline";
}

const normalizeAndComputeTrends = async (req, res) => {
    try {
        const { data: sources, error: dbError } = await supabase
            .from("sources")
            .select("*");

        if (dbError) {
            console.error("Error fetching sources:", dbError.message);
            return res.status(500).json({ error: "Failed to fetch sources from database." });
        }

        if (!sources || sources.length === 0) {
            return res.status(404).json({ error: "No sources found in the database." });
        }

        const scrapedData = [];

        for (const source of sources) {
            const { competitor_id, urls } = source;
            if (!urls) continue;

            const scraped = {};

            if (urls.official_site && urls.official_site !== "Not found") {
                console.log(`[normalize] Scraping official site: ${urls.official_site}`);
                scraped.official_site = await scrapeOfficialSite(urls.official_site);
            } else {
                scraped.official_site = { error: "No URL available" };
            }

            if (urls.reviews && urls.reviews !== "Not found") {
                console.log(`[normalize] Scraping reviews: ${urls.reviews}`);
                scraped.reviews = await scrapeReviews(urls.reviews);
            } else {
                scraped.reviews = { error: "No URL available" };
            }

            if (urls.discussions && urls.discussions !== "Not found") {
                console.log(`[normalize] Scraping discussions: ${urls.discussions}`);
                scraped.discussions = await scrapeDiscussions(urls.discussions);
            } else {
                scraped.discussions = { error: "No URL available" };
            }

            scrapedData.push({ competitor_id, sources: scraped });
        }

        const keywordFrequencies = normalizeData(scrapedData);
        console.log("[normalize] Extracted keywords:", keywordFrequencies);

        const { data: existingTrends, error: trendsError } = await supabase
            .from("trends")
            .select("*");

        if (trendsError) {
            console.error("Error fetching trends:", trendsError.message);
            return res.status(500).json({ error: "Failed to fetch existing trends." });
        }

        const existingMap = {};
        if (existingTrends) {
            for (const trend of existingTrends) {
                existingMap[trend.keyword] = trend;
            }
        }

        const updatedTrends = [];

        for (const [keyword, newFreq] of Object.entries(keywordFrequencies)) {
            if (existingMap[keyword]) {
                const oldFreq = existingMap[keyword].frequency;
                const trendDirection = computeTrendDirection(oldFreq, newFreq);

                const { data, error } = await supabase
                    .from("trends")
                    .update({
                        frequency: newFreq,
                        trend_direction: trendDirection,
                        computed_at: new Date().toISOString(),
                    })
                    .eq("id", existingMap[keyword].id)
                    .select()
                    .single();

                if (error) {
                    console.error(`Error updating trend "${keyword}":`, error.message);
                } else {
                    updatedTrends.push(data);
                }
            } else {
                const trendDirection = existingTrends && existingTrends.length > 0
                    ? "steady growth"
                    : "stable";

                const { data, error } = await supabase
                    .from("trends")
                    .insert([{
                        keyword,
                        frequency: newFreq,
                        trend_direction: trendDirection,
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error(`Error inserting trend "${keyword}":`, error.message);
                } else {
                    updatedTrends.push(data);
                }
            }
        }

        res.status(200).json({
            message: "Normalization and trend computation complete.",
            keywords: keywordFrequencies,
            trends: updatedTrends,
        });

    } catch (error) {
        console.error("Error in normalizeAndComputeTrends:", error);
        res.status(500).json({ error: "An error occurred during normalization." });
    }
};

export { normalizeAndComputeTrends };
