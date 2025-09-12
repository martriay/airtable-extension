# How to Reload Chrome Extension After Changes

## Steps to see the new colored tag blocks:

1. **Open Chrome Extension Management:**
   - Go to `chrome://extensions/`
   - Or click the puzzle piece icon → "Manage extensions"

2. **Find "Save to Airtable" extension:**
   - Look for your extension in the list

3. **Reload the extension:**
   - Click the circular reload/refresh icon on the extension card
   - This will reload all extension files including our popup.tsx changes

4. **Test the changes:**
   - Close any open extension popups
   - Click the extension icon again to open a fresh popup
   - You should now see the new colored tag blocks interface!

## If you still see the old interface:

1. **Hard refresh:** Try disabling and re-enabling the extension
2. **Check browser cache:** Close all Chrome windows and reopen
3. **Check for errors:** Open Developer Tools on the popup (right-click → Inspect)

## Expected New Behavior:
- Tags display as colored pill-shaped blocks
- Each tag has its own color (consistent per tag name)
- Click × on any tag to remove it
- Type in the input field and press Enter or comma to add tags
- Autocomplete suggestions still work
