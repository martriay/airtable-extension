# iOS Integration Guide

## Overview

The Save to Airtable backend API supports iOS integration through **iOS Shortcuts**. This allows you to save web pages from Safari or any app on iOS directly to your Airtable database using the same backend as the Chrome extension.

## API Endpoint

**URL**: `https://airtable-extension-martriays-projects.vercel.app/api/save`  
**Method**: `POST`  
**Content-Type**: `application/json`

### Request Body

```json
{
  "url": "https://example.com/page",
  "title": "Page Title",
  "tags": ["tag1", "tag2"],
  "source": "iOS Shortcut"
}
```

### Response

**Success (New Entry)**:
```json
{
  "duplicate": false,
  "id": "recXXXXXXXXXXXXXX"
}
```

**Success (Duplicate Found)**:
```json
{
  "duplicate": true,
  "existingId": "recXXXXXXXXXXXXXX",
  "existingData": {
    "title": "Existing Title",
    "tags": ["existing", "tags"]
  }
}
```

## iOS Shortcut Setup

### Step 1: Create New Shortcut

1. Open the **Shortcuts** app on iOS
2. Tap the **+** button to create a new shortcut
3. Name it "Save to Airtable"

### Step 2: Add Actions

#### Action 1: Get Current URL
- Add action: **"Get URLs from Input"**
- Set input to: **"Shortcut Input"**
- If no input, get from: **"Safari Web Page"**

#### Action 2: Get Page Title
- Add action: **"Get Name of URL"**
- Input: Use output from previous action

#### Action 3: Ask for Tags (Optional)
- Add action: **"Ask for Text"**
- Prompt: "Enter tags (comma-separated):"
- Default Answer: Leave empty
- Allow Multiple Lines: No

#### Action 4: Format Request Body
- Add action: **"Get Text"**
- Text content:
```json
{
  "url": "[URL from Step 1]",
  "title": "[Name from Step 2]",
  "tags": ["[Split tags from Step 3]"],
  "source": "iOS Shortcut"
}
```

#### Action 5: Make API Request
- Add action: **"Get Contents of URL"**
- URL: `https://airtable-extension-martriays-projects.vercel.app/api/save`
- Method: **POST**
- Headers:
  - `Content-Type`: `application/json`
- Request Body: Output from Step 4

#### Action 6: Show Result
- Add action: **"Show Notification"**
- Title: "Saved to Airtable"
- Body: "Page saved successfully!"

### Step 3: Configure Sharing

1. Go to shortcut settings (tap the shortcut name)
2. Enable **"Use with Share Sheet"**
3. Accept Types: **URLs** and **Safari web pages**

## Usage Methods

### Method 1: Share Sheet
1. In Safari or any app, tap the **Share** button
2. Select **"Save to Airtable"** from the share sheet
3. Enter tags when prompted
4. Wait for confirmation notification

### Method 2: Shortcuts App
1. Open the **Shortcuts** app
2. Tap **"Save to Airtable"**
3. It will get the current Safari page or ask for a URL
4. Enter tags when prompted

### Method 3: Siri Voice Command
1. Say "Hey Siri, Save to Airtable"
2. Siri will run the shortcut automatically
3. Follow voice prompts for tags if configured

### Method 4: Home Screen Widget
1. Add the shortcut to your home screen
2. Tap the icon to run it instantly

## Advanced Configuration

### Auto-Tag Based on URL
You can enhance the shortcut to automatically suggest tags based on the URL:

```javascript
// Add a "Run JavaScript on Web Page" action
if (document.location.hostname.includes('github.com')) {
  return ['development', 'code'];
} else if (document.location.hostname.includes('youtube.com')) {
  return ['video', 'learning'];
} else if (document.location.hostname.includes('medium.com')) {
  return ['article', 'reading'];
}
return [];
```

### Batch Save Multiple URLs
Create a separate shortcut that:
1. Gets multiple URLs from clipboard or text input
2. Loops through each URL
3. Calls the save API for each one

### Integration with Other Apps
The shortcut can be triggered from:
- **Drafts**: Using URL schemes
- **Obsidian**: Through community plugins
- **Bear**: Via x-callback-url
- **Any app** that supports iOS Shortcuts integration

## Troubleshooting

### Common Issues

**"Network Error"**
- Check your internet connection
- Verify the API URL is correct
- Ensure the backend is deployed and running

**"Invalid JSON"**
- Make sure the request body is properly formatted
- Check for special characters in title/tags that might break JSON

**"Tags not saving"**
- Ensure tags are properly comma-separated
- Check that tag names match your Airtable field configuration

**"Duplicate detection not working"**
- The API uses URL canonicalization
- URLs with tracking parameters are treated as the same page
- YouTube URLs ignore playlist/timestamp parameters

### Testing the API

You can test the API directly using the **"Get Contents of URL"** action in Shortcuts:

```json
{
  "url": "https://example.com/test",
  "title": "Test Page",
  "tags": ["test"],
  "source": "iOS Shortcut"
}
```

## Environment Variables

The iOS Shortcut uses the same backend API, so no additional environment variables are needed. The backend already has:

- `AIRTABLE_PAT`: Your Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Your Airtable Base ID
- `AIRTABLE_TABLE`: Your table name (defaults to "Units")

## Limitations

1. **No Form Population**: Unlike the Chrome extension, iOS Shortcuts can't populate forms with existing data from duplicates
2. **No Real-time Tag Suggestions**: The shortcut can't fetch dynamic tag suggestions from Airtable
3. **Limited Error Handling**: iOS Shortcuts have basic error handling compared to the web extension
4. **No Auto-save**: Each save action must be manually triggered

## Future Enhancements

Potential improvements for iOS integration:
- Native iOS app with full feature parity
- Shortcuts that fetch existing tags for suggestions
- Background sync capabilities
- Integration with iOS Reading List
- Support for saving multiple pages at once