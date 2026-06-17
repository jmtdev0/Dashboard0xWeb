import * as cheerio from "cheerio";
import { filterChromeExtensions, isExcludedChromeExtension } from "@/lib/public-exclusions";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const GITHUB_OWNER = "jmtdev0";
const CHROME_EXTENSION_ORG = "jmt-chromeextensions";
const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "Dashboard0xWeb/1.0",
};
const SOURCE_URL_DENYLIST = new Set([
  "chrome.google.com",
  "chromewebstore.google.com",
  "developer.chrome.com",
  "docs.netlify.com",
  "ffmpeg.org",
  "github.com",
  "localhost",
  "netlify.com",
  "openrouter.ai",
  "t.me",
  "telegram.org",
  "www.instagram.com",
  "instagram.com",
  "www.windy.com",
  "windy.com",
  "www.youtube.com",
  "youtube.com",
  "x.com",
]);
const KNOWN_CHROME_EXTENSION_SEEDS: ChromeExtensionSeed[] = [
  {
    name: "YouTube Only First Video",
    extensionId: "nehhphibaeodomkkffididpjmlcigbdp",
  },
  {
    name: "Monkey Invasion",
    extensionId: "anpmcnmjoihhflnnlbmmceoonpcimhae",
  },
];

type GitHubRepo = {
  name: string;
  html_url: string;
  homepage: string | null;
  description: string | null;
  pushed_at: string | null;
  archived: boolean;
  default_branch: string;
};

type WebsiteCandidate = Omit<
  WebsiteResult,
  "success" | "statusCode" | "responseTimeMs" | "error"
>;

type ChromeExtensionSeed = {
  name: string;
  extensionId: string;
  repo?: string;
  repoUrl?: string;
};

export interface TestResult {
  timestamp: string;
  results: {
    youtube: YoutubeResult;
    twitter: TwitterResult;
    instagram: InstagramResult;
    github: GithubResult;
    crypto: CryptoResult;
    extensions: ExtensionResult[];
    websites: WebsiteResult[];
    chromeExtensions: ChromeExtensionResult[];
    bethecandle?: BeTheCandleResult;
  };
}

export interface YoutubeResult {
  success: boolean;
  lastVideo?: string;
  error?: string;
}

export interface TwitterResult {
  success: boolean;
  lastTweet?: string;
  totalTweets?: string | null;
  error?: string;
}

export interface InstagramResult {
  success: boolean;
  lastPost?: string;
  error?: string;
}

export interface GithubResult {
  success: boolean;
  version?: string;
  downloads?: number;
  releaseDate?: string | null;
  error?: string;
}

export interface CryptoResult {
  success: boolean;
  btc?: { price: number; change24h: number };
  sol?: { price: number; change24h: number };
  error?: string;
}

export interface ExtensionResult {
  name: string;
  extensionId: string;
  success: boolean;
  functionalTest?: boolean;
  available?: boolean;
  error?: string;
}

export interface WebsiteResult {
  name: string;
  repo: string;
  repoUrl: string;
  url: string;
  success: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  source: "netlify" | "custom-domain";
  description?: string | null;
  lastPushedAt?: string | null;
  error?: string;
}

export interface ChromeExtensionResult {
  name: string;
  extensionId: string;
  storeUrl: string;
  repo?: string;
  repoUrl?: string;
  success: boolean;
  available?: boolean;
  users?: string;
  rating?: string;
  ratingCount?: string;
  metricsError?: string;
  error?: string;
}

export interface BeTheCandleResult {
  success: boolean;
  totalDistributed?: number;
  error?: string;
}

