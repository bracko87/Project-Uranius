import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'

// The harness only creates a process-local WASM PostgreSQL instance.
const packageDirectory = path.resolve(process.argv[2] || 'node_modules/@electric-sql/pglite')
const { version } = JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf8'))
assert.equal(version, '0.3.16')
const { PGlite } = await import(pathToFileURL(path.join(packageDirectory, 'dist/index.js')).href)
const directory = new URL('../database/preparation/', import.meta.url)
const names = ['001_identity.sql', '002_reference_schema.sql', '003_access.sql', '004_synthetic_reference.sql']
const fixtureRef = 'localofflinefixture1'
const differentRef = 'localofflinefixture2'
const fixtureUser = '00000000-0000-4000-8000-000000000001'
const otherUser = '00000000-0000-4000-8000-000000000002'

test('ordered database preparation, project identity and access policies', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      CREATE ROLE uranius_migrator;
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
        AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
    `)
    const { rows: [version] } = await db.query('SHOW server_version_num')
    assert.equal(Math.floor(Number(version.server_version_num) / 10000), 17)
    const sql = await Promise.all(names.map(name => readFile(new URL(name, directory), 'utf8')))
    const manifest = JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8'))
    assert.deepEqual(manifest, names.map((file, index) => ({
      file, sha256: createHash('sha256').update(sql[index]).digest('hex'),
    })))
    const files = (await readdir(directory)).filter(name => /^\d{3}_.*\.sql$/.test(name)).sort()
    assert.deepEqual(files, names)
    const preflight = await readFile(new URL('preflight.sql', directory), 'utf8')
    await assert.rejects(db.exec(preflight), /migration role mismatch/)
    await assert.rejects(db.exec(sql[0]), /project identity is missing/)
    for (const [index, migration] of sql.entries()) {
      await db.transaction(async tx => {
        await tx.query("SELECT set_config('uranius.approved_project_ref', $1, true)", [fixtureRef])
        await tx.exec(migration)
        await tx.query('INSERT INTO uranius_private.migration_ledger (version, sha256) VALUES ($1, $2)', [
          names[index], createHash('sha256').update(migration).digest('hex'),
        ])
      })
    }

    await assert.rejects(db.transaction(async tx => {
      await tx.query("SELECT set_config('uranius.approved_project_ref', $1, true)", [differentRef])
      await tx.exec(sql[3])
    }), /project identity does not match/)
    await assert.rejects(db.exec(sql[2]), /project identity does not match/)

    const { rows: counts } = await db.query(
      'SELECT stage_id, count(*)::int AS riders FROM uranius_catalog.startlists GROUP BY stage_id ORDER BY stage_id',
    )
    assert.deepEqual(counts, [
      { stage_id: 1, riders: 100 }, { stage_id: 2, riders: 150 }, { stage_id: 3, riders: 200 },
    ])
    const { rows: endpoints } = await db.query(`
      SELECT s.stage_id FROM uranius_catalog.stages s JOIN uranius_catalog.terrain t USING(stage_id)
      GROUP BY s.stage_id, s.distance_m HAVING min(t.distance_m) = 0 AND max(t.distance_m) = s.distance_m
    `)
    assert.equal(endpoints.length, 3)
    const hostedCheck = await readFile(new URL('verify-initialization.sql', directory), 'utf8')
    const offlineCheck = hostedCheck.split('\\gset')[0]
      .replace('sdtsivgtcaoaeoihcwzd', fixtureRef)
      .replace(/:'hash([1-4])'/g, (_, n) => "'" + manifest[Number(n) - 1].sha256 + "'")
    assert.equal((await db.exec(offlineCheck + '; ROLLBACK;')).at(-2).rows[0].verified, true)

    const { rows: ledger } = await db.query('SELECT version FROM uranius_private.migration_ledger ORDER BY version')
    assert.deepEqual(ledger.map(row => row.version), names)

    await db.query('INSERT INTO uranius_catalog.team_owners VALUES (1, $1), (2, $2)', [fixtureUser, otherUser])
    await assert.rejects(db.transaction(async tx => {
      await tx.exec('SET LOCAL ROLE anon; SELECT * FROM uranius_catalog.stages')
    }), /permission denied/)
    for (const claims of [{}, { sub: 'invalid' }, { user_metadata: { sub: fixtureUser } }]) {
      await db.transaction(async tx => {
        await tx.exec('SET LOCAL ROLE authenticated')
        await tx.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)])
        assert.deepEqual((await tx.query('SELECT * FROM uranius_catalog.riders')).rows, [])
        assert.deepEqual((await tx.query('SELECT * FROM uranius_catalog.stages')).rows, [])
      })
    }
    for (const [user, team] of [[fixtureUser, 1], [otherUser, 2]]) {
      await db.transaction(async tx => {
        await tx.exec('SET LOCAL ROLE authenticated')
        await tx.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user })])
        const own = await tx.query('SELECT DISTINCT team_id FROM uranius_catalog.riders')
        const entries = await tx.query('SELECT DISTINCT team_id FROM uranius_catalog.startlists')
        assert.deepEqual(own.rows, [{ team_id: team }])
        assert.deepEqual(entries.rows, [{ team_id: team }])
      })
    }
    await assert.rejects(db.transaction(async tx => {
      await tx.exec('SET LOCAL ROLE authenticated; DELETE FROM uranius_catalog.teams')
    }), /permission denied/)
    await assert.rejects(db.transaction(async tx => {
      await tx.exec('SET LOCAL ROLE authenticated; SELECT * FROM uranius_private.project_identity')
    }), /permission denied/)
    await db.exec('SET SESSION AUTHORIZATION uranius_migrator')
    await assert.rejects(db.exec(preflight), /target schemas already exist|lacks database CONNECT or CREATE/)
  } finally {
    await db.close()
  }
})

test('preflight rejects the migration login without required database grants', async () => {
  const db = new PGlite()
  try {
    await db.exec('CREATE ROLE uranius_migrator; SET SESSION AUTHORIZATION uranius_migrator;')
    await assert.rejects(db.exec(await readFile(new URL('preflight.sql', directory), 'utf8')), /lacks database CONNECT or CREATE/)
  } finally {
    await db.close()
  }
})
