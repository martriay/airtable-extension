const BACKEND_URL = 'https://airtable-extension.vercel.app';

export interface SaveRequest {
  url: string;
  title: string;
  tags: string[];
  source: 'Extension' | 'iOS Shortcut';
}

export interface SaveResponse {
  duplicate: boolean;
  id?: string;
  existingId?: string;
  error?: string;
}

export interface CheckRequest {
  url: string;
}

export interface CheckResponse {
  exists: boolean;
  recordId?: string;
  existingData?: {
    title: string;
    tags: string[];
  };
  error?: string;
  details?: string;
}

export interface TagOption {
  id: string;
  name: string;
}

export interface TagsResponse {
  tags: string[];
  count: number;
}

export interface UnitFields {
  Name: string;
  Link: string;
  Tags: string[];
}

export const postSave = async (data: SaveRequest): Promise<SaveResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export const patchUnit = async (recordId: string, fields: UnitFields): Promise<void> => {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Units/${recordId}`;
  const response = await fetch(airtableUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const deleteUnit = async (recordId: string): Promise<void> => {
  const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Units/${recordId}`;
  const response = await fetch(airtableUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const getTags = async (): Promise<string[]> => {
  const response = await fetch(`${BACKEND_URL}/api/tags`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data: TagsResponse = await response.json();
  return data.tags || [];
};

export const checkUrl = async (url: string): Promise<CheckResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

export interface DeleteResponse {
  success: boolean;
  error?: string;
  details?: string;
}

export const deleteEntry = async (recordId: string): Promise<DeleteResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recordId }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data: DeleteResponse = await response.json();
  return data;
}; 