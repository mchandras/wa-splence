"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_BRAND, getBrandByHost, isDefaultBrand, type BrandConfig } from "./config";

interface BrandContextType {
  brand: BrandConfig;
  isDefault: boolean;
}

const BrandContext = createContext<BrandContextType>({
  brand: DEFAULT_BRAND,
  isDefault: true,
});

export function BrandProvider({
  initialBrand,
  children,
}: {
  initialBrand?: BrandConfig;
  children: React.ReactNode;
}) {
  const [brand, setBrand] = useState<BrandConfig>(initialBrand || DEFAULT_BRAND);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname;
      const resolved = getBrandByHost(currentHost);
      // Update if host maps to a distinct brand from what was initially rendered
      if (resolved.id !== brand.id) {
        setBrand(resolved);
      }
    }
  }, [brand.id]);

  return (
    <BrandContext.Provider
      value={{
        brand,
        isDefault: isDefaultBrand(brand),
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

/**
 * Hook to access current brand information anywhere in the client component tree
 */
export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    return {
      brand: DEFAULT_BRAND,
      isDefault: true,
    };
  }
  return context;
}
