declare const process: {
  env: {
    AIRTABLE_PAT: string;
    AIRTABLE_BASE_ID: string;
    AIRTABLE_TABLE?: string;
  };
};

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
    Status?: string;
    Type?: string;
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
}

interface CreateRecord {
  Name: string;
  Link?: string;
  Tags?: string[];
  Status?: string;
  Type?: string;
}

// Function to detect content type based on URL
export function detectContentType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Twitter/X links
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'Twitter thread';
  }
  
  // Reddit links
  if (hostname.includes('reddit.com')) {
    return 'Reddit thread';
  }
  
  // Video platforms
  if (hostname.includes('youtube.com') || 
      hostname.includes('youtu.be') || 
      hostname.includes('vimeo.com') || 
      hostname.includes('twitch.tv') || 
      hostname.includes('tiktok.com')) {
    return 'Video';
  }
  
  // Default to article
  return 'Article';
}

export async function findByUrl(canonicalUrl: string): Promise<AirtableRecord | null> {
  // Check if environment variables are set
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable environment variables: AIRTABLE_PAT or AIRTABLE_BASE_ID');
  }
  
  const filterFormula = `{Link}="${canonicalUrl}"`;
  const url = `${BASE_URL}?filterByFormula=${encodeURIComponent(filterFormula)}`;
  
  console.log('Checking for duplicate URL:', canonicalUrl);
  
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

async function processTagsForCreation(requestedTags: string[]): Promise<string[]> {
  // Clean and prepare tags for creation - typecast will handle new option creation
  try {
    // Simply clean up the tags (trim whitespace, remove empty strings)
    const cleanedTags = requestedTags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter(tag => tag.length <= 100); // Reasonable length limit
    
    console.log('Processing tags for creation:', requestedTags, '-> cleaned:', cleanedTags);
    
    return cleanedTags;
  } catch (error) {
    console.error('Error processing tags, using original tags:', error);
    return requestedTags; // Fallback to original tags
  }
}

export async function create(record: CreateRecord): Promise<AirtableRecord> {
  // Process tags for creation (clean but don't filter)
  if (record.Tags && Array.isArray(record.Tags)) {
    record.Tags = await processTagsForCreation(record.Tags);
  }
  
  const body = {
    fields: record,
    typecast: true  // Enable automatic creation of new multiple-select options
  };
  
  console.log('Creating record with typecast enabled:', JSON.stringify(record, null, 2));
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Airtable API error response:', errorText);
    
    // If Status or Type fields cause issues, try without them
    if (response.status === 422 && (record.Status || record.Type)) {
      console.log('Retrying without Status/Type fields...');
      const { Status, Type, ...recordWithoutStatusType } = record;
      
      const retryBody = {
        fields: recordWithoutStatusType
      };
      
      const retryResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(retryBody)
      });
      
      if (retryResponse.ok) {
        console.log('Successfully created record without Status/Type fields');
        const retryData: AirtableRecord = await retryResponse.json();
        return retryData;
      }
    }
    
    throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data: AirtableRecord = await response.json();
  return data;
} 
export async function update(recordId: string, fields: Partial<CreateRecord>): Promise<AirtableRecord> {
  // Process tags for creation (clean but don't filter)
  if (fields.Tags && Array.isArray(fields.Tags)) {
    fields.Tags = await processTagsForCreation(fields.Tags);
  }
  
  const body = {
    fields: fields,
    typecast: true  // Enable automatic creation of new multiple-select options
  };
  
  const response = await fetch(`${BASE_URL}/${recordId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Airtable API error response:', errorText);
    
    // If Status or Type fields cause issues, try without them
    if (response.status === 422 && (fields.Status || fields.Type)) {
      console.log('Retrying update without Status/Type fields...');
      const { Status, Type, ...fieldsWithoutStatusType } = fields;
      
      const retryBody = {
        fields: fieldsWithoutStatusType
      };
      
      const retryResponse = await fetch(`${BASE_URL}/${recordId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(retryBody)
      });
      
      if (retryResponse.ok) {
        console.log('Successfully updated record without Status/Type fields');
        const retryData: AirtableRecord = await retryResponse.json();
        return retryData;
      }
    }
    
    throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data: AirtableRecord = await response.json();
  return data;
}

export async function deleteRecord(recordId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${recordId}`, {
    method: "DELETE",
    headers
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Airtable delete error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
  }
}
