export function renderMarkdownReport({ generatedAt, periodLabel, contributors, repoSlug, scoringMethodology, metricDefinitions }) {
  const lines = [
    '# Contributor Evaluation Report',
    '',
    `- Generated at: ${generatedAt}`,
    `- Period: ${periodLabel}`,
    `- Repository: ${repoSlug ?? 'local git repository'}`,
    '',
    '## Score Summary',
    '',
    '| Contributor | Commits | Merge Commits (git) | Merged PRs (GitHub attributed) | Review Cmts | PR Cmts | Avg PR Lead (h) | Added | Deleted | Files | Test Files | Activity | Review Flow | Quality Proxy | Overall |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ]

  for (const contributor of contributors) {
    lines.push(
      `| ${contributor.name} | ${contributor.commitCount} | ${contributor.mergeCommitPrCount} | ${contributor.attributedMergedPullRequestCount ?? 0} | ${contributor.githubReviewCommentCount ?? 0} | ${contributor.githubConversationCommentCount ?? 0} | ${contributor.avgLeadTimeHours ?? '-'} | ${contributor.added} | ${contributor.deleted} | ${contributor.filesTouched} | ${contributor.testFilesTouched} | ${contributor.activityScore} | ${contributor.reviewFlowScore ?? '-'} | ${contributor.qualityProxyScore} | ${contributor.overallScore ?? '-'} |`
    )
  }

  if (scoringMethodology) {
    lines.push('', '## Scoring Methodology', '')
    lines.push(`- Overall formula: \`${scoringMethodology.overall.formula}\``)
    lines.push(`- Activity formula: \`${scoringMethodology.activity.formula}\``)
    lines.push(`- Review flow formula: \`${scoringMethodology.reviewFlow.formula}\``)
    lines.push(`- Quality proxy formula: \`${scoringMethodology.qualityProxy.formula}\``)
    lines.push(`- Large change threshold: ${scoringMethodology.thresholds.largeChangeLoc} LOC in a single commit`)
    lines.push('', '### Quality Proxy Signals', '')

    for (const signal of scoringMethodology.qualityProxy.signals) {
      lines.push(`- ${signal.label}: ${signal.effect}`)
    }

    lines.push('', '## Metric Definitions', '')
  }

  if (metricDefinitions) {
    for (const definition of Object.values(metricDefinitions)) {
      lines.push(`- ${definition.label}: ${definition.definition}${definition.caveat ? ` ${definition.caveat}` : ''}`)
    }
  }

  if (scoringMethodology?.industryAlignment) {
    lines.push('', '## Industry Alignment', '')

    for (const item of scoringMethodology.industryAlignment) {
      lines.push(`- ${item.source}: ${item.summary} (${item.url})`)
    }
  }

  lines.push('', '## Detail Signals', '')

  for (const contributor of contributors) {
    lines.push(`### ${contributor.name}`)
    lines.push(`- Email: ${contributor.email}`)
    lines.push(`- Merge Commits (git): ${contributor.mergeCommitPrCount}`)
    lines.push(`- Merged PRs (GitHub attributed): ${contributor.attributedMergedPullRequestCount ?? 0}`)
    lines.push(`- Test-related commits: ${contributor.testRelatedCommitCount}`)
    lines.push(`- Feature commits without tests: ${contributor.featureCommitsWithoutTests}`)
    lines.push(`- Large change commits: ${contributor.largeChangeCommits}`)
    lines.push(`- Test touch ratio: ${contributor.testTouchRatio}`)
    lines.push(`- GitHub review comments: ${contributor.githubReviewCommentCount ?? 0}`)
    lines.push(`- GitHub conversation comments: ${contributor.githubConversationCommentCount ?? 0}`)
    lines.push(`- Average PR lead time (hours): ${contributor.avgLeadTimeHours ?? '-'}`)
    lines.push('')
  }

  lines.push('## Caveats', '')
  lines.push('- This report is for evaluation support, not a single metric for personnel decisions.')
  lines.push('- Activity is intentionally only one dimension. This report follows SPACE guidance and does not treat commit volume as code quality by itself.')
  lines.push('- Merge Commits (git) are inferred from commit subjects and mainly reflect repositories using merge commits, not squash or rebase workflows.')
  lines.push('- Merged PRs (GitHub attributed) depend on supplied PR metadata and are attributed using the dominant git author in each PR range.')
  lines.push('- Review Flow is only available when GitHub merged PR metadata is supplied with `--include-github`.')
  lines.push('- Test-related signals rely on file naming and path heuristics, so manual QA or architectural work can be undercounted.')

  return `${lines.join('\n')}\n`
}

export function renderJsonReport(reportData) {
  return JSON.stringify(reportData, null, 2)
}
