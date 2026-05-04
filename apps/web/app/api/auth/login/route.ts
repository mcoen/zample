import { NextRequest, NextResponse } from "next/server";
import {
  authenticateSeedUser,
  encodeSessionUser,
  SESSION_COOKIE_NAME,
  SESSION_USER_COOKIE_NAME
} from "@/lib/auth";

function sanitizeNextPath(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname === "/logout") {
    return "/launches";
  }

  return pathname;
}

function buildLoginRedirect(request: NextRequest, errorCode: "missing_credentials" | "invalid_credentials", nextPath: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", errorCode);
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
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

  const targetUrl = new URL(nextPath, request.url);
  const response = NextResponse.redirect(targetUrl);

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
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
