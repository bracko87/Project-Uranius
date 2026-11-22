DO $$
BEGIN
  IF current_user <> 'uranius_migrator' OR session_user <> 'uranius_migrator' THEN
    RAISE EXCEPTION 'Uranius migration role mismatch';
  END IF;
  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Uranius PostgreSQL major version mismatch';
  END IF;
  IF NOT has_database_privilege(current_user, current_database(), 'CONNECT')
     OR NOT has_database_privilege(current_user, current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'Uranius migration role lacks database CONNECT or CREATE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')
     OR to_regnamespace('uranius_private') IS NOT NULL OR to_regnamespace('uranius_catalog') IS NOT NULL THEN
    RAISE EXCEPTION 'Uranius target schemas already exist';
  END IF;
END
$$;
