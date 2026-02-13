-- RLS policies for all shared tables
ALTER TABLE shared_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.person ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.identity_link ENABLE ROW LEVEL SECURITY;

-- shared_users: users can see own profile, admins see all
CREATE POLICY shared_users_self ON shared_users FOR ALL
  USING (auth_user_id = current_setting('app.user_id', true)::UUID);
CREATE POLICY shared_users_admin ON shared_users FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- shared_entitlements: users see own, admins see all
CREATE POLICY entitlements_self ON shared_entitlements FOR ALL
  USING (user_id IN (SELECT id FROM shared_users WHERE auth_user_id = current_setting('app.user_id', true)::UUID));
CREATE POLICY entitlements_admin ON shared_entitlements FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- shared_assets: users see own + public, admins see all
CREATE POLICY assets_own ON shared_assets FOR ALL
  USING (user_id IN (SELECT id FROM shared_users WHERE auth_user_id = current_setting('app.user_id', true)::UUID) OR is_public = true);
CREATE POLICY assets_admin ON shared_assets FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- shared_events: product isolation (service_role for writes, admins for reads)
CREATE POLICY events_service ON shared_events FOR INSERT
  USING (true); -- services can always insert
CREATE POLICY events_admin ON shared_events FOR SELECT
  USING (current_setting('app.role', true) = 'admin');
CREATE POLICY events_own ON shared_events FOR SELECT
  USING (user_id IN (SELECT id FROM shared_users WHERE auth_user_id = current_setting('app.user_id', true)::UUID));

-- shared.person: service_role only
CREATE POLICY person_service ON shared.person FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'service_role'));
CREATE POLICY identity_service ON shared.identity_link FOR ALL
  USING (current_setting('app.role', true) IN ('admin', 'service_role'));
