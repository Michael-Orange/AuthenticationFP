ALTER TABLE referentiel.users
ADD COLUMN IF NOT EXISTS peut_acces_shelly BOOLEAN DEFAULT FALSE;

UPDATE referentiel.users
SET peut_acces_shelly = TRUE
WHERE username IN ('michael', 'marine');
