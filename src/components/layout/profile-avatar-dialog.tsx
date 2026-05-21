"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convertToWebP } from "@/lib/image-webp";
import { removeProfileAvatar, uploadProfileAvatar } from "@/lib/actions/profile";

interface ProfileAvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function ProfileAvatarDialog({
  open,
  onOpenChange,
  name,
  email,
  avatarUrl,
}: ProfileAvatarDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const displayUrl = previewUrl ?? avatarUrl;

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Vyberte obrázek (JPEG, PNG, WebP…)");
        return;
      }
      setUploading(true);
      try {
        const webpBlob = await convertToWebP(file);
        const preview = URL.createObjectURL(webpBlob);
        setPreviewUrl(preview);

        const fd = new FormData();
        fd.append("image", webpBlob, "avatar.webp");
        const result = await uploadProfileAvatar(fd);
        if (result.error) {
          toast.error(result.error);
          setPreviewUrl(null);
        } else {
          toast.success("Profilový obrázek byl uložen");
          setPreviewUrl(null);
          router.refresh();
          onOpenChange(false);
        }
      } catch {
        toast.error("Chyba při zpracování obrázku");
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [onOpenChange, router],
  );

  async function handleRemove() {
    setRemoving(true);
    const result = await removeProfileAvatar();
    if (result.success) {
      toast.success("Profilový obrázek byl odstraněn");
      setPreviewUrl(null);
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Odstranění selhalo");
    }
    setRemoving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Profilový obrázek</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            aria-label="Nahrát nový profilový obrázek"
          >
            <UserAvatar
              name={name}
              email={email}
              avatarUrl={displayUrl}
              size="lg"
              className="size-24 text-lg"
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-zinc-500 text-center">
            Klikněte na náhled nebo vyberte soubor. Doporučeno čtvercové foto, max. 5 MB.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploading || removing}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Nahrát obrázek
          </Button>
          {avatarUrl || previewUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={uploading || removing}
              onClick={() => void handleRemove()}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {removing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Odebrat
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
