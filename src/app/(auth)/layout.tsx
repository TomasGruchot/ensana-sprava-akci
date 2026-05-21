import { redirect } from "next/navigation";

import { getSession } from "@/lib/actions/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const user = await getSession();
    if (user) redirect("/");
  } catch {
    /* Supabase env chybí — zobrazit přihlášení */
  }

  return children;
}
