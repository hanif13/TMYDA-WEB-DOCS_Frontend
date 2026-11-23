import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Basic log to help debugging in the terminal
    // console.log("Middleware matched path:", req.nextUrl.pathname);
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    // same fallback as the auth route — a session signed with AUTH_SECRET must be readable here too,
    // otherwise every page bounces back to /login right after a successful sign-in
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|\\.well-known).*)",
  ],
};
