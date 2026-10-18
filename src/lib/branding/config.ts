/**
 * Multi-Tenant White-Label Brand Configuration
 *
 * Allows Waplence to be hosted dynamically across custom domains
 * (e.g. friend's or reseller's domain) with customized branding, titles,
 * logos, and support details while maintaining a single shared codebase
 * and strictly isolated tenant data via Supabase RLS.
 */

export interface BrandConfig {
  /** Unique brand identifier (slug) */
  id: string;
  /** Full brand name (e.g., "Waplence by Splence") */
  name: string;
  /** Short brand name used for compact UI badges and titles (e.g., "Waplence") */
  shortName: string;
  /** Tagline or description shown in meta tags and headers */
  description: string;
  /** Domain hostnames mapped to this brand (e.g., ["crm.partner.com"]) */
  domains: string[];
  /** Optional image URL or public path for the brand logo. If undefined, an SVG badge is generated */
  logoUrl?: string;
  /** Optional custom favicon URL */
  faviconUrl?: string;
  /** Optional support contact email */
  supportEmail?: string;
  /** Optional support contact phone or WhatsApp */
  supportPhone?: string;
  /** Whether to show a subtle "Powered by Waplence" badge (default: false) */
  showPoweredBy?: boolean;
}

/**
 * Default flagship brand (Splence)
 */
export const DEFAULT_BRAND: BrandConfig = {
  id: 'splence',
  name: 'Waplence by Splence',
  shortName: 'Waplence',
  description: 'Waplence by Splence — WhatsApp CRM and Marketing Platform.',
  domains: ['wa.splence.in', 'localhost', '127.0.0.1'],
  logoUrl: '/logo.png',
  faviconUrl: '/logo.png',
  supportEmail: 'support@splence.in',
  showPoweredBy: false,
};

/**
 * Built-in registered partner brands.
 * You can add your friend's domain here, or configure it via the
 * WHITE_LABEL_BRANDS environment variable in Vercel.
 */
export const REGISTERED_BRANDS: BrandConfig[] = [
  // Example partner template (ready to customize with your friend's domain):
  // {
  //   id: 'partner-crm',
  //   name: 'Partner WhatsApp CRM',
  //   shortName: 'PartnerCRM',
  //   description: 'Omnichannel WhatsApp CRM & Automation Suite.',
  //   domains: ['crm.partnerdomain.com'],
  //   logoUrl: '', // Leave empty if no logo yet; dynamic SVG badge will be rendered
  //   supportEmail: 'support@partnerdomain.com',
  //   showPoweredBy: false,
  // }
];

/**
 * Cleans and normalizes a host string by stripping ports and protocol.
 * e.g., "crm.domain.com:3000" -> "crm.domain.com"
 */
export function normalizeHost(host?: string | null): string {
  if (!host) return '';
  return host
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .split(':')[0]
    .split('/')[0];
}

/**
 * Parses dynamic white-label brand definitions from the WHITE_LABEL_BRANDS
 * environment variable if present. Allows adding new partner domains in Vercel
 * without any code redeployments or commits.
 */
export function getEnvBrands(): BrandConfig[] {
  const envRaw = process.env.WHITE_LABEL_BRANDS;
  if (!envRaw) return [];

  try {
    const parsed = JSON.parse(envRaw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (b) => b && typeof b.id === 'string' && Array.isArray(b.domains)
      );
    }
  } catch (err) {
    console.warn('[branding] Failed to parse WHITE_LABEL_BRANDS environment variable:', err);
  }

  return [];
}

/**
 * Resolves the active BrandConfig based on the incoming request hostname.
 * Checks:
 *  1. Dynamic env var WHITE_LABEL_BRANDS
 *  2. In-code REGISTERED_BRANDS
 *  3. Default fallback (Splence / Waplence)
 */
export function getBrandByHost(host?: string | null): BrandConfig {
  const cleanHost = normalizeHost(host);
  if (!cleanHost) {
    return DEFAULT_BRAND;
  }

  // 1. Check dynamic environment variable brands
  const envBrands = getEnvBrands();
  for (const brand of envBrands) {
    if (brand.domains.some((d) => normalizeHost(d) === cleanHost)) {
      return brand;
    }
  }

  // 2. Check registered brands in codebase
  for (const brand of REGISTERED_BRANDS) {
    if (brand.domains.some((d) => normalizeHost(d) === cleanHost)) {
      return brand;
    }
  }

  // 3. Fallback to default brand
  return DEFAULT_BRAND;
}

/**
 * Helper to check if a brand is the primary default platform brand
 */
export function isDefaultBrand(brandOrId: BrandConfig | string): boolean {
  const id = typeof brandOrId === 'string' ? brandOrId : brandOrId?.id;
  return id === DEFAULT_BRAND.id;
}
