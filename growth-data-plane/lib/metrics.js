import { supabase } from './supabase.js';

export async function getSuccessMetrics() {
  const metrics = {};

  // 1. Total events captured (unified events table coverage)
  const { count: totalEvents } = await supabase
    .from('gdp_event')
    .select('id', { count: 'exact', head: true });
  metrics.total_events = totalEvents || 0;

  // 2. Event source breakdown
  const { data: sourceCounts } = await supabase.rpc('gdp_event_source_counts');
  metrics.events_by_source = sourceCounts || [];

  // 3. Email attribution chain: sent → delivered → opened → clicked
  const emailMetrics = {};
  for (const type of ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']) {
    const { count } = await supabase
      .from('gdp_email_event')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', type);
    emailMetrics[type] = count || 0;
  }
  metrics.email_funnel = emailMetrics;

  // 4. Person count with features computed
  const { count: featuredPersons } = await supabase
    .from('gdp_person_features')
    .select('person_id', { count: 'exact', head: true });
  const { count: totalPersons } = await supabase
    .from('gdp_person')
    .select('id', { count: 'exact', head: true });
  metrics.persons_total = totalPersons || 0;
  metrics.persons_with_features = featuredPersons || 0;

  // 5. Segment membership counts
  const { data: segmentCounts } = await supabase
    .from('gdp_segment_member')
    .select('segment_id, gdp_segment(slug)')
    .is('exited_at', null);
  const segMap = {};
  for (const m of segmentCounts || []) {
    const slug = m.gdp_segment?.slug || m.segment_id;
    segMap[slug] = (segMap[slug] || 0) + 1;
  }
  metrics.active_segment_memberships = segMap;

  // 6. Automation fires
  const { count: automationsFired } = await supabase
    .from('gdp_segment_member')
    .select('id', { count: 'exact', head: true })
    .eq('automation_fired', true);
  metrics.automations_fired = automationsFired || 0;

  // 7. Identity links (dedup quality)
  const { count: identityLinks } = await supabase
    .from('gdp_identity_link')
    .select('id', { count: 'exact', head: true });
  metrics.identity_links = identityLinks || 0;

  // 8. Deal pipeline summary
  const { data: dealStages } = await supabase
    .from('gdp_deal')
    .select('stage');
  const dealMap = {};
  for (const d of dealStages || []) {
    dealMap[d.stage] = (dealMap[d.stage] || 0) + 1;
  }
  metrics.deal_pipeline = dealMap;

  return metrics;
}

if (process.argv[1]?.endsWith('metrics.js')) {
  getSuccessMetrics().then((m) => console.log(JSON.stringify(m, null, 2))).catch(console.error);
}
