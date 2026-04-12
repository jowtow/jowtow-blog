import { NextRequest } from "next/server";

type AuthSuccess = {
  ok: true;
  email: string;
};

type AuthFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export type AdminAuthResult = AuthSuccess | AuthFailure;

type NetlifyIdentityUser = {
  email?: string;
};

function canBypassAdminAuth(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.DEV_ADMIN_BYPASS !== "false";
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function getAdminAllowlist(): string[] {
  const entries = [process.env.ADMIN_ALLOWED_EMAILS, process.env.ADMIN_EMAIL]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(entries));
}

function getIdentityUserEndpoint(request: NextRequest): string {
  const configuredOrigin = process.env.SITE_URL || process.env.URL;
  const origin = configuredOrigin || request.nextUrl.origin;

  return new URL("/.netlify/identity/user", origin).toString();
}

function tokenLooksExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return true;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(
      Buffer.from(padded, "base64").toString("utf-8"),
    ) as {
      exp?: number;
    };

    if (typeof payload.exp !== "number") {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch {
    return true;
  }
}

export async function verifyAdminAuth(
  request: NextRequest,
): Promise<AdminAuthResult> {
  if (canBypassAdminAuth()) {
    const email = (process.env.ADMIN_EMAIL || "local-dev-admin@localhost")
      .trim()
      .toLowerCase();
    return { ok: true, email };
  }

  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized - Missing bearer token",
    };
  }

  if (tokenLooksExpired(token)) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized - Invalid or expired token",
    };
  }

  const allowlist = getAdminAllowlist();
  if (allowlist.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden - Admin email allowlist is not configured",
    };
  }

  try {
    const identityUserEndpoint = getIdentityUserEndpoint(request);
    const response = await fetch(identityUserEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 401,
        error: "Unauthorized - Invalid identity token",
      };
    }

    const identityUser = (await response.json()) as NetlifyIdentityUser;
    const email = identityUser.email?.trim().toLowerCase();

    if (!email) {
      return {
        ok: false,
        status: 401,
        error: "Unauthorized - Email missing from identity profile",
      };
    }

    if (!allowlist.includes(email)) {
      return {
        ok: false,
        status: 403,
        error: "Forbidden - User is not an admin",
      };
    }

    return { ok: true, email };
  } catch (error) {
    console.error("Admin auth verification error:", error);
    return {
      ok: false,
      status: 401,
      error: "Unauthorized - Unable to verify identity token",
    };
  }
}
