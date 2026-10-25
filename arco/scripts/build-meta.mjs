import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(import.meta.dirname, '..')
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : [resolve(directory, entry.name)]).sort()
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex')

/** Retain the installed editors' license texts, including transitive runtime notices. */
export function copyEditorLicenses(destination) {
  const packages = new Map()
  function collect(name, from) {
    const require = createRequire(resolve(from, 'package.json'))
    let directory = dirname(require.resolve(name))
    let metadata
    while (true) {
      const manifest = resolve(directory, 'package.json')
      if (existsSync(manifest)) {
        const candidate = JSON.parse(readFileSync(manifest, 'utf8'))
        if (candidate.name === name) { metadata = candidate; break }
      }
      const parent = dirname(directory)
      if (parent === directory) throw new Error(`Cannot locate the installed package manifest: ${name}`)
      directory = parent
    }
    const key = `${name}@${metadata.version}`
    if (packages.has(key)) return
    const notices = readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile() && /^(?:licen[cs]e|copying|notices?|copyright)(?:$|[._-])/i.test(entry.name)).map(entry => entry.name).sort()
    if (!notices.length) throw new Error(`The installed editor dependency has no license text: ${key}`)
    packages.set(key, { key, directory, metadata, notices })
    for (const dependency of Object.keys(metadata.dependencies ?? {})) collect(dependency, directory)
  }
  const dependencies = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).dependencies
  for (const name of Object.keys(dependencies).filter(name => name === 'tinymce' || name === 'codemirror' || name.startsWith('@codemirror/'))) collect(name, root)
  const licenseRoot = resolve(destination, 'third-party')
  rmSync(licenseRoot, { recursive: true, force: true })
  mkdirSync(licenseRoot, { recursive: true })
  const sections = ['# Editor third-party notices', '', 'This directory retains the original license and notice files from the installed TinyMCE, CodeMirror and their runtime dependencies. Versions come from installed package manifests; the files are copied without modification. The application license is in [LICENSE](LICENSE).', '']
  for (const { key, directory, metadata, notices } of [...packages.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    const folder = key.replace(/^@/, '').replaceAll('/', '--')
    mkdirSync(resolve(licenseRoot, folder), { recursive: true })
    const repository = typeof metadata.repository === 'string' ? metadata.repository : metadata.repository?.url
    sections.push(`## ${key}`, '', `Package license declaration: ${metadata.license ?? 'See the included license files'}.`)
    if (repository) sections.push(`Source: ${repository.replace(/^git\+/, '').replace(/\.git$/, '')}`)
    sections.push('')
    for (const notice of notices) {
      cpSync(resolve(directory, notice), resolve(licenseRoot, folder, notice))
      sections.push(`- [${notice}](third-party/${folder}/${notice})`)
    }
    sections.push('')
  }
  writeFileSync(resolve(destination, 'THIRD_PARTY_NOTICES.md'), sections.join('\n'))
  return packages.size
}

function writeBuildMetadata() {
  const sourceFiles = [...walk(resolve(root, 'src')), ...walk(resolve(root, 'scripts')), ...['package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'tsconfig.json', 'index.html'].map(file => resolve(root, file))].sort()
  const sourceHash = createHash('sha256').update(sourceFiles.map(file => `${relative(root, file)}:${hash(file)}`).join('\n')).digest('hex')
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const destination = resolve(root, 'dist')
  cpSync(resolve(root, '../LICENSE'), resolve(destination, 'LICENSE'))
  copyEditorLicenses(destination)
  const files = Object.fromEntries(walk(destination).filter(file => !file.endsWith('/SOURCE.json')).map(file => [relative(destination, file), hash(file)]))
  writeFileSync(resolve(destination, 'SOURCE.json'), JSON.stringify({ repository: 'https://github.com/gatework/form-generator', upstream: 'https://github.com/JakHuang/form-generator', branch: git('branch', '--show-current'), baseCommit: git('rev-parse', 'HEAD'), dirty: !!git('status', '--porcelain', '--', 'arco'), sourceHash, files }, null, 2) + '\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) writeBuildMetadata()
