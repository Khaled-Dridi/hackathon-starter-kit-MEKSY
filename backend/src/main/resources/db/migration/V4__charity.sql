-- Charity Day domain
--
-- Actions: volunteer events employees can register for.
-- Registrations: link between user and action (1 row = 1 seat).
-- Proposals: bottom-up action ideas submitted by employees.
--
-- No Chronotime / JC code anywhere (project rule).

CREATE TABLE actions (
    id             BIGSERIAL PRIMARY KEY,
    title          VARCHAR(200) NOT NULL,
    description    TEXT         NOT NULL DEFAULT '',
    action_date    TIMESTAMP    NOT NULL,
    location       VARCHAR(200),
    capacity       INTEGER      NOT NULL CHECK (capacity > 0),
    odd_tag        VARCHAR(80),
    is_closed      BOOLEAN      NOT NULL DEFAULT FALSE,
    impact_summary TEXT,
    created_by     BIGINT       NOT NULL REFERENCES users (id),
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_actions_date     ON actions (action_date);
CREATE INDEX idx_actions_is_closed ON actions (is_closed);

CREATE TABLE registrations (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT    NOT NULL REFERENCES users   (id) ON DELETE CASCADE,
    action_id  BIGINT    NOT NULL REFERENCES actions (id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_registrations_user_action UNIQUE (user_id, action_id)
);

CREATE INDEX idx_registrations_action  ON registrations (action_id);
CREATE INDEX idx_registrations_user    ON registrations (user_id);
CREATE INDEX idx_registrations_created ON registrations (created_at);

CREATE TABLE proposals (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    status      VARCHAR(32)  NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proposals_status  ON proposals (status);
CREATE INDEX idx_proposals_user    ON proposals (user_id);
