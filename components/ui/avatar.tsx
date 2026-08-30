"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt = "", ...props }, ref) => {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
      props.src ? "loading" : "error",
    );

    // No image (or failed load) renders nothing, so the fallback shows.
    if (!props.src || status === "error") return null;

    return (
      <img
        ref={ref}
        alt={alt}
        {...props}
        className={cn(
          "aspect-square h-full w-full object-cover transition-opacity",
          status === "loaded" ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

// Avatar fallback chips get a stable "random" color: hashed from the user id,
// so each person keeps the same color everywhere. Emerald/rose are excluded —
// they are reserved for money amounts.
const FALLBACK_COLORS = [
  "bg-orange-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-cyan-600",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

function colorForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { seed?: string }
>(({ className, seed, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute inset-0 flex h-full w-full items-center justify-center rounded-full text-sm font-semibold",
      seed
        ? cn("text-white", colorForSeed(seed))
        : "bg-muted text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };