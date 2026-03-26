import axios from "axios";
import * as cheerio from "cheerio";

const TIMEOUT = 15000;

async function fetchHTML(url) {
    const response = await axios.get(url, {
        timeout: TIMEOUT,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    });
    return cheerio.load(response.data);
}

export async function scrapeOfficialSite(url) {
    try {
        const $ = await fetchHTML(url);

        const title = $("title").text().trim() || null;
        const meta_description = $('meta[name="description"]').attr("content")?.trim() || null;
        const headline = $("h1").first().text().trim() || null;

        const subheadings = [];
        $("h2, h3").each((i, el) => {
            const text = $(el).text().trim();
            if (text && subheadings.length < 10) {
                subheadings.push(text);
            }
        });

        let pricing_text = null;
        const pricingSelectors = [
            '[class*="pric"]', '[id*="pric"]',
            '[class*="plan"]', '[id*="plan"]',
        ];
        for (const selector of pricingSelectors) {
            const el = $(selector).first();
            if (el.length) {
                pricing_text = el.text().trim().substring(0, 1000);
                break;
            }
        }
        if (!pricing_text) {
            $("p, li, span, div").each((i, el) => {
                const text = $(el).text().trim();
                if (text.match(/\$\d+/) && !pricing_text) {
                    pricing_text = text.substring(0, 500);
                }
            });
        }

        const content_snippets = [];
        $("p").each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 30 && content_snippets.length < 5) {
                content_snippets.push(text.substring(0, 500));
            }
        });

        return { title, meta_description, headline, subheadings, pricing_text, content_snippets };
    } catch (error) {
        return { error: `Failed to scrape official site: ${error.message}` };
    }
}

export async function scrapeReviews(url) {
    try {
        const $ = await fetchHTML(url);

        const title = $("title").text().trim() || null;

        let rating = null;
        const ratingSelectors = [
            '[class*="rating"]', '[class*="score"]', '[class*="star"]',
            '[itemprop="ratingValue"]', '[data-rating]',
        ];
        for (const selector of ratingSelectors) {
            const el = $(selector).first();
            if (el.length) {
                const text = el.text().trim();
                const attrRating = el.attr("data-rating") || el.attr("content");
                if (attrRating) {
                    rating = attrRating;
                    break;
                }
                if (text.match(/[\d.]+\s*\/\s*[\d.]+/) || text.match(/^[\d.]+$/)) {
                    rating = text;
                    break;
                }
            }
        }

        const review_snippets = [];
        const reviewSelectors = [
            '[class*="review"]', '[class*="comment"]', '[class*="testimonial"]',
            '[itemprop="reviewBody"]',
        ];
        for (const selector of reviewSelectors) {
            $(selector).each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 20 && text.length < 1000 && review_snippets.length < 5) {
                    review_snippets.push(text.substring(0, 500));
                }
            });
            if (review_snippets.length >= 3) break;
        }
        if (review_snippets.length === 0) {
            $("p").each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 30 && review_snippets.length < 5) {
                    review_snippets.push(text.substring(0, 500));
                }
            });
        }

        const pros_cons = [];
        $("h2, h3, h4, strong, b").each((i, el) => {
            const text = $(el).text().trim().toLowerCase();
            if (text.match(/pros|cons|advantages|disadvantages|strengths|weaknesses/)) {
                const parent = $(el).parent();
                const siblingText = parent.next().text().trim();
                pros_cons.push({
                    heading: $(el).text().trim(),
                    content: siblingText.substring(0, 500),
                });
            }
        });

        const bodyText = $("body").text().toLowerCase();
        const words = bodyText.match(/\b[a-z]{4,}\b/g) || [];
        const freq = {};
        for (const w of words) {
            if (!["this", "that", "with", "from", "have", "been", "more", "about", "their", "will", "your", "they", "what", "when", "which", "each", "than", "also", "into", "some", "would", "could", "other", "were", "there", "very", "just", "only", "most", "like", "over"].includes(w)) {
                freq[w] = (freq[w] || 0) + 1;
            }
        }
        const keywords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word]) => word);

        return { title, rating, review_snippets, keywords, pros_cons };
    } catch (error) {
        return { error: `Failed to scrape reviews: ${error.message}` };
    }
}

export async function scrapeDiscussions(url) {
    try {
        const $ = await fetchHTML(url);

        const title = $("title").text().trim() || null;

        const topics = [];
        const topicSelectors = [
            '[class*="topic"]', '[class*="thread"]', '[class*="post-title"]',
            '[class*="title"]', '[class*="subject"]',
            "h2 a", "h3 a", "h4 a",
        ];
        for (const selector of topicSelectors) {
            $(selector).each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 5 && text.length < 200 && topics.length < 5) {
                    topics.push(text);
                }
            });
            if (topics.length >= 5) break;
        }
        if (topics.length === 0) {
            $("h1, h2, h3").each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 5 && topics.length < 5) {
                    topics.push(text);
                }
            });
        }

        const comments = [];
        const commentSelectors = [
            '[class*="comment"]', '[class*="reply"]', '[class*="post-body"]',
            '[class*="message"]', '[class*="content"]',
        ];
        for (const selector of commentSelectors) {
            $(selector).each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 20 && text.length < 1000 && comments.length < 5) {
                    comments.push(text.substring(0, 500));
                }
            });
            if (comments.length >= 5) break;
        }
        if (comments.length === 0) {
            $("p").each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 30 && comments.length < 5) {
                    comments.push(text.substring(0, 500));
                }
            });
        }

        return { title, topics, comments };
    } catch (error) {
        return { error: `Failed to scrape discussions: ${error.message}` };
    }
}

export async function scrapeChangelog(url) {
    try {
        const $ = await fetchHTML(url);

        const title = $("title").text().trim() || null;
        const headline = $("h1").first().text().trim() || null;

        const features = [];
        $("h2, h3").each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 3 && text.length < 200 && features.length < 20) {
                features.push(text);
            }
        });

        const details = [];
        $("li").each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 10 && text.length < 300 && details.length < 15) {
                details.push(text);
            }
        });

        const content_snippets = [];
        $("p").each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 30 && content_snippets.length < 10) {
                content_snippets.push(text.substring(0, 500));
            }
        });

        const bodyText = $("body").text().toLowerCase();
        const words = bodyText.match(/\b[a-z]{4,}\b/g) || [];
        const freq = {};
        for (const w of words) {
            if (!["this", "that", "with", "from", "have", "been", "more", "about", "their", "will", "your", "they", "what", "when", "which", "each", "than", "also", "into", "some", "would", "could", "other", "were", "there", "very", "just", "only", "most", "like", "over", "code", "using", "view", "setting"].includes(w)) {
                freq[w] = (freq[w] || 0) + 1;
            }
        }
        const keywords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word]) => word);

        let pricing_text = null;
        $("p, li, span, div").each((i, el) => {
            const text = $(el).text().trim();
            if (text.match(/\$\d+|free|pricing|plan/i) && !pricing_text) {
                pricing_text = text.substring(0, 500);
            }
        });

        const raw_text = [
            headline,
            ...features,
            ...details.slice(0, 5),
            ...content_snippets.slice(0, 3),
        ].filter(Boolean).join(" ").substring(0, 5000);

        return {
            title,
            headline,
            features,
            details,
            keywords,
            pricing_text,
            content_snippets,
            raw_text,
        };
    } catch (error) {
        return { error: `Failed to scrape changelog: ${error.message}` };
    }
}
