import { deleteRecord } from './src/airtable';
import { validateBasicAuth, sendUnauthorizedResponse } from './src/auth';

interface DeleteRequest {
  recordId: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
  details?: string;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    const response: DeleteResponse = {
      success: false,
      error: 'Method not allowed'
    };
    return res.status(405).json(response);
  }

  // Validate Basic Auth
  const authResult = validateBasicAuth(req.headers.authorization);
  if (!authResult.authenticated) {
    return sendUnauthorizedResponse(res, authResult.error);
  }

  try {
    const body: DeleteRequest = req.body;

    if (!body.recordId) {
      const response: DeleteResponse = {
        success: false,
        error: 'Missing recordId'
      };
      return res.status(400).json(response);
    }

    await deleteRecord(body.recordId);

    const response: DeleteResponse = {
      success: true
    };
    return res.status(200).json(response);

  } catch (error) {
    console.error('Delete API error:', error);
    const response: DeleteResponse = {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    return res.status(500).json(response);
  }
}