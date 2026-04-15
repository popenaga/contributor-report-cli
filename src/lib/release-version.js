export function bumpPatchVersion(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/)

  if (!match) {
    throw new Error(`Unsupported version format: ${version}`)
  }

  const [, major, minor, patch] = match
  return `${major}.${minor}.${Number(patch) + 1}`
}

export function shouldSkipReleaseForCommit(message = '') {
  return String(message).startsWith('chore: release ')
}
