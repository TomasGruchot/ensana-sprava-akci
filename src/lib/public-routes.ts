/** Stránky dostupné bez přihlášení (pouze čtení). */
const PUBLIC_READ_PATHS = ["/", "/hotely", "/akce"] as const;

/** Přihlášení a registrace (aktivace účtu) — bez kontroly session. */
const AUTH_EXEMPT_PATHS = ["/prihlasit", "/registrace"] as const;

export function isPublicReadPath(pathname: string): boolean {
  return (PUBLIC_READ_PATHS as readonly string[]).includes(pathname);
}

export function isAuthExemptPath(pathname: string): boolean {
  return AUTH_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
}

export function isAuthRequiredPath(pathname: string): boolean {
  return !isAuthExemptPath(pathname) && !isPublicReadPath(pathname);
}
