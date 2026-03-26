import supabase from "../db/supabase.js";
import { scrapeOfficialSite, scrapeReviews, scrapeDiscussions, scrapeChangelog } from "../utils/scraper.js";
import { normalizeData } from "../utils/normalizer.js";

const DEMO_MODE = process.env.DEMO_MODE === "true";
const RAW_TEXT_LIMIT = 5000;

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
    if (sourceData.features) parts.push(...sourceData.features);
    if (sourceData.details) parts.push(...sourceData.details);

    const combined = parts.join(" ").trim();
    return combined.length > RAW_TEXT_LIMIT ? combined.substring(0, RAW_TEXT_LIMIT) : combined;
}

function extractFeatures(officialSite) {
    if (!officialSite || officialSite.error) return null;
    const features = [];
    if (officialSite.features) features.push(...officialSite.features);
    if (features.length === 0 && officialSite.subheadings) features.push(...officialSite.subheadings);
    if (features.length === 0 && officialSite.content_snippets) {
        features.push(...officialSite.content_snippets);
    }
    return features.length > 0 ? features : null;
}

function extractKeywordsForSource(scrapedSources, reviewData) {
    const normalized = normalizeData([{ competitor_id: "temp", sources: scrapedSources }]);
    const normalizedKeys = Object.keys(normalized);
    if (normalizedKeys.length > 0) return [...new Set(normalizedKeys)];

    if (reviewData && !reviewData.error && reviewData.keywords) {
        return [...new Set(reviewData.keywords)];
    }

    return null;
}

async function createDemoSnapshots() {
    const { data: sources, error: dbError } = await supabase
        .from("sources")
        .select("*");

    if (dbError) throw new Error(`Failed to fetch sources: ${dbError.message}`);
    if (!sources || sources.length === 0) throw new Error("No sources found.");

    const snapshotDetails = [];

    for (const source of sources) {
        const { id: sourceId, competitor_id: competitorId, urls } = source;
        if (!urls) continue;

        const currentUrl = urls.changelog_current || urls.reviews;
        const previousUrl = urls.changelog_previous || urls.official_site;

        if (!currentUrl || !previousUrl) {
            console.log(`[snapshot-demo] Skipping ${competitorId}: no changelog URLs`);
            continue;
        }

        console.log(`[snapshot-demo] Scraping PREVIOUS changelog: ${previousUrl}`);
        const previousData = await scrapeChangelog(previousUrl);

        console.log(`[snapshot-demo] Scraping CURRENT changelog: ${currentUrl}`);
        const currentData = await scrapeChangelog(currentUrl);

        if (previousData.error && currentData.error) {
            console.error(`[snapshot-demo] Both changelogs failed to scrape for ${competitorId}`);
            snapshotDetails.push({
                competitor_id: competitorId,
                source_id: sourceId,
                status: "failed",
                error: "Both changelog URLs failed",
            });
            continue;
        }

        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 1);

        if (!previousData.error) {
            const oldSnapshot = {
                competitor_id: competitorId,
                source_id: sourceId,
                headline: previousData.headline,
                pricing: previousData.pricing_text,
                features: previousData.features && previousData.features.length > 0 ? previousData.features.slice(0, 15) : null,
                keywords: previousData.keywords && previousData.keywords.length > 0 ? previousData.keywords.slice(0, 10) : null,
                raw_text: previousData.raw_text || buildRawText(previousData),
                captured_at: oldDate.toISOString(),
            };

            const { error: insertErr1 } = await supabase
                .from("snapshots")
                .insert([oldSnapshot]);

            if (insertErr1) {
                console.error(`[snapshot-demo] Error inserting old snapshot:`, insertErr1.message);
                snapshotDetails.push({ competitor_id: competitorId, source_id: sourceId, version: "previous", status: "failed", error: insertErr1.message });
            } else {
                console.log(`[snapshot-demo] Old snapshot created for ${competitorId}`);
                snapshotDetails.push({ competitor_id: competitorId, source_id: sourceId, version: "previous", status: "created" });
            }
        }

        if (!currentData.error) {
            const newSnapshot = {
                competitor_id: competitorId,
                source_id: sourceId,
                headline: currentData.headline,
                pricing: currentData.pricing_text,
                features: currentData.features && currentData.features.length > 0 ? currentData.features.slice(0, 15) : null,
                keywords: currentData.keywords && currentData.keywords.length > 0 ? currentData.keywords.slice(0, 10) : null,
                raw_text: currentData.raw_text || buildRawText(currentData),
            };

            const { error: insertErr2 } = await supabase
                .from("snapshots")
                .insert([newSnapshot]);

            if (insertErr2) {
                console.error(`[snapshot-demo] Error inserting new snapshot:`, insertErr2.message);
                snapshotDetails.push({ competitor_id: competitorId, source_id: sourceId, version: "current", status: "failed", error: insertErr2.message });
            } else {
                console.log(`[snapshot-demo] New snapshot created for ${competitorId}`);
                snapshotDetails.push({ competitor_id: competitorId, source_id: sourceId, version: "current", status: "created" });
            }
        }
    }

    return snapshotDetails;
}

const createSnapshots = async (req, res) => {
    try {
        if (DEMO_MODE) {
            console.log("[snapshot] DEMO_MODE: creating temporal snapshots from changelogs");
            const details = await createDemoSnapshots();
            const created = details.filter(d => d.status === "created").length;
            return res.status(200).json({ snapshots_created: created, details });
        }

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

        const byCompetitor = {};
        for (const source of sources) {
            if (!byCompetitor[source.competitor_id]) {
                byCompetitor[source.competitor_id] = [];
            }
            byCompetitor[source.competitor_id].push(source);
        }

        const snapshotDetails = [];

        for (const [competitorId, competitorSources] of Object.entries(byCompetitor)) {
            for (const source of competitorSources) {
                const { id: sourceId, urls } = source;
                if (!urls) continue;

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

                const os = scraped.official_site || {};

                const headline = (!os.error && os.headline)
                    ? os.headline
                    : (!os.error && os.subheadings && os.subheadings[0])
                        ? os.subheadings[0]
                        : null;

                const pricing = (!os.error && os.pricing_text) ? os.pricing_text : null;

                const features = extractFeatures(scraped.official_site);

                const keywords = extractKeywordsForSource(scraped, scraped.reviews);

                const allParts = [
                    buildRawText(scraped.official_site),
                    buildRawText(scraped.reviews),
                    buildRawText(scraped.discussions),
                ].filter(Boolean);
                const raw_text = allParts.join(" ").substring(0, RAW_TEXT_LIMIT) || null;

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
