-- Upgrade a TechCare MySQL database from migration version 9 to 10
-- (public usernames with a private full name, and several photos per question).
-- Apply once after mysql-upgrade-9.sql. New databases need only backend/schema/mysql.sql.
ALTER TABLE users ADD COLUMN full_name VARCHAR(80) NOT NULL DEFAULT '' AFTER name;
ALTER TABLE posts ADD COLUMN photos VARCHAR(2000) NOT NULL DEFAULT '[]' AFTER photo;
UPDATE posts SET photos=JSON_ARRAY(photo) WHERE photo<>'';

-- users.name becomes the public username; the old display name moves to the private full_name.
-- Usernames keep letters, numbers and _ in lowercase. Deleted accounts stay "Deleted member".
UPDATE users SET full_name=name, name=LEFT(LOWER(REGEXP_REPLACE(name,'[^A-Za-z0-9_]','')),20)
  WHERE email NOT LIKE 'deleted-%@deleted.invalid';
UPDATE users SET name=CONCAT('member_',id)
  WHERE CHAR_LENGTH(name)<3 AND email NOT LIKE 'deleted-%@deleted.invalid';
UPDATE users u
  JOIN (SELECT name FROM users WHERE email NOT LIKE 'deleted-%@deleted.invalid'
        GROUP BY name HAVING COUNT(*)>1) d ON d.name=u.name
  SET u.name=CONCAT(LEFT(u.name,13),'_',u.id);

INSERT IGNORE INTO migrations (version,applied) VALUES (10,UNIX_TIMESTAMP());
