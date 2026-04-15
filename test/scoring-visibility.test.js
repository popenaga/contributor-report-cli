import test from 'node:test'
import assert from 'node:assert/strict'

import { collectContributorReportData } from '../src/lib/contributor-report-core.js'
import { renderMarkdownReport } from '../src/lib/contributor-report-renderers.js'

test('report data exposes scoring methodology metadata', () => {
  const report = collectContributorReportData({
    repoRoot: process.cwd(),
    since: '100 years ago',
    generatedAt: '2026-04-15'
  })

  assert.ok(report.scoringMethodology)
  assert.equal(report.scoringMethodology.overall.weights.throughput, 0.45)
  assert.match(report.scoringMethodology.quality.formula, /feature commits without tests/i)
  assert.match(report.scoringMethodology.quality.signals[0].label, /test-related commits/i)
})

test('markdown report includes an explicit scoring methodology section', () => {
  const markdown = renderMarkdownReport({
    generatedAt: '2026-04-15',
    periodLabel: '2026-04-01 ~ 2026-04-15',
    repoSlug: 'popenaga/contributor-report-cli',
    contributors: [],
    scoringMethodology: {
      throughput: {
        formula: 'commitCount * 4 + min(churn, 1200) / 20 + filesTouched * 1.5 + mergePrCount * 3'
      },
      quality: {
        formula: '60 + test-related commits bonus + test files bonus + test touch ratio bonus - missing-tests penalty - large-change penalty',
        signals: [
          { label: 'Test-related commits', effect: 'Increase quality score' },
          { label: 'Feature commits without tests', effect: 'Decrease quality score' }
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
        largeChangeLoc: 400
      }
    }
  })

  assert.match(markdown, /## Scoring Methodology/)
  assert.match(markdown, /throughputScore \* 0\.45 \+ qualityScore \* 0\.55/)
  assert.match(markdown, /Feature commits without tests/)
  assert.match(markdown, /400 LOC/)
})
