export const LARGE_CHANGE_THRESHOLD = 400
const CHURN_CAP_LOC = 1200
const REVIEW_DISCUSSION_CAP = 18
const MERGED_PR_CAP = 20

export const metricDefinitions = {
  mergeCommitPrCount: {
    label: 'Merge Commits (git)',
    definition: 'Count of git commits whose subject matches `Merge pull request #...`.',
    caveat: 'This only captures merge-commit workflows. Squash or rebase merges can leave this at zero.'
  },
  attributedMergedPullRequestCount: {
    label: 'Merged PRs (GitHub attributed)',
    definition:
      'Count of merged GitHub pull requests in the selected window when `--include-github` is enabled and the PR is attributed to the contributor by dominant git author across commits in that PR.',
    caveat: 'This depends on supplied GitHub metadata and is an attribution heuristic, not GitHub authorship ground truth.'
  },
  githubReviewCommentCount: {
    label: 'Review Comments',
    definition: 'Count of GitHub review comments on attributed merged pull requests in the selected window.'
  },
  githubConversationCommentCount: {
    label: 'PR Comments',
    definition: 'Count of top-level GitHub pull request conversation comments on attributed merged pull requests.'
  },
  avgLeadTimeHours: {
    label: 'Avg PR Lead (h)',
    definition: 'Average hours between PR creation and merge for attributed merged pull requests.'
  }
}

export const scoringMethodology = {
  activity: {
    formula: 'commitCount * 3 + min(churn, 1200) / 25 + filesTouched * 1.5 + mergeCommitPrCount * 2',
    signals: [
      { label: 'Commit count', effect: 'Adds 3 points per commit' },
      { label: 'Code churn', effect: 'Adds up to 48 points from added + deleted lines, capped at 1200 LOC' },
      { label: 'Files touched', effect: 'Adds 1.5 points per unique file touched' },
      { label: 'Merge Commits (git)', effect: 'Adds 2 points per merge commit to reflect integration activity' }
    ]
  },
  reviewFlow: {
    formula:
      '60 + min(attributedMergedPullRequestCount * 4, 20) + min((reviewComments + prComments) * 0.6, 18) + leadTimeBonus(avgLeadTimeHours), clamped to 0..100',
    signals: [
      { label: 'Merged PRs (GitHub attributed)', effect: 'Adds 4 points each, capped at +20' },
      { label: 'Review and PR discussion', effect: 'Adds 0.6 points per comment across review and conversation comments, capped at +18' },
      { label: 'PR lead time', effect: 'Adds +12 at <=24h, +8 at <=72h, +4 at <=168h, else +0' }
    ],
    availability: 'Only available when GitHub merged PR metadata is supplied with `--include-github`.'
  },
  qualityProxy: {
    formula:
      '60 + min(test-related commits * 1.5, 18) + min(test files touched * 1.2, 14) + round(test touch ratio * 18) - min(feature commits without tests * 0.35, 26) - large change commits * 2, clamped to 0..100',
    signals: [
      { label: 'Test-related commits', effect: 'Increase quality proxy by 1.5 each, capped at +18' },
      { label: 'Test files touched', effect: 'Increase quality proxy by 1.2 each, capped at +14' },
      { label: 'Test touch ratio', effect: 'Increase quality proxy by round(testFilesTouched / filesTouched * 18)' },
      { label: 'Feature commits without tests', effect: 'Decrease quality proxy by 0.35 each, capped at -26' },
      { label: 'Large change commits', effect: `Decrease quality proxy by 2 each when a commit changes ${LARGE_CHANGE_THRESHOLD} LOC or more` }
    ]
  },
  overall: {
    formula:
      'Weighted average of activityScore, reviewFlowScore, and qualityProxyScore across available dimensions. Missing reviewFlowScore does not penalize contributors when GitHub metadata is absent.',
    weights: {
      activity: 0.25,
      reviewFlow: 0.35,
      qualityProxy: 0.4
    }
  },
  thresholds: {
    churnCapLoc: CHURN_CAP_LOC,
    largeChangeLoc: LARGE_CHANGE_THRESHOLD
  },
  industryAlignment: [
    {
      source: 'Microsoft Research / SPACE',
      url: 'https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/',
      summary: 'Avoid evaluating engineering work with one activity metric. Use multiple dimensions that stay in tension.'
    },
    {
      source: 'Google Cloud / DORA',
      url: 'https://dora.dev/guides/dora-metrics/',
      summary: 'Track throughput and instability together, and favor smaller batches and shorter lead times.'
    },
    {
      source: 'Google Engineering Practices',
      url: 'https://google.github.io/eng-practices/review/reviewer/looking-for.html',
      summary: 'Code review should prioritize design, functionality, tests, and code health, not just change volume.'
    },
    {
      source: 'GitHub Code Quality',
      url: 'https://docs.github.com/code-security/reference/code-quality/metrics-and-ratings',
      summary: 'Quality discussions should distinguish reliability and maintainability. This CLI reports proxies for those concerns, not static analysis findings.'
    }
  ]
}

