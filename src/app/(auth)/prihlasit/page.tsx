"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { Loader2, Lock, Mail } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/actions/auth";
import type { ActionState } from "@/types";

const initialState: ActionState = {};

export default function PrihlasitPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <AppLogo size="lg" />
          </div>
          <h1 className="text-xl font-semibold text-primary">Ensana</h1>
          <p className="text-sm text-zinc-500 mt-1">Správa akcí — přihlášení</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jmeno@ensana.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
                Heslo
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {state.error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {state.error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Přihlásit se
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
