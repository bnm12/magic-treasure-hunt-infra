---
description: "Use when debugging, previewing, or visually inspecting the website app. Use when launching dev server, using Chrome DevTools MCP, or taking screenshots."
applyTo: "website/**"
---

# Development & Debugging

## Dev Server

- Run `npm run dev` from `website/` to start the Vite dev server with HTTPS (mkcert).
- Check whether the dev server is already running before starting a new one.
- The dev server supports HMR — no restart needed after code changes.

## Chrome DevTools (MCP)

Use the Chrome DevTools MCP tools to inspect the running app:

- Navigate to pages, evaluate JS, inspect the DOM snapshot, check console errors, list network requests.
- Prefer DOM snapshots (`take_snapshot`) and console checks (`list_console_messages`) over screenshots for visual verification.

### Enterprise restriction: screenshots are disabled

**`take_screenshot` is blocked by enterprise policy and will always fail.** Do not attempt it.

Use these alternatives instead:

| Need | Tool |
|------|------|
| Check layout / DOM structure | `take_snapshot` (returns accessible DOM tree) |
| Check element visibility | `evaluate_script` with `getComputedStyle()` or `getBoundingClientRect()` |
| Check CSS values | `evaluate_script` with `getComputedStyle(el).propertyName` |
| Check for JS errors | `list_console_messages` |
| Check network failures | `list_network_requests` |

## Build Verification

- Run `npm run build` from `website/` to verify TypeScript + Vite production build.
- Always build after code changes before considering a task complete.
