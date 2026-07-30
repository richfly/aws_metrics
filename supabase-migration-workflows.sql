-- Workflow builder: reviewers, workflows, assignments, audit events
-- Run this in the Supabase SQL editor (idempotent).

CREATE TABLE IF NOT EXISTS reviewers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  initials      text NOT NULL,
  avatar_hue    int  NOT NULL DEFAULT 200,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  is_enabled    boolean NOT NULL DEFAULT true,
  granularity   text NOT NULL CHECK (granularity IN ('per_call', 'per_group')),
  group_by      text CHECK (group_by IN ('customer_phone_number', 'agent', 'queue', 'system_phone_number')),
  conditions    jsonb NOT NULL DEFAULT '{"type":"and","children":[]}'::jsonb,
  assign_to     uuid REFERENCES reviewers(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  group_key       text NOT NULL,
  contact_ids     text[] NOT NULL DEFAULT '{}'::text[],
  reviewer_id     uuid REFERENCES reviewers(id) ON DELETE SET NULL,
  state           text NOT NULL DEFAULT 'assigned'
                  CHECK (state IN ('assigned', 'in_progress', 'completed', 'flagged', 'escalated')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, group_key)
);

CREATE TABLE IF NOT EXISTS assignment_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  from_state      text,
  to_state        text NOT NULL,
  note            text,
  actor_id        uuid REFERENCES reviewers(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignments_reviewer_state_idx
  ON assignments (reviewer_id, state);
CREATE INDEX IF NOT EXISTS assignments_workflow_idx
  ON assignments (workflow_id);
CREATE INDEX IF NOT EXISTS assignment_events_assignment_idx
  ON assignment_events (assignment_id, created_at DESC);

ALTER TABLE reviewers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read reviewers"        ON reviewers;
DROP POLICY IF EXISTS "Authenticated can write reviewers"        ON reviewers;
DROP POLICY IF EXISTS "Authenticated can read workflows"         ON workflows;
DROP POLICY IF EXISTS "Authenticated can write workflows"        ON workflows;
DROP POLICY IF EXISTS "Authenticated can read assignments"       ON assignments;
DROP POLICY IF EXISTS "Authenticated can write assignments"      ON assignments;
DROP POLICY IF EXISTS "Authenticated can read assignment_events" ON assignment_events;
DROP POLICY IF EXISTS "Authenticated can write assignment_events" ON assignment_events;

CREATE POLICY "Authenticated can read reviewers"  ON reviewers  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write reviewers"  ON reviewers  FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can read workflows"   ON workflows  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write workflows"  ON workflows  FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can read assignments" ON assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write assignments" ON assignments FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can read assignment_events" ON assignment_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write assignment_events" ON assignment_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

alter publication supabase_realtime add table assignments;
