# Tab Collections - Chrome Extension

A powerful, local-first tab and session management extension for Chrome. Organize your tabs into visual collections with drag-and-drop, save browsing sessions, and quickly search through everything. Inspired by Toby, built with privacy and modern UX in mind.

## ✨ Features

### 📚 Visual Collections
- **Full-width card layout** - Collections displayed as stacked cards for easy scanning
- **Grid of tab cells** - Each tab shown with favicon, title, and hostname
- **Click to rename** - Edit collection names inline by clicking on them
- **Collapse/Expand** - Hide collection contents to save space
- **Open all** - Launch every tab in a collection with one click

### 🎯 Drag & Drop Everything
- **Drag tabs from sidebar** - Drag any open tab into a collection to save it
- **Reorder tabs** - Drag tabs within or between collections
- **Reorder collections** - Drag collection headers to change their order
- **Visual feedback** - Clear indicators show where items will land

### 📂 Open Tabs Sidebar
- **Always visible** - See all your currently open tabs on the right side
- **Filter box** - Quickly find open tabs by title or URL
- **Drag to save** - Drag any open tab into a collection
- **Auto-refresh** - Updates every 3 seconds

### 💾 Session Management
- **Save sessions** - Capture all open tabs across all windows
- **Restore sessions** - Reopen entire browsing sessions in new windows
- **Session history** - Keep multiple named sessions
- **Keyboard shortcut** - `Alt+S` to quickly save current session

### 🔍 Powerful Search
- **Fuzzy matching** - Find tabs even with partial or misspelled queries
- **Search everywhere** - Searches titles, URLs, and notes
- **Instant results** - Live search with relevance scoring
- **Double-shift** - Press Shift twice to focus search instantly
- **Keyboard shortcut** - Press `/` to focus search bar

### 📤 Import & Export
- **Toby-compatible** - Import your existing Toby collections
- **URL lists** - Import plain text files with URLs (one per line)
- **Merge or replace** - Choose how to handle existing data
- **Version tracking** - Exports include version info for compatibility

### 🔒 Privacy-First
- **Local storage only** - All data stays on your device
- **No cloud sync** - No accounts, no servers, no tracking
- **URL deduplication** - Automatically removes tracking parameters
- **Minimal permissions** - Only requests what's necessary

## 📥 Installation

### Quick Start

1. **Clone or Download**
   ```bash
   cd C:\Users\Lui-PC\Desktop\Reboot\Toby-Claude
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (toggle top-right)
   - Click "Load unpacked"
   - Select the `extension` folder
   - Done!

3. **First Use**
   - Open a new tab to see your dashboard
   - Click "+ New Collection" to create your first collection
   - Drag tabs from the sidebar to save them

## 🎮 Usage

### Creating & Managing Collections

**Create a Collection:**
- Click "+ New Collection" button
- Enter a name and optional description
- Click "Create"

**Rename a Collection:**
- Click on the collection title
- Edit inline
- Press Enter or click away to save

**Collapse/Expand:**
- Click the ▲/▼ button on any collection
- State persists across sessions

**Delete a Collection:**
- Click the 🗑️ button
- Confirm deletion

### Adding Tabs to Collections

**Method 1: Drag from Sidebar**
- Find the tab in the Open Tabs sidebar (right side)
- Drag it onto any collection
- Tab is automatically saved

**Method 2: From Popup**
- Click the extension icon in toolbar
- Select a collection
- Current tab is added

**Method 3: Drag Between Collections**
- Drag tab cells between collections to reorganize

### Opening Tabs

**Open Single Tab:**
- Click any tab cell in a collection
- Opens in a new tab

**Open All Tabs:**
- Click the ▶️ button on a collection
- All tabs open in current window

### Organizing Collections

**Reorder Collections:**
- Click and hold a collection header (avoid title and buttons)
- Drag up or down
- Drop to new position

**Reorder Tabs:**
- Drag tab cells to reorder within a collection
- Or drag to move between collections

**Filter Open Tabs:**
- Use the filter box in the sidebar
- Type to search by title or URL

### Searching Tabs

**Regular Search:**
1. Type in the search bar at top
2. Or press `/` to focus search
3. Results update as you type
4. Click any result to open

**Quick Search:**
1. Press Shift key twice rapidly (< 300ms)
2. Search bar focuses automatically
3. Start typing immediately

**Search Tips:**
- Searches tab titles, URLs, and notes
- Fuzzy matching: "fbk" matches "Facebook"
- Results sorted by relevance

### Sessions

**Save Current Session:**
- Click "💾 Save Current Session" button
- Or press `Alt+S`
- Enter optional name
- All windows and tabs are saved

**Restore Session:**
- Scroll to "Saved Sessions" section
- Click "Restore" on any session
- Opens in a new window

**Delete Session:**
- Click 🗑️ on session card
- Confirm deletion

### Import & Export

**Export Collections:**
1. Click "📤 Export" button
2. JSON file downloads automatically
3. Filename: `tab-collections-YYYY-MM-DD.json`

**Import Data:**
1. Click "📥 Import" button
2. Select JSON or TXT file
3. Choose "Merge" or "Replace"
4. Confirm

**Supported Formats:**
- Toby export files (JSON array of collections)
- Our export format (with sessions and metadata)
- Plain text URLs (one per line)
- URL arrays in JSON format

**Import from Toby:**
1. In Toby, export your collections
2. In Tab Collections, click "Import"
3. Select the Toby JSON file
4. Choose "Merge with Existing"
5. Your Toby collections are now in Tab Collections!

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+S` | Save current session |
| `/` | Focus search bar |
| `Shift` + `Shift` (quick) | Quick search (focus & select) |
| `Esc` | Close search results |
| `Enter` | Confirm modal actions / Save edited title |
| `Escape` (while editing) | Cancel title editing |

