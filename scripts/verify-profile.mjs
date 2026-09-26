/** Install the packed plugin through the real CLI, boot, read, remove, and compare. */
import {spawn, execFileSync} from 'node:child_process'
import {mkdir, mkdtemp, readFile, writeFile, readdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname, resolve, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = process.env.DSH_SOURCE_DIR
if (!source) throw new Error('Set DSH_SOURCE_DIR to a built Desktop 0.5.10 source tree')
const cli = resolve(source, 'apps/cli/lib/bin.js')
const artifact = join(root, 'dist/missher-dsh-usage-statistics-0.1.0.tgz')
await mkdir(join(root, '.verification'), {recursive: true})
const work = await mkdtemp(join(root, '.verification/profile-'))
await writeFile(join(work, 'package.json'), JSON.stringify({name:'usage-statistics-acceptance-fixtures',private:true,type:'module'}))
await writeFile(join(work, 'seed.mjs'), await readFile(join(root, 'scripts/acceptance-seed.mjs')))
const home = join(work, 'home')
const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TZ'].filter(k => process.env[k]).map(k => [k, process.env[k]]))
Object.assign(env, {DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', MISSHER_TENCENTDB_DIR: join(work, 'unused-memory')})
const run = args => execFileSync(process.execPath, [cli, ...args], {cwd: work, env, encoding: 'utf8', stdio: ['ignore','pipe','pipe'], timeout: 60_000})
const profile = 'usage-preview'
const patch = join(home, 'profiles', profile, 'cordis.patch.yml')
const base = run(['--profile', profile, '--from-default-profile', 'web', '--dump-config'])
await writeFile(join(work, 'install.log'), run(['plugin', '--profile', profile, 'add', artifact, '--offline']))
const composed = run(['--profile', profile, '--dump-config'])
assert(composed.includes('missher-usage-statistics'))
await writeFile(join(work, 'composed.yml'), composed)
let child
let closed
async function stop() {
  if (!child) return
  child.kill('SIGTERM')
  const timer = setTimeout(() => child?.kill('SIGKILL'), 8000)
  await closed
  clearTimeout(timer)
  child = undefined
}
async function bootAndRead(mode) {
  const receipt = join(work, `${mode}.json`)
  const reporter = join(work, `${mode}-reporter.mjs`)
  const service = mode === 'installed' ? 'usageStatistics' : 'usageInsights'
  await writeFile(reporter, `import {writeFile} from 'node:fs/promises';
export const inject=['${service}','usageStatisticsAcceptanceSeed'];
export async function apply(ctx){const snapshot=await ctx.${service}.snapshot();await writeFile(${JSON.stringify(receipt)},JSON.stringify({snapshot,pluginActive:ctx.get('usageStatistics')!==undefined}));}`)
  await writeFile(patch, `- insert:\n    - id: acceptance-seed\n      name: ${JSON.stringify(join(work,'seed.mjs'))}\n    - id: acceptance-reporter\n      name: ${JSON.stringify(reporter)}\n`)
  child = spawn(process.execPath, [cli,'--profile',profile,'--no-open','--host','127.0.0.1','--port','0'], {cwd: work, env, stdio:['ignore','pipe','pipe']})
  let log = ''
  child.stdout.on('data', chunk => { log += chunk.toString() })
  child.stderr.on('data', chunk => { log += chunk.toString() })
  closed = new Promise(resolve => child.once('exit', resolve))
  const deadline = Date.now()+40_000
  while (!existsSync(receipt)) {
    if (Date.now()>deadline || child.exitCode!==null) {
      await writeFile(join(work, `${mode}.log`), log)
      throw new Error(`Profile ${mode} failed; inspect ${work}/${mode}.log`)
    }
    await new Promise(resolve => setTimeout(resolve,100))
  }
  const report = JSON.parse(await readFile(receipt,'utf8'))
  assert.equal(report.snapshot.summary.totalTokens,30_000)
  assert.equal(report.snapshot.insights.cacheHitRate,0.76)
  assert.equal(report.snapshot.sessionCount,1)
  assert.equal(report.snapshot.omittedSessions,0)
  assert.equal(report.pluginActive,mode==='installed')
  await stop()
  await writeFile(join(work, `${mode}.log`), log)
  return report.snapshot
}
async function protectedSessions(dir, result={}) {
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const path=join(dir,entry.name)
    if(entry.isDirectory()) await protectedSessions(path,result)
    else if(entry.isFile()) result[path.slice(home.length)]=createHash('sha256').update(await readFile(path)).digest('hex')
  }
  return result
}
try {
  const installed=await bootAndRead('installed')
  const before=await protectedSessions(join(home,'sessions'))
  await writeFile(patch,'[]\n')
  await writeFile(join(work,'remove.log'),run(['plugin','--profile',profile,'remove','@missher/dsh-usage-statistics']))
  assert.equal(run(['--profile',profile,'--dump-config']),base)
  const restored=await bootAndRead('restored')
  assert.deepEqual(restored.summary,installed.summary)
  assert.deepEqual(await protectedSessions(join(home,'sessions')),before)
  const report={runtime:'0.1.5-rc.2',artifactSha256:createHash('sha256').update(await readFile(artifact)).digest('hex'),install:true,loaderBoot:true,privateRemoteManifest:true,syntheticTokens:30_000,cacheHitRate:0.76,uninstallRestoresBase:true,originalServiceRestored:true,sessionBytesUnchanged:true,realModel:false}
  await writeFile(join(root,'verification/profile.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
} finally {await stop()}
