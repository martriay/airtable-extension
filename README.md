# Save to Airtable

A powerful Chrome extension for instantly saving web pages to Airtable with intelligent categorization, auto-save functionality, and smart duplicate prevention.

## Features

- Auto-saves page when extension opens
- Smart content type detection (Twitter, Reddit, Video, Article)
- URL-based deduplication prevents duplicates
- Dynamic tag suggestions from Airtable
- Real-time change tracking with update button
- Clean popup interface with visual feedback

## 📁 Repository Structure

```
├── api/                         # Vercel Serverless Functions
│   ├── save.ts                  # Main save endpoint with deduplication
│   ├── tags.ts                  # Dynamic tag suggestions endpoint
│   └── src/
│       ├── airtable.ts          # Airtable API helpers & type detection
│       └── canonical.ts         # URL canonicalization utilities
├── extension/                   # Chrome Extension (MV3)
│   ├── popup.tsx                # React popup with auto-save
│   ├── popup.html               # Extension popup entry point
│   ├── background.ts            # Service worker
│   ├── manifest.json            # Extension manifest
│   ├── vite.config.ts           # Build configuration
│   └── utils/
│       └── api.ts               # API client utilities
├── backend/                     # Legacy backend (tests only)
│   ├── src/                     # Shared utilities
│   └── tests/                   # Comprehensive test suites
└── .github/workflows/
    └── ci.yml                   # CI/CD pipeline
```

## 🔧 Environment Variables

Set these variables in your Vercel dashboard or `.env` file:

```bash
AIRTABLE_PAT=your_personal_access_token    # Airtable Personal Access Token
AIRTABLE_BASE_ID=your_base_id              # Your Airtable base ID
AIRTABLE_TABLE=Units                       # Table name (default: Units)
```

### 🎯 Getting Airtable Credentials

1. **Personal Access Token**: Go to [Airtable Developer Hub](https://airtable.com/create/tokens) → Create new token
2. **Base ID**: Found in your Airtable base URL: `https://airtable.com/{BASE_ID}/...`
3. **Table Name**: Usually "Units" or your preferred table name

## 🚀 Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- Airtable account with configured table

### Quick Start

```bash
# Install dependencies
pnpm install

# Build extension for production
cd extension && npm run build

# Deploy backend to Vercel
vercel --prod
```

### 🔄 Development Workflow

```bash
# Build extension for Chrome
cd extension && npm run build
# → Outputs to extension/dist/

# Backend testing
pnpm test
```

### 📊 Airtable Schema

Your Airtable table should have these fields:

| Field Name | Field Type | Description | Required |
|------------|------------|-------------|----------|
| `Name` | Single line text | Page title | ✅ |
| `Link` | URL | Canonical URL | ✅ |
| `Tags` | Multiple select | Content tags | ✅ |
| `Status` | Single select | Entry status | ✅ |
| `Type` | Single select | Content type | ✅ |

#### Required Single Select Options:

**Status field options:**
- `To do` (default for new entries)
- `In progress`
- `Done`

**Type field options:**
- `Twitter thread`
- `Reddit thread` 
- `Video`
- `Article`

The extension will automatically populate Status and Type based on the URL, and you can add any tags you want to the Tags field.

## 🧪 Testing

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
- **Deduplication Tests**: URL-based duplicate prevention
- **Type Detection Tests**: Smart content classification
- **Edge Runtime**: Tests run in Vercel Edge environment

## 🚀 Deployment

### Backend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add AIRTABLE_PAT
vercel env add AIRTABLE_BASE_ID
vercel env add AIRTABLE_TABLE
```

### Chrome Extension

```bash
# Build extension
cd extension && npm run build

# Load in Chrome:
# 1. Open chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select extension/dist/ folder
```

### 🌐 Testing

Test the extension by loading it in Chrome:
```bash
# 1. Build the extension
cd extension && npm run build

# 2. Load in Chrome at chrome://extensions/
# 3. Enable "Developer mode" and click "Load unpacked"
# 4. Select the extension/dist/ folder
```

## 📡 API Endpoints

### POST `/api/save`

Saves a new page with smart deduplication and type detection.

**Request:**
```json
{
  "url": "https://twitter.com/user/status/123",
  "title": "Amazing Twitter Thread",
  "tags": ["programming", "ai"],
  "source": "Extension"
}
```

**Response (New Entry):**
```json
{
  "duplicate": false,
  "id": "recXXXXXXXXXXXXXX"
}
```

**Response (Duplicate Found):**
```json
{
  "duplicate": true,
  "existingId": "recXXXXXXXXXXXXXX"
}
```

### GET `/api/tags`

Returns all unique tags from your Airtable for autocomplete.

**Response:**
```json
{
  "tags": ["programming", "design", "ai", "web"],
  "count": 4
}
```

## 🎯 User Experience

### Extension Workflow

1. **🔵 Open Extension** → Page auto-saves instantly
2. **✅ See "Saved" Status** → Green button confirms save
3. **📝 Edit Fields** → Button changes to "Update Changes" 
4. **🔄 Click Update** → Changes saved, returns to "Saved"

### Button States

| State | Color | Icon | Description |
|-------|-------|------|-------------|
| `Saving...` | Gray | ⏳ | Initial auto-save in progress |
| `✅ Saved` | Green | ✅ | No changes, record saved |
| `📝 Update Changes` | Orange | 📝 | Changes detected, ready to update |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT - see [LICENSE](LICENSE) file for details

---

**Built with ❤️ using React, TypeScript, Vite, and Vercel** 