export async function runAllTests(): Promise<TestResult> {
  const results: TestResult = {
    timestamp: new Date().toISOString(),
    results: {
      youtube: { success: false },
      twitter: { success: false },
      instagram: { success: false },
      github: { success: false },
      crypto: { success: false },
      extensions: [],
      websites: [],
      chromeExtensions: [],
      bethecandle: { success: false },
    },
  };

  // All tests use fetch — run them all in parallel
  const [
    youtube,
    twitter,
    instagram,
    github,
    crypto,
    websites,
    chromeExtensions,
    bethecandle,
  ] = await Promise.allSettled([
    testYouTube(),
    testTwitter(),
    testInstagram(),
    testGitHub(),
    testCryptoPrices(),
    testWebsites(),
    testChromeExtensions(),
    testBeTheCandle(),
  ]);

  results.results.youtube =
    youtube.status === "fulfilled" ? youtube.value : { success: false, error: youtube.reason?.message ?? "Unknown error" };
  results.results.twitter =
    twitter.status === "fulfilled" ? twitter.value : { success: false, error: twitter.reason?.message ?? "Unknown error" };
  results.results.instagram =
    instagram.status === "fulfilled" ? instagram.value : { success: false, error: instagram.reason?.message ?? "Unknown error" };
  results.results.github =
    github.status === "fulfilled" ? github.value : { success: false, error: github.reason?.message ?? "Unknown error" };

  if (crypto.status === "fulfilled") {
    results.results.crypto = crypto.value;
  } else {
    results.results.crypto = {
      success: false,
      error: `Crypto error: ${crypto.reason?.message ?? "Unknown error"}`,
    };
  }

  results.results.websites =
    websites.status === "fulfilled" ? websites.value : [];
  results.results.chromeExtensions =
    chromeExtensions.status === "fulfilled" ? chromeExtensions.value : [];
  results.results.extensions = results.results.chromeExtensions.map(
    ({ name, extensionId, success, available, error }) => ({
      name,
      extensionId,
      success,
      available,
      error,
      functionalTest: false,
    })
  );
  results.results.bethecandle =
    bethecandle.status === "fulfilled" ? bethecandle.value : { success: false, error: bethecandle.reason?.message ?? "Unknown error" };

  return results;
}

/**
 * YouTube: Use the public RSS feed to find the latest video date.
 * No browser or API key needed.
 */
