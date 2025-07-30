# Save to Airtable

A browser extension and iOS shortcut for quickly saving web pages to an Airtable database. Captures page title, URL, and tags with automatic deduplication through URL canonicalization.

## Features

- **Browser Extension**: Chrome MV3 extension with popup interface
- **iOS Shortcut**: Native iOS share extension integration
- **URL Canonicalization**: Removes tracking parameters and normalizes URLs
- **Deduplication**: SHA256 hashing prevents duplicate entries
- **Tag Management**: Multi-select tags with 24h caching
- **Auto-save**: Debounced saving with undo functionality

## Repository Structure

```
├── backend/
│   ├── api/
│   │   └── save.ts              # Vercel Edge API endpoint
│   ├── src/
│   │   ├── canonical.ts         # URL canonicalization utilities
│   │   └── airtable.ts          # Airtable API helpers
│   └── tests/                   # Backend test suites
├── extension/
│   ├── manifest.json            # Chrome extension manifest
│   ├── popup.tsx                # React popup interface
│   ├── background.ts            # MV3 service worker
│   └── utils/
│       └── api.ts               # API client utilities
├── shortcut/
│   └── SaveToAirtable.shortcut  # iOS Shortcut file
└── .github/workflows/
    └── ci.yml                   # CI/CD pipeline
```

## Environment Variables

Create a `.env` file with the following variables:

```bash
AIRTABLE_PAT=your_personal_access_token
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE=Units
```

## Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- Airtable account with Units table

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build extension
pnpm --filter extension build
```

### Airtable Schema

The `Units` table should have these fields:
- `Name` (Single line text) - Page title
- `Link` (URL) - Canonical URL
- `Tags` (Multiple select) - Tag array
- `hash` (Single line text) - SHA256 hash for deduplication

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test suite
pnpm test backend/tests/canonical.test.ts
```

### Test Coverage

- **Canonical Tests**: 8 URL transformation scenarios
- **Save API Tests**: Complete endpoint testing with mocked Airtable
- **Edge Runtime**: Tests run in Vercel Edge environment

## Deployment

### Vercel (Backend)

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Set environment variables: `vercel env add`
4. Deploy: `vercel --prod`

### Chrome Extension

1. Build extension: `pnpm --filter extension build`
2. Open Chrome Extensions (`chrome://extensions/`)
3. Enable Developer Mode
4. Load unpacked extension from `extension/dist/`

### iOS Shortcut

1. Open `shortcut/SaveToAirtable.shortcut`
2. Update backend URL in shortcut configuration
3. Install on iOS device via AirDrop or iCloud

## CI/CD

GitHub Actions automatically:
1. Runs linting and tests
2. Builds extension
3. Deploys backend to Vercel on push to `main`

Required GitHub secrets:
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_TOKEN`

## API Endpoints

### POST /save

Saves a new page or returns existing record if duplicate.

**Request:**
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "tags": ["tag1", "tag2"],
  "source": "Extension"
}
```

**Response (New):**
```json
{
  "duplicate": false,
  "id": "recXXXXXXXXXXXXXX"
}
```

**Response (Duplicate):**
```json
{
  "duplicate": true,
  "existingId": "recXXXXXXXXXXXXXX"
}
```

## License

MIT 