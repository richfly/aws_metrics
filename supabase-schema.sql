-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contacts (
  contact_id TEXT PRIMARY KEY,
  channel TEXT,
  contact_status TEXT,
  initiation_timestamp TEXT,
  system_phone_number TEXT,
  queue TEXT,
  agent TEXT,
  customer_phone_number TEXT,
  disconnect_timestamp TEXT,
  contact_duration TEXT,
  routing_profile TEXT,
  connected_to_agent_timestamp TEXT,
  scheduled_timestamp TEXT,
  enqueue_timestamp TEXT,
  acw_start_timestamp TEXT,
  acw_end_timestamp TEXT,
  agent_interaction_duration TEXT,
  agent_connection_attempts TEXT,
  number_of_holds TEXT,
  initiation_method TEXT,
  disconnect_reason TEXT,
  first_contact_flow_name TEXT,
  contact_direction TEXT,
  preferred_agents TEXT,
  system_email_address TEXT,
  customer_email_address TEXT,
  phone_description TEXT,
  phone_type TEXT,
  active_channels TEXT,
  contact_flow_ivr TEXT,
  country TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_records (
  phone_number TEXT PRIMARY KEY,
  description TEXT,
  phone_type TEXT,
  active_channels TEXT,
  contact_flow_ivr TEXT,
  country TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can upsert contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select phone_records"
  ON phone_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert phone_records"
  ON phone_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can upsert phone_records"
  ON phone_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable real-time replication so the app auto-refreshes on new data
alter publication supabase_realtime add table contacts;
alter publication supabase_realtime add table phone_records;
