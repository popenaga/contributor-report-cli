import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

export function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    repoPath: process.cwd(),
    format: 'both',
    includeGitHub: false,
    stdout: false,
    since: '1 month ago'
  }

  for (const arg of argv) {
    if (arg === '--include-github') options.includeGitHub = true
    else if (arg === '--stdout') options.stdout = true
    else if (arg.startsWith('--repo-path=')) options.repoPath = path.resolve(arg.slice('--repo-path='.length))
    else if (arg.startsWith('--repo=')) options.repoSlug = arg.slice('--repo='.length)
    else if (arg.startsWith('--format=')) options.format = arg.slice('--format='.length)
    else if (arg.startsWith('--output-dir=')) options.outputDir = path.resolve(arg.slice('--output-dir='.length))
    else if (arg.startsWith('--since=')) options.since = arg.slice('--since='.length)
    else if (arg.startsWith('--from=')) options.from = arg.slice('--from='.length)
    else if (arg.startsWith('--to=')) options.to = arg.slice('--to='.length)
    else if (arg === '--help') options.help = true
  }

  return options
}

export function detectRepoRoot(startPath = process.cwd()) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: startPath,
    encoding: 'utf8'
  }).trim()
}

export function buildDefaultBaseName({ from, to, since, generatedAt }) {
  if (from || to) {
    return `contributor-report-${from ?? generatedAt}_${to ?? generatedAt}`
  }

  return `contributor-report-${generatedAt}`
}

export function buildOutputPlan({ outputDir, format, baseName }) {
  const plan = {}
  if (format === 'markdown' || format === 'both') {
    plan.markdownPath = path.join(outputDir, `${baseName}.md`)
  }
  if (format === 'json' || format === 'both') {
    plan.jsonPath = path.join(outputDir, `${baseName}.json`)
  }
  return plan
}

export function renderHelpText() {
  return [
    'Usage: contributor-report [options]',
    '',
    'Options:',
    '  --repo-path=/path/to/repo     Analyze a different local repository',
    '  --repo=owner/name             Override GitHub repo slug',
    '  --since="2 weeks ago"         Relative Git date window',
    '  --from=YYYY-MM-DD             Absolute start date',
    '  --to=YYYY-MM-DD               Absolute end date',
    '  --include-github              Fetch GitHub PR metadata with gh',
    '  --format=markdown|json|both   Output format, default: both',
    '  --output-dir=/path            Directory for saved outputs',
    '  --stdout                      Print selected output to stdout',
    '  --help                        Show this help text'
  ].join('\n')
}
