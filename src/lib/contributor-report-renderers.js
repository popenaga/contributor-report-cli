export function renderMarkdownReport({ generatedAt, periodLabel, contributors, repoSlug }) {
  const lines = [
    '# Contributor Evaluation Report',
    '',
    `- Generated at: ${generatedAt}`,
    `- Period: ${periodLabel}`,
    `- Repository: ${repoSlug ?? 'local git repository'}`,
    '',
    '## Score Summary',
    '',
    '| Contributor | Commits | Merge PRs | GitHub PRs | Review Cmts | PR Cmts | Avg Lead (h) | Added | Deleted | Files | Test Files | Throughput | Quality | Overall |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ]

  for (const contributor of contributors) {
    lines.push(
      `| ${contributor.name} | ${contributor.commitCount} | ${contributor.mergePrCount} | ${contributor.githubPrCount ?? 0} | ${contributor.githubReviewCommentCount ?? 0} | ${contributor.githubConversationCommentCount ?? 0} | ${contributor.avgLeadTimeHours ?? '-'} | ${contributor.added} | ${contributor.deleted} | ${contributor.filesTouched} | ${contributor.testFilesTouched} | ${contributor.throughputScore} | ${contributor.qualityScore} | ${contributor.overallScore} |`
    )
  }

  lines.push('', '## Detail Signals', '')

  for (const contributor of contributors) {
    lines.push(`### ${contributor.name}`)
    lines.push(`- Email: ${contributor.email}`)
    lines.push(`- Test-related commits: ${contributor.testRelatedCommitCount}`)
    lines.push(`- Feature commits without tests: ${contributor.featureCommitsWithoutTests}`)
    lines.push(`- Large change commits: ${contributor.largeChangeCommits}`)
    lines.push(`- Test touch ratio: ${contributor.testTouchRatio}`)
    lines.push(`- GitHub merged PRs: ${contributor.githubPrCount ?? 0}`)
    lines.push(`- GitHub review comments: ${contributor.githubReviewCommentCount ?? 0}`)
    lines.push(`- GitHub conversation comments: ${contributor.githubConversationCommentCount ?? 0}`)
    lines.push(`- Average PR lead time (hours): ${contributor.avgLeadTimeHours ?? '-'}`)
    lines.push('')
  }

  lines.push('## Caveats', '')
  lines.push('- This report is for evaluation support, not a single metric for personnel decisions.')
  lines.push('- Merge PR count is inferred from merge commit subjects and can differ from actual authorship or reviewer effort.')
  lines.push('- GitHub PR metrics depend on supplied PR metadata and are attributed using the dominant Git author in each PR range.')
  lines.push('- Test-related signals rely on file naming and path heuristics, so manual QA or architectural work can be undercounted.')

  return `${lines.join('\n')}\n`
}

export function renderJsonReport(reportData) {
  return JSON.stringify(reportData, null, 2)
}
