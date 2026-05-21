/** Veřejná URL aplikace pro redirecty v e-mailech Supabase Auth. */
export function getAppOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Callback po kliknutí na odkaz v e-mailu (pozvánka / reset hesla). */
export function buildAuthCallbackUrl(nextPath = "/nastavit-heslo"): string {
  const url = new URL("/auth/callback", getAppOrigin());
  url.searchParams.set("next", nextPath);
  return url.toString();
}
