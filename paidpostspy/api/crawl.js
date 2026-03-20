const axios = require('axios');
const cheerio = require('cheerio');

// Helper: check if a URL is an outbound commercial link (not same domain, not social/wiki)
function isCommercialOutbound(href, sourceDomain) {
  try {
    const url = new URL(href);
    const host = url.hostname.replace('www.', '');
    const source = sourceDomain.replace('www.', '');

    // Skip same domain
    if (host === source || host.endsWith('.' + source)) return false;

    // Skip common non-commercial domains
    const skip = [
      'google.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'linkedin.com', 'youtube.com', 'wikipedia.org', 'amazon.com',
      'apple.com', 'microsoft.com', 't.co', 'bit.ly', 'goo.gl',
      'pinterest.com', 'reddit.com', 'whatsapp.com', 'telegram.org'
    ];
    if (skip.some(s => host === s || host.endsWith('.' + s))) return false;

    // Must be http/https
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    return true;
  } catch {
    return false;
  }
}

// Helper: guess contact email patterns from domain
function guessEmail(domain) {
  return [
    `pr@${domain}`,
    `marketing@${domain}`,
    `hello@${domain}`,
    `contact@${domain}`
  ];
}

// Helper: extract brand name from domain
function brandFromDomain(domain) {
  const clean = domain.replace('www.', '').split('.')[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Helper: get article links from subfolder page
async function getArticleLinks(subfolderUrl, sourceDomain) {
  const res = await axios.get(subfolderUrl, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const $ = cheerio.load(res.data);
  const links = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      const full = new URL(href, subfolderUrl).href;
      const urlObj = new URL(full);
      const host = urlObj.hostname.replace('www.', '');
      const src = sourceDomain.replace('www.', '');

      // Only collect links that belong to the same domain and look like articles
      if ((host === src || host.endsWith('.' + src)) && full !== subfolderUrl) {
        links.add(full);
      }
    } catch {}
  });

  return [...links].slice(0, 20); // max 20 articles
}

// Helper: extract outbound body links from a single article
async function extractLeadsFromArticle(articleUrl, sourceDomain) {
  const res = await axios.get(articleUrl, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const $ = cheerio.load(res.data);

  // Get article title
  const title = $('h1').first().text().trim() ||
                $('title').text().trim() ||
                'Untitled Article';

  // Get published date
  const date = $('time').attr('datetime') ||
               $('[class*="date"]').first().text().trim() ||
               $('[class*="time"]').first().text().trim() ||
               'Unknown date';

  const leads = [];

  // Focus on article body — common content selectors
  const bodySelectors = [
    'article', '.article-body', '.post-content', '.entry-content',
    '.content-body', '.story-body', '[class*="article"]', 'main', '.content'
  ];

  let bodyEl = null;
  for (const sel of bodySelectors) {
    if ($(sel).length) { bodyEl = $(sel).first(); break; }
  }
  if (!bodyEl) bodyEl = $('body');

  bodyEl.find('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const anchor = $(el).text().trim();
    if (!href || !anchor || anchor.length < 2) return;

    try {
      const full = new URL(href, articleUrl).href;
      if (!isCommercialOutbound(full, sourceDomain)) return;

      const urlObj = new URL(full);
      const domain = urlObj.hostname.replace('www.', '');
      const brand = brandFromDomain(domain);
      const emails = guessEmail(domain);

      // Avoid duplicate domains per article
      if (leads.some(l => l.domain === domain)) return;

      leads.push({
        brand,
        domain,
        anchor,
        outboundUrl: full,
        sourceArticle: title,
        sourceUrl: articleUrl,
        date,
        contactRole: 'Marketing Manager / PR Lead',
        contactEmails: emails,
        contactEmail: emails[0],
        stage: 'New',
        pitch: ''
      });
    } catch {}
  });

  return leads;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subfolderUrl } = req.body;
  if (!subfolderUrl) return res.status(400).json({ error: 'subfolderUrl is required' });

  try {
    const urlObj = new URL(subfolderUrl);
    const sourceDomain = urlObj.hostname;

    // Step 1: get article links from subfolder
    let articleLinks = [];
    try {
      articleLinks = await getArticleLinks(subfolderUrl, sourceDomain);
    } catch (e) {
      return res.status(500).json({ error: `Could not load subfolder: ${e.message}` });
    }

    if (articleLinks.length === 0) {
      return res.status(200).json({ leads: [], message: 'No article links found in this subfolder.' });
    }

    // Step 2: extract leads from each article (parallel, max 10 at a time)
    const allLeads = [];
    const chunks = [];
    for (let i = 0; i < articleLinks.length; i += 5) {
      chunks.push(articleLinks.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(url => extractLeadsFromArticle(url, sourceDomain))
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allLeads.push(...result.value);
        }
      }
    }

    // Deduplicate by domain across all articles
    const seen = new Set();
    const uniqueLeads = allLeads.filter(l => {
      if (seen.has(l.domain)) return false;
      seen.add(l.domain);
      return true;
    }).map((l, i) => ({ ...l, id: `lead-${Date.now()}-${i}` }));

    return res.status(200).json({
      leads: uniqueLeads,
      articlesScanned: articleLinks.length,
      totalLeads: uniqueLeads.length
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
