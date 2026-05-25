-- Add geographic coordinates to actions so the frontend can show them on a map.
--
-- Both columns are nullable: legacy actions created before this migration
-- have no coords until an admin opens the edit form and picks a point.
-- The frontend's map view will simply skip actions where either column is null.
--
-- DECIMAL(9,6) gives ~11 cm of precision worldwide, which is plenty (and
-- compact: 5 bytes vs. 8 for DOUBLE PRECISION). Latitude range [-90, 90],
-- longitude [-180, 180].

ALTER TABLE actions
    ADD COLUMN latitude  DECIMAL(9, 6),
    ADD COLUMN longitude DECIMAL(9, 6);

-- Sanity-check ranges. Allows NULL.
ALTER TABLE actions
    ADD CONSTRAINT actions_latitude_range
        CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90));
ALTER TABLE actions
    ADD CONSTRAINT actions_longitude_range
        CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180));
