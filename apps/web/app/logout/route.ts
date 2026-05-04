import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_USER_COOKIE_NAME } from "@/lib/auth";

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

function buildAbsoluteLoginUrl(request: Request) {
  const url = new URL(request.url);
  const host =
    normalizePublicHost(firstHeaderValue(request.headers.get("x-forwarded-host"))) ||
    normalizePublicHost(firstHeaderValue(request.headers.get("host")));
  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  if (host) {
    url.host = host;
  }

  if (proto) {
    url.protocol = proto.endsWith(":") ? proto : `${proto}:`;
  }

  url.pathname = "/login";
  url.search = "";
  return url;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(buildAbsoluteLoginUrl(request));

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0
  });
  response.cookies.set(SESSION_USER_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0
  });

  return response;
}
