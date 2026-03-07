export const OUTBOUND_FUNNEL_SEGMENTS = [
  {
    slug: 'visited_offer_2plus_no_reply',
    name: 'Visited Offer 2+, No Reply',
    description: 'Visited offer page 2+ times but no outbound reply',
    funnel: 'outbound',
    priority: 9,
    automation_type: 'outbound',
    automation_config: {
      template: '2-line follow up',
      subject: 'Quick follow up',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.offer_page_views >= 2
        AND pf.deal_stage IN ('lead', 'contacted')
        AND pf.last_outbound_reply IS NULL
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'clicked_outbound_no_booking',
    name: 'Clicked Outbound, No Booking',
    description: 'Clicked outbound email link but did not book a call',
    funnel: 'outbound',
    priority: 8,
    automation_type: 'outbound',
    automation_config: {
      template: 'send scheduling link',
      subject: 'Want to jump on a quick call?',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.email_clicks_30d >= 1
        AND pf.booking_count = 0
        AND pf.deal_stage IN ('lead', 'contacted', 'replied')
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'booked_call',
    name: 'Booked Call',
    description: 'Call booked — stop outbound, send pre-call email',
    funnel: 'outbound',
    priority: 10,
    automation_type: 'email',
    automation_config: {
      template: 'pre-call email',
      subject: 'Looking forward to our call',
      stop_outbound: true,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.booking_count >= 1
        AND pf.deal_stage = 'booked'
    `,
  },
  {
    slug: 'no_show',
    name: 'No Show',
    description: 'Booked but did not show up — reschedule + retarget',
    funnel: 'outbound',
    priority: 9,
    automation_type: 'outbound',
    automation_config: {
      template: 'reschedule',
      subject: 'Let us reschedule',
      meta_retarget: true,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      JOIN gdp_deal d ON d.person_id = pf.person_id
      WHERE d.stage = 'booked'
        AND d.last_activity_at < now() - interval '1 day'
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'proposal_sent',
    name: 'Proposal Sent',
    description: '3-touch close sequence after proposal',
    funnel: 'outbound',
    priority: 8,
    automation_type: 'outbound',
    automation_config: {
      template: '3-touch close sequence',
      touches: 3,
      interval_days: 2,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.deal_stage = 'proposal'
    `,
  },
  {
    slug: 'warm_lead',
    name: 'Warm Lead',
    description: 'Engaged lead — send case study',
    funnel: 'outbound',
    priority: 7,
    automation_type: 'email',
    automation_config: {
      template: 'case study drop',
      subject: 'How [Company] achieved X with AI automation',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.email_opens_30d >= 3
        AND pf.deal_stage IN ('contacted', 'replied')
        AND pf.outbound_reply_sentiment IS NULL
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'replied_positive',
    name: 'Replied Positive',
    description: 'Positive reply — route to human',
    funnel: 'outbound',
    priority: 10,
    automation_type: 'outbound',
    automation_config: {
      action: 'route_to_human',
      notify_slack: true,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.outbound_reply_sentiment = 'positive'
        AND pf.deal_stage = 'replied'
    `,
  },
  {
    slug: 'replied_negative',
    name: 'Replied Negative',
    description: 'Negative reply — tag objection, drip nurture',
    funnel: 'outbound',
    priority: 6,
    automation_type: 'email',
    automation_config: {
      template: 'objection drip',
      action: 'tag_objection',
      drip_days: 30,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.outbound_reply_sentiment = 'negative'
        AND pf.deal_stage = 'replied'
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'won',
    name: 'Won Deal',
    description: 'Deal won — onboarding + upsell sequence',
    funnel: 'outbound',
    priority: 5,
    automation_type: 'email',
    automation_config: {
      template: 'onboarding + upsell',
      subject: 'Welcome aboard! Here is your onboarding plan',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.deal_stage = 'won'
    `,
  },
  {
    slug: 'lost',
    name: 'Lost Deal',
    description: '30-day nurture + Meta retarget',
    funnel: 'outbound',
    priority: 4,
    automation_type: 'email',
    automation_config: {
      template: '30-day nurture',
      drip_days: 30,
      meta_retarget: true,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.deal_stage = 'lost'
        AND pf.has_bounced = false
    `,
  },
];
