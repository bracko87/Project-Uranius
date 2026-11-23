-- Project DBA bootstrap. Apply only after verifying the pinned Uranius TLS session.
CREATE ROLE uranius_smoke_reader NOLOGIN NOINHERIT NOSUPERUSER
  NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO uranius_smoke_reader;
ALTER ROLE uranius_smoke_reader SET default_transaction_read_only = on;
