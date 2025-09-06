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

### Step 2: Add Actions (in exact order)

#### Action 1: Get URL
- Add action: **"Get URLs from Input"**
- Set "Get URLs from" to: **"Shortcut Input"**
- Set "If There's No Input" to: **"Safari Web Page"**

#### Action 2: Get Page Title
- Add action: **"Get Name of URL"**
- Input: Use output from Action 1 (automatic)

#### Action 3: Ask for Tags
- Add action: **"Ask for Text"**
- Prompt: **"Tags (comma-separated):"**
- Default Answer: Leave empty

#### Action 4: Split Tags into Array
- Add action: **"Split Text"**
- Text to Split: Output from Action 3
- Separator: **"Custom"**
- Custom Separator: **","** (just a comma)

#### Action 5: Make API Request
- Add action: **"Get Contents of URL"**
- URL: `https://airtable-extension-martriays-projects.vercel.app/api/save`
- Method: **"POST"**

**Option A: If you see "Authentication" section:**
- **Authentication**: **"Basic Auth"**
  - Username: Your `BASIC_AUTH_USERNAME`
  - Password: Your `BASIC_AUTH_PASSWORD`

**Option B: If you DON'T see "Authentication" section (use custom header):**
- Headers → Add Header:
  - Key: `Authorization`
  - Value: `Basic [BASE64_ENCODED_CREDENTIALS]`
  
  To get your BASE64_ENCODED_CREDENTIALS:
  1. Go to https://www.base64encode.org/
  2. Enter: `your_username:your_password` (replace with your actual credentials)
  3. Click "Encode" and copy the result
  4. Use that encoded string in the Authorization header

- Headers → Add Header:
  - Key: `Content-Type`
  - Value: `application/json`
- Request Body: **"Text"**
- In the text field, type:
```
{"url":"URL_PLACEHOLDER","title":"TITLE_PLACEHOLDER","tags":TAGS_PLACEHOLDER,"source":"iOS Shortcut"}
```
- Replace placeholders by tapping them and selecting:
  - `URL_PLACEHOLDER` → "URLs from Input" (from Action 1)
  - `TITLE_PLACEHOLDER` → "Name of URL" (from Action 2)
  - `TAGS_PLACEHOLDER` → "Split Text" (from Action 4)

#### Action 6: Show Result
- Add action: **"Show Notification"**
- Title: **"Saved!"**
- Body: **"Link saved to Airtable"**

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

**"Bad Request" / Server Error 400**
- Most common cause: Tags not formatted as array
- Solution: Ensure you added the "Split Text" action (Step 4)
- Debug: Create a test shortcut that shows the request body instead of sending it

**"Unauthorized" / Server Error 401**
- Cause: Missing or incorrect Basic Auth credentials
- Solution: Verify username/password in "Get Contents of URL" action
- Ensure credentials match your `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` environment variables

**"Network Error"**
- Check your internet connection
- Verify the API URL is correct
- Ensure the backend is deployed and running

**"Invalid JSON"**
- Make sure the request body is properly formatted
- Check for special characters in title/tags that might break JSON
- Ensure placeholders are replaced with actual variables

**"Tags not saving"**
- Ensure tags are properly comma-separated in input
- Check that the "Split Text" action is working correctly
- Verify tag names match your Airtable field configuration

**"Duplicate detection not working"**
- The API uses URL canonicalization
- URLs with tracking parameters are treated as the same page
- YouTube URLs ignore playlist/timestamp parameters

### Debug Your Shortcut

If the shortcut fails, create a debug version:

1. **Duplicate your shortcut**
2. **Remove the "Get Contents of URL" action**
3. **Add "Show Result" action instead**
4. **Set it to display the request body text**
5. **Run it to see exactly what JSON is being sent**

The JSON should look like:
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "tags": ["tag1", "tag2"],
  "source": "iOS Shortcut"
}
```

### Check Vercel Logs

To see detailed error messages:
1. Go to [vercel.com](https://vercel.com)
2. Find your project: `airtable-extension-martriays-projects`
3. Go to **Functions** tab
4. Click `/api/save` function
5. Check **Logs** section for errors

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

The iOS Shortcut uses the same backend API with Basic Auth security. The backend requires:

- `AIRTABLE_PAT`: Your Airtable Personal Access Token
- `AIRTABLE_BASE_ID`: Your Airtable Base ID
- `AIRTABLE_TABLE`: Your table name (defaults to "Units")
- `BASIC_AUTH_USERNAME`: Username for API authentication
- `BASIC_AUTH_PASSWORD`: Password for API authentication

**Important**: You'll need to configure the same Basic Auth credentials in your iOS Shortcut's "Get Contents of URL" action (Step 5 above).

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