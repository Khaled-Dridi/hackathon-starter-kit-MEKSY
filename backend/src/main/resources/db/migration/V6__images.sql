-- Image storage for actions and proposals.
--
-- Two parallel mechanisms, both stored as a string in the `image_url` column
-- of `actions` / `proposals`:
--   * External URL ("https://example.org/...") — admin pastes a link
--   * Uploaded file ("/files/{uuid}") — backend serves from disk
--
-- The frontend doesn't need to care which kind it's rendering — both work
-- as a plain <img src> in a card or detail page.

ALTER TABLE actions   ADD COLUMN image_url VARCHAR(2000);
ALTER TABLE proposals ADD COLUMN image_url VARCHAR(2000);

-- Files table: metadata for binaries we hold on disk.
--
-- Why UUID for the id: file ids end up in URLs and we don't want them to
-- be enumerable. A sequence-int (1, 2, 3) would let anyone scrape every
-- upload by walking the integers; a UUID needs the exact ref to fetch.
CREATE TABLE files (
    id            UUID         PRIMARY KEY,
    original_name VARCHAR(500) NOT NULL,
    content_type  VARCHAR(120) NOT NULL,
    size_bytes    BIGINT       NOT NULL CHECK (size_bytes > 0),
    storage_path  VARCHAR(1000) NOT NULL,
    created_by    BIGINT       NOT NULL REFERENCES users (id),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_created_by ON files (created_by);
CREATE INDEX idx_files_created_at ON files (created_at);
