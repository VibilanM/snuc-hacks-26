const KEYWORD_MAP = {
    "ai": "AI integration",
    "artificial intelligence": "AI integration",
    "machine learning": "AI integration",
    "deep learning": "AI integration",
    "generative ai": "AI integration",
    "llm": "AI integration",
    "agentic": "AI integration",

    "automation": "automation",
    "automate": "automation",
    "workflow": "automation",
    "no-code": "automation",
    "low-code": "automation",
    "orchestration": "automation",

    "fast": "speed optimization",
    "speed": "speed optimization",
    "performance": "speed optimization",
    "real-time": "speed optimization",
    "realtime": "speed optimization",
    "latency": "speed optimization",

    "cheap": "cost efficiency",
    "affordable": "cost efficiency",
    "cost": "cost efficiency",
    "pricing": "cost strategy",
    "price": "cost strategy",
    "plan": "cost strategy",
    "subscription": "cost strategy",
    "free plan": "cost strategy",
    "free tier": "cost strategy",

    "marketing": "marketing automation",
    "campaign": "marketing automation",
    "lead generation": "marketing automation",
    "leads": "marketing automation",
    "seo": "marketing automation",

    "blog": "content generation",
    "content": "content generation",
    "publishing": "content generation",
    "articles": "content generation",

    "security": "security focus",
    "secure": "security focus",
    "encryption": "security focus",
    "compliance": "security focus",
    "zero-trust": "security focus",
    "privacy": "security focus",

    "collaboration": "team collaboration",
    "messaging": "team collaboration",
    "chat": "team collaboration",
    "communication": "team collaboration",
    "team": "team collaboration",
    "workspace": "team collaboration",

    "integration": "platform integration",
    "integrations": "platform integration",
    "api": "platform integration",
    "plugin": "platform integration",
    "apps": "platform integration",
    "connect": "platform integration",

    "scale": "scalability",
    "scalable": "scalability",
    "enterprise": "scalability",
    "growth": "scalability",

    "user-friendly": "user experience",
    "intuitive": "user experience",
    "easy to use": "user experience",
    "simple": "user experience",
    "onboarding": "user experience",

    "support": "customer support",
    "help": "customer support",
    "documentation": "customer support",
    "community": "customer support",

    "deploy": "deployment flexibility",
    "cloud": "deployment flexibility",
    "on-premises": "deployment flexibility",
    "self-hosted": "deployment flexibility",
    "saas": "deployment flexibility",

    "analytics": "data analytics",
    "reporting": "data analytics",
    "dashboard": "data analytics",
    "insights": "data analytics",
    "data": "data analytics",

    "mobile": "mobile experience",
    "app": "mobile experience",
    "responsive": "mobile experience",
};

function combineText(sources) {
    const parts = [];

    if (sources.official_site && !sources.official_site.error) {
        const os = sources.official_site;
        if (os.headline) parts.push(os.headline);
        if (os.title) parts.push(os.title);
        if (os.meta_description) parts.push(os.meta_description);
        if (os.subheadings) parts.push(...os.subheadings);
        if (os.content_snippets) parts.push(...os.content_snippets);
        if (os.pricing_text) parts.push(os.pricing_text);
    }

    if (sources.reviews && !sources.reviews.error) {
        const rv = sources.reviews;
        if (rv.title) parts.push(rv.title);
        if (rv.review_snippets) parts.push(...rv.review_snippets);
        if (rv.keywords) parts.push(...rv.keywords);
        if (rv.pros_cons) {
            for (const pc of rv.pros_cons) {
                if (pc.heading) parts.push(pc.heading);
                if (pc.content) parts.push(pc.content);
            }
        }
    }

    if (sources.discussions && !sources.discussions.error) {
        const ds = sources.discussions;
        if (ds.title) parts.push(ds.title);
        if (ds.topics) parts.push(...ds.topics);
        if (ds.comments) parts.push(...ds.comments);
    }

    return parts.join(" ").toLowerCase();
}

function extractKeywords(combinedText) {
    const keywordFrequency = {};

    for (const [pattern, normalized] of Object.entries(KEYWORD_MAP)) {
        const regex = new RegExp(`\\b${pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "gi");
        const matches = combinedText.match(regex);

        if (matches && matches.length > 0) {
            if (keywordFrequency[normalized]) {
                keywordFrequency[normalized] += matches.length;
            } else {
                keywordFrequency[normalized] = matches.length;
            }
        }
    }

    return keywordFrequency;
}

export function normalizeData(scrapedData) {
    const aggregatedKeywords = {};

    for (const entry of scrapedData) {
        const combinedText = combineText(entry.sources);
        const keywords = extractKeywords(combinedText);

        for (const [keyword, freq] of Object.entries(keywords)) {
            aggregatedKeywords[keyword] = (aggregatedKeywords[keyword] || 0) + freq;
        }
    }

    return aggregatedKeywords;
}

export { KEYWORD_MAP };
