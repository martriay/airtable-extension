import { canonicalize } from './src/canonical';
import { findByUrl } from './src/airtable';
import { validateBasicAuth, sendUnauthorizedResponse } from './src/auth';

interface CheckRequest {
  url: string;
}

interface CheckResponse {
  exists: boolean;
  recordId?: string;
  canonicalUrl?: string;
  existingData?: {
    title: string;
    tags: string[];
    status?: string;
    doneDate?: string;
  };
  error?: string;
  details?: string;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate Basic Auth
  const authResult = validateBasicAuth(req.headers.authorization);
  if (!authResult.authenticated) {
    return sendUnauthorizedResponse(res, authResult.error);
  }

  try {
    const body: CheckRequest = req.body;

    if (!body.url) {
      return res.status(400).json({ 
        error: 'Missing required field', 
        details: 'url is required' 
      });
    }

    const { canonical } = await canonicalize(body.url);

    // Check for existing record with same canonical URL
    const existingRecord = await findByUrl(canonical);
    
    if (existingRecord) {
      const response: CheckResponse = {
        exists: true,
        recordId: existingRecord.id,
        canonicalUrl: canonical,
        existingData: {
          title: existingRecord.fields.Name,
          tags: existingRecord.fields.Tags || [],
          status: existingRecord.fields.Status,
          doneDate: existingRecord.fields['Done date']
        }
      };
      return res.status(200).json(response);
    }

    // URL doesn't exist
    const response: CheckResponse = {
      exists: false,
      canonicalUrl: canonical
    };
    return res.status(200).json(response);

  } catch (error) {
    console.error('Check API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(502).json({ 
      error: 'Service unavailable', 
      details: errorMessage 
    });
  }
}