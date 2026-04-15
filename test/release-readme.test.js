import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReleaseReadmeBlock, syncReleaseReadme } from '../src/lib/release-readme.js'

test('buildReleaseReadmeBlock renders the managed release section', () => {
  const block = buildReleaseReadmeBlock({
    packageName: 'contributor-report-cli',
    version: '1.2.3'
  })

  assert.match(block, /Current package version: `1\.2\.3`/)
  assert.match(block, /npm install -g contributor-report-cli@1\.2\.3/)
})

test('syncReleaseReadme replaces the managed release block', () => {
  const readme = [
    '# contributor-report-cli',
    '',
    '<!-- release:managed:start -->',
    'outdated',
    '<!-- release:managed:end -->'
  ].join('\n')

  const nextReadme = syncReleaseReadme(readme, {
    packageName: 'contributor-report-cli',
    version: '2.0.0'
  })

  assert.doesNotMatch(nextReadme, /outdated/)
  assert.match(nextReadme, /Current package version: `2\.0\.0`/)
})
