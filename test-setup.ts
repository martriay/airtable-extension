import { beforeAll } from 'vitest';
import { webcrypto } from 'crypto';

beforeAll(() => {
  // Mock process.env
  global.process = {
    env: {
      AIRTABLE_PAT: 'test-pat',
      AIRTABLE_BASE_ID: 'test-base',
      AIRTABLE_TABLE: 'Units'
    }
  } as any;

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