import supabase from "../db/supabase.js";

function diffSnapshots(oldSnap, newSnap) {
    const changes = [];

    if (oldSnap.headline !== newSnap.headline && newSnap.headline !== null) {
        changes.push({
            field: "headline",
            change_type: "update",
            old_value: oldSnap.headline || null,
            new_value: newSnap.headline,
        });
    }

    if (oldSnap.pricing !== newSnap.pricing && newSnap.pricing !== null) {
        changes.push({
            field: "pricing",
            change_type: "update",
            old_value: oldSnap.pricing || null,
            new_value: newSnap.pricing,
        });
    }

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

const detectChanges = async (req, res) => {
    try {
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

        const groups = {};
        for (const snap of allSnapshots) {
            const key = `${snap.competitor_id}::${snap.source_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(snap);
        }

        const allDetails = [];

        for (const [key, snaps] of Object.entries(groups)) {
            const latest = snaps[0];
            const previous = snaps.length > 1 ? snaps[1] : null;

            if (!previous) {
                console.log(`[changes] Only one snapshot for ${key}, skipping diff.`);
                continue;
            }

            const changes = diffSnapshots(previous, latest);

            if (changes.length === 0) {
                console.log(`[changes] No changes detected for ${key}`);
                continue;
            }

            for (const change of changes) {
                const { data: existing } = await supabase
                    .from("changes")
                    .select("id")
                    .eq("competitor_id", latest.competitor_id)
                    .eq("field", change.field)
                    .eq("new_value", change.new_value || "")
                    .eq("change_type", change.change_type)
                    .limit(1);

                if (existing && existing.length > 0) {
                    console.log(`[changes] Existing change found for ${change.field}, adding to response`);
                    allDetails.push({
                        competitor_id: latest.competitor_id,
                        source_id: latest.source_id,
                        field: change.field,
                        type: change.change_type,
                        old_value: change.old_value ? String(change.old_value).substring(0, 100) : null,
                        new_value: change.new_value ? String(change.new_value).substring(0, 100) : null,
                        status: "existing"
                    });
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
            details: allDetails,
        });

    } catch (error) {
        console.error("Error in detectChanges:", error);
        res.status(500).json({ error: "An error occurred while detecting changes." });
    }
};

export { detectChanges };
