"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-base font-semibold text-zinc-900">
        Stránku se nepodařilo načíst
      </h2>
      <p className="max-w-md text-sm text-zinc-500">
        Na serveru nastala chyba. Zkuste obnovit stránku. Pokud problém přetrvá,
        ověřte na Vercelu proměnné prostředí (DATABASE_URL, Supabase klíče) a
        spusťte nový deploy.
      </p>
      {error.digest ? (
        <p className="text-xs text-zinc-400 font-mono">Kód: {error.digest}</p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Zkusit znovu
      </Button>
    </div>
  );
}
