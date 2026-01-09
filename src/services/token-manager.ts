import { chromium, Browser } from "playwright";
import { config } from "../config/index.js";
import { TokenInfo } from "../types/index.js";

const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

export class TokenManager {
  private tokenInfo: TokenInfo | null = null;
  private browser: Browser | null = null;
  private refreshPromise: Promise<string> | null = null;

  async getToken(): Promise<string> {
    if (config.bvc.token) {
      this.tokenInfo = {
        token: config.bvc.token,
        source: "env",
      };
      return config.bvc.token;
    }

    if (this.tokenInfo && this.isTokenValid()) {
      return this.tokenInfo.token;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    return this.refreshToken();
  }

  private isTokenValid(): boolean {
    if (!this.tokenInfo) return false;
    if (!this.tokenInfo.expiresAt) return true;
    return Date.now() < this.tokenInfo.expiresAt;
  }

  async refreshToken(): Promise<string> {
    if (!config.playwright.enabled) {
      throw new Error(
        "Could not obtain token: Playwright disabled and no BVC_TOKEN configured",
      );
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string> {
    try {
      console.log("[TokenManager] Fetching token with Playwright...");

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: config.playwright.headless,
        });
      }

      const context = await this.browser.newContext({
        userAgent: USER_AGENT,
      });

      const page = await context.newPage();

      let capturedToken: string | null = null;

      const apiHost = new URL(config.bvc.restApiUrl).host;

      page.on("request", (request) => {
        const url = request.url();
        try {
          const requestHost = new URL(url).host;
          if (requestHost === apiHost && url.includes("/market-information")) {
            const headers = request.headers();
            if (headers.token) {
              capturedToken = headers.token;
              console.log("[TokenManager] Token captured from request headers");
            }
          }
        } catch {
          return;
        }
      });

      const targetUrl = `${config.bvc.webUrl}/mercado-local-en-linea?tab=renta-variable_mercado-global-colombiano`;

      await page.goto(targetUrl, {
        waitUntil: "networkidle",
        timeout: config.playwright.timeoutMs,
      });

      await page.waitForTimeout(2000);

      if (!capturedToken) {
        throw new Error("Could not capture token from requests");
      }

      this.tokenInfo = {
        token: capturedToken,
        source: "playwright",
        expiresAt: Date.now() + TOKEN_EXPIRATION_MS,
      };

      await context.close();

      console.log("[TokenManager] Token obtained successfully");
      return capturedToken;
    } catch (error) {
      console.error("[TokenManager] Error fetching token:", error);
      throw new Error(
        `Could not obtain token: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async invalidateToken(): Promise<void> {
    console.log("[TokenManager] Invalidating token...");
    this.tokenInfo = null;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const tokenManager = new TokenManager();
