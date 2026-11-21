import { pathToFileURL } from 'node:url'

const operations = new Set(['deploy', 'migrate', 'admin'])

// Replace these only after the sandbox resources are independently verified.
const approved = Object.freeze({ projectRef: null, origin: null, siteId: null })

export function assertSandboxTarget(operation, env) {
  if (!operations.has(operation)) throw new Error('Unknown sandbox operation.')

  const projectRef = env.URANIUS_SUPABASE_PROJECT_REF
  const origin = env.URANIUS_SUPABASE_URL
  if (!projectRef || !origin) throw new Error('Sandbox project configuration is missing.')
  if (!/^[a-z0-9]{20}$/.test(projectRef) || origin !== `https://${projectRef}.supabase.co`) {
    throw new Error('Sandbox project origin does not exactly match its project reference.')
  }
  if (!approved.projectRef || projectRef !== approved.projectRef || origin !== approved.origin) {
    throw new Error('Sandbox project is unapproved.')
  }

  if (operation === 'deploy' && (!approved.siteId || env.URANIUS_SITE_ID !== approved.siteId)) {
    throw new Error('Sandbox hosting site is missing or unapproved.')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertSandboxTarget(process.argv[2], process.env)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
