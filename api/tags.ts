import { getAllRecords } from './src/airtable';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching all records to extract tags...');
    
    // Get all records from Airtable
    const records = await getAllRecords();
    
    // Extract all unique tags from all records
    const allTags = new Set<string>();
    
    records.forEach(record => {
      const tags = record.fields.Tags;
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) {
            allTags.add(tag.trim().toLowerCase());
          }
        });
      }
    });

    // Convert to sorted array
    const uniqueTags = Array.from(allTags).sort();
    
    console.log(`Found ${uniqueTags.length} unique tags:`, uniqueTags);
    
    return res.status(200).json({
      tags: uniqueTags,
      count: uniqueTags.length
    });

  } catch (error) {
    console.error('Tags API error:', error);
    return res.status(502).json({
      error: 'Service unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 