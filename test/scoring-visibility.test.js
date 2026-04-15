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
  assert.equal(report.scoringMethodology.overall.weights.activity, 0.25)
  assert.equal(report.scoringMethodology.overall.weights.reviewFlow, 0.35)
  assert.equal(report.scoringMethodology.overall.weights.qualityProxy, 0.4)
  assert.match(report.scoringMethodology.qualityProxy.formula, /feature commits without tests/i)
  assert.match(report.scoringMethodology.industryAlignment[0].source, /SPACE/i)
  assert.match(report.metricDefinitions.mergeCommitPrCount.label, /Merge Commits \(git\)/)
  assert.match(report.metricDefinitions.attributedMergedPullRequestCount.label, /Merged PRs \(GitHub attributed\)/)
})

test('markdown report includes an explicit scoring methodology section', () => {
  const markdown = renderMarkdownReport({
    generatedAt: '2026-04-15',
    periodLabel: '2026-04-01 ~ 2026-04-15',
    repoSlug: 'popenaga/contributor-report-cli',
    contributors: [],
    scoringMethodology: {
      activity: {
        formula: 'commitCount * 3 + min(churn, 1200) / 25 + filesTouched * 1.5 + mergeCommitPrCount * 2'
      },
      reviewFlow: {
        formula: 'baseReviewFlow + merged PR count bonus + review discussion bonus + fast lead time bonus'
      },
      qualityProxy: {
        formula: '60 + test-related commits bonus + test files bonus + test touch ratio bonus - missing-tests penalty - large-change penalty',
        signals: [
          { label: 'Test-related commits', effect: 'Increase quality score' },
          { label: 'Feature commits without tests', effect: 'Decrease quality score' }
        ]
      },
      overall: {
        formula: 'weighted average of activityScore, reviewFlowScore, and qualityProxyScore across available dimensions',
        weights: {
          activity: 0.25,
          reviewFlow: 0.35,
          qualityProxy: 0.4
        }
      },
      industryAlignment: [
        { source: 'SPACE', summary: 'Avoid single-metric productivity evaluation' },
        { source: 'DORA', summary: 'Favor flow and instability indicators such as lead time and rework' }
      ],
      thresholds: {
        largeChangeLoc: 400
      }
    },
    metricDefinitions: {
      mergeCommitPrCount: {
        label: 'Merge Commits (git)',
        definition: 'git merge commits whose subject matches Merge pull request'
      },
      attributedMergedPullRequestCount: {
        label: 'Merged PRs (GitHub attributed)',
        definition: 'merged GitHub pull requests attributed by dominant git author'
      }
    }
  })

  assert.match(markdown, /## Scoring Methodology/)
  assert.match(markdown, /weighted average of activityScore, reviewFlowScore, and qualityProxyScore/)
  assert.match(markdown, /## Metric Definitions/)
  assert.match(markdown, /Merge Commits \(git\)/)
  assert.match(markdown, /Merged PRs \(GitHub attributed\)/)
  assert.match(markdown, /## Industry Alignment/)
  assert.match(markdown, /SPACE/)
  assert.match(markdown, /DORA/)
  assert.match(markdown, /Feature commits without tests/)
  assert.match(markdown, /400 LOC/)
})
