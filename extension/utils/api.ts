const BACKEND_URL = 'https://airtable-extension-martriays-projects.vercel.app';

// Basic Auth credentials - these should be set as environment variables during build
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || '';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || '';

/**
 * Creates Basic Auth header for API requests
 */
const getAuthHeaders = (): Record<string, string> => {
  if (!BASIC_AUTH_USERNAME || !BASIC_AUTH_PASSWORD) {
    console.warn('Basic Auth credentials not configured');
    return {};
  }
  const credentials = btoa(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`);
  return {
    Authorization: `Basic ${credentials}`,
  };
};

export interface SaveRequest {
  url: string;
  title: string;
  tags: string[];
  source: 'Extension' | 'iOS Shortcut';
  forceUpdate?: boolean;
  recordId?: string | null;
}

export interface SaveResponse {
  duplicate: boolean;
  id?: string;
  existingId?: string;
  existingData?: {
    title: string;
    tags: string[];
  };
  error?: string;
}

export interface CheckRequest {
  url: string;
}

export interface CheckResponse {
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
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
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
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
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
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const getTags = async (): Promise<string[]> => {
  // Try to get cached tags first
  const cachedTags = localStorage.getItem('airtable-extension-tags');
  const cacheTimestamp = localStorage.getItem('airtable-extension-tags-timestamp');

  // Use cache if it's less than 1 hour old
  if (cachedTags && cacheTimestamp) {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (parseInt(cacheTimestamp, 10) > oneHourAgo) {
      console.log('🚀 Using cached tags (fast path)');
      return JSON.parse(cachedTags);
    }
  }

  console.log('📡 Fetching fresh tags from API (slow path)');
  const response = await fetch(`${BACKEND_URL}/api/tags`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    // If API fails, return cached tags if available
    if (cachedTags) {
      console.log('⚠️ API failed, using stale cached tags');
      return JSON.parse(cachedTags);
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: TagsResponse = await response.json();
  const tags = data.tags || [];

  // Cache the results
  localStorage.setItem('airtable-extension-tags', JSON.stringify(tags));
  localStorage.setItem('airtable-extension-tags-timestamp', Date.now().toString());

  return tags;
};

export const checkUrl = async (url: string): Promise<CheckResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export interface DeleteResponse {
  success: boolean;
  error?: string;
  details?: string;
}

export interface MarkDoneResponse {
  success: boolean;
  recordId?: string;
  doneDate?: string;
  error?: string;
  details?: string;
}

export interface MarkNextResponse {
  success: boolean;
  recordId?: string;
  status?: string;
  error?: string;
  details?: string;
}

export interface MarkTodoResponse {
  success: boolean;
  recordId?: string;
  status?: string;
  error?: string;
  details?: string;
}

export const deleteEntry = async (recordId: string): Promise<DeleteResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ recordId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: DeleteResponse = await response.json();
  return data;
};

export const markAsDone = async (recordId: string): Promise<MarkDoneResponse> => {
  // Generate user's local date in YYYY-MM-DD format
  const today = new Date();
  const userLocalDate = today.getFullYear()
    + '-' + String(today.getMonth() + 1).padStart(2, '0')
    + '-' + String(today.getDate()).padStart(2, '0');

  const response = await fetch(`${BACKEND_URL}/api/mark-done`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      recordId,
      doneDate: userLocalDate,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: MarkDoneResponse = await response.json();
  return data;
};

export const markAsNext = async (recordId: string): Promise<MarkNextResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/mark-next`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ recordId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: MarkNextResponse = await response.json();
  return data;
};

export const markAsTodo = async (recordId: string): Promise<MarkTodoResponse> => {
  const response = await fetch(`${BACKEND_URL}/api/mark-todo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ recordId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: MarkTodoResponse = await response.json();
  return data;
};
