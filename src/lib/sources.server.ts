const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface FetchedSource {
  url: string;
  ok: boolean;
  status: number;
  text: string;
}

/** Strip a HTML document down to readable text. */
export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function fetchOne(url: string): Promise<FetchedSource> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    const body = await res.text();
    return { url, ok: res.ok, status: res.status, text: htmlToText(body) };
  } catch (error) {
    return { url, ok: false, status: 0, text: String(error) };
  }
}

/** Guess the shopping domain for a plain store name ("Kroger" -> kroger.com). */
export function storeDomain(store: string) {
  const known: Record<string, string> = {
    kroger: "kroger.com",
    target: "target.com",
    walmart: "walmart.com",
    costco: "costco.com",
    publix: "publix.com",
    safeway: "safeway.com",
    aldi: "aldi.us",
    meijer: "meijer.com",
    albertsons: "albertsons.com",
    "whole foods": "wholefoodsmarket.com",
    "trader joe's": "traderjoes.com",
    cvs: "cvs.com",
    walgreens: "walgreens.com",
    amazon: "amazon.com",
  };
  const key = store.trim().toLowerCase();
  if (known[key]) return known[key];
  return `${key.replace(/[^a-z0-9]+/g, "")}.com`;
}

export function storeSlug(store: string) {
  return store.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Live, publicly readable coupon pages for a store. The retailer's own site
 * (kroger.com and friends) blocks automated readers outright, so these are the
 * pages that actually answer.
 */
export function couponSourceUrls(store: string) {
  const domain = storeDomain(store);
  const slug = storeSlug(store);
  return [
    `https://couponfollow.com/site/${domain}`,
    `https://www.coupons.com/coupon-codes/${slug}`,
    `https://www.dealnews.com/s/${encodeURIComponent(store)}/`,
  ];
}

/** Fetch every source in parallel and keep the ones that returned real content. */
export async function fetchSources(urls: string[]) {
  const results = await Promise.all(urls.map(fetchOne));
  return results.map((r) => ({ ...r, text: r.text.slice(0, 24000) }));
}
