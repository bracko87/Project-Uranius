import { pathToFileURL } from 'node:url'

const databaseRoles = new Map([
  ['migrate', 'uranius_migrator'],
  ['write', 'uranius_worker'],
  ['schedule', 'uranius_scheduler'],
])
const operations = new Set(['deploy', 'admin', ...databaseRoles.keys()])

// Replace these only after the sandbox resources are independently verified.
const approved = Object.freeze({ projectRef: null, origin: null, sessionPoolerHost: null })

export function assertSandboxDatabaseUrl(databaseUrl, projectRef, role, sessionPoolerHost = null) {
  let target
  try {
    target = new URL(databaseUrl)
  } catch {
    throw new Error('Sandbox database connection is missing or malformed.')
  }

  const direct = target.host === 'db.' + projectRef + '.supabase.co:5432' && target.username === role
  const sessionPooler = sessionPoolerHost &&
    /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(sessionPoolerHost) &&
    target.host === sessionPoolerHost + ':5432' && target.username === role + '.' + projectRef

  if (!/^[a-z0-9]{20}$/.test(projectRef) ||
      target.protocol !== 'postgresql:' ||
      (!direct && !sessionPooler) ||
      target.pathname !== '/postgres' || target.hash ||
      !target.password ||
      target.search !== '?sslmode=verify-full') {
    throw new Error('Sandbox database connection does not match the approved target and role.')
  }
}

export function assertSandboxTarget(operation, env) {
  if (!operations.has(operation)) throw new Error('Unknown sandbox operation.')
  if (operation === 'deploy') throw new Error('Deployment is disabled. Uranius runs locally.')

  const projectRef = env.URANIUS_SUPABASE_PROJECT_REF
  const origin = env.URANIUS_SUPABASE_URL
  if (!projectRef || !origin) throw new Error('Sandbox project configuration is missing.')
  if (!/^[a-z0-9]{20}$/.test(projectRef) || origin !== `https://${projectRef}.supabase.co`) {
    throw new Error('Sandbox project origin does not exactly match its project reference.')
  }
  if (!approved.projectRef || projectRef !== approved.projectRef || origin !== approved.origin) {
    throw new Error('Sandbox project is unapproved.')
  }

  const role = databaseRoles.get(operation)
  if (role) assertSandboxDatabaseUrl(env.URANIUS_DATABASE_URL, projectRef, role, approved.sessionPoolerHost)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertSandboxTarget(process.argv[2], process.env)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
