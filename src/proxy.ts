import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(req: NextRequest, event: NextFetchEvent) {
  try {
    // If Clerk env vars are missing in a Vercel environment, avoid global 500.
    if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      return NextResponse.next();
    }

    // Initialize lazily so any Clerk init errors are catchable here.
    const clerkProxy = clerkMiddleware();
    return clerkProxy(req, event);
  } catch (error) {
    console.error("Clerk proxy invocation failed:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
