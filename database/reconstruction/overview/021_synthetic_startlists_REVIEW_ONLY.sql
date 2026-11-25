-- REVIEW ONLY. Isolated synthetic startlists, no hosted authorization or worker writes.
-- Existing 019 fixtures are separate single-club races. Do not add opponents silently.
-- Five synthetic riders per existing accepted entry; not original game eligibility.
DO $startlist021$
DECLARE
 t text;
BEGIN
 PERFORM set_config('search_path','pg_catalog',true);
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(410521);
 PERFORM uranius_private.assert_project();
 IF current_user <> 'uranius_migrator' OR session_user <> current_user
 OR current_database()<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 OR current_setting('uranius.approved_project_ref',true) IS DISTINCT FROM 'sdtsivgtcaoaeoihcwzd'
 OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit OR NOT rolcanlogin))
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=current_user::regrole)
 OR (SELECT count(*) FROM uranius_private.migration_ledger)<>15
 OR (SELECT count(*) FROM uranius_catalog.riders)<>200
 OR (SELECT count(*) FROM uranius_catalog.team_owners)<>2
 OR (SELECT count(*) FROM uranius_game.game_state WHERE is_paused AND season_number=1 AND month_number=1 AND day_number=1)<>1
 OR to_regclass('uranius_game.synthetic_race_startlists') IS NOT NULL
 THEN RAISE EXCEPTION '021 isolated baseline refused'; END IF;
 IF EXISTS(
 WITH expected(version,sha256) AS (VALUES
      ('001_identity.sql','87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd'),
      ('002_reference_schema.sql','6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f'),
      ('003_access.sql','b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee'),
      ('004_synthetic_reference.sql','e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317'),
      ('005_club_identity.sql','9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc'),
      ('006_synthetic_world.sql','56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3'),
      ('007_smoke_reader.sql','dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b'),
      ('008_game_clock_v1.sql','f3dadf7b7934e1c8677d24af2d0a57b2be19768f0bc2dc6b45729618c28e349b'),
      ('009_clock_smoke_reader.sql','1be3ce5418ff8a03a787fae81fe2cbd543ad6002cc592222bc2b011245cc4c37'),
      ('010_overview_race_reader.sql','56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af'),
      ('013_squad_reader_grant.sql','8193d80743f6392709a3220441531636751a70fc487c111cc23d1865080be859'),
      ('014_synthetic_rider_uuid.sql','f97126ed0a9259bfeac9ebf3c4158ece7a590b3ae77fd7d66f7efdc26894db6f'),
      ('015_rider_uuid_owner_read.sql','71ade068c5cf5bbdc0e356663a0525f1e74b43e63a9c19f267748f7b46b6161e'),
      ('018_synthetic_nine_skill_attributes.sql','622d7626f5f6d93117cbb755398971d23ca0a870e49bc8c98e2df768630b48cc'),
      ('019_synthetic_race_world.sql','7e5f8a727dfc44784c0a8abf48c51b8ddfb19766a2cc319b7ff31686a068283b')
 )
 (SELECT version,sha256 FROM expected EXCEPT SELECT version,sha256 FROM uranius_private.migration_ledger)
 UNION ALL
 (SELECT version,sha256 FROM uranius_private.migration_ledger EXCEPT SELECT version,sha256 FROM expected)
 ) THEN RAISE EXCEPTION '021 ledger mismatch'; END IF;

 -- Atomic temporary SELECT policies; FORCE RLS remains enabled throughout.
 FOREACH t IN ARRAY ARRAY['race_team_entries','race_preparations'] LOOP
   EXECUTE format('LOCK TABLE uranius_game.%I IN ACCESS EXCLUSIVE MODE',t);
   IF NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='uranius_game'::regnamespace AND c.relname=t
    AND c.relrowsecurity AND c.relforcerowsecurity AND c.relowner=current_user::regrole)
   OR (SELECT count(*) FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t)<>1
   OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='uranius_game' AND tablename=t AND cmd='SELECT' AND roles=ARRAY['uranius_smoke_reader']::name[])
   THEN RAISE EXCEPTION '021 existing policy mismatch on %',t; END IF;
   EXECUTE format('CREATE POLICY uranius_021_temporary_read ON uranius_game.%I FOR SELECT TO uranius_migrator USING (true)',t);
 END LOOP;
 IF (SELECT count(*) FROM uranius_game.race_team_entries)<>2
 OR (SELECT count(*) FROM uranius_game.race_preparations)<>2
 OR (SELECT count(*) FROM uranius_game.race_preparations p
 JOIN uranius_game.race_team_entries e ON e.id=p.race_team_entry_id AND e.race_id=p.race_id AND e.club_id=p.club_id
 JOIN uranius_game.club_profiles c ON c.club_id=p.club_id
 WHERE e.status='accepted' AND e.entry_source='uranius_synthetic_fixture'
 AND p.status='submitted' AND p.startlist_status='submitted'
 AND p.rider_count=0 AND p.finance_transaction_id IS NULL
 AND p.metadata->>'uranius_synthetic'='true'
 AND e.participating_club_id=p.club_id AND p.participating_club_id=p.club_id
 AND ((c.team_id=1 AND p.race_id='19000000-0000-4000-8000-000000000001')
 OR (c.team_id=2 AND p.race_id='19000000-0000-4000-8000-000000000002')) )<>2
 THEN RAISE EXCEPTION '021 accepted preparation fixture mismatch'; END IF;

 -- Redundant unique pair supports a declarative ownership FK; existing PK/unique remain.
 ALTER TABLE uranius_game.club_profiles ADD CONSTRAINT uranius_club_team_pair UNIQUE(team_id,club_id);
 CREATE TABLE uranius_game.synthetic_race_startlists(
   race_id uuid NOT NULL,
   club_id uuid NOT NULL,
   team_id integer NOT NULL,
   rider_id integer NOT NULL REFERENCES uranius_game.synthetic_rider_identity(rider_id) ON DELETE RESTRICT,
   selection_order smallint NOT NULL CHECK(selection_order BETWEEN 1 AND 5),
   role text NOT NULL CHECK(role IN ('captain','domestique')),
   provenance text NOT NULL CHECK(provenance='uranius_synthetic_fixture'),
   PRIMARY KEY(race_id,rider_id),
   UNIQUE(race_id,club_id,selection_order),
   FOREIGN KEY(race_id,club_id) REFERENCES uranius_game.race_preparations(race_id,club_id) ON DELETE RESTRICT,
   FOREIGN KEY(team_id,club_id) REFERENCES uranius_game.club_profiles(team_id,club_id) ON DELETE RESTRICT,
   FOREIGN KEY(team_id,rider_id) REFERENCES uranius_catalog.riders(team_id,rider_id) ON DELETE RESTRICT,
   CHECK((selection_order=1 AND role='captain') OR (selection_order>1 AND role='domestique'))
 );
 REVOKE ALL ON uranius_game.synthetic_race_startlists FROM PUBLIC,anon,authenticated,uranius_smoke_reader;
 INSERT INTO uranius_game.synthetic_race_startlists(race_id,club_id,team_id,rider_id,selection_order,role,provenance)
 SELECT p.race_id,p.club_id,c.team_id,r.rider_id,r.slot,
 CASE WHEN r.slot=1 THEN 'captain' ELSE 'domestique' END,'uranius_synthetic_fixture'
 FROM uranius_game.race_preparations p JOIN uranius_game.club_profiles c ON c.club_id=p.club_id
 CROSS JOIN LATERAL(SELECT rider_id,row_number() OVER(ORDER BY rider_id)::smallint AS slot
 FROM uranius_catalog.riders WHERE team_id=c.team_id ORDER BY rider_id LIMIT 5) r;
 IF (SELECT count(*) FROM uranius_game.synthetic_race_startlists)<>10
 OR (SELECT count(*) FROM (SELECT race_id,club_id FROM uranius_game.synthetic_race_startlists
 GROUP BY race_id,club_id HAVING count(*)=5 AND count(*) FILTER(WHERE role='captain')=1) q)<>2
 THEN RAISE EXCEPTION '021 exact startlist count failed'; END IF;
 ALTER TABLE uranius_game.synthetic_race_startlists ENABLE ROW LEVEL SECURITY;
 ALTER TABLE uranius_game.synthetic_race_startlists FORCE ROW LEVEL SECURITY;
 FOREACH t IN ARRAY ARRAY['race_team_entries','race_preparations'] LOOP
   EXECUTE format('DROP POLICY uranius_021_temporary_read ON uranius_game.%I',t);
 END LOOP;
END
$startlist021$;