## 🗂️ Data Structure

### Collections
```javascript
{
  id: string,
  name: string,
  description: string,
  tabIds: string[],      // Ordered array of tab IDs
  collapsed: boolean,
  createdAt: number
}
```

### Tab Items
```javascript
{
  id: string,
  url: string,
  title: string,
  faviconUrl: string,
  createdAt: number,
  notes: string,
  tags: string[]
}
```

### Sessions
```javascript
{
  id: string,
  name: string,
  createdAt: number,
  windowCount: number,
  tabCount: number,
  tabSnapshot: Array<{
    url: string,
    title: string,
    pinned: boolean,
    index: number,
    windowId: number,
    favicon: string
  }>
}
```

### Export Format (v2.0)
```javascript
{
  version: '2.0',
  exportedAt: number,
  collections: Collection[],
  tabItems: { [id: string]: TabItem },
  sessions: Session[],
  settings: object
}
```

## 🛠️ Technical Details

### Architecture
- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No framework overhead
- **ES6 Modules** - Clean, modular code structure
- **Local Storage** - `chrome.storage.local` with unlimited storage

### File Structure
```
extension/
├── manifest.json
├── background/
│   └── background.js      # Service worker
├── newtab/
│   ├── newtab.html        # Dashboard UI
│   ├── newtab.css         # Styles
│   └── newtab.js          # Logic & drag-drop
├── popup/
│   ├── popup.html         # Quick actions
│   ├── popup.css
│   └── popup.js
├── utils/
│   ├── storage.js         # Data management
│   ├── search.js          # Fuzzy search
│   └── helpers.js         # URL canonicalization, etc.
└── icons/
    └── *.png              # Extension icons
```

### Permissions
- `tabs` - Read tab info (title, URL, favicon)
- `storage` - Store collections locally
- `unlimitedStorage` - No size limits on collections

### Data Optimization
- **Separated storage** - Tab items stored separately from collections
- **Deduplication** - Canonical URLs prevent duplicates
- **Shared tabs** - Same tab can exist in multiple collections
- **Garbage collection** - Unused tabs cleaned up automatically

### URL Canonicalization
Removes tracking parameters and normalizes URLs:
- Strips: `utm_*`, `fbclid`, `gclid`, `ref`, `source`, `_ga`, etc.
- Lowercases hostname
- Removes trailing slashes
- Ensures consistent duplicate detection

## 🎨 Design Highlights

- **Gradient background** - Purple to blue gradient
- **Card-based UI** - Modern, clean aesthetic
- **Smooth animations** - Drag feedback, hover states
- **Responsive grid** - Tab cells wrap to fit width
- **Visual hierarchy** - Clear sections and spacing
- **Custom scrollbars** - Styled for consistency

## 🔄 Migration from Toby

1. **Export from Toby**
   - Open Toby
   - Export your collections (usually a JSON file)

2. **Import to Tab Collections**
   - Open Tab Collections (new tab)
   - Click "📥 Import"
   - Select your Toby export file
   - Choose "Merge with Existing"
   - Click "Merge"

3. **Verify**
   - All collections should appear
   - All tabs preserved with titles and favicons
   - Collections maintain their names

## 🐛 Troubleshooting

### Extension won't load
- Ensure Developer mode is enabled
- Check for errors in `chrome://extensions/`
- Verify you selected the `extension` folder (not parent)

### Tabs not saving
- Check storage permissions
- Try exporting and re-importing data
- Open browser console (F12) for errors

### Drag and drop not working
- Ensure you're dragging the correct elements
- Try refreshing the page
- Check that collections aren't collapsed

### Search not finding tabs
- Verify tabs are actually saved in collections
- Try exact title or URL match first
- Check for typos in collection names

### Sessions not restoring
- Some URLs can't be restored (chrome:// pages)
- Check that browser allows new windows
- Verify session data wasn't corrupted

### Open tabs sidebar empty
- Sidebar filters out chrome:// and extension pages
- Check the filter box isn't excluding tabs
- Try opening a regular webpage

## 🚀 Future Enhancements

- [ ] Tab reordering within collections (fine-grained)
- [ ] Collection covers/thumbnails
- [ ] Tab notes and tags UI
- [ ] Chrome tab groups integration
- [ ] Keyboard navigation for search results
- [ ] Bulk operations (select multiple tabs)
- [ ] Dark mode
- [ ] Custom themes
- [ ] Export single collection
- [ ] Dead link detection
- [ ] Auto-archive old tabs

## 📝 Version History

### v2.0.0 (Current)
- ✨ Added Open Tabs sidebar with drag-and-drop
- ✨ Full drag-and-drop support (tabs, collections)
- ✨ Editable collection titles (click to edit)
- ✨ Collapse/expand collections
- ✨ Full-width card layout
- ✨ URL canonicalization for deduplication
- ✨ Import URL lists (text files)
- ✨ Merge or replace import modes
- ✨ New export format (v2.0) with separated tab items
- 🔧 Removed unnecessary permissions
- 🔧 Improved data structure efficiency

### v1.0.0
- Initial release
- Basic collections and sessions
- Search functionality
- Toby import support

## 📄 License

Open source - free for personal use.

## 🙏 Credits

Inspired by Toby for Chrome. Built as a privacy-focused, local-first alternative with modern drag-and-drop UX.

---

**Made with ❤️ for tab hoarders everywhere**
