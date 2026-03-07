import { supabase } from '../../lib/supabase.js';

export async function computePersonFeatures() {
  const now = new Date();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  const { data: persons, error } = await supabase
    .from('gdp_person')
    .select('id, created_at');

  if (error) throw error;
  if (!persons?.length) return { computed: 0 };

  let computed = 0;

  for (const person of persons) {
    const pid = person.id;

    const [emailEvents, events, subscription, deal] = await Promise.all([
      supabase
        .from('gdp_email_event')
        .select('event_type, timestamp')
        .eq('person_id', pid)
        .gte('timestamp', d30),
      supabase
        .from('gdp_event')
        .select('event_type, properties, timestamp')
        .eq('person_id', pid)
        .gte('timestamp', d7),
      supabase
        .from('gdp_subscription')
        .select('status, plan_id')
        .eq('person_id', pid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('gdp_deal')
        .select('stage, last_activity_at')
        .eq('person_id', pid)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const ee = emailEvents.data || [];
    const ev = events.data || [];
    const sub = subscription.data;
    const dl = deal.data;

    const opens30d = ee.filter((e) => e.event_type === 'opened').length;
    const clicks30d = ee.filter((e) => e.event_type === 'clicked').length;
    const lastOpen = ee.filter((e) => e.event_type === 'opened').sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp || null;
    const lastClick = ee.filter((e) => e.event_type === 'clicked').sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp || null;

    const pageViews7d = ev.filter((e) => e.event_type === 'page_view').length;
    const lastPageView = ev.filter((e) => e.event_type === 'page_view').sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp || null;
    const lastLogin = ev.filter((e) => e.event_type === 'login').sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.timestamp || null;
    const activationEvent = ev.find((e) => e.event_type === 'activation');
    const pricingViews = ev.filter((e) => e.event_type === 'page_view' && e.properties?.page?.includes('pricing')).length;
    const checkoutStarted = ev.some((e) => e.event_type === 'checkout.started');
    const hasBounced = ee.some((e) => e.event_type === 'bounced');
    const hasComplained = ee.some((e) => e.event_type === 'complained');
    const sessions7d = ev.filter((e) => e.event_type === 'session_start').length;
    const offerViews = ev.filter((e) => e.event_type === 'page_view' && e.properties?.page?.includes('offer')).length;
    const bookings = ev.filter((e) => e.event_type === 'booking.created').length;

    const features = {
      person_id: pid,
      email_opens_30d: opens30d,
      email_clicks_30d: clicks30d,
      page_views_7d: pageViews7d,
      last_email_open: lastOpen,
      last_email_click: lastClick,
      last_page_view: lastPageView,
      last_login: lastLogin,
      signup_date: person.created_at,
      activation_date: activationEvent?.timestamp || null,
      subscription_status: sub?.status || null,
      subscription_plan: sub?.plan_id || null,
      total_sessions_7d: sessions7d,
      pricing_page_views_7d: pricingViews,
      checkout_started: checkoutStarted,
      has_bounced: hasBounced,
      has_complained: hasComplained,
      deal_stage: dl?.stage || null,
      offer_page_views: offerViews,
      booking_count: bookings,
      computed_at: now.toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('gdp_person_features')
      .upsert(features, { onConflict: 'person_id' });

    if (upsertError) {
      console.error(`Feature compute error for ${pid}:`, upsertError);
    } else {
      computed++;
    }
  }

  return { computed, total: persons.length };
}

export async function evaluateSegments() {
  const { data: segments, error } = await supabase
    .from('gdp_segment')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false });

  if (error) throw error;
  if (!segments?.length) return { evaluated: 0 };

  let totalMemberships = 0;

  for (const segment of segments) {
    if (!segment.query_sql) continue;

    const { data: matchedPersons, error: queryError } = await supabase.rpc(
      'gdp_evaluate_segment',
      { segment_query: segment.query_sql }
    );

    if (queryError) {
      console.error(`Segment eval error for ${segment.slug}:`, queryError);
      continue;
    }

    if (!matchedPersons?.length) continue;

    for (const row of matchedPersons) {
      const { error: memberError } = await supabase.from('gdp_segment_member').upsert(
        {
          person_id: row.person_id,
          segment_id: segment.id,
          entered_at: new Date().toISOString(),
        },
        { onConflict: 'person_id,segment_id' }
      );
      if (!memberError) totalMemberships++;
    }

    // Mark persons who no longer match as exited
    const matchedIds = matchedPersons.map((r) => r.person_id);
    if (matchedIds.length > 0) {
      await supabase
        .from('gdp_segment_member')
        .update({ exited_at: new Date().toISOString() })
        .eq('segment_id', segment.id)
        .is('exited_at', null)
        .not('person_id', 'in', `(${matchedIds.join(',')})`);
    }
  }

  return { evaluated: segments.length, memberships: totalMemberships };
}

export async function triggerAutomations() {
  const { data: pending, error } = await supabase
    .from('gdp_segment_member')
    .select('*, gdp_segment(*)')
    .is('exited_at', null)
    .eq('automation_fired', false);

  if (error) throw error;
  if (!pending?.length) return { triggered: 0 };

  let triggered = 0;

  for (const membership of pending) {
    const segment = membership.gdp_segment;
    if (!segment?.automation_type) continue;

    switch (segment.automation_type) {
      case 'email':
        await insertAutomationEvent(membership.person_id, segment, 'email_queued');
        break;
      case 'meta_capi':
        await insertAutomationEvent(membership.person_id, segment, 'meta_capi_queued');
        break;
      case 'outbound':
        await insertAutomationEvent(membership.person_id, segment, 'outbound_queued');
        break;
      case 'suppress':
        await insertAutomationEvent(membership.person_id, segment, 'suppressed');
        break;
    }

    await supabase
      .from('gdp_segment_member')
      .update({ automation_fired: true, automation_fired_at: new Date().toISOString() })
      .eq('id', membership.id);

    triggered++;
  }

  return { triggered };
}

async function insertAutomationEvent(personId, segment, eventType) {
  const { insertEvent } = await import('../../lib/supabase.js');
  await insertEvent({
    personId,
    source: 'segment_engine',
    eventType,
    properties: {
      segment_slug: segment.slug,
      segment_name: segment.name,
      automation_type: segment.automation_type,
      automation_config: segment.automation_config,
    },
  });
}

export async function runSegmentEngine() {
  console.log('[segment-engine] Computing person features...');
  const featureResult = await computePersonFeatures();
  console.log(`[segment-engine] Computed features for ${featureResult.computed}/${featureResult.total} persons`);

  console.log('[segment-engine] Evaluating segments...');
  const segmentResult = await evaluateSegments();
  console.log(`[segment-engine] Evaluated ${segmentResult.evaluated} segments, ${segmentResult.memberships} memberships`);

  console.log('[segment-engine] Triggering automations...');
  const automationResult = await triggerAutomations();
  console.log(`[segment-engine] Triggered ${automationResult.triggered} automations`);

  return { features: featureResult, segments: segmentResult, automations: automationResult };
}

if (process.argv[1]?.endsWith('segment-engine/index.js')) {
  runSegmentEngine().then(console.log).catch(console.error);
}
