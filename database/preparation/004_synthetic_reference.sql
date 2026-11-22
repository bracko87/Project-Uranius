SELECT uranius_private.assert_project();

INSERT INTO uranius_catalog.seasons VALUES (1, 'Synthetic fixture season');
INSERT INTO uranius_catalog.teams
SELECT n, 'Fixture Team ' || n FROM generate_series(1, 20) AS n;

INSERT INTO uranius_catalog.riders
SELECT n, (n - 1) / 10 + 1, 'Fixture Rider ' || n,
  50 + n * 17 % 46, 50 + n * 19 % 46, 55 + n * 13 % 41, 55 + n * 23 % 41
FROM generate_series(1, 200) AS n;

INSERT INTO uranius_catalog.equipment VALUES
  ('road_base', 'Fixture road bicycle'), ('wheel_base', 'Fixture road wheels');

INSERT INTO uranius_catalog.stages VALUES
  (1, 1, 1, 'Fixture flat', 120000),
  (2, 1, 2, 'Fixture rolling', 160000),
  (3, 1, 3, 'Fixture mountain', 200000);

INSERT INTO uranius_catalog.terrain VALUES
  (1, 0, 80), (1, 40000, 100), (1, 80000, 65), (1, 120000, 80),
  (2, 0, 150), (2, 40000, 280), (2, 78000, 570), (2, 92000, 230),
  (2, 130000, 480), (2, 160000, 180),
  (3, 0, 290), (3, 70000, 480), (3, 92000, 1820), (3, 112000, 710),
  (3, 160000, 950), (3, 180000, 2140), (3, 200000, 600);

INSERT INTO uranius_catalog.startlists
SELECT s.stage_id, r.team_id, r.rider_id
FROM uranius_catalog.stages AS s
JOIN uranius_catalog.riders AS r ON r.rider_id <= 50 * (s.stage_id + 1);
