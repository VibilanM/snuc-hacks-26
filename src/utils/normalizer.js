/**
 * Predefined keyword map for deterministic normalization.
 * Keys are raw text patterns (lowercase), values are normalized keywords.
 */
const KEYWORD_MAP = {
    // AI & Technology
    "ai": "AI integration",
    "artificial intelligence": "AI integration",
    "machine learning": "AI integration",
    "deep learning": "AI integration",
    "generative ai": "AI integration",
    "llm": "AI integration",
    "agentic": "AI integration",

    // Automation
    "automation": "automation",
    "automate": "automation",
    "workflow": "automation",
    "no-code": "automation",
    "low-code": "automation",
    "orchestration": "automation",

    // Speed & Performance
    "fast": "speed optimization",
    "speed": "speed optimization",
    "performance": "speed optimization",
    "real-time": "speed optimization",
    "realtime": "speed optimization",
    "latency": "speed optimization",

    // Cost & Pricing
    "cheap": "cost efficiency",
    "affordable": "cost efficiency",
    "cost": "cost efficiency",
    "pricing": "cost strategy",
    "price": "cost strategy",
    "plan": "cost strategy",
    "subscription": "cost strategy",
    "free plan": "cost strategy",
    "free tier": "cost strategy",

    // Marketing
    "marketing": "marketing automation",
    "campaign": "marketing automation",
    "lead generation": "marketing automation",
    "leads": "marketing automation",
    "seo": "marketing automation",

    // Content
    "blog": "content generation",
    "content": "content generation",
    "publishing": "content generation",
    "articles": "content generation",

    // Security
    "security": "security focus",
    "secure": "security focus",
    "encryption": "security focus",
    "compliance": "security focus",
    "zero-trust": "security focus",
    "privacy": "security focus",

    // Collaboration
    "collaboration": "team collaboration",
    "messaging": "team collaboration",
    "chat": "team collaboration",
    "communication": "team collaboration",
    "team": "team collaboration",
    "workspace": "team collaboration",

    // Integration
    "integration": "platform integration",
    "integrations": "platform integration",
    "api": "platform integration",
    "plugin": "platform integration",
    "apps": "platform integration",
    "connect": "platform integration",

    // Scalability
    "scale": "scalability",
    "scalable": "scalability",
    "enterprise": "scalability",
    "growth": "scalability",

    // User Experience
    "user-friendly": "user experience",
    "intuitive": "user experience",
    "easy to use": "user experience",
    "simple": "user experience",
    "onboarding": "user experience",

    // Support
    "support": "customer support",
    "help": "customer support",
    "documentation": "customer support",
    "community": "customer support",

    // Deployment
    "deploy": "deployment flexibility",
    "cloud": "deployment flexibility",
    "on-premises": "deployment flexibility",
    "self-hosted": "deployment flexibility",
    "saas": "deployment flexibility",

    // Analytics
    "analytics": "data analytics",
    "reporting": "data analytics",
    "dashboard": "data analytics",
    "insights": "data analytics",
    "data": "data analytics",

    // Mobile
    "mobile": "mobile experience",
    "app": "mobile experience",
    "responsive": "mobile experience",
};

/**
 * Combine all textual data from scraped sources into one lowercase string.
 */
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

/**
 * Extract normalized keywords from combined text using the KEYWORD_MAP.
 * Returns an object: { normalizedKeyword: frequency }
 */
function extractKeywords(combinedText) {
    const keywordFrequency = {};

    for (const [pattern, normalized] of Object.entries(KEYWORD_MAP)) {
        // Count occurrences of the pattern in the combined text
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

/**
 * Normalize scraped data and return keyword frequencies.
 * @param {Array} scrapedData - Array of { competitor_id, sources } objects
 * @returns {Object} - Aggregated keyword frequencies across all competitors
 */
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
