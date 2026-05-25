-- Discussion wall: per-action Facebook-style feed (posts, comments, reactions).
--
-- Anyone logged in (USER or ADMIN) can post on any action's wall, react to
-- posts, and comment. There is no "must be registered" gate — the spec
-- doesn't ask for one, and gating limits the demo's social vibrancy.
--
-- Posts can carry one piece of media (image or video):
--   * Uploaded file → media_url = "/files/{uuid}", media_type = "image" | "video"
--   * External URL  → media_url = "https://…",     media_type detected by client
-- media_url is wide enough (2000) for either; media_type is just a hint so
-- the frontend renders <img> vs <video> vs <iframe> (for YouTube/Vimeo).

CREATE TABLE posts (
    id         BIGSERIAL    PRIMARY KEY,
    action_id  BIGINT       NOT NULL REFERENCES actions (id) ON DELETE CASCADE,
    user_id    BIGINT       NOT NULL REFERENCES users   (id) ON DELETE CASCADE,
    body       TEXT         NOT NULL DEFAULT '',
    media_url  VARCHAR(2000),
    media_type VARCHAR(20)
        CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_action  ON posts (action_id);
CREATE INDEX idx_posts_created ON posts (created_at);
CREATE INDEX idx_posts_user    ON posts (user_id);

CREATE TABLE comments (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT    NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id    BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body       TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post    ON comments (post_id);
CREATE INDEX idx_comments_created ON comments (created_at);

-- Reactions: one per user per post. Picking a different emoji replaces the
-- previous one (composite PK guarantees uniqueness; the backend uses an
-- upsert pattern). Allowed values mirror the standard Facebook/Teams set.
CREATE TABLE reactions (
    post_id    BIGINT      NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reaction   VARCHAR(20) NOT NULL
        CHECK (reaction IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_reactions_post ON reactions (post_id);
