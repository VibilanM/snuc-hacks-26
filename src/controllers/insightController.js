import axios from "axios";
import supabase from "../db/supabase.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const LLM_MODEL = "llama-3.1-8b-instant";

/**
 * Extract a JSON object from a string that may contain surrounding text.
 */
function extractJSON(text) {
    // Try direct parse first
    try {
        return JSON.parse(text);
    } catch {}

    // Strip markdown code fences
    let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch {}

    // Find the first { and last } to extract embedded JSON
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonStr);
        } catch {}
    }

    return null;
}

/**
 * Call Groq LLM and return parsed JSON response.
 * Retries once if the response is not valid JSON.
 */
async function callLLM(prompt, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: LLM_MODEL,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.4,
                },
                {
                    headers: {
                        "Authorization": `Bearer ${GROQ_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    timeout: 60000,
                }
            );

            const content = response.data.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error("Empty LLM response");

            console.log(`[LLM] Raw response (attempt ${attempt + 1}):`, content.substring(0, 300));

            const parsed = extractJSON(content);
            if (!parsed) throw new Error("Could not extract valid JSON from response");
            return parsed;
        } catch (error) {
            const errMsg = error.response
                ? `API error ${error.response.status}: ${JSON.stringify(error.response.data).substring(0, 300)}`
                : error.message;
            if (attempt < retries) {
                console.log(`[LLM] Retry attempt ${attempt + 1} due to: ${errMsg}`);
                continue;
            }
            console.error(`[LLM] Failed after ${retries + 1} attempts:`, errMsg);
            return null;
        }
    }
}

/**
 * POST /insights/generate
 * For each competitor: generate insights from changes+trends, then recommendations per insight.
 */
const generateInsights = async (req, res) => {
    try {
        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: "GROQ_API_KEY not configured in .env" });
        }

        // Fetch all changes grouped by competitor_id
        const { data: changes, error: changesErr } = await supabase
            .from("changes")
            .select("*")
            .order("detected_at", { ascending: false });

        if (changesErr) {
            console.error("Error fetching changes:", changesErr.message);
            return res.status(500).json({ error: "Failed to fetch changes." });
        }

        // Fetch all trends
        const { data: trends, error: trendsErr } = await supabase
            .from("trends")
            .select("*");

        if (trendsErr) {
            console.error("Error fetching trends:", trendsErr.message);
            return res.status(500).json({ error: "Failed to fetch trends." });
        }

        // Group changes by competitor_id
        const changesByCompetitor = {};
        for (const change of (changes || [])) {
            if (!changesByCompetitor[change.competitor_id]) {
                changesByCompetitor[change.competitor_id] = [];
            }
            changesByCompetitor[change.competitor_id].push({
                field: change.field,
                old: change.old_value,
                new: change.new_value,
                type: change.change_type,
            });
        }

        // Format trends
        const formattedTrends = (trends || []).map(t => ({
            keyword: t.keyword,
            frequency: t.frequency,
            trend_direction: t.trend_direction,
        }));

        // Get distinct competitor IDs (from changes + from competitors table)
        const { data: allCompetitors } = await supabase
            .from("competitors")
            .select("id, name");

        const competitorIds = [...new Set([
            ...Object.keys(changesByCompetitor),
            ...(allCompetitors || []).map(c => c.id),
        ])];

        let insightsCreated = 0;
        let recommendationsCreated = 0;

        for (const competitorId of competitorIds) {
            const competitorChanges = changesByCompetitor[competitorId] || [];
            const competitorName = allCompetitors?.find(c => c.id === competitorId)?.name || "Unknown";

            // Build LLM input
            const llmInput = {
                competitor_id: competitorId,
                competitor_name: competitorName,
                changes: competitorChanges,
                trends: formattedTrends,
            };

            // STEP 2: Generate insight
            const insightPrompt = `Generate a concise business insight based on the provided competitor data.

COMPETITOR: ${competitorName}
CHANGES: ${JSON.stringify(competitorChanges)}
TRENDS: ${JSON.stringify(formattedTrends)}

IMPORTANT:
- Return STRICT JSON only
- No markdown
- No explanations
- No extra text

FORMAT:
{
  "insight_text": "...",
  "insight_type": "...",
  "score": 0.0
}

RULES:
- insight_text must explain WHAT is happening and WHY it matters
- insight_type must be one of: pricing, messaging, features, trend
- score must be between 0 and 1 based on importance`;

            console.log(`[insights] Generating insight for ${competitorName}...`);
            const insightResult = callLLM(insightPrompt);

            // While waiting, prepare recommendation generation
            const insight = await insightResult;

            if (!insight || !insight.insight_text || !insight.insight_type) {
                console.error(`[insights] Invalid insight for ${competitorName}, skipping.`);
                continue;
            }

            // Clamp score
            insight.score = Math.max(0, Math.min(1, parseFloat(insight.score) || 0.5));

            // STEP 3: Store insight
            const { data: insertedInsight, error: insightErr } = await supabase
                .from("insights")
                .insert([{
                    competitor_id: competitorId,
                    insight_text: insight.insight_text,
                    insight_type: insight.insight_type,
                    score: insight.score,
                }])
                .select()
                .single();

            if (insightErr) {
                console.error(`[insights] Error storing insight for ${competitorName}:`, insightErr.message);
                continue;
            }

            insightsCreated++;
            console.log(`[insights] Insight stored for ${competitorName}: ${insight.insight_type}`);

            // STEP 4: Generate recommendation
            const recPrompt = `Generate an actionable recommendation based on the given insight.

INSIGHT: ${insight.insight_text}
CONTEXT:
- Changes: ${JSON.stringify(competitorChanges)}
- Trends: ${JSON.stringify(formattedTrends)}

IMPORTANT:
- Return STRICT JSON only
- No markdown
- No explanations

FORMAT:
{
  "recommendation_text": "...",
  "priority": 0.0
}

RULES:
- recommendation must be actionable
- priority must be between 0 and 1
- Higher priority for strong trends or major changes`;

            console.log(`[insights] Generating recommendation for ${competitorName}...`);
            const rec = await callLLM(recPrompt);

            if (!rec || !rec.recommendation_text) {
                console.error(`[insights] Invalid recommendation for ${competitorName}, skipping.`);
                continue;
            }

            // Clamp priority
            rec.priority = Math.max(0, Math.min(1, parseFloat(rec.priority) || 0.5));

            // STEP 5: Store recommendation
            const { error: recErr } = await supabase
                .from("recommendations")
                .insert([{
                    insight_id: insertedInsight.id,
                    recommendation_text: rec.recommendation_text,
                    priority: rec.priority,
                }]);

            if (recErr) {
                console.error(`[insights] Error storing recommendation:`, recErr.message);
            } else {
                recommendationsCreated++;
                console.log(`[insights] Recommendation stored for ${competitorName}`);
            }
        }

        res.status(200).json({
            status: "success",
            insights_created: insightsCreated,
            recommendations_created: recommendationsCreated,
        });

    } catch (error) {
        console.error("Error in generateInsights:", error);
        res.status(500).json({ error: "An error occurred while generating insights." });
    }
};

export { generateInsights };
