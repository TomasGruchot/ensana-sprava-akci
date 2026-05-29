-- Jednorázové založení databáze pro Ensana (spusť v pgAdmin nebo psql jako uživatel postgres).
-- Heslo níže si změň na stejné, jaké dáš do .env → DATABASE_URL.

CREATE USER ensana WITH PASSWORD 'ZMEN_HESLO_TADY';

CREATE DATABASE ensana OWNER ensana;

GRANT ALL PRIVILEGES ON DATABASE ensana TO ensana;
