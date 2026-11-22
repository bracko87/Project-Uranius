DO $$
DECLARE
  ref text := current_setting('uranius.approved_project_ref', true);
BEGIN
  IF ref IS NULL OR ref !~ '^[a-z0-9]{20}$' THEN
    RAISE EXCEPTION 'Uranius project identity is missing or invalid';
  END IF;
END
$$;

CREATE SCHEMA uranius_private;
REVOKE ALL ON SCHEMA uranius_private FROM PUBLIC, anon, authenticated;

CREATE TABLE uranius_private.project_identity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  project_ref text NOT NULL CHECK (project_ref ~ '^[a-z0-9]{20}$')
);

INSERT INTO uranius_private.project_identity (project_ref)
VALUES (current_setting('uranius.approved_project_ref'));

CREATE FUNCTION uranius_private.assert_project()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM uranius_private.project_identity
    WHERE project_ref = current_setting('uranius.approved_project_ref', true)
  ) THEN
    RAISE EXCEPTION 'Uranius project identity does not match';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION uranius_private.assert_project() FROM PUBLIC, anon, authenticated;

CREATE TABLE uranius_private.migration_ledger (
  version text PRIMARY KEY,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
);
