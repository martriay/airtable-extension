const AIRTABLE_PAT = process.env.AIRTABLE_PAT as string;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID as string;
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'Units';

const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_PAT}`,
  'Content-Type': 'application/json'
};

interface AirtableRecord {
  id: string;
  fields: {
    Name: string;
    Link: string;
    Tags: string[];
    hash?: string;
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
}

interface CreateRecord {
  Name: string;
  Link: string;
  Tags: string[];
}

export async function findByHash(hash: string): Promise<AirtableRecord | null> {
  // Check if environment variables are set
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable environment variables: AIRTABLE_PAT or AIRTABLE_BASE_ID');
  }
  
  const filterFormula = `{hash}="${hash}"`;
  const url = `${BASE_URL}?filterByFormula=${encodeURIComponent(filterFormula)}`;
  
  console.log('Making Airtable request to:', url);
  console.log('Headers:', { ...headers, 'Authorization': 'Bearer [REDACTED]' });
  
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Airtable API error response:', errorText);
    throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data: AirtableResponse = await response.json();
  return data.records.length > 0 ? data.records[0] : null;
}

export async function getAllRecords(): Promise<AirtableRecord[]> {
  // Check if environment variables are set
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable environment variables: AIRTABLE_PAT or AIRTABLE_BASE_ID');
  }
  
  let allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  
  do {
    const url = offset ? `${BASE_URL}?offset=${offset}` : BASE_URL;
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error response:', errorText);
      throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data: AirtableResponse & { offset?: string } = await response.json();
    allRecords = allRecords.concat(data.records);
    offset = data.offset;
    
  } while (offset);
  
  return allRecords;
}

export async function create(record: CreateRecord): Promise<AirtableRecord> {
  const body = {
    fields: record
  };
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
  }
  
  const data: AirtableRecord = await response.json();
  return data;
} 