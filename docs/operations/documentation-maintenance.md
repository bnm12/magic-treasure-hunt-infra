# Documentation maintenance

Documentation has one source of truth per concept. Update the canonical document when a contract, ownership seam, workflow, or contributor rule changes; use links instead of repeating the same fact.

## Source map

| Concern | Canonical document |
| --- | --- |
| Project purpose, user outcomes, wand narrative, and hardware target | [`docs/reference/vision-and-wand-hardware.md`](../reference/vision-and-wand-hardware.md) |
| Current repository state and entry points | [`docs/reference/project-overview-and-current-state.md`](../reference/project-overview-and-current-state.md) |
| Exact wand wire format and safety invariants | [`docs/reference/wand-nfc-data-contract.md`](../reference/wand-nfc-data-contract.md) |
| Module seams and runtime flows | [`docs/reference/system-architecture-and-data-flows.md`](../reference/system-architecture-and-data-flows.md) |
| Website, firmware, and deployment setup | [`docs/operations/developer-build-and-deploy.md`](developer-build-and-deploy.md) |
| Event preparation and field support | [`docs/operations/organiser-runbook.md`](organiser-runbook.md) |
| Hunt JSON and image authoring | [`website/public/hunts/README.md`](../../website/public/hunts/README.md) |
| Hard-to-reverse decisions | [`docs/adr/`](../adr/) |
| Agent workflow rules | [`.github/instructions/`](../../.github/instructions/) |

## Update rules

- Update the wire contract before changing code that reads or writes wand data.
- Update architecture when ownership, entry points, or user flows change.
- Update operations when commands, hardware, deployment, or field support changes.
- Update the organiser runbook when event preparation or troubleshooting changes.
- Update `AGENTS.md` when repository structure, ownership, or non-negotiable invariants change.
- Keep `CONTEXT.md` as a glossary only; implementation details belong in reference or operations docs.
- Add an ADR only for a hard-to-reverse, surprising decision that records a real trade-off.
- Mark confirmed decisions accepted. Use proposed only for an unresolved decision that is still worth recording.

## Validation

Before finishing a documentation change:

1. Search for links to deleted or renamed files.
2. Search for stale terminology and conflicting protocol values.
3. Confirm every concept has one canonical source.
4. Check relative links from the file that contains them.
5. Review the changed file list and note unresolved factual uncertainties.
