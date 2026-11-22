SELECT uranius_private.assert_project();

-- Managed schema exposure remains a separate dashboard decision.
REVOKE ALL ON ALL TABLES IN SCHEMA uranius_catalog FROM PUBLIC, anon, authenticated;

ALTER TABLE uranius_catalog.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.team_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.terrain ENABLE ROW LEVEL SECURITY;
ALTER TABLE uranius_catalog.startlists ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA uranius_catalog TO authenticated;
GRANT SELECT ON uranius_catalog.seasons, uranius_catalog.teams,
  uranius_catalog.team_owners, uranius_catalog.riders, uranius_catalog.equipment,
  uranius_catalog.stages, uranius_catalog.terrain, uranius_catalog.startlists TO authenticated;

CREATE POLICY seasons_read ON uranius_catalog.seasons FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY teams_read ON uranius_catalog.teams FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY equipment_read ON uranius_catalog.equipment FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY stages_read ON uranius_catalog.stages FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY terrain_read ON uranius_catalog.terrain FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY team_owners_read ON uranius_catalog.team_owners FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY riders_read ON uranius_catalog.riders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM uranius_catalog.team_owners AS owner
    WHERE owner.team_id = riders.team_id AND owner.user_id = (SELECT auth.uid())
  ));
CREATE POLICY startlists_read ON uranius_catalog.startlists FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM uranius_catalog.team_owners AS owner
    WHERE owner.team_id = startlists.team_id AND owner.user_id = (SELECT auth.uid())
  ));
