# contributor-report-cli

Generic CLI for measuring contributor throughput and code quality from any git repository, with optional GitHub PR enrichment through `gh`.

Repository: https://github.com/popenaga/contributor-report-cli

## Status

- npm package name `contributor-report-cli` is currently available
- GitHub repository is public and connected
- npm package `contributor-report-cli@0.1.1` has been published successfully

<!-- release:managed:start -->
Current package version: `0.1.1`

Install the current release:
```bash
npm install -g contributor-report-cli@0.1.1
```

Release flow:
- every push to `main` creates the next patch release
- the workflow bumps `package.json` and README to the next version
- the workflow publishes to npm and creates the GitHub release
<!-- release:managed:end -->

## Open Source Notes

- Generated reports can include contributor names, email addresses, PR titles, and other repository-derived metadata.
- Review generated output before sharing it outside your team or committing it to a repository.
- This CLI is intended as an inspection aid, not as a sole basis for hiring, compensation, or performance decisions.

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

These files can contain personally identifiable or organization-specific metadata. Treat them as reviewable artifacts, not automatically safe-to-publish outputs.

## How Big Tech Usually Evaluates Code Quality

Large engineering organizations usually avoid judging code quality from one activity metric alone.

- Microsoft Research's [SPACE framework](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/) argues that developer productivity should be measured across multiple dimensions, not only output or activity.
- Google's DORA program describes software delivery in terms of throughput and instability, and explicitly recommends smaller batches and shorter lead times as improvement levers: [DORA metrics guide](https://dora.dev/guides/dora-metrics/).
- Google's engineering review guidance focuses on design, functionality, tests, and overall code health during review: [Google Engineering Practices](https://google.github.io/eng-practices/review/reviewer/looking-for.html).
- GitHub Code Quality frames repository quality around [reliability and maintainability](https://docs.github.com/code-security/reference/code-quality/metrics-and-ratings), not raw commit volume.

This CLI mirrors that direction by separating engineering signals into:

- `Activity Score`: delivery volume and integration activity
- `Review Flow Score`: merged PR participation, review discussion, and PR lead time
- `Quality Proxy Score`: test touch signals, missing-test risk, and oversized-change risk

`Quality Proxy Score` is still a heuristic, not a static-analysis or defect-density result. The CLI currently uses only git history and test-file path heuristics, then clamps the final proxy score to `0..100`.

Current quality proxy formula:

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
overallScore = weighted average of activityScore, reviewFlowScore, and qualityProxyScore across available dimensions
```

If GitHub PR metadata is not supplied, `Review Flow Score` is omitted rather than treated as zero.

## Metric Definitions

- `Merge Commits (git)`: count of git commits whose subject matches `Merge pull request #...`. This mostly reflects merge-commit workflows and may stay at zero for squash/rebase repositories.
- `Merged PRs (GitHub attributed)`: count of merged GitHub pull requests in the selected window when `--include-github` is enabled and the contributor is selected by dominant git author across commits in that PR.

Generated Markdown and JSON reports include the methodology and these metric definitions directly so the score remains inspectable at report time.

## Publish

Maintainers should not publish manually in the normal flow.

1. Merge a change into `main`
2. GitHub Actions bumps the patch version and commits it back to `main`
3. The same workflow publishes to npm and creates the GitHub release

## Release Maintenance

- Required GitHub secret: `NPM_TOKEN`
- Version bumping, README sync, npm publish, and GitHub releases run automatically on every push to `main`
- Run `npm run release:check` locally before merging release-related changes
- GitHub Actions repository workflow permissions must allow write access and pull request creation

## Community

- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
