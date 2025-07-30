import { canonicalize } from '../src/canonical';
import { findByHash, create } from '../src/airtable';

interface SaveRequest {
  url: string;
  title: string;
  tags: string[];
  source: 'Extension' | 'iOS Shortcut';
}

interface SaveResponse {
  duplicate: boolean;
  id?: string;
  existingId?: string;
  error?: string;
  details?: string;
}

export default async function handler(request: Request): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    let body: SaveRequest;
    
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON', 
          details: 'Request body must be valid JSON' 
        }),
        { status: 400, headers }
      );
    }

    if (!body.url || !body.title || !Array.isArray(body.tags)) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          details: 'url, title, and tags array are required' 
        }),
        { status: 400, headers }
      );
    }

    const { canonical, hash } = await canonicalize(body.url);

    const existingRecord = await findByHash(hash);
    if (existingRecord) {
      const response: SaveResponse = {
        duplicate: true,
        existingId: existingRecord.id
      };
      return new Response(JSON.stringify(response), { status: 200, headers });
    }

    const newRecord = await create({
      Name: body.title,
      Link: canonical,
      Tags: body.tags
    });

    const response: SaveResponse = {
      duplicate: false,
      id: newRecord.id
    };

    return new Response(JSON.stringify(response), { status: 201, headers });

  } catch (error) {
    console.error('Save API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'Service unavailable', 
        details: errorMessage 
      }),
      { status: 502, headers }
    );
  }
} 