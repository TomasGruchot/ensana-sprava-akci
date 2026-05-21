import Image from "next/image";

import { APP_LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: 32,
  md: 48,
  lg: 64,
} as const;

export function AppLogo({ size = "sm", className }: AppLogoProps) {
  const px = SIZE[size];

  return (
    <Image
      src={APP_LOGO_SRC}
      alt="Ensana"
      width={px}
      height={px}
      className={cn("block shrink-0 object-contain object-center", className)}
      unoptimized
      priority={size !== "sm"}
    />
  );
}
