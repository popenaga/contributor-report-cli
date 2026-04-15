import fs from 'node:fs'

import { syncReleaseReadme } from '../src/lib/release-readme.js'

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const readmePath = new URL('../README.md', import.meta.url)
const readme = fs.readFileSync(readmePath, 'utf8')

const expectedReadme = syncReleaseReadme(readme, {
  packageName: packageJson.name,
  version: packageJson.version
})

if (readme !== expectedReadme) {
  throw new Error('README managed release block is out of sync. Run `npm run release:readme`.')
}

if (!fs.existsSync(new URL('../.changeset/config.json', import.meta.url))) {
  throw new Error('Missing .changeset/config.json')
}
