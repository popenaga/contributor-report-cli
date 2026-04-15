# Contributing

Thanks for contributing to `contributor-report-cli`.

## Getting Started

1. Use Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Validate changes with:
   - `npm test`
   - `npm run smoke`
   - `npm run release:check`
   - `npm pack --dry-run`

## Pull Requests

- Keep changes focused and reviewable.
- Add or update tests when behavior changes.
- Add a changeset for user-facing changes by running `npx changeset`.
- Update documentation when CLI behavior, output, or release steps change.

## Generated Output

- Do not commit generated `contributor-reports/` artifacts unless the repository explicitly wants them tracked.
- Review report contents before sharing them. Reports may contain contributor names, email addresses, PR titles, and other repository metadata.

## Release Notes

- Changes merged to `main` should carry a changeset when they affect users.
- The repository uses Changesets to open release PRs and publish to npm.
