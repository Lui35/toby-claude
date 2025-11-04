What Toby is (facts you can rely on)

Purpose: a visual workspace for tabs/links—think boards of “collections” you can save tabs into, reopen as sessions, and search quickly. (Official site description.) 
Toby

Key mechanics (from listing & docs): new-tab dashboard; session management (save/restore current open tabs); drag-drop into collections; search, dedupe; team features on paid plans. 
Chrome Web Store

Plans (as of today): Starter (free, cap on saved tabs), Productivity and Team tiers with unlimited saved tabs and extras like advanced search, deduplication, SSO. Pricing is listed publicly. 
Toby

Product blueprint your agent can build
Core objects

TabItem: { id, url, title, faviconUrl, createdAt, notes?, pinned?, tags[] }

Collection: { id, name, description?, sortOrder, tabIds[], cover?, ownerId, sharedWith[] }

Session: { id, createdAt, windowLayout, tabSnapshot[] } where tabSnapshot holds {url, title, pinned, index, group?}

Space/Workspace (optional for teams): grouping of collections; shareable with ACLs.

Settings: { newTabOverride, shortcuts, appearance, cloudSyncEnabled }

Non-negotiable capabilities (parity with Toby)

New Tab override → visual board of collections with drag-drop and instant search.

Save Session → one click: capture all open tabs (with window structure); Restore Session opens the set accurately.

Collections → drag tabs in; one click opens some/all; dedupe URLs on insert.

Global search → fuzzy over titles, URLs, tags, notes; keyboard-first.

Sync → device to device (use your own backend; avoid storage.sync limits).

(Paid) Team sharing → shared spaces, role-based access, SSO option later.

Chrome Extension (Manifest V3) architecture

Extension surfaces

New tab page (chrome_url_overrides.newtab) → React app (board UI).

Action popup → quick “Save Session / Save current tab to …”.

Options page / Side panel → settings + import/export.

Background service worker → session capture/restore, storage, sync.

Key MV3 APIs

tabs (query/create/update), sessions (optional), commands (shortcuts), storage (local/session), declarativeNetRequest (not needed), identity (for cloud login), runtime, sidePanel (optional). MV3 is the current platform. 
Chrome for Developers
+1

Storage strategy (important!)

Don’t rely on chrome.storage.sync for all data—it’s capped ~100KB total, 8KB per item; you’ll hit it fast. Use it only for tiny preferences; put collections/tabs in your cloud. 
Chrome for Developers
+1

Local fallback: storage.local (≈5MB) with unlimitedStorage if you must; still plan for online sync. 
sunnyzhou-1024.github.io

Minimal manifest.json (MV3)

