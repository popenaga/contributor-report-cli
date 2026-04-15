const START_MARKER = '<!-- release:managed:start -->'
const END_MARKER = '<!-- release:managed:end -->'

export function buildReleaseReadmeBlock({ packageName, version }) {
  return [
    START_MARKER,
    `Current package version: \`${version}\``,
    '',
    'Install the current release:',
    '```bash',
    `npm install -g ${packageName}@${version}`,
    '```',
    '',
    'Release flow:',
    '- feature PRs add a changeset',
    '- merges to `main` open or update a release PR',
    '- merging the release PR updates npm and creates the GitHub release',
    END_MARKER
  ].join('\n')
}

export function syncReleaseReadme(readme, { packageName, version }) {
  const block = buildReleaseReadmeBlock({ packageName, version })
  const pattern = new RegExp(`${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}`)

  if (!pattern.test(readme)) {
    throw new Error('README is missing the managed release markers')
  }

  return readme.replace(pattern, block)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
