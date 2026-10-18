"use client";

import React, { createContext, useContext, useState } from "react";
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
  const [brand] = useState<BrandConfig>(() => {
    if (initialBrand) return initialBrand;
    if (typeof window !== "undefined") {
      return getBrandByHost(window.location.hostname);
    }
    return DEFAULT_BRAND;
  });

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
