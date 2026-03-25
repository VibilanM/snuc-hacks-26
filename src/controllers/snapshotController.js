import supabase from "../db/supabase.js";
import { scrapeOfficialSite, scrapeReviews, scrapeDiscussions } from "../utils/scraper.js";
import { normalizeData } from "../utils/normalizer.js";

const RAW_TEXT_LIMIT = 5000;

/**
 * Combine all text from a source into a single string, limited in length.
 */
function buildRawText(sourceData) {
    const parts = [];
    if (!sourceData || sourceData.error) return null;

    if (sourceData.headline) parts.push(sourceData.headline);
    if (sourceData.title) parts.push(sourceData.title);
    if (sourceData.meta_description) parts.push(sourceData.meta_description);
    if (sourceData.subheadings) parts.push(...sourceData.subheadings);
    if (sourceData.content_snippets) parts.push(...sourceData.content_snippets);
    if (sourceData.pricing_text) parts.push(sourceData.pricing_text);
    if (sourceData.review_snippets) parts.push(...sourceData.review_snippets);
    if (sourceData.topics) parts.push(...sourceData.topics);
    if (sourceData.comments) parts.push(...sourceData.comments);

    const combined = parts.join(" ").trim();
    return combined.length > RAW_TEXT_LIMIT ? combined.substring(0, RAW_TEXT_LIMIT) : combined;
}

/**
 * Extract features array from official site data.
 */
function extractFeatures(officialSite) {
    if (!officialSite || officialSite.error) return null;
    const features = [];
    if (officialSite.subheadings) features.push(...officialSite.subheadings);
    if (features.length === 0 && officialSite.content_snippets) {
        features.push(...officialSite.content_snippets);
    }
    return features.length > 0 ? features : null;
}

/**
 * Extract keywords from scraped data for a single competitor.
 */
function extractKeywordsForSource(scrapedSources, reviewData) {
    // Use normalized keywords first
    const normalized = normalizeData([{ competitor_id: "temp", sources: scrapedSources }]);
    const normalizedKeys = Object.keys(normalized);
    if (normalizedKeys.length > 0) return [...new Set(normalizedKeys)];

    // Fallback to review keywords
    if (reviewData && !reviewData.error && reviewData.keywords) {
        return [...new Set(reviewData.keywords)];
    }

    return null;
}

/**
 * POST /snapshots/create
 * Scrapes all sources, creates snapshot entries in the snapshots table.
 */
const createSnapshots = async (req, res) => {
    try {
        // Fetch all sources with their competitor_id and type
        const { data: sources, error: dbError } = await supabase
            .from("sources")
            .select("*");

        if (dbError) {
            console.error("Error fetching sources:", dbError.message);
            return res.status(500).json({ error: "Failed to fetch sources." });
        }

        if (!sources || sources.length === 0) {
            return res.status(404).json({ error: "No sources found." });
        }

        // Group sources by competitor_id
        const byCompetitor = {};
        for (const source of sources) {
            if (!byCompetitor[source.competitor_id]) {
                byCompetitor[source.competitor_id] = [];
            }
            byCompetitor[source.competitor_id].push(source);
        }

        const snapshotDetails = [];

        for (const [competitorId, competitorSources] of Object.entries(byCompetitor)) {
            // Each competitor has one source row with urls jsonb
            for (const source of competitorSources) {
                const { id: sourceId, urls } = source;
                if (!urls) continue;

                // Scrape all three URL types
                const scraped = {};

                if (urls.official_site && urls.official_site !== "Not found") {
                    console.log(`[snapshot] Scraping official site: ${urls.official_site}`);
                    scraped.official_site = await scrapeOfficialSite(urls.official_site);
                } else {
                    scraped.official_site = { error: "No URL available" };
                }

                if (urls.reviews && urls.reviews !== "Not found") {
                    console.log(`[snapshot] Scraping reviews: ${urls.reviews}`);
                    scraped.reviews = await scrapeReviews(urls.reviews);
                } else {
                    scraped.reviews = { error: "No URL available" };
                }

                if (urls.discussions && urls.discussions !== "Not found") {
                    console.log(`[snapshot] Scraping discussions: ${urls.discussions}`);
                    scraped.discussions = await scrapeDiscussions(urls.discussions);
                } else {
                    scraped.discussions = { error: "No URL available" };
                }

                // Build snapshot fields
                const os = scraped.official_site || {};

                const headline = (!os.error && os.headline)
                    ? os.headline
                    : (!os.error && os.subheadings && os.subheadings[0])
                        ? os.subheadings[0]
                        : null;

                const pricing = (!os.error && os.pricing_text) ? os.pricing_text : null;

                const features = extractFeatures(scraped.official_site);

                const keywords = extractKeywordsForSource(scraped, scraped.reviews);

                // Build raw_text by combining all sources
                const allParts = [
                    buildRawText(scraped.official_site),
                    buildRawText(scraped.reviews),
                    buildRawText(scraped.discussions),
                ].filter(Boolean);
                const raw_text = allParts.join(" ").substring(0, RAW_TEXT_LIMIT) || null;

                // Insert snapshot (append-only, never update old ones)
                const { data: snapshot, error: insertError } = await supabase
                    .from("snapshots")
                    .insert([{
                        competitor_id: competitorId,
                        source_id: sourceId,
                        headline,
                        pricing,
                        features,
                        keywords,
                        raw_text,
                    }])
                    .select()
                    .single();

                if (insertError) {
                    console.error(`Error inserting snapshot for ${competitorId}:`, insertError.message);
                    snapshotDetails.push({
                        competitor_id: competitorId,
                        source_id: sourceId,
                        status: "failed",
                        error: insertError.message,
                    });
                } else {
                    snapshotDetails.push({
                        competitor_id: competitorId,
                        source_id: sourceId,
                        status: "created",
                    });
                }
            }
        }

        const created = snapshotDetails.filter(d => d.status === "created").length;

        res.status(200).json({
            snapshots_created: created,
            details: snapshotDetails,
        });

    } catch (error) {
        console.error("Error in createSnapshots:", error);
        res.status(500).json({ error: "An error occurred while creating snapshots." });
    }
};

export { createSnapshots };
