BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '__VERIFIED_SUBJECT__')::text, true);
SELECT jsonb_build_object(
  'club', (SELECT to_jsonb(c) FROM uranius_game.clubs c WHERE c.id=uranius_game.get_my_club_id()),
  'riders', (SELECT count(*) FROM uranius_catalog.riders),
  'credits', (SELECT credits FROM uranius_game.opening_balances),
  'calendar', (SELECT count(*) FROM uranius_game.stage_calendar)
);
ROLLBACK;
