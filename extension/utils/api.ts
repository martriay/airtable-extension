const BACKEND_URL = 'https://airtable-extension-martriays-projects.vercel.app';

// Basic Auth credentials - these should be set as environment variables during build
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || '';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || '';

/**
 * Creates Basic Auth header for API requests
 */
const getAuthHeaders = (): Record<string, string> => {
  if (!BASIC_AUTH_USERNAME || !BASIC_AUTH_PASSWORD) {
    console.warn('Basic Auth credentials not configured - using demo mode');
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

  const result: SaveResponse = await response.json();

  // Write-through: keep the autocomplete cache fresh without a refetch.
  if (data.tags?.length) {
    try {
      mergeTagsIntoCache(data.tags);
    } catch (err) {
      console.error('Failed to merge tags into cache:', err);
    }
  }

  return result;
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

const TAGS_CACHE_KEY = 'airtable-extension-tags';
const TAGS_TIMESTAMP_KEY = 'airtable-extension-tags-timestamp';
const TAGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const writeTagsCache = (tags: string[]): void => {
  localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags));
  localStorage.setItem(TAGS_TIMESTAMP_KEY, Date.now().toString());
};

const readTagsCache = (): string[] | null => {
  const cached = localStorage.getItem(TAGS_CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
};

const fetchTagsFromApi = async (): Promise<string[] | null> => {
  const authHeaders = getAuthHeaders();
  if (!authHeaders.Authorization) return null;

  try {
    const response = await fetch(`${BACKEND_URL}/api/tags`, { headers: { ...authHeaders } });
    if (!response.ok) return null;
    const data: TagsResponse = await response.json();
    return data.tags || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return null;
  }
};

const DEMO_TAGS = ['technology', 'programming', 'web', 'design', 'tutorial', 'article', 'video', 'tool'];

// Stale-while-revalidate: if a cache exists, return it synchronously and
// refresh in the background regardless of age. The popup never waits on
// /api/tags after the very first successful fetch.
export const getTags = async (): Promise<string[]> => {
  const cached = readTagsCache();
  const cacheTimestamp = localStorage.getItem(TAGS_TIMESTAMP_KEY);
  const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp, 10) : Infinity;

  if (cached) {
    // Fire-and-forget background refresh
    fetchTagsFromApi().then((fresh) => {
      if (fresh) writeTagsCache(fresh);
    });

    // Stale-but-usable: return immediately for any cache, log if past TTL
    if (cacheAge > TAGS_CACHE_TTL_MS) {
      console.log('⚠️ Returning stale cache while revalidating');
    } else {
      console.log('🚀 Using cached tags (fast path)');
    }
    return cached;
  }

  // No cache — must fetch synchronously
  const fresh = await fetchTagsFromApi();
  if (fresh) {
    writeTagsCache(fresh);
    return fresh;
  }

  // No cache, fetch failed (or no auth) — fall back to demo tags
  console.log('🚧 Falling back to demo tags');
  writeTagsCache(DEMO_TAGS);
  return DEMO_TAGS;
};

// Write-through: merge tags the user just saved into the cache so they're
// immediately suggestible without a /api/tags round-trip.
export const mergeTagsIntoCache = (newTags: string[]): void => {
  const existing = readTagsCache() ?? [];
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  const additions = newTags
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (additions.length > 0) {
    writeTagsCache([...existing, ...additions]);
  }
};

export const checkUrl = async (url: string): Promise<CheckResponse> => {
  // Check if we have auth credentials
  const authHeaders = getAuthHeaders();
  if (!authHeaders.Authorization) {
    console.log('🚧 Demo mode: No auth credentials, returning mock response');
    return {
      exists: false,
      canonicalUrl: url,
    };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('🚧 Auth failed, returning mock response');
        return {
          exists: false,
          canonicalUrl: url,
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking URL:', error);
    // Return mock response as fallback
    return {
      exists: false,
      canonicalUrl: url,
    };
  }
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
  const userLocalDate = `${today.getFullYear()
  }-${String(today.getMonth() + 1).padStart(2, '0')
  }-${String(today.getDate()).padStart(2, '0')}`;

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
