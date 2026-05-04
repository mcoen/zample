import { NextRequest, NextResponse } from "next/server";
import {
  authenticateSeedUser,
  encodeSessionUser,
  SESSION_COOKIE_NAME,
  SESSION_USER_COOKIE_NAME
} from "@/lib/auth";

function firstHeaderValue(value: string | null) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function normalizePublicHost(host: string) {
  const isLocalHost =
    host.startsWith("localhost") ||
    host.startsWith("127.") ||
    host.startsWith("[::1]");

  if (!isLocalHost && /:(3000|4000)$/.test(host)) {
    return host.replace(/:(3000|4000)$/, "");
  }

  return host;
}

function getPublicOrigin(request: NextRequest) {
  const referer = firstHeaderValue(request.headers.get("referer"));
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore invalid referer
    }
  }

  const origin = firstHeaderValue(request.headers.get("origin"));
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // ignore invalid origin
    }
  }

  const host =
    normalizePublicHost(firstHeaderValue(request.headers.get("x-forwarded-host"))) ||
    normalizePublicHost(firstHeaderValue(request.headers.get("host")));
  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto")) || "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}

function buildAbsoluteUrl(request: NextRequest, pathname: string, search?: URLSearchParams) {
  const targetUrl = new URL(getPublicOrigin(request));

  targetUrl.pathname = pathname;
  targetUrl.search = search ? search.toString() : "";
  return targetUrl;
}

function sanitizeNextPath(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname === "/logout") {
    return "/launches";
  }

  return pathname;
}

function buildLoginRedirect(
  request: NextRequest,
  errorCode: "missing_credentials" | "invalid_credentials",
  nextPath: string
) {
  const search = new URLSearchParams();
  search.set("error", errorCode);
  search.set("next", nextPath);
  return NextResponse.redirect(buildAbsoluteUrl(request, "/login", search));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const nextPath = sanitizeNextPath(String(formData.get("next") || "/launches"));

  if (!email || !password) {
    return buildLoginRedirect(request, "missing_credentials", nextPath);
  }

  const sessionUser = authenticateSeedUser(email, password);

  if (!sessionUser) {
    return buildLoginRedirect(request, "invalid_credentials", nextPath);
  }

  const response = NextResponse.redirect(buildAbsoluteUrl(request, nextPath));

  response.cookies.set(SESSION_COOKIE_NAME, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12
  });

  response.cookies.set(SESSION_USER_COOKIE_NAME, encodeSessionUser(sessionUser), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(buildAbsoluteUrl(request, "/login"));
}
