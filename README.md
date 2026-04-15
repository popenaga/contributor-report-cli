# contributor-report-cli

Generic CLI for measuring contributor throughput and code quality from any git repository, with optional GitHub PR enrichment through `gh`.

Repository: https://github.com/popenaga/contributor-report-cli

## Status

- npm package name `contributor-report-cli` is currently available
- GitHub repository is public and connected
- npm publish has not been run yet

## Requirements

- Node.js 20+
- `git`
- `gh` only when using `--include-github`

## Install

From local clone:

```bash
npm install
npm run smoke
node ./bin/contributor-report.js --help
```

After npm publish:

```bash
npm install -g contributor-report-cli
contributor-report --help
```

## Usage

```bash
contributor-report --since='2 weeks ago' --format=markdown --stdout
```

```bash
contributor-report \
  --repo-path=/path/to/repo \
  --from=2026-04-01 \
  --to=2026-04-15 \
  --format=both
```

```bash
contributor-report \
  --repo-path=/path/to/repo \
  --from=2026-04-01 \
  --to=2026-04-15 \
  --include-github \
  --format=json \
  --stdout
```

## Options

- `--repo-path=/path/to/repo`: analyze a different local repository
- `--repo=owner/name`: override GitHub repo slug
- `--since='2 weeks ago'`: relative git date window
- `--from=YYYY-MM-DD`: absolute start date
- `--to=YYYY-MM-DD`: absolute end date
- `--include-github`: fetch GitHub PR metadata with `gh`
- `--format=markdown|json|both`: output format, default `both`
- `--output-dir=/path`: directory for saved outputs
- `--stdout`: print selected output to stdout
- `--help`: show help text

## Output

By default the CLI writes outputs to `<repo>/contributor-reports/`.

- Markdown report: `contributor-report-<date-or-range>.md`
- JSON report: `contributor-report-<date-or-range>.json`
- GitHub metadata cache when enabled: `contributor-github-pr-metadata-<from>_<to>.json`

## Publish

1. Run `npm login`
2. Run `npm pack --dry-run`
3. Run `npm publish --access public`
4. Verify with `npm view contributor-report-cli`
