import axios from "axios";
import supabase from "../db/supabase.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const LLM_MODEL = "llama-3.3-70b-versatile";

async function callLLM(prompt, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: LLM_MODEL,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5,
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

            return content;
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

const generateInsights = async (req, res) => {
    try {
        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: "GROQ_API_KEY not configured in .env" });
        }

        const { data: changes, error: changesErr } = await supabase
            .from("changes")
            .select("*")
            .order("detected_at", { ascending: false })
            .limit(50);

        if (changesErr) {
            console.error("Error fetching changes:", changesErr.message);
            return res.status(500).json({ error: "Failed to fetch changes." });
        }

        const { data: trends, error: trendsErr } = await supabase
            .from("trends")
            .select("*");

        if (trendsErr) {
            console.error("Error fetching trends:", trendsErr.message);
            return res.status(500).json({ error: "Failed to fetch trends." });
        }

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

        const formattedTrends = (trends || []).slice(0, 5).map(t => ({
            keyword: t.keyword,
            frequency: t.frequency,
            trend_direction: t.trend_direction,
        }));

        const { data: allCompetitors } = await supabase
            .from("competitors")
            .select("id, name");

        const DEMO_MODE = process.env.DEMO_MODE === "true";

        let relevantCompetitors = (allCompetitors || []).filter(c => changesByCompetitor[c.id]);

        if (DEMO_MODE) {
            relevantCompetitors = (allCompetitors || []).filter(c => c.name === "Antigravity" || c.name === "VS Code");
            
            const validIds = relevantCompetitors.map(c => c.id);
            Object.keys(changesByCompetitor).forEach(id => {
                if (!validIds.includes(id)) {
                    delete changesByCompetitor[id];
                }
            });
        }

        const prompt = `You are a concise strategic business analyst. Write a extremely brief "Insights and Recommendations" summary (maximum 3-4 short sentences) based on the following competitor data.

COMPETITORS: ${relevantCompetitors.map(c => c.name).join(", ")}
CHANGES DETECTED: ${JSON.stringify(changesByCompetitor).substring(0, 2000)}
MARKET TRENDS: ${JSON.stringify(formattedTrends)}

CRITICAL INSTRUCTIONS:
- Write exactly one short paragraph for **Insights:** and exactly one bullet point for **Recommendation:**.
- Mention specific features that were updated.
- DO NOT use large markdown headings like # or ##.
- Be extremely brief and punchy. No generic fluff.`;

        console.log(`[insights] Generating overall market report...`);
        const markdownReport = await callLLM(prompt);

        if (!markdownReport) {
            return res.status(500).json({ error: "Failed to generate report from LLM." });
        }

        res.status(200).json({
            status: "success",
            report: markdownReport
        });

    } catch (error) {
        console.error("Error in generateInsights:", error);
        res.status(500).json({ error: "An error occurred while generating insights." });
    }
};

export { generateInsights };
