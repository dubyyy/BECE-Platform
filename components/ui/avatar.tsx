"use client"

import * as React from "react"
import Image from "next/image"
import type { ImageProps } from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
Avatar.displayName = "Avatar"

type AvatarImageProps = Omit<
  ImageProps,
  "src" | "alt" | "fill" | "width" | "height" | "sizes" | "className" | "onError" | "onLoadingComplete"
> & {
  src?: string;
  alt?: string;
  className?: string;
  sizes?: string;
  unoptimized?: boolean;
};

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, sizes = "40px", unoptimized = true, ...props }, _ref) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    if (!src || hasError) {
      return null;
    }

    return (
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        className={cn(
          "aspect-square h-full w-full",
          imageLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onError={() => setHasError(true)}
        onLoadingComplete={() => setImageLoaded(true)}
        {...props}
      />
    );
  }
)
AvatarImage.displayName = "AvatarImage"

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
