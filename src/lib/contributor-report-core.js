import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  calculateBaseScores,
  calculateOverallScore,
  calculateReviewFlowScore,
  LARGE_CHANGE_THRESHOLD,
  metricDefinitions,
  scoringMethodology
} from './contributor-report-scoring.js'

const MAILMAP_PATTERN = /^(.*?) <([^>]+)> (.*?) <([^>]+)>$/
const COMMIT_MARKER = '--COMMIT--'

export function normalizeIdentity(name, email) {
  return `${String(name).normalize('NFC').trim().toLowerCase()} <${String(email).trim().toLowerCase()}>`
}

export function parseMailmap(content) {
  const mappings = new Map()

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(MAILMAP_PATTERN)
    if (!match) continue

    const [, canonicalName, canonicalEmail, aliasName, aliasEmail] = match
    mappings.set(normalizeIdentity(aliasName, aliasEmail), {
      canonicalName: canonicalName.trim(),
      canonicalEmail: canonicalEmail.trim()
    })
  }

  return mappings
}

export function loadMailmap(repoRoot = process.cwd()) {
  const mailmapPath = path.join(repoRoot, '.mailmap')
  if (!fs.existsSync(mailmapPath)) {
    return new Map()
  }

  return parseMailmap(fs.readFileSync(mailmapPath, 'utf8'))
}

export function isTestPath(filePath) {
  return /(^|\/)(__tests__|tests)\//.test(filePath) || /\.test\.[jt]sx?$/.test(filePath) || /\.unit\.test\.[jt]sx?$/.test(filePath)
}

export function getCanonicalIdentity(name, email, mailmap = new Map()) {
  const normalizedKey = normalizeIdentity(name, email)
  const mapped = mailmap.get(normalizedKey)

  return {
    key: normalizeIdentity(mapped?.canonicalName ?? name, mapped?.canonicalEmail ?? email),
    name: mapped?.canonicalName ?? String(name).normalize('NFC'),
    email: mapped?.canonicalEmail ?? email
  }
}

export function aggregateContributors(commits, mailmap = new Map()) {
  const contributorMap = new Map()

  for (const commit of commits) {
    const canonicalIdentity = getCanonicalIdentity(commit.authorName, commit.authorEmail, mailmap)
    const contributorKey = canonicalIdentity.key

    const current = contributorMap.get(contributorKey) ?? {
      name: canonicalIdentity.name,
      email: canonicalIdentity.email,
      commitCount: 0,
      mergeCommitPrCount: 0,
      added: 0,
      deleted: 0,
      filesTouchedSet: new Set(),
      testFilesTouchedSet: new Set(),
      testRelatedCommitCount: 0,
      featureCommitsWithoutTests: 0,
      largeChangeCommits: 0
    }

    current.commitCount += 1

    if (/^Merge pull request #\d+/i.test(commit.subject)) {
      current.mergeCommitPrCount += 1
    }

    let commitAdded = 0
    let commitDeleted = 0
    let hasTestFile = false
    let hasNonTestFile = false

    for (const file of commit.files) {
      commitAdded += file.added
      commitDeleted += file.deleted
      current.filesTouchedSet.add(file.path)

      if (isTestPath(file.path)) {
        hasTestFile = true
        current.testFilesTouchedSet.add(file.path)
      } else {
        hasNonTestFile = true
      }
    }

    current.added += commitAdded
    current.deleted += commitDeleted

    if (hasTestFile) {
      current.testRelatedCommitCount += 1
    }

    if (hasNonTestFile && !hasTestFile) {
      current.featureCommitsWithoutTests += 1
    }

    if (commitAdded + commitDeleted >= LARGE_CHANGE_THRESHOLD) {
      current.largeChangeCommits += 1
    }

    contributorMap.set(contributorKey, current)
  }

  return [...contributorMap.values()]
    .map((item) => {
      const scores = calculateBaseScores(item)

      return {
        name: item.name,
        email: item.email,
        commitCount: item.commitCount,
        mergeCommitPrCount: item.mergeCommitPrCount,
        added: item.added,
        deleted: item.deleted,
        filesTouched: scores.filesTouched,
        testFilesTouched: scores.testFilesTouched,
        testRelatedCommitCount: item.testRelatedCommitCount,
        featureCommitsWithoutTests: item.featureCommitsWithoutTests,
        largeChangeCommits: item.largeChangeCommits,
        testTouchRatio: scores.testTouchRatio,
        activityScore: scores.activityScore,
        reviewFlowScore: null,
        qualityProxyScore: scores.qualityProxyScore,
        overallScore: calculateOverallScore({
          activityScore: scores.activityScore,
          reviewFlowScore: null,
          qualityProxyScore: scores.qualityProxyScore
        })
      }
    })
    .sort((left, right) => right.overallScore - left.overallScore || right.commitCount - left.commitCount)
}

