import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_USER_COOKIE_NAME } from "@/lib/auth";

function firstHeaderValue(value: string | null) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function buildAbsoluteLoginUrl(request: Request) {
  const url = new URL(request.url);
  const host = firstHeaderValue(request.headers.get("x-forwarded-host")) || firstHeaderValue(request.headers.get("host"));
  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const port = firstHeaderValue(request.headers.get("x-forwarded-port"));

  if (host) {
    const includePort = Boolean(port) && port !== "80" && port !== "443" && !host.includes(":");
    url.host = includePort ? `${host}:${port}` : host;
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
