import { type NextRequest, NextResponse } from "next/server";

import { isAuthExemptPath, isPublicReadPath } from "@/lib/public-routes";

const SESSION_COOKIE = "ensana_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Přihlášený uživatel na login/registraci → přesměruj do aplikace
  if (hasSession && (pathname === "/prihlasit" || pathname === "/registrace")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isPublic = isAuthExemptPath(pathname) || isPublicReadPath(pathname);

  // Nepřihlášený uživatel na chráněné route → přesměruj na login
  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/prihlasit", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