async function testYouTube(): Promise<YoutubeResult> {
  try {
    console.log("Testing YouTube @jmtdev via RSS feed...");

    // First, resolve the channel ID from the handle page
    const handleRes = await fetch("https://www.youtube.com/@jmtdev", {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });

    if (!handleRes.ok) {
      throw new Error(`YouTube page returned ${handleRes.status}`);
    }

    const html = await handleRes.text();

    // Extract channel ID from page HTML (YouTube uses "externalId" in the initial HTML)
    const channelIdMatch = html.match(/"externalId"\s*:\s*"(UC[\w-]+)"/);
    if (!channelIdMatch) {
      // Fallback: channel page loaded but we couldn't parse the ID
      return { success: true, lastVideo: "Channel active" };
    }

    const channelId = channelIdMatch[1];
    console.log(`Found channel ID: ${channelId}`);

    // Fetch RSS feed
    const rssRes = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { headers: { "User-Agent": USER_AGENT } }
    );

    if (!rssRes.ok) {
      throw new Error(`YouTube RSS returned ${rssRes.status}`);
    }

    const rssXml = await rssRes.text();
    const $ = cheerio.load(rssXml, { xml: true });

    const firstEntry = $("entry").first();
    if (firstEntry.length === 0) {
      return { success: true, lastVideo: "No videos yet" };
    }

    const published = firstEntry.find("published").text();
    if (published) {
      const date = new Date(published);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let ago: string;
      if (diffDays === 0) ago = "today";
      else if (diffDays === 1) ago = "1 day ago";
      else if (diffDays < 7) ago = `${diffDays} days ago`;
      else if (diffDays < 30) ago = `${Math.floor(diffDays / 7)} weeks ago`;
      else if (diffDays < 365) ago = `${Math.floor(diffDays / 30)} months ago`;
      else ago = `${Math.floor(diffDays / 365)} years ago`;

      return { success: true, lastVideo: ago };
    }

    return { success: true, lastVideo: "Channel active" };
  } catch (error) {
    console.error("YouTube test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Twitter/X: Fetch profile page and parse meta tags.
 * X.com heavily relies on JS, so we extract what we can from the initial HTML
 * (meta og:description usually contains bio; syndication API gives tweet count).
 */
async function testTwitter(): Promise<TwitterResult> {
  try {
    console.log("Testing Twitter @windyBotES via syndication API...");

    // Twitter syndication endpoint returns basic user info as JSON
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      "https://syndication.twitter.com/srv/timeline-profile/screen-name/windyBotES",
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 403/429 means Twitter is blocking the cloud IP or rate-limiting — profile likely exists
      if (response.status === 403 || response.status === 429) {
        return { success: true, lastTweet: "Profile exists (blocked by X)", totalTweets: null };
      }
      throw new Error(`Twitter returned ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to find tweet timestamps in the syndication timeline
    const timeEl = $("time").first();
    const lastTweet = timeEl.attr("datetime")
      ? new Date(timeEl.attr("datetime")!).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : $(".timeline-Tweet-text").first().text().substring(0, 60) || "Profile active";

    return {
      success: true,
      lastTweet,
      totalTweets: null,
    };
  } catch (error) {
    console.error("Twitter test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Instagram: Fetch profile page and parse meta tags (og:description).
 * The description typically contains "X Followers, Y Following, Z Posts".
 */
async function testInstagram(): Promise<InstagramResult> {
  try {
    console.log("Testing Instagram @anainimaladay via meta tags...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://www.instagram.com/anainimaladay/", {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Instagram returned ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // og:description usually has "X Followers, Y Following, Z Posts"
    const description =
      $('meta[property="og:description"]').attr("content") ?? "";
    const title = $("title").text();

    const followersMatch = description.match(/([\d.,]+[KM]?)\s*Followers/i);
    const postsMatch = description.match(/([\d.,]+)\s*Posts/i);

    if (followersMatch || postsMatch) {
      const info = [];
      if (postsMatch) info.push(`${postsMatch[1]} posts`);
      if (followersMatch) info.push(`${followersMatch[1]} followers`);
      return { success: true, lastPost: info.join(", ") };
    }

    // Even if we couldn't parse stats, if the title mentions the username the profile exists
    if (title.toLowerCase().includes("anainimaladay")) {
      return { success: true, lastPost: "Profile exists" };
    }

    // Page loaded but nothing useful found (likely login wall)
    return { success: true, lastPost: "Profile exists (login wall)" };
  } catch (error) {
    console.error("Instagram test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testGitHub(): Promise<GithubResult> {
  // Use GitHub API directly - more reliable than scraping
  try {
    console.log("Testing GitHub KingdomHeartsCustomMusic via API...");
    
    const response = await fetch(
      "https://api.github.com/repos/jmtdev0/KingdomHeartsCustomMusic/releases/latest",
      {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "AppHealthDashboard/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release = await response.json();
    
    // Calculate total downloads from all assets
    const totalDownloads = release.assets?.reduce(
      (sum: number, asset: { download_count: number }) => sum + asset.download_count,
      0
    ) || 0;

    return {
      success: true,
      version: release.tag_name || release.name,
      releaseDate: release.published_at,
      downloads: totalDownloads,
    };
  } catch (error) {
    console.error("GitHub API test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testCryptoPrices(): Promise<CryptoResult> {
  try {
    // Try CoinGecko first
    return await attemptCryptoFetch();
  } catch (unexpectedError) {
    console.error("❌ [CRYPTO] Unexpected error in testCryptoPrices:", unexpectedError);
    return {
      success: false,
      error: `Unexpected crypto error: ${unexpectedError instanceof Error ? unexpectedError.message : 'Unknown'}`,
    };
  }
}

async function attemptCryptoFetch(): Promise<CryptoResult> {
  // Log environment info
  console.log("🌍 [CRYPTO] Environment:", {
    isNetlify: !!process.env.NETLIFY,
    nodeEnv: process.env.NODE_ENV,
    region: process.env.AWS_REGION || 'unknown',
  });

  // Try CoinGecko first
  try {
    console.log("₿ [CRYPTO] Fetching prices from CoinGecko API...");
    const startTime = Date.now();

    // Add timeout and User-Agent to avoid being blocked
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=eur&include_24hr_change=true",
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; Dashboard0xWeb/1.0; +https://dashboard0x.netlify.app)",
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`₿ [CRYPTO] CoinGecko response received in ${elapsed}ms`);
      console.log("₿ [CRYPTO] CoinGecko response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("₿ [CRYPTO] CoinGecko API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200),
          elapsed,
        });
        throw new Error(`CoinGecko API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log("₿ [CRYPTO] CoinGecko raw data:", JSON.stringify(data, null, 2));

      const result = {
        success: true,
        btc: {
          price: data.bitcoin.eur,
          change24h: data.bitcoin.eur_24h_change,
        },
        sol: {
          price: data.solana.eur,
          change24h: data.solana.eur_24h_change,
        },
      };

      console.log("✅ [CRYPTO] CoinGecko success:", {
        btcPrice: result.btc.price,
        btcChange: result.btc.change24h,
        solPrice: result.sol.price,
        solChange: result.sol.change24h,
      });

      return result;
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      // Check if it's a timeout error
      if (isAbortError(fetchError)) {
        console.error("⏱️ [CRYPTO] CoinGecko request timed out after 8 seconds");
        throw new Error('CoinGecko timeout');
      }

      throw fetchError;
    }
  } catch (coinGeckoError) {
    console.warn("⚠️ [CRYPTO] CoinGecko failed, trying CoinCap API fallback...");
    console.error("₿ [CRYPTO] CoinGecko error details:", {
      name: (coinGeckoError as Error).name,
      message: (coinGeckoError as Error).message,
      error: coinGeckoError,
    });

    // Fallback to CoinCap API
    try {
      console.log("₿ [CRYPTO] Fetching from CoinCap API (fallback)...");
      const fallbackStartTime = Date.now();

      // Add timeout and User-Agent for CoinCap too
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 8000);

      const [btcResponse, solResponse] = await Promise.all([
        fetch("https://api.coincap.io/v2/assets/bitcoin", {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; Dashboard0xWeb/1.0; +https://dashboard0x.netlify.app)",
          },
          signal: controller2.signal,
        }),
        fetch("https://api.coincap.io/v2/assets/solana", {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; Dashboard0xWeb/1.0; +https://dashboard0x.netlify.app)",
          },
          signal: controller2.signal,
        }),
      ]);

      clearTimeout(timeoutId2);
      const fallbackElapsed = Date.now() - fallbackStartTime;
      console.log(`₿ [CRYPTO] CoinCap responses received in ${fallbackElapsed}ms`);

      console.log("₿ [CRYPTO] CoinCap responses:", {
        btcStatus: btcResponse.status,
        solStatus: solResponse.status,
      });

      if (!btcResponse.ok || !solResponse.ok) {
        const btcError = !btcResponse.ok ? await btcResponse.text() : null;
        const solError = !solResponse.ok ? await solResponse.text() : null;
        console.error("₿ [CRYPTO] CoinCap API error:", {
          btcStatus: btcResponse.status,
          solStatus: solResponse.status,
          btcError: btcError?.substring(0, 200),
          solError: solError?.substring(0, 200),
        });
        throw new Error("CoinCap API error");
      }

      const btcData = await btcResponse.json();
      const solData = await solResponse.json();

      console.log("₿ [CRYPTO] CoinCap raw data:", {
        btcPrice: btcData.data.priceUsd,
        btcChange: btcData.data.changePercent24Hr,
        solPrice: solData.data.priceUsd,
        solChange: solData.data.changePercent24Hr,
      });

      // CoinCap provides prices in USD, convert to EUR (approximate rate: 1 EUR = 1.09 USD)
      const usdToEur = 0.92;

      const result = {
        success: true,
        btc: {
          price: Math.round(parseFloat(btcData.data.priceUsd) * usdToEur),
          change24h: parseFloat(btcData.data.changePercent24Hr),
        },
        sol: {
          price: Math.round(parseFloat(solData.data.priceUsd) * usdToEur * 100) / 100,
          change24h: parseFloat(solData.data.changePercent24Hr),
        },
      };

      console.log("✅ [CRYPTO] CoinCap success (fallback):", {
        btcPrice: result.btc.price,
        btcChange: result.btc.change24h,
        solPrice: result.sol.price,
        solChange: result.sol.change24h,
      });

      return result;
    } catch (coinCapError: unknown) {
      console.error("❌ [CRYPTO] All crypto APIs failed!");

      // Check if it's a timeout error
      if (isAbortError(coinCapError)) {
        console.error("⏱️ [CRYPTO] CoinCap request timed out after 8 seconds");
      }

      const coinCapMeta = getErrorMeta(coinCapError);
      console.error("₿ [CRYPTO] CoinCap error details:", {
        name: coinCapMeta.name,
        message: coinCapMeta.message,
        error: coinCapError,
      });

      // Create detailed error message
      let errorMessage = "Unable to fetch crypto prices";

      if (coinGeckoError instanceof Error && coinCapError instanceof Error) {
        const isTimeout =
          coinGeckoError.message.includes('timeout') ||
          coinGeckoError.name === 'AbortError' ||
          coinCapError.message.includes('timeout') ||
          coinCapError.name === 'AbortError';

        if (isTimeout) {
          errorMessage += " (API timeout - requests taking too long)";
        } else if (coinGeckoError.message.includes('429') || coinCapError.message.includes('429')) {
          errorMessage += " (Rate limited - too many requests)";
        } else {
          errorMessage += ` (Both APIs failed: ${coinGeckoError.message} / ${coinCapError.message})`;
        }
      } else {
        errorMessage += " (APIs unavailable)";
      }

      // Add Netlify-specific hint
      if (process.env.NETLIFY) {
        errorMessage += " [Netlify environment]";
      }

      const errorResult = {
        success: false,
        error: errorMessage,
      };

      console.error("₿ [CRYPTO] Returning error result:", errorResult);
      return errorResult;
    }
  }
}

