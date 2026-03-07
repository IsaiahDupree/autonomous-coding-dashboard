import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function upsertPerson({ email, name, source }) {
  const { data, error } = await supabase
    .from('gdp_person')
    .upsert({ email, name, source, updated_at: new Date().toISOString() }, { onConflict: 'email' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function linkIdentity(personId, provider, externalId) {
  const { error } = await supabase
    .from('gdp_identity_link')
    .upsert(
      { person_id: personId, provider, external_id: externalId },
      { onConflict: 'provider,external_id' }
    );
  if (error) throw error;
}

export async function insertEvent({ personId, source, eventType, properties }) {
  const { error } = await supabase
    .from('gdp_event')
    .insert({
      person_id: personId,
      source,
      event_type: eventType,
      properties: properties || {},
      timestamp: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function getPersonByIdentity(provider, externalId) {
  const { data, error } = await supabase
    .from('gdp_identity_link')
    .select('person_id')
    .eq('provider', provider)
    .eq('external_id', externalId)
    .single();
  if (error) return null;
  return data.person_id;
}
