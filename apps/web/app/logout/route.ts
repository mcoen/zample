import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);

  response.cookies.set("zample_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0
  });

  return response;
}
