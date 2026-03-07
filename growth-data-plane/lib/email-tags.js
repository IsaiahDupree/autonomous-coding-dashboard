export function buildEmailTags({ personId, campaignId, funnel }) {
  if (!personId) throw new Error('personId is required for email tags');
  return {
    person_id: personId,
    ...(campaignId ? { campaign_id: campaignId } : {}),
    ...(funnel ? { funnel } : {}),
  };
}

export function parseEmailTags(tags) {
  return {
    personId: tags?.person_id || null,
    campaignId: tags?.campaign_id || null,
    funnel: tags?.funnel || null,
  };
}
