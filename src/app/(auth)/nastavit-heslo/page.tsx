"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function NastavitHesloPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/prihlasit?error=odkaz");
        return;
      }
      setReady(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) {
      toast.error("Heslo musí mít alespoň 8 znaků");
      return;
    }
    if (password !== confirm) {
      toast.error("Hesla se neshodují");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      toast.error(error.message ?? "Nepodařilo se nastavit heslo");
      return;
    }

    toast.success("Heslo bylo nastaveno");
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <AppLogo size="lg" />
          </div>
          <h1 className="text-xl font-semibold text-primary">Nastavení hesla</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Zvolte heslo pro přístup do aplikace Ensana.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nové heslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="pl-9"
                  required
                  placeholder="Min. 8 znaků"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Potvrzení hesla</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="pl-9"
                  required
                  placeholder="Zopakujte heslo"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uložit heslo a pokračovat
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
