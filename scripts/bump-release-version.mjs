import fs from 'node:fs'

import { syncReleaseReadme } from '../src/lib/release-readme.js'
import { bumpPatchVersion } from '../src/lib/release-version.js'

const packageJsonPath = new URL('../package.json', import.meta.url)
const packageLockPath = new URL('../package-lock.json', import.meta.url)
const readmePath = new URL('../README.md', import.meta.url)

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'))
const nextVersion = bumpPatchVersion(packageJson.version)

packageJson.version = nextVersion
packageLock.version = nextVersion

if (packageLock.packages?.['']) {
  packageLock.packages[''].version = nextVersion
}

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`, 'utf8')

const readme = fs.readFileSync(readmePath, 'utf8')
const nextReadme = syncReleaseReadme(readme, {
  packageName: packageJson.name,
  version: nextVersion
})

fs.writeFileSync(readmePath, nextReadme, 'utf8')
process.stdout.write(`${nextVersion}\n`)
