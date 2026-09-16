-- Team roles system (R63)
-- Legacy 'member' rows become 'viewer' (identical read-only behavior);
-- the role ladder is viewer < editor < admin, plus the implicit owner.

UPDATE team_members
SET role = 'viewer'
WHERE role = 'member' OR role IS NULL;

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('viewer', 'editor', 'admin'));

-- Invites reuse the same rows (member_user_id NULL until accepted), so the
-- invited role now persists through the accept flow via the same column.

-- Invites carry the chosen role through the accept flow
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'viewer';
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_role_check
  CHECK (role IN ('viewer', 'editor', 'admin'));
