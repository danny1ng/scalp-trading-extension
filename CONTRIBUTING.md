# Contributing

## Before you start
- Open an issue for non-trivial changes to align on scope.
- Keep all code/comments/docs in English.
- For behavior changes, update `README.md` in the same PR.

## Local setup
```bash
pnpm install
pnpm test
pnpm build
```

Load the extension for manual checks:
1. `pnpm build`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Load unpacked from `dist`

## Branch and commits
- Branch naming: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Use focused commits with imperative messages.
- Prefer Conventional Commits style when possible.

## Pull requests
- Fill in `.github/pull_request_template.md`.
- Include verification evidence (`pnpm test`, `pnpm build`, manual flow).
- Mention risk areas and rollback notes for trading-flow changes.

## Documentation update rule
Update `README.md` whenever you change:
- user-visible behavior
- supported exchanges/domains
- setup/install steps
- usage flow
- payload structure
- limitations, safety notes, or risk behavior

## Scope of README
`README.md` is for end users first.
Keep deep implementation details minimal unless they affect setup or usage.
