---
description: "Use when operating the Tryllestavsprojekt GitHub issue tracker."
applyTo: "**"
---

# Issue tracker

Issues and specifications live in GitHub Issues. Use the `gh` CLI for issue operations.

## Common commands

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body "..."`
- Add or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Use the repository remote selected by `gh` from the current checkout.

## Pull requests as triage

External pull requests are not a feature-request surface unless the repository explicitly changes that policy. If that policy changes, document the new rule here.

## Wayfinding

The map is a single issue labelled `wayfinder:map`. Child tickets use `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`. Record blockers near the top of a child ticket. Claim a ticket with `gh issue edit <number> --add-assignee @me`; resolve it with an answer comment followed by closure.

