import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'
import { RaceAuthority } from '../../src/race-engine/hybrid/raceAuthority'
import { buildSyntheticStage, syntheticWorldDraft } from './stage-input'

it.runIf(Boolean(process.env.URANIUS_PGLITE_ENTRY))('builds engine inputs from the exact reviewed seed SQL', async () => {
  const { PGlite } = await import(pathToFileURL(process.env.URANIUS_PGLITE_ENTRY!).href)
  const db = new PGlite()
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; SET uranius.approved_project_ref = 'localofflinefixture1';")
    for (const name of ['001_identity', '002_reference_schema', '003_access', '004_synthetic_reference']) {
      await db.exec(await readFile(new URL('../preparation/' + name + '.sql', import.meta.url), 'utf8'))
    }
    const { rows: stages } = await db.query('SELECT stage_id, label, distance_m FROM uranius_catalog.stages ORDER BY stage_id')
    expect(stages).toHaveLength(3)
    const { rows: teamIds } = await db.query('SELECT team_id FROM uranius_catalog.teams ORDER BY team_id')
    expect(syntheticWorldDraft.balances.map(entry => entry.teamId)).toEqual(teamIds.map(row => row.team_id))
    expect(syntheticWorldDraft.clubProfiles.map(entry => entry.teamId)).toEqual(teamIds.map(row => row.team_id))
    expect(new Set(syntheticWorldDraft.clubProfiles.map(entry => entry.clubId)).size).toBe(20)
    expect(syntheticWorldDraft.managers.map(entry => entry.teamId)).toEqual([1, 2])
    const { rows: equipment } = await db.query('SELECT equipment_id FROM uranius_catalog.equipment ORDER BY equipment_id')
    expect(equipment.map(row => row.equipment_id)).toEqual(syntheticWorldDraft.equipment)

    for (const stage of stages) {
      const { rows } = await db.query(`
        SELECT r.*, t.label AS team_label
        FROM uranius_catalog.startlists l
        JOIN uranius_catalog.riders r USING (rider_id, team_id)
        JOIN uranius_catalog.teams t USING (team_id)
        WHERE l.stage_id = $1
      `, [stage.stage_id])
      const { rows: terrain } = await db.query(
        'SELECT distance_m, elevation_m FROM uranius_catalog.terrain WHERE stage_id = $1',
        [stage.stage_id],
      )
      const input = buildSyntheticStage(stage, rows, terrain)
      expect(input.riders).toHaveLength([100, 150, 200][stage.stage_id - 1])
      expect(input.profilePoints.at(-1)?.kilometre).toEqual(input.distanceKm)
      const authority = new RaceAuthority(input, {})
      authority.advanceTo(3)
      const elapsed = authority.elapsed()
      expect(elapsed.raceSecond).toBe(90)
      expect(elapsed.revision).toBe(0)
      expect(authority.finalize()).toBeNull()
    }
  } finally {
    await db.close()
  }
}, 60_000)
