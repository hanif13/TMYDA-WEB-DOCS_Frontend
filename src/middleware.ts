import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect all routes except /login and static files
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
