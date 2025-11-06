import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const signInRoutes = ["/sign-in", "/sign-up", "/verify-2fa", "/reset-password"];

export function proxy(request: NextRequest) {
    const sessionCookie = getSessionCookie(request);

    const isSignInRoute = signInRoutes.includes(request.nextUrl.pathname);

    if(isSignInRoute && !sessionCookie) {
        return NextResponse.next();
    }

    if(!isSignInRoute && !sessionCookie) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    if(isSignInRoute || request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard/server', request.url))
    }

    return NextResponse.next();
  }
   
  export const config = {
    matcher: ["/((?!.*\\..*|_next|api/auth).*)", "/", "/trpc(.*)"],
  }