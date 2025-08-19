import { markAsDone } from './src/airtable';

interface MarkDoneRequest {
  recordId: string;
}

interface MarkDoneResponse {
  success: boolean;
  recordId?: string;
  doneDate?: string;
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
    const body: MarkDoneRequest = req.body;

    if (!body.recordId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'recordId is required' 
      });
    }

    const updatedRecord = await markAsDone(body.recordId);
    
    const response: MarkDoneResponse = {
      success: true,
      recordId: updatedRecord.id,
      doneDate: updatedRecord.fields['Done date']
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Mark Done API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(502).json({ 
      error: 'Service unavailable', 
      details: errorMessage 
    });
  }
}