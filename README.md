# contributor-report-cli

Generic CLI for measuring contributor throughput and code quality from any git repository, with optional GitHub PR enrichment through `gh`.

Repository: https://github.com/popenaga/contributor-report-cli

## Status

- npm package name `contributor-report-cli` is currently available
- GitHub repository is public and connected
- npm publish has not been run yet

<!-- release:managed:start -->
Current package version: `0.1.0`

Install the current release:
```bash
npm install -g contributor-report-cli@0.1.0
```

Release flow:
- feature PRs add a changeset
- merges to `main` open or update a release PR
- merging the release PR updates npm and creates the GitHub release
<!-- release:managed:end -->

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

## How Code Quality Is Measured

`qualityScore` is a heuristic, not a static-analysis result. The CLI currently uses only git history and test-file path heuristics, then clamps the final score to `0..100`.

Current quality formula:

```text
60
+ min(test-related commits * 1.5, 18)
+ min(test files touched * 1.2, 14)
+ round(test touch ratio * 18)
- min(feature commits without tests * 0.35, 26)
- large change commits * 2
```

Signals used today:

- Test-related commits: a commit touched at least one file that looks like a test
- Test files touched: unique files matching `tests/`, `__tests__/`, `*.test.*`, or `*.unit.test.*`
- Test touch ratio: `testFilesTouched / filesTouched`
- Feature commits without tests: a commit changed non-test files and no test files
- Large change commits: a single commit changed `400` LOC or more

Overall ranking is also explicit:

```text
overallScore = throughputScore * 0.45 + qualityScore * 0.55
```

`throughputScore` is a separate delivery-volume heuristic based on commit count, churn, files touched, and inferred merge PR commits. Generated Markdown and JSON reports now include this methodology section so the score is inspectable at report time.

## Publish

Maintainers should not publish manually in the normal flow.

1. Add a changeset in the feature PR
2. Merge the PR into `main`
3. Review and merge the release PR created by GitHub Actions
4. GitHub Actions publishes to npm and creates the GitHub release

## Release Maintenance

- Required GitHub secret: `NPM_TOKEN`
- Versioning, changelog generation, README sync, and publish are handled by `changesets`
- Run `npm run release:check` locally before merging release-related changes
