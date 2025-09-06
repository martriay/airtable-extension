/**
 * Basic Authentication middleware for API endpoints
 */

const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME;
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;

interface AuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Validates Basic Auth credentials from request headers
 * @param authHeader The Authorization header value
 * @returns Authentication result
 */
export function validateBasicAuth(authHeader: string | null): AuthResult {
  // Check if environment variables are configured
  if (!BASIC_AUTH_USERNAME || !BASIC_AUTH_PASSWORD) {
    console.error('Basic Auth environment variables not configured');
    return {
      authenticated: false,
      error: 'Server configuration error'
    };
  }

  // Check if Authorization header is present
  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Missing Authorization header'
    };
  }

  // Check if it's Basic Auth
  if (!authHeader.startsWith('Basic ')) {
    return {
      authenticated: false,
      error: 'Invalid authentication method. Expected Basic Auth'
    };
  }

  try {
    // Extract and decode credentials
    const base64Credentials = authHeader.slice(6); // Remove "Basic " prefix
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':', 2);

    // Validate credentials
    if (username === BASIC_AUTH_USERNAME && password === BASIC_AUTH_PASSWORD) {
      return { authenticated: true };
    } else {
      return {
        authenticated: false,
        error: 'Invalid credentials'
      };
    }
  } catch (error) {
    return {
      authenticated: false,
      error: 'Invalid Authorization header format'
    };
  }
}

/**
 * Creates a 401 Unauthorized response
 * @param error Optional error message
 * @returns Response object
 */
export function createUnauthorizedResponse(error: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Unauthorized', 
      details: error 
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Basic realm="API"'
      }
    }
  );
}

/**
 * Creates a 401 Unauthorized response for legacy endpoints (Node.js style)
 * @param res Response object
 * @param error Optional error message
 */
export function sendUnauthorizedResponse(res: any, error: string = 'Unauthorized'): void {
  res.setHeader('WWW-Authenticate', 'Basic realm="API"');
  res.status(401).json({ 
    error: 'Unauthorized', 
    details: error 
  });
}
