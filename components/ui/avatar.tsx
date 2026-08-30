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

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 flex h-full w-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };