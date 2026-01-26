import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import path from "path";

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

async function getBrowser(): Promise<Browser> {
  // Use puppeteer's bundled Chromium 
  // New headless mode is now the default in Puppeteer v22+
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });
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

  let browser: Browser | null = null;

  try {
    browser = await getBrowser();

    // Run tests in parallel where possible
    const [youtube, twitter, instagram, github, crypto, extensions] =
      await Promise.allSettled([
        testYouTube(browser),
        testTwitter(browser),
        testInstagram(browser),
        testGitHub(browser),
        testCryptoPrices(),
        testExtensions(browser),
      ]);

    if (youtube.status === "fulfilled") results.results.youtube = youtube.value;
    if (twitter.status === "fulfilled") results.results.twitter = twitter.value;
    if (instagram.status === "fulfilled")
      results.results.instagram = instagram.value;
    if (github.status === "fulfilled") results.results.github = github.value;
    if (crypto.status === "fulfilled") results.results.crypto = crypto.value;
    if (extensions.status === "fulfilled")
      results.results.extensions = extensions.value;
  } catch (error) {
    console.error("Fatal error in runAllTests:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

async function testYouTube(browser: Browser): Promise<YoutubeResult> {
  // Simplified test - just verify the channel exists and get basic info
  let page: Page | null = null;
  
  try {
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    console.log("Testing YouTube @jmtdev...");
    
    // Set cookies to bypass consent
    await page.setCookie({
      name: "CONSENT",
      value: "YES+cb.20240101-00-p0.en+FX+999",
      domain: ".youtube.com",
    });
    
    await page.goto("https://www.youtube.com/@jmtdev/videos", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for page to render .
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page content and look for video info
    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      // Check if we're on the channel page
      const isChannelPage = bodyText.includes("subscribers") || bodyText.includes("videos");
      
      // Try to find video dates using regex
      const datePatterns = [
        /(\d+)\s*years?\s*ago/i,
        /(\d+)\s*months?\s*ago/i,
        /(\d+)\s*weeks?\s*ago/i,
        /(\d+)\s*days?\s*ago/i,
        /(\d+)\s*hours?\s*ago/i,
      ];
      
      for (const pattern of datePatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          return { success: true, lastVideo: match[0] };
        }
      }
      
      // Check if channel exists but no videos found
      if (isChannelPage) {
        return { success: true, lastVideo: "Channel active" };
      }
      
      return { success: false, lastVideo: null };
    });

    if (result.success && result.lastVideo) {
      return { success: true, lastVideo: result.lastVideo };
    }
    
    return { success: false, error: "Could not access YouTube channel" };
  } catch (error) {
    console.error("YouTube test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (page) await page.close();
  }
}

async function testTwitter(browser: Browser): Promise<TwitterResult> {
  // Try direct X.com scraping with proper setup
  let page: Page | null = null;

  try {
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    console.log("Testing Twitter @windyBotES...");
    
    await page.goto("https://x.com/windyBotES", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    
    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      // Check if profile exists
      const hasProfile = bodyText.includes("posts") || bodyText.includes("followers") || bodyText.includes("following");
      
      // Try to find tweet count
      const postsMatch = bodyText.match(/([\d,]+)\s*posts?/i);
      const totalTweets = postsMatch ? postsMatch[1] : null;
      
      // Try to find a date/time pattern
      const timePatterns = [
        /(\d+[hm])/i,
        /(\d+)\s*hours?\s*ago/i,
        /(\d+)\s*minutes?\s*ago/i,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+/i,
      ];
      
      let lastTweet = null;
      for (const pattern of timePatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          lastTweet = match[0];
          break;
        }
      }
      
      return { hasProfile, lastTweet, totalTweets };
    });
    
    if (result.hasProfile) {
      return { 
        success: true, 
        lastTweet: result.lastTweet || "Profile active",
        totalTweets: result.totalTweets
      };
    }
    
    return { success: false, error: "Could not access Twitter profile" };
  } catch (error) {
    console.error("Twitter test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (page) await page.close();
  }
}

