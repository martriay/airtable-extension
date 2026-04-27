// Strip common site/platform suffixes from page titles.
// Mirror of api/src/title.ts so the extension can pre-fill the form
// with the cleaned title (the backend re-applies it for parity with iOS).

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
  /\s*[-–—|]\s*The\s+\w+$/i,

  // Generic domain.com suffix
  /\s*[-–—|]\s*\w+\.com$/i,
];

function cleanTitle(title: string): string {
  if (!title) return title;

  let cleaned = title.trim();
  for (const pattern of SUFFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  cleaned = cleaned.replace(/\s*[-–—|]\s*$/, '').trim();

  return cleaned || title;
}

export default cleanTitle;
