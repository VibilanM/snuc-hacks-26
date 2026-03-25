import axios from "axios";
import * as cheerio from "cheerio";

const TIMEOUT = 10000;

/**
 * Fetch HTML content from a URL with timeout and error handling.
 */
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

/**
 * Scrape an official website for key business information.
 */
export async function scrapeOfficialSite(url) {
    try {
        const $ = await fetchHTML(url);

        // Title
        const title = $("title").text().trim() || null;

        // Meta description
        const meta_description = $('meta[name="description"]').attr("content")?.trim() || null;

        // Main headline
        const headline = $("h1").first().text().trim() || null;

        // Subheadings
        const subheadings = [];
        $("h2, h3").each((i, el) => {
            const text = $(el).text().trim();
            if (text && subheadings.length < 10) {
                subheadings.push(text);
            }
        });

        // Pricing-related text
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
        // Also look for dollar signs in text
        if (!pricing_text) {
            $("p, li, span, div").each((i, el) => {
                const text = $(el).text().trim();
                if (text.match(/\$\d+/) && !pricing_text) {
                    pricing_text = text.substring(0, 500);
                }
            });
        }

        // Content snippets - first few meaningful paragraphs
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

/**
 * Scrape a reviews page for ratings and review snippets.
 */
export async function scrapeReviews(url) {
    try {
        const $ = await fetchHTML(url);

        // Title
        const title = $("title").text().trim() || null;

        // Overall rating - look for common rating patterns
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

        // Review snippets
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
        // Fallback: grab paragraphs if no review elements found
        if (review_snippets.length === 0) {
            $("p").each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 30 && review_snippets.length < 5) {
                    review_snippets.push(text.substring(0, 500));
                }
            });
        }

        // Pros and cons
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

        // Keywords: extract common words from visible text
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

/**
 * Scrape a discussions/forum page for topics and comments.
 */
export async function scrapeDiscussions(url) {
    try {
        const $ = await fetchHTML(url);

        // Title
        const title = $("title").text().trim() || null;

        // Discussion topics - look for common forum patterns
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
        // Fallback: use headings
        if (topics.length === 0) {
            $("h1, h2, h3").each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 5 && topics.length < 5) {
                    topics.push(text);
                }
            });
        }

        // Comments - look for comment-like elements
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
        // Fallback: grab paragraphs
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
