-- READ ONLY calendar snapshot for privileged isolated review; not a manager API.
-- Use only on the verified Uranius database. No grants, no clock or race writes.
-- Hosted migrator use requires narrow transactional read policies on FORCE RLS tables.
SELECT jsonb_build_object(
 'clock',(SELECT jsonb_build_object('date',make_date(1999+season_number,month_number,day_number),'paused',is_paused) FROM uranius_game.game_state WHERE id),
 'stages',coalesce((SELECT jsonb_agg(jsonb_build_object(
  'raceId',r.id,'stageId',s.id,'stageName',s.name,'stageDate',s.stage_date,
  'stageNumber',s.stage_number,'distanceKm',s.distance_km,'terrainType',s.terrain_type,
  'stageFormat',s.stage_format,'raceStatus',r.status,
  'acceptedClubs',coalesce((SELECT jsonb_agg(e.club_id ORDER BY e.club_id)
    FROM uranius_game.race_team_entries e WHERE e.race_id=r.id AND e.status='accepted'),'[]'::jsonb),
  'preparedClubs',coalesce((SELECT jsonb_agg(p.club_id ORDER BY p.club_id)
    FROM uranius_game.race_preparations p JOIN uranius_game.race_team_entries e
    ON e.id=p.race_team_entry_id AND e.race_id=p.race_id AND e.club_id=p.club_id
    WHERE p.race_id=r.id AND e.status='accepted' AND e.entry_source='uranius_synthetic_fixture'
    AND e.participating_club_id=p.club_id AND p.participating_club_id=p.club_id
    AND p.status='submitted' AND p.startlist_status='submitted' AND p.total_cost_cash=0
    AND p.finance_transaction_id IS NULL AND p.metadata->>'uranius_synthetic'='true'),'[]'::jsonb),
  'rows',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'riderUuid',i.rider_uuid,'clubId',l.club_id,'teamId',l.team_id,'riderName',c.label,'teamName',t.label,
    'selectionOrder',l.selection_order,'role',l.role,'flat',c.flat,'climbing',c.climbing,'stamina',c.stamina,
    'resistance',c.resistance,'provenance',l.provenance) ORDER BY l.team_id,l.selection_order)
    FROM uranius_game.synthetic_race_startlists l JOIN uranius_catalog.riders c USING(rider_id)
    JOIN uranius_game.synthetic_rider_identity i USING(rider_id)
    JOIN uranius_catalog.teams t ON t.team_id=l.team_id WHERE l.race_id=r.id),'[]'::jsonb),
  'hasJob',EXISTS(SELECT 1 FROM uranius_jobs.race_jobs j WHERE j.stage_id=s.id),
  'hasArchive',EXISTS(SELECT 1 FROM uranius_private.synthetic_completed_race_runs a WHERE a.stage_id=s.id))
 ORDER BY s.stage_date,s.stage_number,s.id)
 FROM uranius_game.race_stages s JOIN uranius_game.races r ON r.id=s.race_id
 WHERE r.metadata->>'uranius_synthetic'='true' AND s.metadata->>'uranius_synthetic'='true'),'[]'::jsonb)
);