/**
 * Public websites: best-effort discovery from GitHub metadata and raw files.
 */
async function testWebsites(): Promise<WebsiteResult[]> {
  try {
    console.log("Testing public Netlify-backed websites via GitHub...");
    const candidates = await discoverWebsiteCandidates();

    if (candidates.length === 0) {
      return [];
    }

    const results = await asyncPool(candidates, 5, checkWebsiteCandidate);
    return results.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Website discovery failed:", error);
    return [];
  }
}

async function discoverWebsiteCandidates(): Promise<WebsiteCandidate[]> {
  const repos = await fetchJson<GitHubRepo[]>(
    `https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=100&type=owner&sort=updated`,
    10000,
    GITHUB_API_HEADERS
  );
  const activeRepos = repos.filter((repo) => !repo.archived);
  const discovered = await asyncPool(activeRepos, 6, inspectWebsiteRepo);
  const byUrl = new Map<string, WebsiteCandidate>();

  for (const candidate of discovered.flat()) {
    if (!byUrl.has(candidate.url)) {
      byUrl.set(candidate.url, candidate);
    }
  }

  return Array.from(byUrl.values());
}

async function inspectWebsiteRepo(repo: GitHubRepo): Promise<WebsiteCandidate[]> {
  const readmeUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${repo.name}/${repo.default_branch}/README.md`;
  const netlifyTomlUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${repo.name}/${repo.default_branch}/netlify.toml`;
  const [readme, netlifyToml] = await Promise.all([
    fetchOptionalText(readmeUrl, 8000),
    fetchOptionalText(netlifyTomlUrl, 8000),
  ]);
  const metadata = [repo.homepage, repo.description, readme, netlifyToml]
    .filter(Boolean)
    .join("\n");
  const hasNetlifyHint = /netlify/i.test(metadata);
  const roots = [
    ...extractUrls(repo.homepage ?? ""),
    ...extractUrls(repo.description ?? ""),
    ...extractUrls(readme ?? ""),
  ]
    .map(normalizePublicRootUrl)
    .filter((value): value is string => Boolean(value));
  const urls = new Set(
    roots.filter(
      (url) =>
        !isNetlifyPreviewRoot(url) &&
        !isPlaceholderPublicRoot(url) &&
        isLikelyRepoDeployment(url, repo, readme, netlifyToml, hasNetlifyHint)
    )
  );

  return Array.from(urls).map((url) => ({
    name: titleFromRepoName(repo.name),
    repo: repo.name,
    repoUrl: repo.html_url,
    url,
    source: isNetlifyRoot(url) ? "netlify" : "custom-domain",
    description: repo.description,
    lastPushedAt: repo.pushed_at,
  }));
}

