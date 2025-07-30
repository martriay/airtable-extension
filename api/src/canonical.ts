/**
 * URL canonicalization utilities for deduplication
 */

/**
 * Canonicalizes a URL by normalizing scheme/host and removing tracking parameters
 * @param raw - The raw URL string to canonicalize
 * @returns Object with canonical URL and its SHA256 hash
 */
export async function canonicalize(raw: string): Promise<{ canonical: string; hash: string }> {
  try {
    const url = new URL(raw);
    
    // 1. Lower-case scheme and host
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    
    // 2. Remove tracking parameters
    const paramsToRemove = [
      // UTM parameters
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
      
      // Click tracking
      'gclid', 'fbclid', 'yclid', 'irclickid',
      
      // MailChimp
      'mc_cid', 'mc_eid',
      
      // Other tracking
      'spm', 'gbraid', 'wbraid',
      
      // Vero email tracking
      'vero_conv', 'vero_id',
      
      // Referral tracking
      'ref', 'ref_src', 'ref_url',
      
      // YouTube-specific parameters
      'list',           // Playlist ID
      'index',          // Playlist index
      't',              // Time parameter (e.g., t=123s)
      'start',          // Start time
      'end',            // End time
      'feature',        // YouTube feature tracking
      'app',            // App parameter
      'si',             // YouTube tracking parameter
      'pp',             // YouTube tracking parameter
      'ab_channel',     // Channel name parameter
      'source',         // Source parameter
      'kw',             // Keyword parameter
      'gws_rd',         // Google Web Search redirect
      'ei',             // Event ID
      'ved',            // Google tracking
      'usg',            // Google tracking
      'sa',             // Google search parameter
      'rlz',            // Client ID
      'biw',            // Browser width
      'bih'             // Browser height
    ];
    
    // Remove matching parameters (including wildcard patterns)
    const searchParams = new URLSearchParams(url.search);
    const keysToDelete: string[] = [];
    
    for (const key of searchParams.keys()) {
      // Check exact matches
      if (paramsToRemove.includes(key)) {
        keysToDelete.push(key);
        continue;
      }
      
      // Check wildcard patterns
      if (key.startsWith('utm_') || 
          key.startsWith('mc_') || 
          key.startsWith('vero_') || 
          key.startsWith('ref_')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => searchParams.delete(key));
    url.search = searchParams.toString();
    
    // 3. Drop trailing slash from pathname (but keep for root path "/")
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    
    const canonical = url.toString();
    
    // 4. Generate SHA256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(canonical);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { canonical, hash };
    
  } catch (error) {
    throw new Error(`Invalid URL: ${raw}`);
  }
} 