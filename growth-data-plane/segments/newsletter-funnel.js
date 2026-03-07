export const NEWSLETTER_FUNNEL_SEGMENTS = [
  {
    slug: 'new_signup_no_activation_24h',
    name: 'New Signup, No Activation (24h)',
    description: 'Signed up but has not activated within 24 hours',
    funnel: 'newsletter',
    priority: 10,
    automation_type: 'email',
    automation_config: {
      template: '1-minute setup',
      delay_hours: 24,
      subject: 'Get started in 1 minute',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.activation_date IS NULL
        AND pf.signup_date < now() - interval '24 hours'
        AND pf.signup_date > now() - interval '48 hours'
        AND pf.has_bounced = false
        AND pf.has_complained = false
    `,
  },
  {
    slug: 'activated_not_paid_day3',
    name: 'Activated, Not Paid (Day 3)',
    description: 'Activated the product but no subscription after 3 days',
    funnel: 'newsletter',
    priority: 9,
    automation_type: 'email',
    automation_config: {
      template: 'use case pack',
      delay_hours: 72,
      subject: 'Use cases that might inspire you',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.activation_date IS NOT NULL
        AND pf.subscription_status IS NULL
        AND pf.activation_date < now() - interval '3 days'
        AND pf.activation_date > now() - interval '5 days'
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'high_intent_pricing_2plus_not_paid',
    name: 'High Intent: Pricing 2+ Views, Not Paid',
    description: 'Viewed pricing page 2+ times but no subscription',
    funnel: 'newsletter',
    priority: 8,
    automation_type: 'email',
    automation_config: {
      template: 'help picking plan',
      subject: 'Need help picking the right plan?',
      meta_retarget: true,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.pricing_page_views_7d >= 2
        AND pf.subscription_status IS NULL
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'checkout_started_no_purchase_4h',
    name: 'Checkout Started, No Purchase (4h)',
    description: 'Started checkout but did not complete within 4 hours',
    funnel: 'newsletter',
    priority: 10,
    automation_type: 'email',
    automation_config: {
      template: 'quick fix',
      delay_hours: 4,
      subject: 'Need help completing your purchase?',
      meta_retarget: true,
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.checkout_started = true
        AND pf.subscription_status IS NULL
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'newsletter_clicker_not_signed_up',
    name: 'Newsletter Clicker, Not Signed Up',
    description: 'Clicks newsletter links but has not signed up for the product',
    funnel: 'newsletter',
    priority: 6,
    automation_type: 'email',
    automation_config: {
      template: 'invite to try',
      subject: 'Ready to try it yourself?',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.email_clicks_30d >= 3
        AND pf.activation_date IS NULL
        AND pf.signup_date IS NULL
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'inactive_7d_after_activation',
    name: 'Inactive 7d After Activation',
    description: 'Activated but no activity in the last 7 days',
    funnel: 'newsletter',
    priority: 7,
    automation_type: 'email',
    automation_config: {
      template: 'save your work',
      subject: 'Your progress is waiting for you',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.activation_date IS NOT NULL
        AND pf.total_sessions_7d = 0
        AND pf.last_login < now() - interval '7 days'
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'paid_low_usage_7d',
    name: 'Paid, Low Usage (7d)',
    description: 'Paying subscriber with very low usage in the last week',
    funnel: 'newsletter',
    priority: 7,
    automation_type: 'email',
    automation_config: {
      template: 'your first win',
      subject: 'Let us help you get your first win',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.subscription_status = 'active'
        AND pf.total_sessions_7d <= 1
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'paid_high_usage_7d',
    name: 'Paid, High Usage (7d)',
    description: 'Active paying subscriber — referral candidate',
    funnel: 'newsletter',
    priority: 5,
    automation_type: 'email',
    automation_config: {
      template: 'referral loop',
      subject: 'Know someone who would love this?',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.subscription_status = 'active'
        AND pf.total_sessions_7d >= 5
        AND pf.has_bounced = false
    `,
  },
  {
    slug: 'bounced_complained',
    name: 'Bounced / Complained',
    description: 'Email bounced or complaint filed — suppress from all sequences',
    funnel: 'newsletter',
    priority: 100,
    automation_type: 'suppress',
    automation_config: {
      action: 'suppress_all_sequences',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.has_bounced = true OR pf.has_complained = true
    `,
  },
  {
    slug: 'high_clicks_low_usage',
    name: 'High Email Clicks, Low Product Usage',
    description: 'Clicks emails a lot but barely uses the product',
    funnel: 'newsletter',
    priority: 6,
    automation_type: 'email',
    automation_config: {
      template: 'what are you trying to solve',
      subject: 'What are you trying to solve?',
    },
    query_sql: `
      SELECT pf.person_id FROM gdp_person_features pf
      WHERE pf.email_clicks_30d >= 5
        AND pf.total_sessions_7d <= 1
        AND pf.activation_date IS NOT NULL
        AND pf.has_bounced = false
    `,
  },
];
