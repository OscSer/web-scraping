import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { TokenInfo } from "../types/index.js";

const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;
const BVC_CREDENTIALS = {
  username: "bvclient",
  password: "Pl4t@formaDig1t@L",
  secretKey: "d1g1t4l-m4rk3t-2021-gr4b1l1ty-6vc",
};
const AUTH_IP_ENDPOINT = "https://api-public.auth.bvc.com.co/public-ip";

export class TokenManager {
  private tokenInfo: TokenInfo | null = null;
  private refreshPromise: Promise<string> | null = null;
  private cachedIp: string | null = null;

  async getToken(): Promise<string> {
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

  private async fetchPublicIp(): Promise<string> {
    if (!globalThis.fetch) {
      throw new Error("Global fetch is not available in this runtime");
    }

    if (this.cachedIp) {
      return this.cachedIp;
    }

    try {
      const response = await fetch(AUTH_IP_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Failed to fetch IP: ${response.status}`);
      }

      const data = (await response.json()) as { client_ip: string };
      this.cachedIp = data.client_ip;
      console.log(`[TokenManager] Obtained public IP: ${this.cachedIp}`);
      return this.cachedIp;
    } catch (error) {
      console.error("[TokenManager] Error fetching public IP:", error);
      throw new Error(
        `Could not obtain public IP: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async performRefresh(): Promise<string> {
    try {
      console.log("[TokenManager] Generating new JWT token...");

      const ip = await this.fetchPublicIp();
      const timestamp = Date.now();

      const payload = {
        id: randomUUID(),
        username: BVC_CREDENTIALS.username,
        password: BVC_CREDENTIALS.password,
        ip,
        timestamp,
      };

      const token = jwt.sign(payload, BVC_CREDENTIALS.secretKey, {
        algorithm: "HS256",
        noTimestamp: true,
      });

      this.tokenInfo = {
        token,
        source: "http",
        expiresAt: Date.now() + TOKEN_EXPIRATION_MS,
      };

      console.log("[TokenManager] Token generated successfully");
      return token;
    } catch (error) {
      console.error("[TokenManager] Error generating token:", error);
      throw new Error(
        `Could not generate token: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async invalidateToken(): Promise<void> {
    console.log("[TokenManager] Invalidating token...");
    this.tokenInfo = null;
  }

  async cleanup(): Promise<void> {
    // No resources to cleanup
  }
}

export const tokenManager = new TokenManager();
