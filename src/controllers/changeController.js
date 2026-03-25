import supabase from "../db/supabase.js";

const DEMO_MODE = process.env.DEMO_MODE === "true";

// Demo mode mutation phrases
const HEADLINE_MUTATIONS = [
    " — now with AI capabilities",
    " — next-gen platform",
    " — powered by automation",
    " — enterprise-ready",
    " — reimagined for 2026",
];

const FEATURE_MUTATIONS = [
    "AI-powered analytics",
    "Smart email generation",
    "Automated onboarding",
    "Real-time collaboration engine",
    "Advanced role-based access control",
];

const KEYWORD_MUTATIONS = [
    "AI integration",
    "automation",
    "scalability",
    "cost efficiency",
    "security focus",
];

/**
 * Apply subtle, random mutations to a snapshot for demo purposes.
 * Mutates in-place. Only changes 1-2 fields per call.
 */
function applyDemoMutations(snapshot) {
    const mutated = { ...snapshot };
    const fieldsToMutate = Math.random() < 0.5 ? 1 : 2;
    const allFields = ["headline", "pricing", "features", "keywords"];

    // Shuffle and pick
    const shuffled = allFields.sort(() => Math.random() - 0.5).slice(0, fieldsToMutate);

    for (const field of shuffled) {
        switch (field) {
            case "headline":
                if (mutated.headline) {
                    const phrase = HEADLINE_MUTATIONS[Math.floor(Math.random() * HEADLINE_MUTATIONS.length)];
                    mutated.headline = mutated.headline + phrase;
                }
                break;

            case "pricing":
                if (mutated.pricing) {
                    // Try to find a dollar amount and tweak it
                    const match = mutated.pricing.match(/\$(\d+)/);
                    if (match) {
                        const oldPrice = parseInt(match[1]);
                        const delta = Math.random() < 0.5 ? -Math.floor(oldPrice * 0.1) : Math.floor(oldPrice * 0.15);
                        const newPrice = Math.max(1, oldPrice + delta);
                        mutated.pricing = mutated.pricing.replace(`$${oldPrice}`, `$${newPrice}`);
                    }
                }
                break;

            case "features":
                if (Array.isArray(mutated.features)) {
                    const newFeature = FEATURE_MUTATIONS[Math.floor(Math.random() * FEATURE_MUTATIONS.length)];
                    if (!mutated.features.includes(newFeature)) {
                        mutated.features = [...mutated.features, newFeature];
                    }
                }
                break;

            case "keywords":
                if (Array.isArray(mutated.keywords)) {
                    const newKw = KEYWORD_MUTATIONS[Math.floor(Math.random() * KEYWORD_MUTATIONS.length)];
                    if (!mutated.keywords.includes(newKw)) {
                        mutated.keywords = [...mutated.keywords, newKw];
                    }
                }
                break;
        }
    }

    return mutated;
}

/**
 * Diff two snapshots and return an array of change objects.
 */
function diffSnapshots(oldSnap, newSnap) {
    const changes = [];

    // Headline diff
    if (oldSnap.headline !== newSnap.headline && newSnap.headline !== null) {
        changes.push({
            field: "headline",
            change_type: "update",
            old_value: oldSnap.headline || null,
            new_value: newSnap.headline,
        });
    }

    // Pricing diff
    if (oldSnap.pricing !== newSnap.pricing && newSnap.pricing !== null) {
        changes.push({
            field: "pricing",
            change_type: "update",
            old_value: oldSnap.pricing || null,
            new_value: newSnap.pricing,
        });
    }

    // Features diff (detect added items)
    if (Array.isArray(newSnap.features) && Array.isArray(oldSnap.features)) {
        const oldSet = new Set(oldSnap.features);
        const added = newSnap.features.filter(f => !oldSet.has(f));
        for (const feat of added) {
            changes.push({
                field: "features",
                change_type: "added",
                old_value: null,
                new_value: feat,
            });
        }
    } else if (Array.isArray(newSnap.features) && !Array.isArray(oldSnap.features)) {
        for (const feat of newSnap.features) {
            changes.push({
                field: "features",
                change_type: "added",
                old_value: null,
                new_value: feat,
            });
        }
    }

    // Keywords diff (detect added keywords)
    if (Array.isArray(newSnap.keywords) && Array.isArray(oldSnap.keywords)) {
        const oldSet = new Set(oldSnap.keywords);
        const added = newSnap.keywords.filter(k => !oldSet.has(k));
        for (const kw of added) {
            changes.push({
                field: "keywords",
                change_type: "added",
                old_value: null,
                new_value: kw,
            });
        }
    } else if (Array.isArray(newSnap.keywords) && !Array.isArray(oldSnap.keywords)) {
        for (const kw of newSnap.keywords) {
            changes.push({
                field: "keywords",
                change_type: "added",
                old_value: null,
                new_value: kw,
            });
        }
    }

    return changes;
}

