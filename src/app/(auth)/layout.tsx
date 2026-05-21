import { redirect } from "next/navigation";

import { getSession } from "@/lib/actions/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (user) redirect("/");

  return children;
}
