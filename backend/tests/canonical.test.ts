import { describe, it, expect } from 'vitest';
import { canonicalize } from '../src/canonical';

describe('canonicalize', () => {
  it('should normalize scheme and host to lowercase', async () => {
    const result = await canonicalize('HTTPS://EXAMPLE.COM/Path');
    expect(result.canonical).toBe('https://example.com/Path');
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should remove trailing slash from path', async () => {
    const result = await canonicalize('https://example.com/path/');
    expect(result.canonical).toBe('https://example.com/path');
  });

  it('should keep root path slash', async () => {
    const result = await canonicalize('https://example.com/');
    expect(result.canonical).toBe('https://example.com/');
  });

  it('should remove UTM parameters', async () => {
    const result = await canonicalize('https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=test');
    expect(result.canonical).toBe('https://example.com/');
  });

  it('should remove click tracking parameters', async () => {
    const result = await canonicalize('https://example.com?gclid=123&fbclid=456&yclid=789');
    expect(result.canonical).toBe('https://example.com/');
  });

  it('should remove MailChimp and other tracking parameters', async () => {
    const result = await canonicalize('https://example.com?mc_cid=test&spm=123&gbraid=abc');
    expect(result.canonical).toBe('https://example.com/');
  });

  it('should remove Vero and referral parameters', async () => {
    const result = await canonicalize('https://example.com?vero_conv=1&ref=twitter&ref_src=social');
    expect(result.canonical).toBe('https://example.com/');
  });

  it('should preserve non-tracking parameters', async () => {
    const result = await canonicalize('https://example.com?page=1&sort=name&utm_source=test');
    expect(result.canonical).toBe('https://example.com/?page=1&sort=name');
  });

  it('should handle complex URLs with all transformations', async () => {
    const input = 'HTTPS://EXAMPLE.COM/Path/?utm_source=google&page=1&gclid=123&sort=date&mc_cid=test';
    const result = await canonicalize(input);
    expect(result.canonical).toBe('https://example.com/Path?page=1&sort=date');
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should throw error for invalid URLs', async () => {
    await expect(canonicalize('not-a-url')).rejects.toThrow('Invalid URL');
  });
}); 