/**
 * POST /changes/detect
 * Compares latest two snapshots per (competitor_id, source_id),
 * detects changes, and stores them in the changes table.
 */
const detectChanges = async (req, res) => {
    try {
        console.log(`[changes] DEMO_MODE: ${DEMO_MODE}`);

        // Get all distinct (competitor_id, source_id) pairs from snapshots
        const { data: allSnapshots, error: fetchError } = await supabase
            .from("snapshots")
            .select("*")
            .order("captured_at", { ascending: false });

        if (fetchError) {
            console.error("Error fetching snapshots:", fetchError.message);
            return res.status(500).json({ error: "Failed to fetch snapshots." });
        }

        if (!allSnapshots || allSnapshots.length === 0) {
            return res.status(404).json({ error: "No snapshots found." });
        }

        // Group by (competitor_id, source_id)
        const groups = {};
        for (const snap of allSnapshots) {
            const key = `${snap.competitor_id}::${snap.source_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(snap);
        }

        const allDetails = [];

        for (const [key, snaps] of Object.entries(groups)) {
            // Already sorted desc by captured_at
            let latest = snaps[0];
            const previous = snaps.length > 1 ? snaps[1] : null;

            if (!previous) {
                console.log(`[changes] Only one snapshot for ${key}, skipping diff.`);
                continue;
            }

            // Apply demo mutations if enabled
            if (DEMO_MODE) {
                console.log(`[changes] Applying demo mutations for ${key}`);
                latest = applyDemoMutations(latest);
            }

            // Diff
            const changes = diffSnapshots(previous, latest);

            if (changes.length === 0) {
                console.log(`[changes] No changes detected for ${key}`);
                continue;
            }

            // Store each change
            for (const change of changes) {
                // Check for duplicate to ensure idempotency
                const { data: existing } = await supabase
                    .from("changes")
                    .select("id")
                    .eq("competitor_id", latest.competitor_id)
                    .eq("field", change.field)
                    .eq("new_value", change.new_value || "")
                    .eq("change_type", change.change_type)
                    .limit(1);

                if (existing && existing.length > 0) {
                    console.log(`[changes] Duplicate change skipped: ${change.field}`);
                    continue;
                }

                const { error: insertError } = await supabase
                    .from("changes")
                    .insert([{
                        competitor_id: latest.competitor_id,
                        field: change.field,
                        old_value: change.old_value ? String(change.old_value).substring(0, 1000) : null,
                        new_value: change.new_value ? String(change.new_value).substring(0, 1000) : null,
                        change_type: change.change_type,
                    }]);

                const detail = {
                    competitor_id: latest.competitor_id,
                    source_id: latest.source_id,
                    field: change.field,
                    type: change.change_type,
                    old_value: change.old_value ? String(change.old_value).substring(0, 100) : null,
                    new_value: change.new_value ? String(change.new_value).substring(0, 100) : null,
                };

                if (insertError) {
                    console.error(`Error inserting change:`, insertError.message);
                    detail.status = "detected_only";
                    detail.db_error = insertError.message;
                } else {
                    detail.status = "recorded";
                }

                allDetails.push(detail);
            }
        }

        res.status(200).json({
            changes_detected: allDetails.length,
            demo_mode: DEMO_MODE,
            details: allDetails,
        });

    } catch (error) {
        console.error("Error in detectChanges:", error);
        res.status(500).json({ error: "An error occurred while detecting changes." });
    }
};

export { detectChanges };