async function checkWebsiteCandidate(
  candidate: WebsiteCandidate
): Promise<WebsiteResult> {
  const started = Date.now();

  try {
    let response = await fetchWithTimeout(
      candidate.url,
      {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        redirect: "follow",
      },
      9000
    );

    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(
        candidate.url,
        {
          method: "GET",
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          redirect: "follow",
        },
        9000
      );
    }

    return {
      ...candidate,
      success: response.ok,
      statusCode: response.status,
      responseTimeMs: Date.now() - started,
      error: response.ok
        ? undefined
        : `Website returned ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      ...candidate,
      success: false,
      responseTimeMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Chrome Web Store extensions: availability and public metrics when exposed.
 */
async function testChromeExtensions(): Promise<ChromeExtensionResult[]> {
  try {
    console.log("Testing public Chrome extensions...");
    const seeds = await discoverChromeExtensionSeeds();
    const results = await asyncPool(seeds, 4, checkChromeExtension);
    return filterChromeExtensions(results).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } catch (error) {
    console.error("Chrome extension discovery failed:", error);
    return [];
  }
}

async function discoverChromeExtensionSeeds(): Promise<ChromeExtensionSeed[]> {
  const seeds = [...KNOWN_CHROME_EXTENSION_SEEDS];

  try {
    const repos = await fetchJson<GitHubRepo[]>(
      `https://api.github.com/orgs/${CHROME_EXTENSION_ORG}/repos?per_page=100&type=public&sort=updated`,
      10000,
      GITHUB_API_HEADERS
    );

    for (const repo of repos) {
      const extensionId = extractChromeExtensionId(
        [repo.homepage, repo.description].filter(Boolean).join(" ")
      );

      if (!extensionId) {
        continue;
      }

      seeds.push({
        name: titleFromRepoName(repo.name),
        extensionId,
        repo: repo.name,
        repoUrl: repo.html_url,
      });
    }
  } catch (error) {
    console.warn("Could not load jmt-chromeextensions inventory:", error);
  }

  const byId = new Map<string, ChromeExtensionSeed>();
  for (const seed of seeds) {
    if (isExcludedChromeExtension(seed)) {
      continue;
    }

    if (!byId.has(seed.extensionId)) {
      byId.set(seed.extensionId, seed);
    }
  }

  return Array.from(byId.values());
}

