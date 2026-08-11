---
description: "Use when debugging, previewing, or visually inspecting the website app. Use when launching dev server, using Chrome DevTools MCP, or taking screenshots."
applyTo: "website/**"
---

# Development & Debugging

## Dev Server

- Run `npm run dev` from the `website/` directory to start the Vite dev server with HTTPS (mkcert) to ensure local NFC development functions securely under SSL.
- Always check whether the dev server is already running on port `5173` before starting a new one to avoid port conflict errors.
- Note that the dev server supports HMR (Hot Module Replacement) so that no manual restart is needed after code changes.

## Chrome DevTools (MCP)

Use the Chrome DevTools MCP tools to inspect the running app:

- Use `take_snapshot`, `list_console_messages`, and `list_network_requests` to inspect the application, because doing so allows direct verification without relying on external UI captures.
- Prefer DOM snapshots via the `take_snapshot` tool and console checks via the `list_console_messages` tool over screenshots to ensure highly precise visual and state verification.

### Enterprise restriction: screenshots are disabled

**`take_screenshot` is blocked by enterprise policy and will always fail.** Do not attempt it to prevent execution errors.

Use these alternatives instead:

| Need                         | Tool                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| Check layout / DOM structure | `take_snapshot` (returns accessible DOM tree)                            |
| Check element visibility     | `evaluate_script` with `getComputedStyle()` or `getBoundingClientRect()` |
| Check CSS values             | `evaluate_script` with `getComputedStyle(el).propertyName`               |
| Check for JS errors          | `list_console_messages`                                                  |
| Check network failures       | `list_network_requests`                                                  |

## Build Verification

- Run `npm run build` from the `website/` directory to verify TypeScript + Vite production build to prevent deploying broken builds.
- Always build after code changes before considering a task complete to ensure the code compiles without any TypeScript or bundler errors.
