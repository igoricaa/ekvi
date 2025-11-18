import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify-2fa",
  "/reset-password",
  "/verify-email",
];

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.includes(pathname);

  if (isPublicRoute && !sessionCookie) {
    return NextResponse.next();
  }

  if (!(isPublicRoute || sessionCookie)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (pathname === "/" && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard/server", request.url));
  }

  // if (sessionCookie && (isPublicRoute || pathname === "/")) {
  //   return NextResponse.redirect(new URL("/onboarding", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next|api/auth).*)", "/", "/trpc(.*)"],
};