async function testInstagram(browser: Browser): Promise<InstagramResult> {
  // Simplified Instagram check
  let page: Page | null = null;

  try {
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    console.log("Testing Instagram @anainimaladay...");
    await page.goto("https://www.instagram.com/anainimaladay/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check page content
    const result = await page.evaluate(() => {
      // Get meta description which often contains stats
      const metaDesc = document.querySelector('meta[property="og:description"]');
      const description = metaDesc?.getAttribute('content') || '';
      
      // Get title
      const title = document.title;
      
      // Check for login wall
      const bodyText = document.body.innerText.toLowerCase();
      const isLoginWall = bodyText.includes('log in') && bodyText.includes('sign up');
      const hasContent = bodyText.includes('followers') || bodyText.includes('posts') || bodyText.includes('following');
      
      // Try to extract followers/posts from meta
      const followersMatch = description.match(/([\d.,]+[KM]?)\s*Followers/i);
      const postsMatch = description.match(/([\d.,]+)\s*Posts/i);
      
      return {
        profileAccessible: hasContent || followersMatch !== null,
        followers: followersMatch ? followersMatch[1] : null,
        posts: postsMatch ? postsMatch[1] : null,
        title,
        isLoginWall,
      };
    });

    if (result.profileAccessible || result.followers || result.posts) {
      const info = [];
      if (result.posts) info.push(`${result.posts} posts`);
      if (result.followers) info.push(`${result.followers} followers`);
      
      return { 
        success: true, 
        lastPost: info.length > 0 ? info.join(', ') : "Profile exists" 
      };
    }
    
    // Even login wall means profile exists
    if (result.title.includes('anainimaladay')) {
      return { success: true, lastPost: "Profile exists" };
    }
    
    return { success: false, error: "Could not access Instagram profile" };
  } catch (error) {
    console.error("Instagram test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (page) await page.close();
  }
}

async function testGitHub(browser: Browser): Promise<GithubResult> {
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
  // Try CoinGecko first
  try {
    console.log("Fetching crypto prices from CoinGecko...");

    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=eur&include_24hr_change=true",
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    return {
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
  } catch (coinGeckoError) {
    console.warn("CoinGecko failed, trying CoinCap API...", coinGeckoError);

    // Fallback to CoinCap API
    try {
      const [btcResponse, solResponse] = await Promise.all([
        fetch("https://api.coincap.io/v2/assets/bitcoin"),
        fetch("https://api.coincap.io/v2/assets/solana"),
      ]);

      if (!btcResponse.ok || !solResponse.ok) {
        throw new Error("CoinCap API error");
      }

      const btcData = await btcResponse.json();
      const solData = await solResponse.json();

      // CoinCap provides prices in USD, convert to EUR (approximate rate: 1 EUR = 1.09 USD)
      const usdToEur = 0.92;

      return {
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
    } catch (coinCapError) {
      console.error("All crypto APIs failed:", coinCapError);
      return {
        success: false,
        error: "Unable to fetch crypto prices (APIs unavailable)",
      };
    }
  }
}

async function testExtensions(browser: Browser): Promise<ExtensionResult[]> {
  const extensions = [
    {
      name: "YouTube Only First Video",
      extensionId: "nehhphibaeodomkkffididpjmlcigbdp",
    },
    // Add more extensions here
  ];

  const results: ExtensionResult[] = [];

  for (const ext of extensions) {
    try {
      const result = await testExtensionFunctional(browser, ext);
      results.push(result);
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

async function testExtensionFunctional(
  browser: Browser,
  extension: { name: string; extensionId: string }
): Promise<ExtensionResult> {
  let page: Page | null = null;

  try {
    console.log(`Testing extension: ${extension.name}...`);

    // Check if extension is available on Web Store
    page = await browser.newPage();
    await page.goto(
      `https://chromewebstore.google.com/detail/${extension.extensionId}`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );

    const storeInfo = await page.evaluate(() => {
      const notFound = document.body.textContent?.includes("Item not found");
      const removed = document.body.textContent?.includes("removed");
      const available = !notFound && !removed;

      // Try to extract user count
      const userCountRegex = /(\d+[\d,]*)\s+users?/i;
      const match = document.body.textContent?.match(userCountRegex);
      const users = match ? match[1] : null;

      return { available, users };
    });

    await page.close();
    page = null;

    if (!storeInfo.available) {
      return {
        ...extension,
        success: false,
        available: false,
        error: "Extension not found or removed from Web Store",
      };
    }

    // For YouTube Only First Video, perform functional test
    // Note: This only works in local environment with non-headless browser
    const isLocal = !process.env.AWS_LAMBDA_FUNCTION_VERSION;
    let functionalTestPassed = false;

    if (isLocal && extension.extensionId === "nehhphibaeodomkkffididpjmlcigbdp") {
      // Import and run the specific test
      const { testYouTubeOnlyFirstVideoExtension } = await import(
        "./test-youtube-extension"
      );

      try {
        const testResult = await testYouTubeOnlyFirstVideoExtension();
        functionalTestPassed = testResult.success;
      } catch (error) {
        console.warn("Functional test skipped:", error);
      }
    }

    return {
      ...extension,
      success: true,
      available: true,
      functionalTest: functionalTestPassed,
    };
  } catch (error) {
    console.error(`Extension test failed for ${extension.name}:`, error);
    return {
      ...extension,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (page && !page.isClosed()) await page.close();
  }
}
