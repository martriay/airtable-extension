import { canonicalize } from './src/canonical';
import { findByHash, create } from './src/airtable';

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

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: SaveRequest = req.body;

    if (!body.url || !body.title || !Array.isArray(body.tags)) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'url, title, and tags array are required' 
      });
    }

    const { canonical, hash } = await canonicalize(body.url);

    // Temporarily skip deduplication check until hash field is added to Airtable
    // const existingRecord = await findByHash(hash);
    // if (existingRecord) {
    //   const response: SaveResponse = {
    //     duplicate: true,
    //     existingId: existingRecord.id
    //   };
    //   return res.status(200).json(response);
    // }

    const newRecord = await create({
      Name: body.title,
      Link: canonical,
      Tags: body.tags
    });

    const response: SaveResponse = {
      duplicate: false,
      id: newRecord.id
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('Save API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(502).json({ 
      error: 'Service unavailable', 
      details: errorMessage 
    });
  }
} 