export function calculateBaseScores(item) {
  const filesTouched = item.filesTouchedSet.size
  const testFilesTouched = item.testFilesTouchedSet.size
  const testTouchRatio = filesTouched === 0 ? 0 : testFilesTouched / filesTouched
  const activityScore = Math.round(
    item.commitCount * 3 +
      Math.min(item.added + item.deleted, CHURN_CAP_LOC) / 25 +
      filesTouched * 1.5 +
      item.mergeCommitPrCount * 2
  )
  const qualityProxyBase =
    60 +
    Math.min(item.testRelatedCommitCount * 1.5, 18) +
    Math.min(testFilesTouched * 1.2, 14) +
    Math.round(testTouchRatio * 18) -
    Math.min(item.featureCommitsWithoutTests * 0.35, 26) -
    item.largeChangeCommits * 2
  const qualityProxyScore = clampScore(qualityProxyBase)

  return {
    filesTouched,
    testFilesTouched,
    testTouchRatio: Number(testTouchRatio.toFixed(2)),
    activityScore,
    qualityProxyScore
  }
}

export function calculateReviewFlowScore({
  attributedMergedPullRequestCount,
  githubReviewCommentCount,
  githubConversationCommentCount,
  avgLeadTimeHours
}) {
  if (!attributedMergedPullRequestCount) {
    return null
  }

  const discussionCount = githubReviewCommentCount + githubConversationCommentCount
  const reviewFlowBase =
    60 +
    Math.min(attributedMergedPullRequestCount * 4, MERGED_PR_CAP) +
    Math.min(discussionCount * 0.6, REVIEW_DISCUSSION_CAP) +
    calculateLeadTimeBonus(avgLeadTimeHours)

  return clampScore(reviewFlowBase)
}

export function calculateOverallScore({ activityScore, reviewFlowScore, qualityProxyScore }) {
  const availableScores = [
    ['activity', activityScore],
    ['reviewFlow', reviewFlowScore],
    ['qualityProxy', qualityProxyScore]
  ].filter(([, score]) => typeof score === 'number')

  const totalWeight = availableScores.reduce((sum, [dimension]) => sum + scoringMethodology.overall.weights[dimension], 0)
  const weightedScore = availableScores.reduce(
    (sum, [dimension, score]) => sum + score * scoringMethodology.overall.weights[dimension],
    0
  )

  return totalWeight ? Math.round(weightedScore / totalWeight) : null
}

function calculateLeadTimeBonus(avgLeadTimeHours) {
  if (avgLeadTimeHours == null) return 0
  if (avgLeadTimeHours <= 24) return 12
  if (avgLeadTimeHours <= 72) return 8
  if (avgLeadTimeHours <= 168) return 4
  return 0
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
