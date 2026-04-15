# contributor-report-cli

Generic CLI for measuring contributor throughput and code quality from any git repository, with optional GitHub PR enrichment through `gh`.

## Requirements

- Node.js 20+
- `git`
- `gh` only when using `--include-github`

## Install

Local usage before publish:

```bash
npm install
npm run smoke
```

Global usage after publish:

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

## Publish Checklist

1. Create a public GitHub repository and push this folder.
2. Decide whether `contributor-report-cli` is available on npm. If not, rename the package.
3. Run `npm login`.
4. Run `npm publish --access public`.
5. Verify with `npm view contributor-report-cli`.
