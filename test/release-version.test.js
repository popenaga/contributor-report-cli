import test from 'node:test'
import assert from 'node:assert/strict'

import { bumpPatchVersion, shouldSkipReleaseForCommit } from '../src/lib/release-version.js'

test('bumpPatchVersion increments the patch component', () => {
  assert.equal(bumpPatchVersion('0.1.1'), '0.1.2')
  assert.equal(bumpPatchVersion('1.9.9'), '1.9.10')
})

test('shouldSkipReleaseForCommit skips bot release commits only', () => {
  assert.equal(shouldSkipReleaseForCommit('chore: release 0.1.2'), true)
  assert.equal(shouldSkipReleaseForCommit('feat: align scoring with engineering quality metrics'), false)
})
