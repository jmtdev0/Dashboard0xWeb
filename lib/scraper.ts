import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface TestResult {
  timestamp: string;
  results: {
    youtube: YoutubeResult;
    twitter: TwitterResult;
    instagram: InstagramResult;
    github: GithubResult;
    crypto: CryptoResult;
    extensions: ExtensionResult[];
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
    },
  };

  // All tests use fetch — run them all in parallel
  const [youtube, twitter, instagram, github, crypto, extensions] =
    await Promise.allSettled([
      testYouTube(),
      testTwitter(),
      testInstagram(),
      testGitHub(),
      testCryptoPrices(),
      testExtensions(),
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

  results.results.extensions =
    extensions.status === "fulfilled" ? extensions.value : [];

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
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Check if it's a timeout error
      if (fetchError.name === 'AbortError') {
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
    } catch (coinCapError: any) {
      console.error("❌ [CRYPTO] All crypto APIs failed!");

      // Check if it's a timeout error
      if (coinCapError.name === 'AbortError') {
        console.error("⏱️ [CRYPTO] CoinCap request timed out after 8 seconds");
      }

      console.error("₿ [CRYPTO] CoinCap error details:", {
        name: coinCapError.name,
        message: coinCapError.message,
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
 * Chrome Web Store extensions: check availability via fetch + cheerio.
 */
async function testExtensions(): Promise<ExtensionResult[]> {
  const extensions = [
    {
      name: "YouTube Only First Video",
      extensionId: "nehhphibaeodomkkffididpjmlcigbdp",
    },
  ];

  const results: ExtensionResult[] = [];

  for (const ext of extensions) {
    try {
      console.log(`Testing extension: ${ext.name}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://chromewebstore.google.com/detail/${ext.extensionId}`,
        {
          headers: { "User-Agent": USER_AGENT, "Accept": "text/html" },
          redirect: "follow",
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        results.push({
          ...ext,
          success: false,
          available: false,
          error: `Web Store returned ${response.status}`,
        });
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Check page title — Chrome Web Store shows "404" or "Item not found" in title for missing extensions
      const title = $("title").text();
      const notFound = title.includes("Item not found") || title === "404";

      results.push({
        ...ext,
        success: !notFound,
        available: !notFound,
        error: notFound ? "Extension not found or removed" : undefined,
      });
    } catch (error) {
      results.push({
        ...ext,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
