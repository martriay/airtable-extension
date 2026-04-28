import { beforeAll } from 'vitest';
import { webcrypto } from 'crypto';

beforeAll(() => {
  // Set env vars without replacing the process object — vitest's worker pool
  // relies on the real process (exit, signals, EventEmitter) to terminate
  // cleanly, and wholesale-replacing it hangs tests in non-TTY runs (CI).
  process.env.AIRTABLE_PAT = 'test-pat';
  process.env.AIRTABLE_BASE_ID = 'test-base';
  process.env.AIRTABLE_TABLE = 'Units';

  // Mock crypto for edge runtime compatibility
  if (!global.crypto) {
    global.crypto = webcrypto as any;
  }

  // Mock TextEncoder/TextDecoder
  if (!global.TextEncoder) {
    global.TextEncoder = TextEncoder;
  }
  if (!global.TextDecoder) {
    global.TextDecoder = TextDecoder;
  }
}); 