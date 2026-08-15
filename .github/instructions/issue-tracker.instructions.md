---
description: "Use when operating the Tryllestavsprojekt GitHub issue tracker."
applyTo: "**"
---

# Issue tracker

Issues and specifications live in GitHub Issues. Use the `gh` CLI for all issue-tracker operations. `gh` infers the repository from the remote of the current checkout; do not hard-code a repository unless a command explicitly needs one.

## Common commands

- Create: `gh issue create --title "..." --body "..."` (use a heredoc for multi-line bodies).
- Read: `gh issue view <number> --comments`. For structured triage, request `--json number,title,body,labels,comments` and filter with `--jq`.
- List: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`; add appropriate `--label` and `--state` filters.
- Comment: `gh issue comment <number> --body "..."`.
- Add or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

When a skill says to publish to the issue tracker, create a GitHub issue. When it says to fetch the relevant ticket, run `gh issue view <number> --comments`.

## Pull requests as triage

PRs are not a feature-request surface in this repository. Do not triage an external PR as a feature request unless this policy is explicitly changed here.

If that policy changes, use the issue labels and states for external PRs as well:

- Read: `gh pr view <number> --comments` and `gh pr diff <number>`.
- List: `gh api graphql -f query='query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){pullRequests(states:OPEN,first:100){nodes{number title body author{login} authorAssociation labels(first:100){nodes{name}} comments(first:100){nodes{body}}}}}}' -F owner='<owner>' -F repo='<repo>' --jq '.data.repository.pullRequests.nodes[] | select(.authorAssociation == "CONTRIBUTOR" or .authorAssociation == "FIRST_TIME_CONTRIBUTOR" or .authorAssociation == "NONE")'`, retaining only `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` author associations and dropping `OWNER`, `MEMBER`, and `COLLABORATOR`. `authorAssociation` is available through this verified GraphQL query, not `gh pr list --json`.
- Comment, label, or close with `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, or `gh pr close`.

## Wayfinding

Wayfinding uses one map issue labelled `wayfinder:map`. Its body holds `Notes`, `Decisions-so-far`, and `Fog`; create it with `gh issue create --label wayfinder:map`.

Child tickets are GitHub sub-issues linked to the map. If sub-issues are unavailable, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Use one of the `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task` labels. Record blockers near the top of the child: use native issue dependencies where available, otherwise `Blocked by: #<n>, #<n>`.

The frontier is the map's open children after omitting children with open blockers or an assignee; the first remaining child in map order wins. Claim it with `gh issue edit <number> --add-assignee @me` as the session's first write. Resolve it by posting the answer, closing the child, and appending a context pointer to the map's `Decisions-so-far`.
