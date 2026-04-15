import fs from 'node:fs'

import { syncReleaseReadme } from '../src/lib/release-readme.js'

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const readmePath = new URL('../README.md', import.meta.url)
const readme = fs.readFileSync(readmePath, 'utf8')

const nextReadme = syncReleaseReadme(readme, {
  packageName: packageJson.name,
  version: packageJson.version
})

fs.writeFileSync(readmePath, nextReadme, 'utf8')
