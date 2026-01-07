import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

// Only protect /admin pages, excluding API routes
export const config = {
  matcher: [
    "/admin/:path*",
  ],
};
