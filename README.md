# Save to Airtable

A powerful Chrome extension for instantly saving web pages to Airtable with intelligent categorization, auto-save functionality, and smart duplicate prevention.

## ✨ Features

### 🚀 **Auto-Save Experience**
- **Instant Save**: Automatically saves the current page when extension opens
- **Smart Change Tracking**: Real-time detection of title, URL, and tag modifications
- **One-Click Updates**: Only shows update button when changes are detected
- **Visual Feedback**: Color-coded button states with emoji indicators

### 🧠 **Intelligent Content Detection**
- **Smart Type Classification**:
  - 🐦 **Twitter thread** for Twitter/X links
  - 🔴 **Reddit thread** for Reddit discussions  
  - 🎥 **Video** for YouTube, Vimeo, Twitch, TikTok
  - 📄 **Article** for everything else
- **Auto-Status Setting**: New entries automatically marked as "To do"
- **URL Canonicalization**: Removes tracking parameters and normalizes URLs

### 🏷️ **Advanced Tag Management**
- **Dynamic Suggestions**: Tag autocomplete from existing Airtable data
- **Typeahead Interface**: Smart filtering as you type
- **Multi-select Support**: Add multiple tags with comma separation
- **Real-time Sync**: Always up-to-date with your Airtable tags

### 🔄 **Robust Deduplication**
- **URL-based Prevention**: Prevents duplicate entries by canonical URL
- **Instant Detection**: Shows existing entries immediately
- **Update Workflow**: Seamlessly update existing records

### 🎨 **Beautiful Interface**
- **Responsive Design**: Clean, modern popup interface
- **Accessible Inputs**: Full-height textareas for long titles/URLs
- **Status Indicators**: Clear visual feedback for all operations
- **Development Tools**: Hot-reload dev server for rapid iteration

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
│   ├── dev.html                 # Development preview page
│   ├── background.ts            # Service worker
│   ├── manifest.json            # Extension manifest
│   ├── vite.config.ts           # Build configuration
│   ├── vite.dev.config.ts       # Development server config
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

# Start extension development server
cd extension && npm run dev

# Build extension for production
cd extension && npm run build

# Deploy backend to Vercel
vercel --prod
```

### 🔄 Development Workflow

```bash
# Extension development with hot reload
cd extension && npm run dev
# → Opens http://localhost:5173/dev.html

# Extension build for Chrome
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

### 🌐 Live Demo

You can test the extension development interface at:
```bash
cd extension && npm run dev
# Opens http://localhost:5173/dev.html
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