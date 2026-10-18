import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  normalizeHost,
  getBrandByHost,
  DEFAULT_BRAND,
  type BrandConfig,
} from './config';

describe('normalizeHost', () => {
  it('strips port and protocol from host', () => {
    expect(normalizeHost('crm.example.com:3000')).toBe('crm.example.com');
    expect(normalizeHost('https://wa.splence.in/dashboard')).toBe('wa.splence.in');
    expect(normalizeHost('HTTP://SUB.DOMAIN.COM:8080/')).toBe('sub.domain.com');
  });

  it('handles empty or null hosts', () => {
    expect(normalizeHost('')).toBe('');
    expect(normalizeHost(null)).toBe('');
    expect(normalizeHost(undefined)).toBe('');
  });
});

describe('getBrandByHost', () => {
  const originalEnv = process.env.WHITE_LABEL_BRANDS;

  beforeEach(() => {
    delete process.env.WHITE_LABEL_BRANDS;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.WHITE_LABEL_BRANDS = originalEnv;
    } else {
      delete process.env.WHITE_LABEL_BRANDS;
    }
  });

  it('returns DEFAULT_BRAND for default domains or null', () => {
    expect(getBrandByHost(null)).toEqual(DEFAULT_BRAND);
    expect(getBrandByHost('wa.splence.in')).toEqual(DEFAULT_BRAND);
    expect(getBrandByHost('localhost:3000')).toEqual(DEFAULT_BRAND);
    expect(getBrandByHost('127.0.0.1:8080')).toEqual(DEFAULT_BRAND);
  });

  it('returns DEFAULT_BRAND for unknown domain when no custom brand is registered', () => {
    expect(getBrandByHost('unknown-domain.com')).toEqual(DEFAULT_BRAND);
  });

  it('resolves custom brand from WHITE_LABEL_BRANDS env var', () => {
    const customBrand: BrandConfig = {
      id: 'friend-crm',
      name: 'Alpha WhatsApp CRM',
      shortName: 'Alpha CRM',
      description: 'Alpha WhatsApp marketing suite',
      domains: ['crm.alphadomain.com', 'wa.alphadomain.com'],
      logoUrl: '',
      supportEmail: 'contact@alphadomain.com',
    };

    process.env.WHITE_LABEL_BRANDS = JSON.stringify([customBrand]);

    const result = getBrandByHost('crm.alphadomain.com:443');
    expect(result.id).toBe('friend-crm');
    expect(result.name).toBe('Alpha WhatsApp CRM');
    expect(result.shortName).toBe('Alpha CRM');
    expect(result.supportEmail).toBe('contact@alphadomain.com');

    // Also handles secondary domain in domains array
    const altResult = getBrandByHost('wa.alphadomain.com');
    expect(altResult.id).toBe('friend-crm');

    // Other domains still fall back to default
    expect(getBrandByHost('wa.splence.in')).toEqual(DEFAULT_BRAND);
  });

  it('handles malformed WHITE_LABEL_BRANDS JSON gracefully', () => {
    process.env.WHITE_LABEL_BRANDS = '{ invalid json';
    expect(getBrandByHost('crm.anywhere.com')).toEqual(DEFAULT_BRAND);
  });
});
