const TENOR_SEARCH_URL = 'https://tenor.googleapis.com/v2/search';
const IMGFLIP_MEMES_URL = 'https://api.imgflip.com/get_memes';
const TENOR_API_KEY = String(process.env.TENOR_API_KEY || '').trim();
const TENOR_CLIENT_KEY = String(process.env.TENOR_CLIENT_KEY || 'mai_desktop_companion_app').trim();
const IMGFLIP_CACHE_MS = 6 * 60 * 60 * 1000;

let imgflipCache = {
  fetchedAt: 0,
  items: []
};

function trimText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function tokenize(text) {
  return Array.from(
    new Set(String(text || '').toLowerCase().match(/[a-z0-9']+/g) || [])
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseJsonBlock(text) {
  const source = String(text || '').trim();
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || source;
  const objectMatch = fenced.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  const lineEntries = fenced
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[*-]\s*/, ''))
    .map((line) => line.replace(/^[{[]\s*/, '').replace(/[}\]]\s*,?\s*$/, ''))
    .map((line) => line.match(/^["']?([a-z0-9_ -]+)["']?\s*[:=-]\s*(.+?)\s*,?\s*$/i))
    .filter(Boolean);

  if (lineEntries.length) {
    const payload = {};
    for (const [, rawKey, rawValue] of lineEntries) {
      const key = String(rawKey || '').trim().toLowerCase().replace(/\s+/g, '_');
      const value = String(rawValue || '').trim().replace(/^['"]|['"]$/g, '');
      if (/^(true|false)$/i.test(value)) {
        payload[key] = value.toLowerCase() === 'true';
      } else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
        payload[key] = Number(value);
      } else {
        payload[key] = value;
      }
    }

    if (Object.keys(payload).length) {
      return payload;
    }
  }

  throw new Error('Model did not return JSON.');
}

function parseBooleanish(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['true', 'yes', 'y', '1', 'share'].includes(normalized)) {
    return true;
  }

  if (['false', 'no', 'n', '0', 'skip'].includes(normalized)) {
    return false;
  }

  return fallback;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || text || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

function buildContextDigest(context = {}) {
  return [
    context.triggerType ? `Trigger: ${context.triggerType}` : '',
    context.screenInsight?.summary ? `Screen: ${trimText(context.screenInsight.summary, 120)}` : '',
    context.currentTrack?.title ? `Music: ${trimText(`${context.currentTrack.artist || 'Unknown artist'} - ${context.currentTrack.title}`, 120)}` : '',
    context.sceneFamily ? `Room: ${context.sceneFamily}` : '',
    context.feelingLabel ? `Feeling: ${context.feelingLabel}` : '',
    context.socialDigest ? `Social: ${trimText(context.socialDigest, 120)}` : '',
    Array.isArray(context.recentUserMessages) && context.recentUserMessages[0] ? `Human lately: ${trimText(context.recentUserMessages[0], 120)}` : '',
    Array.isArray(context.recentAssistantMessages) && context.recentAssistantMessages[0] ? `Mai lately: ${trimText(context.recentAssistantMessages[0], 120)}` : ''
  ].filter(Boolean).join(' | ');
}

function getFallbackSearchQuery(context = {}) {
  const feeling = String(context.feelingLabel || '').toLowerCase();
  const scene = String(context.sceneFamily || '').toLowerCase();
  const source = [
    context.screenInsight?.summary,
    context.currentTrack?.title,
    context.currentTrack?.artist,
    context.socialDigest,
    ...(context.recentUserMessages || []),
    ...(context.recentAssistantMessages || [])
  ].filter(Boolean).join(' ');
  const tokens = tokenize(source);

  if (feeling.includes('happy') || scene === 'social') {
    return 'cute reaction';
  }

  if (scene === 'music') {
    return 'vibing reaction';
  }

  if (scene === 'game') {
    return 'gaming reaction';
  }

  if (feeling.includes('curious')) {
    return 'thinking reaction';
  }

  if (scene === 'code' || scene === 'terminal' || scene === 'writing') {
    return 'cozy focus reaction';
  }

  return tokens.slice(0, 3).join(' ') || 'cute reaction';
}

function normalizeTenorItem(item) {
  const media = item?.media_formats || {};
  const full = media.gif || media.mediumgif || media.tinygif || media.nanogif || null;
  const preview = media.tinygif || media.nanogif || media.preview || full || null;

  if (!full?.url && !preview?.url) {
    return null;
  }

  return {
    id: String(item.id || '').trim(),
    provider: 'Tenor',
    providerId: 'tenor',
    kind: 'gif',
    title: trimText(item.title || item.content_description || 'Reaction GIF', 80),
    url: full?.url || preview?.url,
    previewUrl: preview?.url || full?.url,
    pageUrl: item.itemurl || item.url || '',
    attribution: 'GIF via Tenor'
  };
}

async function searchTenor(query) {
  if (!TENOR_API_KEY) {
    return [];
  }

  const searchUrl = new URL(TENOR_SEARCH_URL);
  searchUrl.searchParams.set('key', TENOR_API_KEY);
  searchUrl.searchParams.set('client_key', TENOR_CLIENT_KEY);
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('limit', '8');
  searchUrl.searchParams.set('media_filter', 'gif,tinygif,mediumgif');
  searchUrl.searchParams.set('contentfilter', 'medium');
  searchUrl.searchParams.set('country', 'US');
  searchUrl.searchParams.set('locale', 'en_US');
  searchUrl.searchParams.set('random', 'true');

  const payload = await fetchJson(searchUrl.toString());
  return (payload?.results || []).map(normalizeTenorItem).filter(Boolean);
}

async function getImgflipMemes() {
  const now = Date.now();
  if (imgflipCache.items.length && now - imgflipCache.fetchedAt < IMGFLIP_CACHE_MS) {
    return imgflipCache.items;
  }

  const payload = await fetchJson(IMGFLIP_MEMES_URL);
  const items = (payload?.data?.memes || [])
    .map((item) => ({
      id: String(item.id || '').trim(),
      provider: 'Imgflip',
      providerId: 'imgflip',
      kind: 'image',
      title: trimText(item.name || 'Meme template', 80),
      url: item.url || '',
      previewUrl: item.url || '',
      pageUrl: item.url || '',
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      boxCount: Number(item.box_count || 0),
      attribution: 'Meme template via Imgflip'
    }))
    .filter((item) => item.id && item.url)
    .slice(0, 120);

  imgflipCache = {
    fetchedAt: now,
    items
  };

  return items;
}

function scoreImgflipCandidate(item, queryTokens = [], contextTokens = []) {
  const titleTokens = tokenize(item.title);
  let score = 0;

  for (const token of queryTokens) {
    if (titleTokens.includes(token)) {
      score += 3;
    }
  }

  for (const token of contextTokens) {
    if (titleTokens.includes(token)) {
      score += 1.2;
    }
  }

  if (item.boxCount >= 1 && item.boxCount <= 4) {
    score += 0.45;
  }

  if (item.width && item.height) {
    const aspect = item.width / item.height;
    if (aspect >= 0.7 && aspect <= 1.8) {
      score += 0.3;
    }
  }

  return score;
}

function deriveContextCaption(context = {}, media = null) {
  const trigger = String(context.triggerType || '').toLowerCase();
  const feeling = String(context.feelingLabel || '').toLowerCase();
  const scene = String(context.sceneFamily || '').toLowerCase();
  const screenText = [
    context.screenInsight?.summary,
    context.screenInsight?.activeWindowTitle
  ].filter(Boolean).join(' ').toLowerCase();

  if (context.currentTrack?.title || scene === 'music') {
    return 'this fits the track.';
  }

  if (/error|fail|crash|stack|trace|exception|broken|bug/.test(screenText)) {
    return 'this feels a little too accurate.';
  }

  if (trigger === 'social' || scene === 'social') {
    return 'this has the right energy.';
  }

  if (trigger === 'screen' && /code|terminal|debug|compile|build/.test(screenText)) {
    return 'this is the exact coding mood.';
  }

  if (scene === 'game') {
    return 'this feels very gamer-coded.';
  }

  if (/happy|playful|excited|social/.test(feeling)) {
    return 'this one made me smile.';
  }

  if (/curious|thoughtful|thinking/.test(feeling)) {
    return 'this is the tiny mood.';
  }

  if (media?.providerId === 'imgflip') {
    return 'this one fits the moment.';
  }

  return 'this fits the moment.';
}

function getMediaCooldownSeconds(context = {}) {
  const scene = String(context.sceneFamily || '').toLowerCase();

  if (scene === 'code' || scene === 'terminal' || scene === 'writing') {
    return 1400;
  }

  if (scene === 'music' || scene === 'game' || scene === 'social') {
    return 780;
  }

  return 980;
}

function buildHeuristicSearchQuery(context = {}, preferKind = 'gif') {
  const source = [
    context.screenInsight?.summary,
    context.screenInsight?.activeWindowTitle,
    context.currentTrack?.title,
    context.currentTrack?.artist,
    context.socialDigest,
    ...(context.recentUserMessages || []),
    ...(context.recentAssistantMessages || [])
  ].filter(Boolean).join(' ').toLowerCase();
  const trigger = String(context.triggerType || '').toLowerCase();
  const scene = String(context.sceneFamily || '').toLowerCase();
  const feeling = String(context.feelingLabel || '').toLowerCase();

  if (context.currentTrack?.title || scene === 'music') {
    return preferKind === 'gif' ? 'vibing reaction' : 'music meme';
  }

  if (scene === 'game') {
    return preferKind === 'gif' ? 'gaming reaction' : 'gaming meme';
  }

  if (/error|fail|crash|stack|trace|exception|broken|bug/.test(source)) {
    return preferKind === 'gif' ? 'oops reaction' : 'debugging meme';
  }

  if (/code|terminal|compile|build|script/.test(source) || scene === 'code' || scene === 'terminal') {
    return preferKind === 'gif' ? 'cozy coding reaction' : 'coding meme';
  }

  if (trigger === 'social' || scene === 'social') {
    return preferKind === 'gif' ? 'cute reaction' : 'funny meme';
  }

  if (/curious|thoughtful|thinking/.test(feeling)) {
    return preferKind === 'gif' ? 'thinking reaction' : 'thinking meme';
  }

  return getFallbackSearchQuery(context);
}

function decideMediaPlan(context = {}) {
  const trigger = String(context.triggerType || '').toLowerCase();
  const scene = String(context.sceneFamily || '').toLowerCase();
  const feeling = String(context.feelingLabel || '').toLowerCase();
  const hasRichContext = Boolean(
    context.screenInsight?.summary ||
    context.currentTrack?.title ||
    context.socialDigest ||
    (context.recentUserMessages || []).length
  );

  let score = 0;
  if (trigger === 'social') score += 0.34;
  if (trigger === 'music') score += 0.28;
  if (trigger === 'screen') score += 0.2;
  if (trigger === 'scene-transition') score += 0.14;
  if (trigger === 'settle') score += 0.08;

  if (scene === 'music' || scene === 'game' || scene === 'social') score += 0.14;
  if (scene === 'code' || scene === 'terminal' || scene === 'writing') score -= 0.14;

  if (/happy|playful|excited|social|curious/.test(feeling)) score += 0.12;
  if (/sleepy|settled|calm/.test(feeling)) score -= 0.04;

  if (context.currentTrack?.title) score += 0.08;
  if (context.socialDigest) score += 0.08;
  if (context.screenInsight?.summary) score += 0.05;
  if (!hasRichContext) score -= 0.18;

  const preferKind = scene === 'music' || scene === 'game' || trigger === 'social' ? 'gif' : 'meme';
  return {
    shouldShare: score >= 0.34,
    searchQuery: trimText(buildHeuristicSearchQuery(context, preferKind), 40),
    caption: trimText(deriveContextCaption(context), 90),
    preferKind,
    cooldownSeconds: getMediaCooldownSeconds(context)
  };
}

function chooseImgflipMeme(context, candidates) {
  const shortlist = candidates.slice(0, 8);
  if (!shortlist.length) {
    return null;
  }

  const pool = shortlist.slice(0, Math.min(4, shortlist.length));
  const chosen = pool[Math.floor(Math.random() * pool.length)] || shortlist[0];

  return {
    media: chosen,
    caption: trimText(deriveContextCaption(context, chosen), 90),
    provider: 'imgflip'
  };
}

function pickCandidateByQuery(candidates, query, context = {}) {
  const queryTokens = tokenize(query);
  const contextTokens = tokenize(buildContextDigest(context));
  return candidates
    .map((item) => ({
      item,
      score: scoreImgflipCandidate(item, queryTokens, contextTokens)
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

function createContextMediaPicker() {
  async function pick(config = {}, context = {}) {
    const plan = decideMediaPlan(context);
    if (!plan.shouldShare) {
      return null;
    }

    if (plan.preferKind === 'gif') {
      try {
        const tenorResults = await searchTenor(plan.searchQuery);
        if (tenorResults.length) {
          const selected = tenorResults[Math.floor(Math.random() * Math.min(3, tenorResults.length))];
          return {
            caption: trimText(plan.caption || 'this one fits the mood.', 90),
            media: selected,
            providerStatus: {
              source: 'tenor',
              tenorConfigured: Boolean(TENOR_API_KEY)
            },
            cooldownSeconds: plan.cooldownSeconds
          };
        }
      } catch {}
    }

    try {
      const memes = await getImgflipMemes();
      const ranked = pickCandidateByQuery(memes, plan.searchQuery, context);
      const picked = chooseImgflipMeme(context, ranked);
      if (picked?.media) {
        return {
          caption: trimText(plan.caption || picked.caption || 'this one has the right energy.', 90),
          media: picked.media,
          providerStatus: {
            source: 'imgflip',
            tenorConfigured: Boolean(TENOR_API_KEY)
          },
          cooldownSeconds: plan.cooldownSeconds
        };
      }
    } catch {}

    return null;
  }

  return {
    pick
  };
}

module.exports = {
  createContextMediaPicker
};