async function checkChromeExtension(
  seed: ChromeExtensionSeed
): Promise<ChromeExtensionResult> {
  const storeUrl = `https://chromewebstore.google.com/detail/${seed.extensionId}`;

  try {
    const response = await fetchWithTimeout(
      `${storeUrl}?hl=en`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      },
      10000
    );

    if (!response.ok) {
      return {
        ...seed,
        storeUrl,
        success: false,
        available: false,
        error: `Web Store returned ${response.status}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").text();
    const text = $.text().replace(/\s+/g, " ");
    const notFound = /item not found|404/i.test(`${title} ${text}`);
    const metrics = parseChromeStoreMetrics(html, text);
    const hasMetrics = Boolean(
      metrics.users || metrics.rating || metrics.ratingCount
    );
    const available = hasMetrics || !notFound;

    return {
      ...seed,
      storeUrl,
      success: available,
      available,
      ...metrics,
      metricsError:
        available && !hasMetrics
          ? "Public users and rating were not exposed in the store HTML."
          : undefined,
      error: available ? undefined : "Extension not found or removed",
    };
  } catch (error) {
    return {
      ...seed,
      storeUrl,
      success: false,
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function parseChromeStoreMetrics(html: string, visibleText: string) {
  const users =
    firstMatch(visibleText, /([\d,.]+\s?[KM]?)\s+users/i) ??
    firstMatch(html, /"users"\s*:\s*"([^"]+)"/i);
  const rating =
    firstMatch(visibleText, /([0-5](?:\.\d+)?)\s+out of 5/i) ??
    firstMatch(html, /"ratingValue"\s*:\s*"?([0-5](?:\.\d+)?)"?/i);
  const ratingCount =
    firstMatch(visibleText, /([\d,.]+\s?[KM]?)\s+(?:ratings|reviews)/i) ??
    firstMatch(html, /"ratingCount"\s*:\s*"?([\d,.]+)"?/i);

  return { users, rating, ratingCount };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson<T>(
  url: string,
  timeoutMs: number,
  headers: Record<string, string>
): Promise<T> {
  const response = await fetchWithTimeout(
    url,
    {
      headers,
      redirect: "follow",
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}: ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchOptionalText(url: string, timeoutMs: number) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
        redirect: "follow",
      },
      timeoutMs
    );

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

function extractUrls(value: string) {
  const matches = value.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  return matches.map((url) => url.replace(/[),.;\]]+$/g, ""));
}

function normalizePublicRootUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".devtunnels.ms")
    ) {
      return null;
    }

    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return null;
  }
}

function isLikelyRepoDeployment(
  url: string,
  repo: GitHubRepo,
  readme: string | null,
  netlifyToml: string | null,
  hasNetlifyHint: boolean
) {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  const normalizedRepo = repo.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hostnameKey = hostname.replace(/[^a-z0-9]/g, "");
  const homepageRoot = normalizePublicRootUrl(repo.homepage ?? "");
  const descriptionRoot = normalizePublicRootUrl(repo.description ?? "");
  const explicitReadmeReference = Boolean(
    readme &&
      new RegExp(
        `(live app|live demo|netlify|deploy|production|website)[^\\n]{0,120}${escapeRegExp(
          url
        )}`,
        "i"
      ).test(readme)
  );

  if (homepageRoot === url || descriptionRoot === url) {
    return isNetlifyRoot(url) || isPortfolioDomain(url);
  }

  if (isNetlifyRoot(url) && !isNetlifyPreviewRoot(url)) {
    return (
      hostnameKey.includes(normalizedRepo) ||
      Boolean(netlifyToml) ||
      explicitReadmeReference
    );
  }

  return (
    hasNetlifyHint &&
    isPortfolioDomain(url) &&
    (homepageRoot === url || explicitReadmeReference)
  );
}

function isPlaceholderPublicRoot(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  return (
    hostname.includes("tu-site") ||
    hostname.includes("your-site") ||
    hostname.includes("example") ||
    hostname.includes("sample") ||
    hostname.includes("demo-site")
  );
}

function isNetlifyRoot(url: string) {
  return new URL(url).hostname.toLowerCase().endsWith(".netlify.app");
}

function isNetlifyPreviewRoot(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.endsWith(".netlify.app") && hostname.includes("--");
}

function isPortfolioDomain(url: string) {
  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  return !SOURCE_URL_DENYLIST.has(hostname);
}

function extractChromeExtensionId(value: string) {
  return (
    firstMatch(value, /\/detail\/(?:[^/\s]+\/)?([a-p]{32})/i) ??
    firstMatch(value, /\b([a-p]{32})\b/i)
  );
}

function titleFromRepoName(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function firstMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[1]?.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAbortError(error: unknown) {
  return getErrorMeta(error).name === "AbortError";
}

function getErrorMeta(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error",
  };
}

async function asyncPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
) {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

/**
 * BeTheCandle: Fetch total distributed USDC from the community-pot history API.
 */
async function testBeTheCandle(): Promise<BeTheCandleResult> {
  try {
    console.log("Testing BeTheCandle community pot history...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      "https://bethecandle.live/api/community-pot/history",
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`bethecandle API returned ${response.status}`);
    }

    const data = await response.json();
    const payouts: Array<{ total_amount_usdc: string }> = data.payouts ?? [];

    const total = payouts.reduce(
      (sum, p) => sum + parseFloat(p.total_amount_usdc),
      0
    );

    return { success: true, totalDistributed: parseFloat(total.toFixed(2)) };
  } catch (error) {
    console.error("BeTheCandle test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
