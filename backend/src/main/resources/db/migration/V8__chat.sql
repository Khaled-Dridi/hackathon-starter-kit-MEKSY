-- Per-action chat: a Slack/WhatsApp-style channel for the people
-- actually attending the action.
--
-- Only people registered for the action (and admins) can read or write.
-- The access check lives in ActionChatService, not in SQL — the table itself
-- is open to anything an admin tools query might want to do.
--
-- Note the table is named `action_chat_messages`, not `chat_messages`, to
-- avoid collision with the existing AI-assistant chat table (see V3).

CREATE TABLE action_chat_messages (
    id         BIGSERIAL PRIMARY KEY,
    action_id  BIGINT    NOT NULL REFERENCES actions (id) ON DELETE CASCADE,
    user_id    BIGINT    NOT NULL REFERENCES users   (id) ON DELETE CASCADE,
    body       TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_action_chat_action  ON action_chat_messages (action_id);
CREATE INDEX idx_action_chat_created ON action_chat_messages (created_at);
CREATE INDEX idx_action_chat_action_created
        ON action_chat_messages (action_id, created_at);
