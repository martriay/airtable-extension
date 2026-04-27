// Strip common site/platform suffixes from page titles.
// Idempotent: cleaning an already-clean title is a no-op.
// Used by both the Chrome extension (for form pre-fill UX) and the
// /api/save endpoint (so iOS Shortcut payloads get the same treatment).

const SUFFIX_PATTERNS: RegExp[] = [
  // YouTube
  /\s*[-–—|]\s*YouTube$/i,
  /\s*[-–—|]\s*youtube\.com$/i,

  // Twitter / X
  /\s*[-–—|]\s*Twitter$/i,
  /\s*[-–—|]\s*X$/i,
  /\s*on\s+Twitter$/i,
  /\s*on\s+X$/i,

  // Reddit
  /\s*[-–—|]\s*Reddit$/i,
  /\s*[-–—|]\s*r\/\w+$/i,

  // LinkedIn
  /\s*[-–—|]\s*LinkedIn$/i,

  // Facebook
  /\s*[-–—|]\s*Facebook$/i,

  // Instagram
  /\s*[-–—|]\s*Instagram$/i,

  // TikTok
  /\s*[-–—|]\s*TikTok$/i,
  /\s*on\s+TikTok$/i,

  // Medium
  /\s*[-–—|]\s*Medium$/i,

  // Vimeo
  /\s*[-–—|]\s*Vimeo$/i,

  // Twitch
  /\s*[-–—|]\s*Twitch$/i,

  // GitHub
  /\s*[-–—|]\s*GitHub$/i,

  // Stack Overflow
  /\s*[-–—|]\s*Stack\s*Overflow$/i,

  // Wikipedia
  /\s*[-–—|]\s*Wikipedia$/i,

  // News sites
  /\s*[-–—|]\s*BBC$/i,
  /\s*[-–—|]\s*CNN$/i,
  /\s*[-–—|]\s*The\s+\w+$/i, // "The Guardian", "The Times", etc.

  // Generic domain.com suffix
  /\s*[-–—|]\s*\w+\.com$/i,
];

export function cleanTitle(title: string): string {
  if (!title) return title;

  let cleaned = title.trim();
  for (const pattern of SUFFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  // Drop any trailing separator left over after stripping
  cleaned = cleaned.replace(/\s*[-–—|]\s*$/, '').trim();

  // If we cleaned everything away, fall back to the original
  return cleaned || title;
}