{
  "manifest_version": 3,
  "name": "Tab Boards",
  "version": "0.1.0",
  "description": "Visual collections & sessions like Toby.",
  "permissions": ["tabs", "storage"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup.html" },
  "chrome_url_overrides": { "newtab": "index.html" },
  "options_page": "options.html",
  "background": { "service_worker": "bg.js" },
  "commands": {
    "save-session": { "suggested_key": { "default": "Alt+S" }, "description": "Save current session" },
    "quick-add": { "suggested_key": { "default": "Alt+Q" }, "description": "Save current tab" }
  }
}


Notes: You’ll need tabs to read titles/favicons; <all_urls> (or activeTab) if you ever do screenshots (e.g., thumbnails via tabs.captureVisibleTab which requires activeTab or <all_urls>). 
Chrome for Developers
+2
MDN Web Docs
+2

Background worker — crucial flows (pseudocode)

// Save Session
async function saveSession(name) {
  const windows = await chrome.windows.getAll({populate: true});
  const snapshot = windows.flatMap(w =>
    w.tabs.sort((a,b)=>a.index-b.index).map(t => ({
      url: t.url, title: t.title, pinned: t.pinned, index: t.index, windowId: w.id
    }))
  );
  const session = { id: uid(), name, createdAt: Date.now(), tabSnapshot: snapshot };
  await db.sessions.put(session); // your cloud sync
}

// Restore Session
async function restoreSession(sessionId, mode="new-window") {
  const s = await db.sessions.get(sessionId);
  if (mode==="new-window") {
    let currentWin = await chrome.windows.create({});
    for (const t of s.tabSnapshot) await chrome.tabs.create({windowId: currentWin.id, url: t.url, pinned: t.pinned});
  } else {
    // same-window restore...
  }
}

// Quick add
async function addCurrentTabToCollection(collectionId) {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  await db.collections.addTab(collectionId, normalize(tab)); // dedupe by canonical URL
}


Search

Index {title, url, tags, notes} with a small in-browser index (MiniSearch/Lunr) mirrored server-side for multi-device; include URL canonicalization (strip tracking params, lower-case host, remove trailing slashes) to power dedupe.

Thumbnails (optional)

Use chrome.tabs.captureVisibleTab after user gesture; don’t auto-capture on every save (privacy + perf). It needs activeTab or <all_urls> permission. 
MDN Web Docs

Cloud sync backend

Simple REST: /collections, /tabs, /sessions, /spaces, /auth.

Auth: email+magic link or OAuth (Google).

Conflict strategy: last-write-wins + client-side merge for collection order.

Import/export

One-click import from bookmarks (chrome.bookmarks API) and export to JSON.

UX slices (what to build first)

New Tab board

Left: Spaces (if enabled) → Collections list.

Main: Collection cards (cover, count, “Open all”, kebab menu).

Top: omnibox search; keyboard nav (/ to focus, Enter to open).

Save Session modal

Shows current windows & groups; name; “Save & close tabs” (optional).

Collection view

Masonry grid of TabItems; drag-reorder; quick tags; multi-select; Deduplicate on paste/import.

Popup

Quick add to last collection / pick collection; create new on the fly.

Privacy, security, compliance (why clones get flagged)

Ask for minimal permissions; explain why in onboarding.

Be careful with screenshots: only on click; don’t harvest page content.

Avoid stuffing all data in storage.sync (quota + reliability). Chrome’s own guidance recommends tiny data only; use a real backend. 
Google Groups

MV3 is actively enforced; plan for users coming from MV2 era and ad-blocker changes (context: Chrome’s MV3 rollout). 
The Verge
+1

Competitive notes (to help you differentiate)

Workona focuses on deep workspace/tabgroup workflows; Toby stays simpler with a board-style new tab page. (Independent comparisons + Toby’s own positioning.) 
efficient.app
+2
Toby
+2

Monetization model (reflecting Toby’s tiers)

Free: cap saved tabs/collections; local-only sync.

Pro: unlimited, cloud sync, dedupe, advanced search.

Team: spaces + sharing, SSO, centralized billing. (Mirrors public Toby plan structure.) 
Toby

Risks & gotchas (implementation reality check)

Quota blowups: storage.sync 100KB/8KB limits will corrupt saves if you’re not careful. Use cloud, batch writes, and compress big arrays. 
Chrome for Developers
+1

Permissions friction: Many users uninstall if they see <all_urls>. Keep it to tabs + activeTab unless thumbnails are essential. 
Chrome for Developers

Restore accuracy: Re-create pinned state, tab order, and window grouping. Test on multi-window edge cases.

Search speed: In-memory indices must lazily hydrate on cold start; persist index snapshots to speed up.

Intellectual sparring partner mode — let me challenge the idea

Assumption check: “People want a new-tab replacement to manage tabs.”

Maybe. But many already use native Tab Groups and bookmark bars. If your UX isn’t clearly faster than native, adoption stalls.

Counterpoint: A skeptic will say tab hoarding is a behavior problem, not a tooling problem. If you save thousands of links, do you actually revisit them? Consider opinionated pruning (auto-archive, revisit nudges) instead of infinite storage.

Reasoning test: If “sessions” are the killer feature, why require a new-tab override at all? A popup-only MVP could deliver 80% of value with less friction and fewer permissions.

Alternatives:

Build a workspace launcher integrating with Google Docs/Notion/Jira instead of raw URLs.

Or go OS-level: a universal “stash” that works across browsers and apps (electron + deep links).

Truth over agreement: If you just copy Toby, you’ll compete on price and lose on trust. To be credible, pick a wedge:

Team rituals (standup boards of current tabs),

Knowledge hygiene (auto-dedupe, canonicalize, detect dead links),

Focus automation (open only the next 3 relevant tabs based on calendar/context).

---

Local‑First MVP Updates (Current Build)

- Storage: All data is local using `chrome.storage.local` with `unlimitedStorage`. No cloud sync or identity yet.
- Permissions: `tabs`, `storage`, `unlimitedStorage`. Avoid `<all_urls>` unless thumbnails are added later.
- Surfaces:
  - New Tab page: primary UI.
  - Action Popup: quick add current tab to a collection (or create one).
  - Options Page: import/export JSON (merge or replace) and accept newline/array of URLs.

Open Tabs Sidebar (Right)

- Lists all currently open tabs across windows; includes a filter box.
- Every open tab is draggable.
- Drag from the sidebar into any collection to save the tab.

Collections — Visual Shape and Behaviors

- Container: full‑width “card” stacked vertically. Each has:
  - Header: editable title (click to rename), tab count, actions: Open all, Collapse/Expand, Delete.
  - Body: a responsive grid of compact tab “cells” that wrap to new lines (min ~200px width). The grid shows by default and hides when collapsed.
- Tab Cell:
  - Shows favicon, title, and host.
  - Click anywhere on the cell to open the tab URL.
  - Small Remove button to remove from the collection (does not open the URL).
  - Draggable: reorder within the collection or move to another collection.
- Drag and Drop:
  - Reorder cells inside a collection; order persists.
  - Drag a cell to another collection to move it.
  - Drop from the Open Tabs sidebar to add a new cell.
- Reorder Collections:
  - Drag entire collection containers up/down to change their stack order; order persists.
- Collapse/Expand:
  - Collapsed collections hide their grid until expanded.

Data Shapes (Updated)

- TabItem: { id, url, title, faviconUrl, createdAt, notes?, pinned?, tags[] }
- Collection: { id, name, description?, tabIds[], collapsed, cover? }
  - Tab ordering is the order of ids in `tabIds`.
  - Collection ordering is the array order in storage (not a `sortOrder` integer).
- Session: { id, name?, createdAt, windowLayout, tabSnapshot[] }
- Settings: { newTabOverride, shortcuts?, appearance?, cloudSyncEnabled? }

Import/Export (Local)

- Export JSON: { version, exportedAt, collections, tabItems, sessions, settings }.
- Import:
  - Accepts the exported format (merge or replace).
  - Accepts a simple array or newline list of URLs; creates an “Imported <date>” collection.

Notes on Dedupe and Canonicalization

- URLs are canonicalized (strip tracking params, lowercase host, trim trailing slash) for deduplication on insert.
