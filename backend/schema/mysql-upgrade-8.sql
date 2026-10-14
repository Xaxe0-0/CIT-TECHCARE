-- Upgrade a TechCare MySQL database from migration version 7 to 8 (message read state).
-- Apply once to a database created from an earlier backend/schema/mysql.sql.
-- New databases need only backend/schema/mysql.sql.
ALTER TABLE messages
  ADD COLUMN seen TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD KEY message_unread (receiver,seen);

-- Existing history counts as read so the upgrade does not flood every inbox.
UPDATE messages SET seen=1;

INSERT IGNORE INTO migrations (version,applied) VALUES (8,UNIX_TIMESTAMP());
