import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/save';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../src/canonical', () => ({
  canonicalize: vi.fn().mockResolvedValue({
    canonical: 'https://example.com/test',
    hash: 'testhash123'
  })
}));

vi.mock('../src/airtable', () => ({
  findByHash: vi.fn(),
  create: vi.fn()
}));

import { findByHash, create } from '../src/airtable';

describe('save API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error during tests to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should handle OPTIONS request', async () => {
    const request = new Request('http://localhost/save', { method: 'OPTIONS' });
    const response = await handler(request);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should return 405 for non-POST methods', async () => {
    const request = new Request('http://localhost/save', { method: 'GET' });
    const response = await handler(request);
    
    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data.error).toBe('Method not allowed');
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request('http://localhost/save', {
      method: 'POST',
      body: 'invalid json'
    });
    const response = await handler(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid JSON');
  });

  it('should return 400 for missing required fields', async () => {
    const request = new Request('http://localhost/save', {
      method: 'POST',
      body: JSON.stringify({ url: 'test' })
    });
    const response = await handler(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 200 for duplicate URLs', async () => {
    vi.mocked(findByHash).mockResolvedValue({ id: 'existing123', fields: {} as any });
    
    const request = new Request('http://localhost/save', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/test',
        title: 'Test Page',
        tags: ['tag1'],
        source: 'Extension'
      })
    });
    
    const response = await handler(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.duplicate).toBe(true);
    expect(data.existingId).toBe('existing123');
  });

  it('should return 201 for new URLs', async () => {
    vi.mocked(findByHash).mockResolvedValue(null);
    vi.mocked(create).mockResolvedValue({ id: 'new123', fields: {} as any });
    
    const request = new Request('http://localhost/save', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/new',
        title: 'New Page',
        tags: ['tag1', 'tag2'],
        source: 'Extension'
      })
    });
    
    const response = await handler(request);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.duplicate).toBe(false);
    expect(data.id).toBe('new123');
    
    expect(create).toHaveBeenCalledWith({
      Name: 'New Page',
      Link: 'https://example.com/test',
      Tags: ['tag1', 'tag2']
    });
  });

  it('should return 502 for service errors', async () => {
    vi.mocked(findByHash).mockRejectedValue(new Error('Airtable error'));
    
    const request = new Request('http://localhost/save', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/error',
        title: 'Error Page',
        tags: [],
        source: 'Extension'
      })
    });
    
    const response = await handler(request);
    expect(response.status).toBe(502);
    
    const data = await response.json();
    expect(data.error).toBe('Service unavailable');
  });
}); 