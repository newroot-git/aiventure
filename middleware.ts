import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Pages that don't require a session. Everything else redirects to /signin
// unless the visitor has a guest (av_uid) cookie. APIs handle their own identity.
const PUBLIC = new Set(["/", "/welcome", "/signin", "/onboard", "/style-test", "/styles", "/screens"]);
function isPublic(path: string): boolean {
  if (PUBLIC.has(path)) return true;
  return (
    path.startsWith("/api") ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/img") ||
    path.includes(".")
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const hasGuest = !!req.cookies.get("av_uid")?.value;
  if (!user && !hasGuest && !isPublic(path)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
