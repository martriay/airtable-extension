import { canonicalize } from './src/canonical';
import { findByUrl, create, update, detectContentType } from './src/airtable';
import { validateBasicAuth, sendUnauthorizedResponse } from './src/auth';

interface SaveRequest {
  url: string;
  title: string;
  tags: string[];
  source: 'Extension' | 'iOS Shortcut';
  forceUpdate?: boolean;
  recordId?: string;
}

interface SaveResponse {
  duplicate: boolean;
  id?: string;
  existingId?: string;
  existingData?: {
    title: string;
    tags: string[];
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
    const body: SaveRequest = req.body;

    if (!body.url || !body.title || !Array.isArray(body.tags)) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'url, title, and tags array are required' 
      });
    }

    const { canonical, hash } = await canonicalize(body.url);

    // Check for existing record with same canonical URL
    const existingRecord = await findByUrl(canonical);
    if (existingRecord) {
      // If forceUpdate is true, update the existing record
      if (body.forceUpdate && body.recordId === existingRecord.id) {
        const contentType = detectContentType(canonical);
        const updatedRecord = await update(existingRecord.id, {
          Name: body.title,
          Link: canonical,
          Tags: body.tags,
          Status: 'To do',
          Type: contentType
        });
        
        const response: SaveResponse = {
          duplicate: true,
          existingId: updatedRecord.id
        };
        return res.status(200).json(response);
      }
      
      // Return existing data without updating yet
      const response: SaveResponse = {
        duplicate: true,
        existingId: existingRecord.id,
        existingData: {
          title: existingRecord.fields.Name,
          tags: existingRecord.fields.Tags || []
        }
      };
      return res.status(200).json(response);
    }

    // Detect content type and set status
    const contentType = detectContentType(canonical);
    
    // Create record with Name, Link, Tags, Status, and Type fields
    const newRecord = await create({
      Name: body.title,
      Link: canonical,
      Tags: body.tags,
      Status: 'To do',
      Type: contentType
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