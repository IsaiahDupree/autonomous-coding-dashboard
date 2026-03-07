#!/usr/bin/env node

/**
 * prospect-pipeline.js — Pure-function Tests
 * ============================================
 * Tests: scoreProspect(), buildSearchTerms(), buildPlatformSearches(),
 *        extractProfiles(), PLATFORMS config
 *
 * scoreProspect() determines who gets DMs — wrong scores waste quota on bad leads.
 * extractProfiles() normalises 6 different API response shapes.
 *
 * Run:
 *   node harness/test-prospect-scoring.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreProspect,
  buildSearchTerms,
  buildPlatformSearches,
  extractProfiles,
  PLATFORMS,
} from './prospect-pipeline.js';

// ── scoreProspect ─────────────────────────────────────────────────────────────
function makeProfile(overrides = {}) {
  return {
    username: 'testuser',
    bio: '',
    headline: '',
    company: '',
    post_text: '',
    followers_count: 0,
    ...overrides,
  };
}

describe('scoreProspect — return shape', () => {
  it('returns { score, reasons }', () => {
    const r = scoreProspect(makeProfile(), 'ig');
    assert.ok('score' in r, 'missing score');
    assert.ok('reasons' in r, 'missing reasons');
    assert.ok(Array.isArray(r.reasons), 'reasons must be an array');
  });

  it('score is a number between 0 and 10', () => {
    const r = scoreProspect(makeProfile(), 'ig');
    assert.ok(typeof r.score === 'number');
    assert.ok(r.score >= 0 && r.score <= 10);
  });

  it('empty profile scores 0', () => {
    assert.equal(scoreProspect(makeProfile(), 'ig').score, 0);
  });

  it('score is capped at 10 even for perfect profiles', () => {
    const r = scoreProspect(makeProfile({
      bio: 'AI automation SaaS founder CEO startup platform engineering',
      company: 'TechCo',
      post_text: 'ARR revenue scale customers LLM workflow automate no-code',
      followers_count: 50000,
    }), 'tw');
    assert.equal(r.score, 10);
  });
});

describe('scoreProspect — tech/software signal (+3)', () => {
  const keywords = ['software', 'saas', 'tech', 'ai', 'app', 'platform', 'startup',
    'engineering', 'automation', 'digital', 'product', 'api', 'cloud'];

  for (const kw of keywords) {
    it(`bio containing "${kw}" adds +3 tech signal`, () => {
      const r = scoreProspect(makeProfile({ bio: `I build ${kw} things` }), 'ig');
      assert.ok(r.score >= 3, `expected ≥3, got ${r.score} for "${kw}"`);
      assert.ok(r.reasons.some(s => s.includes('tech')), 'expected tech reason');
    });
  }

  it('post_text also triggers tech signal (not just bio)', () => {
    const r = scoreProspect(makeProfile({ post_text: 'building a SaaS platform' }), 'tw');
    assert.ok(r.reasons.some(s => s.includes('tech')));
  });
});

describe('scoreProspect — founder/exec signal (+2)', () => {
  const titles = ['founder', 'co-founder', 'ceo', 'cto', 'owner', 'director', 'vp '];

  for (const title of titles) {
    it(`headline "${title}" adds +2`, () => {
      const base = scoreProspect(makeProfile(), 'ig').score;
      const r = scoreProspect(makeProfile({ headline: `I am a ${title} of a company` }), 'ig');
      assert.ok(r.score >= base + 2, `expected +2 for "${title}", got +${r.score - base}`);
      assert.ok(r.reasons.some(s => s.includes('founder')));
    });
  }
});

describe('scoreProspect — AI/automation signal (+2)', () => {
  const terms = ['llm', 'gpt', 'workflow', 'automate', 'no-code', 'low-code', 'chatbot'];

  for (const term of terms) {
    it(`"${term}" in bio adds +2`, () => {
      const base = scoreProspect(makeProfile(), 'ig').score;
      const r = scoreProspect(makeProfile({ bio: `We use ${term} to help clients` }), 'ig');
      assert.ok(r.score >= base + 2, `expected +2 for "${term}", got +${r.score - base}`);
    });
  }
});

describe('scoreProspect — company signal (+1)', () => {
  it('profile.company field adds +1', () => {
    const base = scoreProspect(makeProfile(), 'ig').score;
    const r = scoreProspect(makeProfile({ company: 'Acme Corp' }), 'ig');
    assert.ok(r.score >= base + 1);
    assert.ok(r.reasons.some(s => s.includes('company')));
  });

  it('"@" in bio adds +1 company signal', () => {
    const base = scoreProspect(makeProfile(), 'ig').score;
    const r = scoreProspect(makeProfile({ bio: 'building @acmecorp' }), 'ig');
    assert.ok(r.score >= base + 1);
  });
});

describe('scoreProspect — revenue/growth signal (+1)', () => {
  const terms = ['arr', 'mrr', 'revenue', 'raised', 'series', 'customers'];

  for (const term of terms) {
    it(`"${term}" in bio adds +1 revenue signal`, () => {
      const base = scoreProspect(makeProfile(), 'ig').score;
      const r = scoreProspect(makeProfile({ bio: `Hit 100k ${term} this year` }), 'ig');
      assert.ok(r.score >= base + 1, `expected +1 for "${term}", got +${r.score - base}`);
    });
  }
});

describe('scoreProspect — follower signal (+1)', () => {
  it('followers_count > 1000 adds +1', () => {
    const base = scoreProspect(makeProfile({ followers_count: 0 }), 'ig').score;
    const r = scoreProspect(makeProfile({ followers_count: 5000 }), 'ig');
    assert.ok(r.score >= base + 1);
    assert.ok(r.reasons.some(s => s.includes('5000 followers')));
  });

  it('followers_count ≤ 1000 adds no follower bonus', () => {
    const at0    = scoreProspect(makeProfile({ followers_count: 0 }), 'ig').score;
    const at1000 = scoreProspect(makeProfile({ followers_count: 1000 }), 'ig').score;
    assert.equal(at0, at1000);
  });

  it('follower_count (alternate key) also counts', () => {
    const r = scoreProspect(makeProfile({ follower_count: 2000 }), 'tw');
    assert.ok(r.reasons.some(s => s.includes('2000 followers')));
  });
});

describe('scoreProspect — additive scoring', () => {
  it('high-signal profile scores higher than low-signal', () => {
    const ideal = scoreProspect(makeProfile({
      bio: 'AI SaaS founder | CEO @acmecorp | $1M ARR',
      followers_count: 10000,
    }), 'tw');
    const poor = scoreProspect(makeProfile({ bio: 'just a person' }), 'tw');
    assert.ok(ideal.score > poor.score, `ideal (${ideal.score}) should beat poor (${poor.score})`);
  });

  it('reasons array is non-empty for a signal-rich profile', () => {
    const r = scoreProspect(makeProfile({
      bio: 'AI automation founder CEO',
      company: 'TechCo',
      followers_count: 5000,
    }), 'ig');
    assert.ok(r.reasons.length >= 3, `expected ≥3 reasons, got ${r.reasons.length}: ${r.reasons}`);
  });

  it('name field is also searched for signals', () => {
    const r = scoreProspect(makeProfile({ name: 'Jane SaaS Founder' }), 'ig');
    assert.ok(r.score > 0, 'name field should contribute to score');
  });
});

// ── buildSearchTerms ──────────────────────────────────────────────────────────
describe('buildSearchTerms', () => {
  it('returns an array of strings', () => {
    const terms = buildSearchTerms({});
    assert.ok(Array.isArray(terms));
    assert.ok(terms.length > 0);
    assert.ok(terms.every(t => typeof t === 'string'));
  });

  it('uses default niches when goals.content.niches is missing', () => {
    const terms = buildSearchTerms({});
    // ai_automation should produce at least one term
    assert.ok(terms.some(t => t.toLowerCase().includes('ai') || t.toLowerCase().includes('automat')));
  });

  it('custom niches override defaults', () => {
    const terms = buildSearchTerms({ content: { niches: ['ai_automation'] } });
    // Should only have ai_automation terms
    assert.ok(terms.length > 0);
    assert.ok(terms.length < 20, 'single niche should not produce too many terms');
  });

  it('all 5 default niches produce terms', () => {
    const terms = buildSearchTerms({});
    assert.ok(terms.length >= 5, `expected ≥5 terms for 5 niches, got ${terms.length}`);
  });

  it('unknown niche falls back to niche name as keyword', () => {
    const terms = buildSearchTerms({ content: { niches: ['crypto_trading'] } });
    assert.ok(terms.some(t => t.includes('crypto')), 'unknown niche should produce a term from its name');
  });
});

// ── buildPlatformSearches ─────────────────────────────────────────────────────
describe('buildPlatformSearches', () => {
  const terms = ['AI automation', 'SaaS founder'];

  it('returns an array with one entry per term', () => {
    const searches = buildPlatformSearches(terms, 'tw');
    assert.equal(searches.length, terms.length);
  });

  it('returns empty array for unknown platform', () => {
    const searches = buildPlatformSearches(terms, 'unknown_platform');
    assert.deepEqual(searches, []);
  });

  it('Instagram searches use hashtag URL (no spaces)', () => {
    const searches = buildPlatformSearches(['AI automation'], 'ig');
    const val = Object.values(searches[0])[0];
    assert.ok(val.startsWith('https://www.instagram.com/explore/tags/'), `IG search should be hashtag URL: ${val}`);
    assert.ok(!val.includes(' '), 'IG URL should have no spaces');
  });

  it('Twitter searches use raw query string', () => {
    const searches = buildPlatformSearches(['SaaS founder'], 'tw');
    const val = Object.values(searches[0])[0];
    assert.equal(val, 'SaaS founder', `TW search should be raw query: ${val}`);
  });

  it('each search object has the platform searchKey', () => {
    for (const platform of ['ig', 'tt', 'tw', 'threads']) {
      const cfg = PLATFORMS[platform];
      const searches = buildPlatformSearches(['test term'], platform);
      assert.ok(cfg.searchKey in searches[0], `search for ${platform} should have key ${cfg.searchKey}`);
    }
  });
});

// ── PLATFORMS config ─────────────────────────────────────────────────────────
describe('PLATFORMS config', () => {
  it('covers ig, tt, tw, threads', () => {
    for (const p of ['ig', 'tt', 'tw', 'threads']) {
      assert.ok(p in PLATFORMS, `Missing platform: ${p}`);
    }
  });

  it('each platform has port, searchPath, searchKey, name', () => {
    for (const [p, cfg] of Object.entries(PLATFORMS)) {
      assert.ok(cfg.port, `${p} missing port`);
      assert.ok(cfg.searchPath, `${p} missing searchPath`);
      assert.ok(cfg.searchKey, `${p} missing searchKey`);
      assert.ok(cfg.name, `${p} missing name`);
    }
  });

  it('Instagram uses port 3005 (IG comments service)', () => assert.equal(PLATFORMS.ig.port, 3005));
  it('TikTok uses port 3006', ()   => assert.equal(PLATFORMS.tt.port, 3006));
  it('Twitter uses port 3007 (TW comments service)', () => assert.equal(PLATFORMS.tw.port, 3007));
  it('Threads uses port 3004', ()  => assert.equal(PLATFORMS.threads.port, 3004));
});

// ── extractProfiles ───────────────────────────────────────────────────────────
describe('extractProfiles — response schema normalisation', () => {
  it('handles top-level array', () => {
    const data = [{ username: 'alice', bio: 'builder' }, { username: 'bob', bio: 'maker' }];
    const profiles = extractProfiles(data, 'ig');
    assert.equal(profiles.length, 2);
    assert.equal(profiles[0].username, 'alice');
  });

  it('handles { results: [...] }', () => {
    const data = { results: [{ username: 'alice' }] };
    const profiles = extractProfiles(data, 'tw');
    assert.equal(profiles.length, 1);
  });

  it('handles { tweets: [...] }', () => {
    const data = { tweets: [{ username: 'carol', bio: 'dev' }] };
    const profiles = extractProfiles(data, 'tw');
    assert.equal(profiles.length, 1);
  });

  it('handles { posts: [...] }', () => {
    const data = { posts: [{ username: 'dan', bio: 'creator' }] };
    const profiles = extractProfiles(data, 'ig');
    assert.equal(profiles.length, 1);
  });

  it('handles { users: [...] }', () => {
    const data = { users: [{ username: 'eve', bio: 'engineer' }] };
    const profiles = extractProfiles(data, 'tt');
    assert.equal(profiles.length, 1);
  });

  it('handles { data: [...] }', () => {
    const data = { data: [{ username: 'frank', bio: 'designer' }] };
    const profiles = extractProfiles(data, 'threads');
    assert.equal(profiles.length, 1);
  });

  it('handles { result: [...] }', () => {
    const data = { result: [{ username: 'grace', bio: 'founder' }] };
    const profiles = extractProfiles(data, 'ig');
    assert.equal(profiles.length, 1);
  });

  it('skips items with no username or display_name', () => {
    const data = [
      { bio: 'no username here' },
      { username: 'validuser', bio: 'valid' },
    ];
    const profiles = extractProfiles(data, 'ig');
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].username, 'validuser');
  });

  it('each profile has required fields', () => {
    const data = [{ username: 'testuser', bio: 'ai founder', followers_count: 500 }];
    const [p] = extractProfiles(data, 'tw');
    for (const field of ['platform', 'username', 'bio', 'followers_count', 'profile_url']) {
      assert.ok(field in p, `Missing field: ${field}`);
    }
  });

  it('injects platform field correctly', () => {
    const data = [{ username: 'user1' }];
    const [p] = extractProfiles(data, 'ig');
    assert.equal(p.platform, 'ig');
  });

  it('auto-builds Instagram profile_url when missing', () => {
    const data = [{ username: 'saraheashley' }];
    const [p] = extractProfiles(data, 'ig');
    assert.equal(p.profile_url, 'https://www.instagram.com/saraheashley/');
  });

  it('auto-builds Twitter profile_url when missing', () => {
    const data = [{ username: 'saraheashley' }];
    const [p] = extractProfiles(data, 'tw');
    assert.equal(p.profile_url, 'https://x.com/saraheashley');
  });

  it('auto-builds TikTok profile_url when missing', () => {
    const data = [{ username: 'saraheashley' }];
    const [p] = extractProfiles(data, 'tt');
    assert.equal(p.profile_url, 'https://www.tiktok.com/@saraheashley');
  });

  it('handles Twitter author-as-string format', () => {
    const data = [{ author: 'Jane Doe', handle: '@janedoe', bio: 'maker' }];
    const [p] = extractProfiles(data, 'tw');
    assert.ok(p.display_name === 'Jane Doe' || p.username === 'janedoe');
  });

  it('returns empty array for null/undefined data', () => {
    assert.deepEqual(extractProfiles(null, 'ig'), []);
    assert.deepEqual(extractProfiles(undefined, 'ig'), []);
  });

  it('returns empty array for unrecognised shape', () => {
    assert.deepEqual(extractProfiles({ random: 'object' }, 'ig'), []);
  });

  it('post_text is populated from item.text, item.caption, item.content', () => {
    const data = [{ username: 'u1', text: 'AI is great' }];
    const [p] = extractProfiles(data, 'tw');
    assert.equal(p.post_text, 'AI is great');
  });
});

console.log('\n✅ prospect-pipeline (scoreProspect, buildSearchTerms, buildPlatformSearches, extractProfiles) tests complete.\n');
