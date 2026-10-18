"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useBrand } from "@/lib/branding/brand-context";
import type { BrandConfig } from "@/lib/branding/config";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  brand?: BrandConfig;
  priority?: boolean;
}

const SIZE_MAP = {
  sm: {
    container: "h-8 w-8 rounded-lg text-xs",
    iconSize: "h-4 w-4",
    px: 32,
  },
  md: {
    container: "h-10 w-10 rounded-xl text-sm",
    iconSize: "h-5 w-5",
    px: 40,
  },
  lg: {
    container: "h-14 w-14 rounded-2xl text-base",
    iconSize: "h-7 w-7",
    px: 56,
  },
  xl: {
    container: "h-16 w-16 rounded-2xl text-lg",
    iconSize: "h-8 w-8",
    px: 64,
  },
};

/**
 * Extracts 1-2 initials from a brand name (e.g. "Alpha CRM" -> "AC", "Waplence" -> "W")
 */
function getBrandInitials(name: string): string {
  if (!name) return "W";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function BrandLogo({
  size = "md",
  className,
  brand: propBrand,
  priority = false,
}: BrandLogoProps) {
  const { brand: contextBrand } = useBrand();
  const brand = propBrand || contextBrand;
  const [hasError, setHasError] = useState(false);

  const dim = SIZE_MAP[size] || SIZE_MAP.md;
  const hasValidLogoUrl = Boolean(brand?.logoUrl && brand.logoUrl.trim() !== "");

  // If a logo URL is configured and hasn't errored, display the image
  if (hasValidLogoUrl && !hasError) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          dim.container,
          className
        )}
      >
        <Image
          src={brand.logoUrl!}
          alt={brand.name || "Brand logo"}
          width={dim.px}
          height={dim.px}
          className="h-full w-full object-contain"
          priority={priority}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Fallback: Elegant modern SVG monogram badge (used when no logo file/URL is available yet)
  const initials = getBrandInitials(brand?.shortName || brand?.name || "CRM");

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center font-bold tracking-tight select-none",
        "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-primary/25",
        "border border-emerald-500/30 text-emerald-400 shadow-sm",
        dim.container,
        className
      )}
      title={brand?.name}
    >
      <span>{initials}</span>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background border border-border">
        <MessageSquare className="h-2 w-2 text-primary fill-primary" />
      </div>
    </div>
  );
}
