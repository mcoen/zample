import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "zample_session";
const SESSION_USER_COOKIE = "zample_user";

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icons") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";
  const isLogoutRoute = pathname === "/logout";
  const hasSession =
    request.cookies.get(SESSION_COOKIE)?.value === "active" &&
    Boolean(request.cookies.get(SESSION_USER_COOKIE)?.value);

  if (pathname === "/") {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = hasSession ? "/launches" : "/login";
    targetUrl.search = "";
    return NextResponse.redirect(targetUrl);
  }

  if (!hasSession && !isLoginPage && !isLogoutRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
