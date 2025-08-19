# Save to Airtable

A powerful Chrome extension for instantly saving web pages to Airtable with intelligent categorization, auto-save functionality, smart duplicate prevention, and comprehensive status management.

## Features

### 🚀 Core Functionality
- **Auto-save**: Page instantly saves when extension opens
- **Smart deduplication**: URL-based duplicate prevention
- **Content type detection**: Automatically categorizes Twitter, Reddit, Video, Article
- **Tag suggestions**: Dynamic autocomplete from your Airtable data
- **Real-time tracking**: Detects changes and shows update button

### ⚡ Status Management (v3.0)
- **Mark as Done**: One-click completion with automatic date stamping
- **Mark as Next**: Set items to "Next" status for prioritization  
- **Smart undo**: Click active status buttons to revert to "To do"
- **Visual feedback**: Action buttons show "turned on" states with colored backgrounds
- **Date formatting**: Colloquial display ("Done today", "Done on January 15th, 2025")

### 🎨 Enhanced UI/UX
- **Status display**: Main button shows current status instead of generic "Saved"
- **Action buttons**: Dedicated buttons for Done (✓), Next (▶️), and Delete (🗑️)
- **Button-only feedback**: No toast messages, all information through button states
- **Timezone-safe dates**: Prevents date shifting issues across timezones

## 📁 Repository Structure

```
├── api/                         # Vercel Serverless Functions
│   ├── save.ts                  # Main save endpoint with deduplication
│   ├── tags.ts                  # Dynamic tag suggestions endpoint
│   ├── check.ts                 # Check URL existence with status info
│   ├── delete.ts                # Delete records from Airtable
│   ├── mark-done.ts             # Mark items as done with date
│   ├── mark-next.ts             # Mark items as next, clear date
│   ├── mark-todo.ts             # Mark items as to do, clear date
│   └── src/
│       ├── airtable.ts          # Airtable API helpers & status management
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
| `Done date` | Date | Completion date | ⭐ **New in v3.0** |

#### Single Select Options:

**Status field options:**
- `To do` (default for new entries)
- `In progress`
- `Next` ⭐ **New in v3.0**
- `Done`

**Type field options:**
- `Twitter thread`
- `Reddit thread` 
- `Video`
- `Article`

#### 🆕 Setting up the Done date field:
1. In your Airtable base, click "+" to add a new field
2. **Field Name**: `Done date` (exact spelling with space)
3. **Field Type**: Select "Date"
4. **Format**: Choose "YYYY-MM-DD" (recommended) or "MM/DD/YYYY"
5. **Include Time**: Leave unchecked

The extension automatically populates Status, Type, and Done date based on your actions.

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
  "existingId": "recXXXXXXXXXXXXXX",
  "existingData": {
    "title": "Amazing Twitter Thread",
    "tags": ["programming", "ai"],
    "status": "To do",
    "doneDate": null
  }
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

### 🆕 Status Management Endpoints (v3.0)

### POST `/api/mark-done`

Marks an item as done with automatic date stamping.

**Request:**
```json
{
  "recordId": "recXXXXXXXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "recordId": "recXXXXXXXXXXXXXX",
  "doneDate": "2025-01-19"
}
```

### POST `/api/mark-next`

Marks an item as next and clears any completion date.

**Request:**
```json
{
  "recordId": "recXXXXXXXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "recordId": "recXXXXXXXXXXXXXX",
  "status": "Next"
}
```

### POST `/api/mark-todo`

Reverts an item to "To do" status and clears completion date.

**Request:**
```json
{
  "recordId": "recXXXXXXXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "recordId": "recXXXXXXXXXXXXXX",
  "status": "To do"
}
```

## 🎯 User Experience

### Extension Workflow

1. **🔵 Open Extension** → Page auto-saves instantly
2. **📊 See Status Display** → Main button shows current status
3. **📝 Edit Fields** → Button changes to "Update" 
4. **🔄 Click Update** → Changes saved, returns to status display
5. **⚡ Manage Status** → Use action buttons to change status

### 🎨 Interface Layout

```
┌─────────────────────────────────────────────────┐
│ Title: [Amazing Article Title................] │
│ URL:   [https://example.com/article..........] │
│ Tags:  [programming, web, tutorial...........] │
│                                                 │
│ [    Done today    ] [✓] [▶️] [🗑️]           │
│  Status Display     Done Next Delete            │
└─────────────────────────────────────────────────┘
```

### Button States & Colors

#### Main Button (Status Display)
| State | Color | Description |
|-------|-------|-------------|
| `Save to Airtable` | Blue | Ready to save new item |
| `Saving...` | Gray | Auto-save in progress |
| `Update` | Purple | Changes detected, ready to update |
| `Done today` | Gray | Completed today (non-clickable) |
| `Done on Jan 15th, 2025` | Gray | Completed on specific date |
| `Next` | Gray | Marked as next priority |
| `To do` | Gray | Standard to-do status |

#### Action Buttons (Always Available When Saved)
| Button | Inactive State | Active State | Action |
|--------|---------------|--------------|---------|
| **✓ Done** | White bg, Green border | Light green bg, Dark green text | Toggle Done ↔ To do |
| **▶️ Next** | White bg, Blue border | Light blue bg, Dark blue text | Toggle Next ↔ To do |
| **🗑️ Delete** | White bg, Red border | - | Delete from Airtable |

### 🔄 Status Workflow

```
To do ←→ Next
  ↑       ↑
  └─ Done ┘
```

- **Mark as Done**: Sets status to "Done" + today's date
- **Mark as Next**: Sets status to "Next" + clears date  
- **Undo (click active button)**: Reverts to "To do" + clears date
- **Toggle behavior**: Active buttons are clickable to undo their status

### 📅 Date Display Examples

- **Today**: "Done today"
- **Yesterday**: "Done yesterday"  
- **This year**: "Done on March 15th, 2025"
- **Past years**: "Done on December 23rd, 2023"

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