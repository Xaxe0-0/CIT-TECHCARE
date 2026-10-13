-- Upgrade a TechCare MySQL database from migration version 8 to 9
-- (review notes, lost & found claim records, suspensions, alerts, email changes).
-- Apply once after mysql-upgrade-8.sql. New databases need only backend/schema/mysql.sql.
ALTER TABLE users ADD COLUMN suspended TINYINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN review_note VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE lost_found
  ADD COLUMN review_note VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN claim_note VARCHAR(500) NOT NULL DEFAULT '',
  ADD COLUMN returned_at BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS alerts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  text VARCHAR(700) NOT NULL,
  link VARCHAR(512) NOT NULL DEFAULT '',
  seen TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY alerts_user (user_id,id),
  CONSTRAINT alerts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_changes (
  user_id INT UNSIGNED NOT NULL,
  email VARCHAR(254) NOT NULL,
  code_hash VARCHAR(160) NOT NULL,
  expires BIGINT NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  CONSTRAINT email_changes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations (version,applied) VALUES (9,UNIX_TIMESTAMP());
