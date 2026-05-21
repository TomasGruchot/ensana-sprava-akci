import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/user-avatar";
import { cn } from "@/lib/utils";

type UserAvatarSize = "sm" | "default" | "lg";

const SIZE_CLASS: Record<UserAvatarSize, string> = {
  sm: "size-8",
  default: "size-9",
  lg: "size-11",
};

interface UserAvatarProps {
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  className?: string;
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "default",
  className,
}: UserAvatarProps) {
  const initials = getUserInitials(name, email);

  return (
    <Avatar size={size} className={cn(SIZE_CLASS[size], "shrink-0", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name?.trim() || email} /> : null}
      <AvatarFallback className="bg-zinc-100 text-zinc-700 text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
