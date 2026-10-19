-- Upgrade a TechCare MySQL database from migration version 10 to 11
-- (questions removed by a moderator stay at their link, shown as removed).
-- Apply once after mysql-upgrade-10.sql. New databases need only backend/schema/mysql.sql.
ALTER TABLE posts ADD COLUMN removed TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER photos;

INSERT IGNORE INTO migrations (version,applied) VALUES (11,UNIX_TIMESTAMP());
