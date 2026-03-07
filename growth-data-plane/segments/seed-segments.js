import { supabase } from '../lib/supabase.js';
import { NEWSLETTER_FUNNEL_SEGMENTS } from './newsletter-funnel.js';
import { OUTBOUND_FUNNEL_SEGMENTS } from './outbound-funnel.js';

export async function seedSegments() {
  const allSegments = [...NEWSLETTER_FUNNEL_SEGMENTS, ...OUTBOUND_FUNNEL_SEGMENTS];

  let seeded = 0;
  let errors = 0;

  for (const seg of allSegments) {
    const { error } = await supabase.from('gdp_segment').upsert(
      {
        slug: seg.slug,
        name: seg.name,
        description: seg.description,
        funnel: seg.funnel,
        priority: seg.priority,
        automation_type: seg.automation_type,
        automation_config: seg.automation_config,
        query_sql: seg.query_sql.trim(),
        active: true,
      },
      { onConflict: 'slug' }
    );

    if (error) {
      console.error(`Error seeding segment ${seg.slug}:`, error.message);
      errors++;
    } else {
      seeded++;
    }
  }

  console.log(`Seeded ${seeded}/${allSegments.length} segments (${errors} errors)`);
  return { seeded, total: allSegments.length, errors };
}

if (process.argv[1]?.endsWith('seed-segments.js')) {
  seedSegments().then(console.log).catch(console.error);
}
