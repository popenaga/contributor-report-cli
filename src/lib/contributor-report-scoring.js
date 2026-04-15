export const LARGE_CHANGE_THRESHOLD = 400

export const scoringMethodology = {
  throughput: {
    formula: 'commitCount * 4 + min(churn, 1200) / 20 + filesTouched * 1.5 + mergePrCount * 3',
    signals: [
      { label: 'Commit count', effect: 'Adds 4 points per commit' },
      { label: 'Code churn', effect: 'Adds up to 60 points from added + deleted lines, capped at 1200 LOC' },
      { label: 'Files touched', effect: 'Adds 1.5 points per unique file touched' },
      { label: 'Merge PR commits', effect: 'Adds 3 points per inferred merge PR commit' }
    ]
  },
  quality: {
    formula:
      '60 + min(test-related commits * 1.5, 18) + min(test files touched * 1.2, 14) + round(test touch ratio * 18) - min(feature commits without tests * 0.35, 26) - large change commits * 2, clamped to 0..100',
    signals: [
      { label: 'Test-related commits', effect: 'Increase quality score by 1.5 each, capped at +18' },
      { label: 'Test files touched', effect: 'Increase quality score by 1.2 each, capped at +14' },
      { label: 'Test touch ratio', effect: 'Increase quality score by round(testFilesTouched / filesTouched * 18)' },
      { label: 'Feature commits without tests', effect: 'Decrease quality score by 0.35 each, capped at -26' },
      { label: 'Large change commits', effect: 'Decrease quality score by 2 each when a commit changes 400 LOC or more' }
    ]
  },
  overall: {
    formula: 'throughputScore * 0.45 + qualityScore * 0.55',
    weights: {
      throughput: 0.45,
      quality: 0.55
    }
  },
  thresholds: {
    churnCapLoc: 1200,
    largeChangeLoc: LARGE_CHANGE_THRESHOLD
  }
}

export function calculateScores(item) {
  const filesTouched = item.filesTouchedSet.size
  const testFilesTouched = item.testFilesTouchedSet.size
  const testTouchRatio = filesTouched === 0 ? 0 : testFilesTouched / filesTouched
  const throughputScore = Math.round(
    item.commitCount * 4 +
      Math.min(item.added + item.deleted, scoringMethodology.thresholds.churnCapLoc) / 20 +
      filesTouched * 1.5 +
      item.mergePrCount * 3
  )
  const qualityBase =
    60 +
    Math.min(item.testRelatedCommitCount * 1.5, 18) +
    Math.min(testFilesTouched * 1.2, 14) +
    Math.round(testTouchRatio * 18) -
    Math.min(item.featureCommitsWithoutTests * 0.35, 26) -
    item.largeChangeCommits * 2
  const qualityScore = Math.max(0, Math.min(100, Math.round(qualityBase)))
  const overallScore = Math.round(
    throughputScore * scoringMethodology.overall.weights.throughput +
      qualityScore * scoringMethodology.overall.weights.quality
  )

  return {
    filesTouched,
    testFilesTouched,
    testTouchRatio: Number(testTouchRatio.toFixed(2)),
    throughputScore,
    qualityScore,
    overallScore
  }
}
