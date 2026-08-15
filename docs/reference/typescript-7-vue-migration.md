# TypeScript 7 and Vue migration feasibility

_Assessment date: 2026-08-15._

## Decision

This solution can trial TypeScript 7 for its standalone TypeScript build, but it
is not ready for a clean, all-in TypeScript 7 Vue tooling migration.

The important distinction is that the repository currently runs `tsc` directly
and does not use `vue-tsc` or Volar for build-time type checking. A compiler-only
upgrade is therefore a small, isolated experiment. A complete migration that
also type-checks Vue single-file components depends on Vue language tooling,
which still needs a TypeScript 6-compatible API layer rather than stock
TypeScript 7.

## First-party compatibility status

* TypeScript 7.0 is officially released as the native Go-based compiler:
  [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
* The same announcement says TypeScript 7.0 does not yet expose a stable
  programmatic API. It specifically calls out Vue, MDX, Astro, and Svelte
  workflows as unable to use TypeScript 7 through embedded-language tooling,
  and recommends TypeScript 6.0 for Vue until the API work lands.
* `vue-tsc` is a wrapper around `tsc` that creates a Vue language plugin and
  transforms `.vue` files into virtual TypeScript code:
  [official vue-tsc README](https://raw.githubusercontent.com/vuejs/language-tools/master/packages/tsc/README.md).
* The Vue language-tools tracker documents the transition problem:
  [TypeScript 7 support, issue #5381](https://github.com/vuejs/language-tools/issues/5381).
  A direct `typescript@7.0.2` + `vue-tsc` run was reported failing because
  `typescript/lib/tsc` is no longer exported:
  [issue #6124](https://github.com/vuejs/language-tools/issues/6124).
* Vue language-tools has validated a bridge-based approach for its own build
  and tests in [PR #6129](https://github.com/vuejs/language-tools/pull/6129).
  That approach uses a TypeScript 6-compatible bridge backed by the native
  compiler; it is not the same as `vue-tsc` consuming the public TypeScript 7
  API. It should be treated as an experimental compatibility route, not as a
  reason to assume stock TypeScript 7 is supported by every Vue tool.
* Vite's official TypeScript guidance says Vite transpiles TypeScript but does
  not type-check it; type checking must be run separately with `tsc` or another
  tool:
  [Vite TypeScript features](https://vite.dev/guide/features.md).

## Repository inventory

The current website workspace contains:

| Surface | Current state |
| --- | --- |
| TypeScript | `~5.9.3` in `website/package.json`; lockfile resolves 5.9.3 |
| Vue | `^3.4.0`; lockfile resolves 3.5.31 |
| Vite | `^5.0.0`; lockfile resolves 5.4.21 |
| Vue Vite plugin | `^5.0.0`; lockfile resolves 5.2.4 |
| Tests | Vitest 2.1.9; one test file with 10 passing tests at assessment time |
| TypeScript source | 21 `.ts`/declaration files, approximately 2,267 lines |
| Vue source | 23 `.vue` files, approximately 4,716 lines |
| Vue type checker | No `vue-tsc`, Volar, or language-tools dependency |

The production script is `tsc && vite build`. The TypeScript configuration
includes `src` and `management/main.ts`, not `.vue` files. The local
`src/env.d.ts` declaration represents `*.vue` modules as a generic
`DefineComponent<{}, {}, any>`. Consequently, the current `tsc` step checks
the standalone TypeScript graph but does not type-check the scripts and
templates inside the Vue SFCs.

The current `website/tsconfig.json` already avoids the most relevant TypeScript
7 configuration removals: it uses `moduleResolution: "bundler"`, `module:
"ESNext"`, `strict: true`, an explicit `types` list, `verbatimModuleSyntax`,
and `noUncheckedSideEffectImports`. The source also uses the
`erasableSyntaxOnly` discipline and has no apparent enum, namespace, or legacy
module-resolution surface that would make this a source rewrite.

The baseline is healthy: `npm run build` and `npm test` both passed during this
assessment. Those checks were run against the existing TypeScript 5.9.3
installation, not TypeScript 7.

## Effort estimates

| Goal | Effort | Risk | Result |
| --- | ---: | --- | --- |
| Compiler-only TS7 spike | 0.5–1 day | Low | Upgrade `typescript`, refresh the lockfile, run the existing build/tests, and verify CI/Node support. This does not improve SFC type checking. |
| Dual toolchain using a TS6-compatible bridge | 1–3 days | Medium/high | Run native TS7 for standalone `tsc` checks while keeping `vue-tsc` on a pinned TS6-compatible API/bridge. Adds aliases, scripts, CI coverage, and maintenance burden. |
| Full official Vue + TS7 migration | Blocked today; likely 1–3 days after support | Medium | Add `vue-tsc` type checking, remove the compatibility split, then fix any template diagnostics and update CI/docs. The timing depends on the TypeScript 7 API and Vue language-tools releases, not on this codebase. |

The repository-specific code change for the first option should be small:
`website/package.json`, `website/package-lock.json`, and possibly a build
script or CI command. No Vue runtime or NFC/protocol changes are implied.
The main validation is compatibility testing, not rewriting application code.

## Recommendation

Do not make a broad Vue/toolchain upgrade solely to obtain TypeScript 7.

If the goal is to measure the native compiler, make a short-lived branch that
changes only the TypeScript package and runs:

```text
npm install
npm run build
npm test
```

Keep the current `tsc`-only behavior explicit in the result: a green build
would prove standalone compiler compatibility, not full Vue SFC type safety.
When official Vue language-tools support is available, add `vue-tsc --noEmit`
as a separate type-check step and then reassess the template diagnostics before
removing the existing `*.vue` shim.

No change is required to the wand NFC contract, offline-first loop, or
website/firmware responsibility boundary; this is a website build-tooling
change only.
