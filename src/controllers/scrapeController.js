import supabase from "../db/supabase.js";
import { scrapeOfficialSite, scrapeReviews, scrapeDiscussions } from "../utils/scraper.js";

const scrapeData = async (req, res) => {
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

        const results = [];

        for (const source of sources) {
            const { competitor_id, urls } = source;

            if (!urls) {
                results.push({ competitor_id, sources: { error: "No URLs found for this source." } });
                continue;
            }

            const scraped = {};

            if (urls.official_site && urls.official_site !== "Not found") {
                console.log(`Scraping official site: ${urls.official_site}`);
                scraped.official_site = await scrapeOfficialSite(urls.official_site);
            } else {
                scraped.official_site = { error: "No URL available" };
            }

            if (urls.reviews && urls.reviews !== "Not found") {
                console.log(`Scraping reviews: ${urls.reviews}`);
                scraped.reviews = await scrapeReviews(urls.reviews);
            } else {
                scraped.reviews = { error: "No URL available" };
            }

            if (urls.discussions && urls.discussions !== "Not found") {
                console.log(`Scraping discussions: ${urls.discussions}`);
                scraped.discussions = await scrapeDiscussions(urls.discussions);
            } else {
                scraped.discussions = { error: "No URL available" };
            }

            results.push({ competitor_id, sources: scraped });
        }

        res.status(200).json({ data: results });

    } catch (error) {
        console.error("Error in scrapeData:", error);
        res.status(500).json({ error: "An error occurred while scraping data." });
    }
};

export { scrapeData };
