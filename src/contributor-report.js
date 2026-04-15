import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { buildDefaultBaseName, buildOutputPlan, detectRepoRoot, parseCliArgs, renderHelpText } from './lib/contributor-report-cli.js'
import { collectContributorReportData } from './lib/contributor-report-core.js'
import { buildGitHubPrMetadata, detectGitHubRepoSlug, fetchMergedPrs, writeGitHubPrMetadataFile } from './lib/contributor-report-github.js'
import { renderJsonReport, renderMarkdownReport } from './lib/contributor-report-renderers.js'

function validateFormat(format) {
  if (!['markdown', 'json', 'both'].includes(format)) {
    throw new Error(`Unsupported format: ${format}`)
  }
}

function ensureAbsoluteRange({ from, to, generatedAt }) {
  if (!from && !to) {
    return null
  }

  return {
    from: from ?? generatedAt,
    to: to ?? generatedAt
  }
}

function runCli() {
  const options = parseCliArgs()

  if (options.help) {
    process.stdout.write(`${renderHelpText()}\n`)
    return
  }

  validateFormat(options.format)

  const repoRoot = detectRepoRoot(options.repoPath)
  const generatedAt = new Date().toISOString().slice(0, 10)
  const absoluteRange = ensureAbsoluteRange({
    from: options.from,
    to: options.to,
    generatedAt
  })

  let githubPrMetadataPath
  let repoSlug = options.repoSlug

  if (options.includeGitHub) {
    if (!absoluteRange) {
      throw new Error('--include-github requires --from and/or --to so the GitHub PR window is explicit')
    }

    repoSlug = repoSlug ?? detectGitHubRepoSlug(repoRoot)
    if (!repoSlug) {
      throw new Error('Unable to detect GitHub repo slug from origin remote. Use --repo=owner/name.')
    }

    const metadata = buildGitHubPrMetadata(
      fetchMergedPrs({
        repoSlug,
        from: absoluteRange.from,
        to: absoluteRange.to
      })
    )

    const metadataBaseName = `contributor-github-pr-metadata-${absoluteRange.from}_${absoluteRange.to}.json`
    githubPrMetadataPath = writeGitHubPrMetadataFile({
      repoRoot,
      outputPath: path.join(options.outputDir ?? path.join(repoRoot, 'contributor-reports'), metadataBaseName),
      metadata
    })
  }

  const reportData = collectContributorReportData({
    repoRoot,
    since: options.since,
    from: options.from,
    to: options.to,
    generatedAt,
    githubPrMetadataPath
  })
  const enrichedReportData = { ...reportData, repoSlug: repoSlug ?? null, repoRoot }

  const markdown = renderMarkdownReport(enrichedReportData)
  const json = renderJsonReport(enrichedReportData)

  if (options.stdout) {
    if (options.format === 'json') process.stdout.write(`${json}\n`)
    else if (options.format === 'markdown') process.stdout.write(markdown)
    else process.stdout.write(`${markdown}\n---\n${json}\n`)
    return
  }

  const outputDir = options.outputDir ?? path.join(repoRoot, 'contributor-reports')
  const baseName = buildDefaultBaseName({
    from: options.from,
    to: options.to,
    since: options.since,
    generatedAt
  })
  const outputPlan = buildOutputPlan({ outputDir, format: options.format, baseName })

  if (outputPlan.markdownPath) {
    fs.mkdirSync(path.dirname(outputPlan.markdownPath), { recursive: true })
    fs.writeFileSync(outputPlan.markdownPath, markdown, 'utf8')
  }

  if (outputPlan.jsonPath) {
    fs.mkdirSync(path.dirname(outputPlan.jsonPath), { recursive: true })
    fs.writeFileSync(outputPlan.jsonPath, json, 'utf8')
  }

  const messages = []
  if (outputPlan.markdownPath) messages.push(outputPlan.markdownPath)
  if (outputPlan.jsonPath) messages.push(outputPlan.jsonPath)
  if (githubPrMetadataPath) messages.push(githubPrMetadataPath)
  process.stdout.write(`${messages.join('\n')}\n`)
}

runCli()
