import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Pages under /admin need a logged-in admin. (API routes and the page layout check the role again on the server.)
// With ADMIN_REQUIRE_2FA=1, an admin without two-factor login can only open the security page, to set it up.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (token?.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
    if (process.env.ADMIN_REQUIRE_2FA === "1" && !token.tf && !req.nextUrl.pathname.startsWith("/admin/security"))
      return NextResponse.redirect(new URL("/admin/security", req.url));
  },
  {
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ token }) => !!token },
  }
);

export const config = { matcher: ["/admin/:path*"] };