export function enrichContributorsWithGitHubPrs(contributors, githubPrs = [], mailmap = new Map()) {
  const prMetricsByContributor = new Map()

  for (const pr of githubPrs) {
    if (!pr.mergedAt) continue

    const canonicalIdentity = getCanonicalIdentity(pr.dominantAuthorName, pr.dominantAuthorEmail, mailmap)
    const current = prMetricsByContributor.get(canonicalIdentity.key) ?? {
      githubPrCount: 0,
      githubReviewCommentCount: 0,
      githubConversationCommentCount: 0,
      leadTimeHoursTotal: 0
    }

    current.githubPrCount += 1
    current.githubReviewCommentCount += pr.reviewCommentCount
    current.githubConversationCommentCount += pr.conversationCommentCount
    current.leadTimeHoursTotal += Math.max(
      0,
      (new Date(pr.mergedAt).getTime() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60)
    )

    prMetricsByContributor.set(canonicalIdentity.key, current)
  }

  return contributors
    .map((contributor) => {
      const canonicalIdentity = getCanonicalIdentity(contributor.name, contributor.email, mailmap)
      const metrics = prMetricsByContributor.get(canonicalIdentity.key)

      return {
        ...contributor,
        attributedMergedPullRequestCount: metrics?.githubPrCount ?? 0,
        githubReviewCommentCount: metrics?.githubReviewCommentCount ?? 0,
        githubConversationCommentCount: metrics?.githubConversationCommentCount ?? 0,
        avgLeadTimeHours: metrics?.githubPrCount
          ? Number((metrics.leadTimeHoursTotal / metrics.githubPrCount).toFixed(1))
          : null,
        reviewFlowScore: calculateReviewFlowScore({
          attributedMergedPullRequestCount: metrics?.githubPrCount ?? 0,
          githubReviewCommentCount: metrics?.githubReviewCommentCount ?? 0,
          githubConversationCommentCount: metrics?.githubConversationCommentCount ?? 0,
          avgLeadTimeHours: metrics?.githubPrCount
            ? Number((metrics.leadTimeHoursTotal / metrics.githubPrCount).toFixed(1))
            : null
        }),
        overallScore: calculateOverallScore({
          activityScore: contributor.activityScore,
          reviewFlowScore: calculateReviewFlowScore({
            attributedMergedPullRequestCount: metrics?.githubPrCount ?? 0,
            githubReviewCommentCount: metrics?.githubReviewCommentCount ?? 0,
            githubConversationCommentCount: metrics?.githubConversationCommentCount ?? 0,
            avgLeadTimeHours: metrics?.githubPrCount
              ? Number((metrics.leadTimeHoursTotal / metrics.githubPrCount).toFixed(1))
              : null
          }),
          qualityProxyScore: contributor.qualityProxyScore
        })
      }
    })
    .sort((left, right) => right.overallScore - left.overallScore || right.commitCount - left.commitCount)
}

export function parseGitLog(rawLog) {
  const commits = []
  const chunks = rawLog.split(`${COMMIT_MARKER}\n`).map((item) => item.trim()).filter(Boolean)

  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/)
    const [hash = '', authorName = '', authorEmail = '', subject = ''] = lines.shift()?.split('\t') ?? []
    const files = []

    for (const line of lines) {
      if (!line.trim()) continue
      const [addedRaw, deletedRaw, filePath] = line.split('\t')
      if (!filePath) continue
      const added = /^\d+$/.test(addedRaw) ? Number(addedRaw) : 0
      const deleted = /^\d+$/.test(deletedRaw) ? Number(deletedRaw) : 0
      files.push({ path: filePath, added, deleted })
    }

    commits.push({ hash, authorName, authorEmail, subject, files })
  }

  return commits
}

export function collectGitCommits({ repoRoot = process.cwd(), gitLogArgs = ['--since=1 month ago'] } = {}) {
  const format = `${COMMIT_MARKER}%n%H%x09%an%x09%ae%x09%s%n`
  const rawLog = execFileSync('git', ['log', ...gitLogArgs, '--numstat', `--format=${format}`], {
    cwd: repoRoot,
    encoding: 'utf8'
  })
  return parseGitLog(rawLog)
}

export function loadGitHubPrMetadata(metadataPath, repoRoot = process.cwd()) {
  if (!metadataPath) return []

  const resolvedPath = path.resolve(repoRoot, metadataPath)
  if (!fs.existsSync(resolvedPath)) return []

  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
}

export function buildPeriodOptions({
  since = '1 month ago',
  from,
  to,
  generatedAt = new Date().toISOString().slice(0, 10)
} = {}) {
  if (from || to) {
    const normalizedFrom = from ?? generatedAt
    const normalizedTo = to ?? generatedAt

    return {
      gitLogArgs: [`--since=${normalizedFrom} 00:00:00`, `--until=${normalizedTo} 23:59:59`],
      periodLabel: `${normalizedFrom} ~ ${normalizedTo}`
    }
  }

  return {
    gitLogArgs: [`--since=${since}`],
    periodLabel: `${since} ~ ${generatedAt}`
  }
}

export function collectContributorReportData({
  repoRoot = process.cwd(),
  since = '1 month ago',
  from,
  to,
  generatedAt = new Date().toISOString().slice(0, 10),
  githubPrMetadataPath
} = {}) {
  const periodOptions = buildPeriodOptions({ since, from, to, generatedAt })
  const mailmap = loadMailmap(repoRoot)
  const commits = collectGitCommits({ repoRoot, gitLogArgs: periodOptions.gitLogArgs })
  const contributors = enrichContributorsWithGitHubPrs(
    aggregateContributors(commits, mailmap),
    loadGitHubPrMetadata(githubPrMetadataPath, repoRoot),
    mailmap
  )

  return {
    generatedAt,
    periodLabel: periodOptions.periodLabel,
    scoringMethodology,
    metricDefinitions,
    contributors
  }
}
