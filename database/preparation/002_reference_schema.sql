SELECT uranius_private.assert_project();

CREATE SCHEMA uranius_catalog;
REVOKE ALL ON SCHEMA uranius_catalog FROM PUBLIC, anon, authenticated;

CREATE TABLE uranius_catalog.seasons (
  season_no integer PRIMARY KEY CHECK (season_no > 0),
  label text NOT NULL
);

CREATE TABLE uranius_catalog.teams (
  team_id integer PRIMARY KEY CHECK (team_id > 0),
  label text NOT NULL UNIQUE
);

CREATE TABLE uranius_catalog.team_owners (
  team_id integer PRIMARY KEY REFERENCES uranius_catalog.teams,
  user_id uuid NOT NULL REFERENCES auth.users (id)
);

CREATE INDEX team_owners_user ON uranius_catalog.team_owners (user_id);

CREATE TABLE uranius_catalog.riders (
  rider_id integer PRIMARY KEY CHECK (rider_id > 0),
  team_id integer NOT NULL REFERENCES uranius_catalog.teams,
  label text NOT NULL,
  flat smallint NOT NULL CHECK (flat BETWEEN 1 AND 100),
  climbing smallint NOT NULL CHECK (climbing BETWEEN 1 AND 100),
  stamina smallint NOT NULL CHECK (stamina BETWEEN 1 AND 100),
  resistance smallint NOT NULL CHECK (resistance BETWEEN 1 AND 100),
  UNIQUE (team_id, rider_id)
);

CREATE TABLE uranius_catalog.equipment (
  equipment_id text PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE uranius_catalog.stages (
  stage_id integer PRIMARY KEY CHECK (stage_id > 0),
  season_no integer NOT NULL REFERENCES uranius_catalog.seasons,
  stage_no integer NOT NULL CHECK (stage_no > 0),
  label text NOT NULL,
  distance_m integer NOT NULL CHECK (distance_m > 0),
  UNIQUE (season_no, stage_no)
);

CREATE TABLE uranius_catalog.terrain (
  stage_id integer NOT NULL REFERENCES uranius_catalog.stages,
  distance_m integer NOT NULL CHECK (distance_m >= 0),
  elevation_m integer NOT NULL,
  PRIMARY KEY (stage_id, distance_m)
);

CREATE TABLE uranius_catalog.startlists (
  stage_id integer NOT NULL REFERENCES uranius_catalog.stages,
  team_id integer NOT NULL,
  rider_id integer NOT NULL,
  PRIMARY KEY (stage_id, rider_id),
  FOREIGN KEY (team_id, rider_id) REFERENCES uranius_catalog.riders (team_id, rider_id)
);
