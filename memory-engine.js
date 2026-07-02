const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MAX_ITEMS = 6000;
const MEMORY_DIR_NAME = 'memory';
const MEMORY_FILE_NAME = 'mai-memory.jsonl';
const REFLECTION_FILE_NAME = 'mai-reflections.json';
const STORY_CARDS_FILE_NAME = 'mai-story-cards.json';
const SESSION_COMPRESS_FILE_NAME = 'mai-session-compress.json';
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'been', 'being', 'build', 'could', 'companion', 'desktop',
  'doing', 'from', 'have', 'into', 'just', 'like', 'look', 'make', 'more', 'most', 'need',
  'only', 'really', 'said', 'some', 'that', 'their', 'them', 'then', 'they', 'this', 'through',
  'using', 'want', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your'
]);
const OPERATIONAL_TOKENS = new Set(['error', 'warning', 'failed', 'failure', 'bug', 'issue', 'problem']);
const PROJECT_VERB_PATTERN = /\b(build|fix|improve|refine|tune|upgrade|integrate|wire|fold|rename|polish|adjust|add|remove|rework|clean|make)\b/i;
const PROJECT_TOPIC_PATTERN = /\b(mai|companion|avatar|vrm|animation|motion|screen|vision|memory|recall|moltbook|social|sidecar|music|dj|jukebox|mai studio|lm studio|model|adapter|gui|ui|window)\b/i;

function trimText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function obfuscateThirdPartyNames(text) {
  return String(text || '')
    .replace(/\blm studio\b/gi, 'Mai Studio');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTimePhaseFromDate(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return 'morning';
  }

  if (hour >= 11 && hour < 17) {
    return 'day';
  }

  if (hour >= 17 && hour < 22) {
    return 'evening';
  }

  return 'night';
}

const STANDING_MEMORY_KINDS = new Set(['taste_preference']);
const EPISODIC_MEMORY_KINDS = new Set([
  'screen_insight',
  'music_moment',
  'presence_ritual',
  'scene_transition',
  'scene_visit',
  'scene_residency',
  'media_share',
  'social_share',
  'social_post',
  'sidecar_alert'
]);

function inferMemoryClass(kind = '') {
  const normalized = String(kind || '').toLowerCase();
  if (STANDING_MEMORY_KINDS.has(normalized)) {
    return 'standing';
  }

  if (EPISODIC_MEMORY_KINDS.has(normalized)) {
    return 'episodic';
  }

  return 'episodic';
}

function inferMemoryLane(kind = '', text = '', tags = [], metadata = {}) {
  const normalizedKind = String(kind || '').toLowerCase();
  const haystack = `${normalizedKind} ${String(text || '')} ${toArray(tags).join(' ')} ${flattenMetadata(metadata).join(' ')}`.toLowerCase();

  if (
    /\b(relationship|trust|bond|affection|user_message|assistant_message|liked|disliked|favorite|prefers?|works? like|name|birthday|promise)\b/.test(haystack) ||
    normalizedKind === 'taste_preference'
  ) {
    if (/\b(song|track|music|artist|playlist|album)\b/.test(haystack)) {
      return 'taste';
    }
    return 'relationship';
  }

  if (
    /\b(project|build|goal|blocker|fix|improve|refine|wire|integrate|ui|avatar|memory|screen|vision|sidecar|model|agent|routine|event engine)\b/.test(haystack) &&
    (PROJECT_VERB_PATTERN.test(haystack) || PROJECT_TOPIC_PATTERN.test(haystack))
  ) {
    return 'project';
  }

  if (
    normalizedKind === 'screen_insight' ||
    normalizedKind === 'scene_visit' ||
    normalizedKind === 'scene_transition' ||
    normalizedKind === 'scene_residency' ||
    metadata.sceneKey ||
    metadata.sceneFamily
  ) {
    return 'place';
  }

  if (
    normalizedKind === 'music_moment' ||
    /\b(song|track|music|artist|playlist|album|jukebox|dj)\b/.test(haystack)
  ) {
    return 'taste';
  }

  if (
    normalizedKind === 'presence_ritual' ||
    /\b(ritual|return|wake|morning|evening|night|sleep|routine|settle|settled|habit)\b/.test(haystack)
  ) {
    return 'ritual';
  }

  return 'episodic';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeParseJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function isReflectionWorthyText(text) {
  const value = trimText(text, 240);
  if (!value) {
    return false;
  }

  if (/^\s*[\[{].*[\]}]\s*$/.test(value)) {
    return false;
  }

  if (/\b(context size has been exceeded|unable to reach|request failed|no moltbook api key|did not return json)\b/i.test(value)) {
    return false;
  }

  const tokens = tokenize(value);
  if (tokens.length <= 2 && value.length < 28) {
    return false;
  }

  return true;
}

function isLowSignalItem(item = {}) {
  const summary = trimText(item.summary || item.text || '', 240);
  const combined = `${summary} ${trimText(item.text || '', 240)}`.trim();

  if (!isReflectionWorthyText(summary || combined)) {
    return true;
  }

  if (item.kind === 'sidecar_alert' && /\b(error|warning|failed|failure)\b/i.test(combined)) {
    return true;
  }

  return false;
}

function queryWantsOperationalDetail(queryTokens = []) {
  return queryTokens.some((token) => OPERATIONAL_TOKENS.has(token));
}

function flattenMetadata(value, accumulator = []) {
  if (value == null) {
    return accumulator;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => flattenMetadata(item, accumulator));
    return accumulator;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => flattenMetadata(item, accumulator));
    return accumulator;
  }

  accumulator.push(String(value));
  return accumulator;
}

function tokenize(text) {
  return Array.from(
    new Set(
      String(text || '')
        .toLowerCase()
        .match(/[a-z0-9']+/g) || []
    )
  ).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function normalizeTags(tags = []) {
  return Array.from(
    new Set(
      toArray(tags)
        .map((tag) => String(tag || '').toLowerCase().trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

/** Story-card style: short phrases / words that pull this memory in when they appear in the query (AID-style triggers). */
function normalizeMemoryTriggers(raw = []) {
  return Array.from(
    new Set(
      toArray(raw)
        .map((t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim())
        .filter((t) => t.length >= 3 && t.length <= 80)
    )
  ).slice(0, 14);
}

function inferImportance(kind, text, tags) {
  let score = 0.46;
  const source = `${kind} ${text} ${tags.join(' ')}`.toLowerCase();

  if (/\b(user|assistant)_message\b/.test(kind)) {
    score += 0.14;
  }

  if (/\b(screen|vision|social|warning|error|post)\b/.test(source)) {
    score += 0.16;
  }

  if (/\b(scene|familiar|ritual|return|awake|presence|room|settle|settled|residency|nested)\b/.test(source)) {
    score += 0.12;
  }

  if (/\b(transition|coding nook|terminal den|social room|writing nook|creative desk|browsing lane|playful space)\b/.test(source)) {
    score += 0.1;
  }

  if (/\b(love|important|remember|favorite|likes?|dislikes?|plan|project|goal)\b/.test(source)) {
    score += 0.16;
  }

  if (/\b(track|music|song|playlist)\b/.test(source)) {
    score += 0.08;
  }

  return clamp(score, 0.28, 0.98);
}

function createFingerprint(kind, source, summary, metadata) {
  const core = [
    kind,
    source,
    trimText(summary, 180).toLowerCase(),
    trimText(flattenMetadata(metadata).join(' '), 120).toLowerCase()
  ].join('|');

  return core;
}

function loadItems(filePath, maxItems) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  const loaded = lines.map(safeParseJson).filter(Boolean);
  return loaded.slice(-maxItems);
}

function createMemoryEngine({ rootDir, maxItems = DEFAULT_MAX_ITEMS } = {}) {
  const memoryDir = path.join(rootDir || process.cwd(), MEMORY_DIR_NAME);
  const storePath = path.join(memoryDir, MEMORY_FILE_NAME);
  const reflectionsPath = path.join(memoryDir, REFLECTION_FILE_NAME);
  const sessionCompressPath = path.join(memoryDir, SESSION_COMPRESS_FILE_NAME);

  fs.mkdirSync(memoryDir, { recursive: true });

  const MERGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const PRUNE_MAX_AGE_MS = 95 * 24 * 60 * 60 * 1000;

  let items = loadItems(storePath, maxItems);

  let writeChain = Promise.resolve();
  function enqueueWrite(operation) {
    writeChain = writeChain
      .then(() => operation())
      .catch(() => {});
    return writeChain;
  }

  function atomicWriteText(filePath, text) {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, text, 'utf8');
    try {
      fs.renameSync(tmpPath, filePath);
    } catch (error) {
      try {
        if (error && (error.code === 'EEXIST' || error.code === 'EPERM')) {
          fs.rmSync(filePath, { force: true });
          fs.renameSync(tmpPath, filePath);
          return;
        }
      } catch {}

      throw error;
    }
  }

  function atomicWriteJson(filePath, payload) {
    atomicWriteText(filePath, JSON.stringify(payload, null, 2));
  }

  function persistStore() {
    const payload = items.map((entry) => JSON.stringify(entry)).join('\n') + (items.length ? '\n' : '');
    enqueueWrite(() => atomicWriteText(storePath, payload));
  }

  function pruneStaleMemories() {
    const now = Date.now();
    const before = items.length;

    items = items.filter((item) => {
      if (item.pinned) {
        return true;
      }

      const ageMs = now - (Date.parse(item.createdAt) || now);
      const acc = Number(item.accessCount || 0);
      const imp = Number(item.importance || 0.5);

      if (ageMs > PRUNE_MAX_AGE_MS && imp < 0.36 && acc === 0 && isLowSignalItem(item)) {
        return false;
      }

      return true;
    });

    if (items.length !== before) {
      persistStore();
    }
  }
  let reflections = readJson(reflectionsPath, {
    generatedAt: null,
    sourceCount: 0,
    sourceLastStoredAt: null,
    categories: {},
    digest: ''
  });

  const REFLECTION_BUCKETS = [
    {
      id: 'autonomy',
      line: 'The human values autonomy and wants the creature to feel self-directed rather than obviously puppeted.',
      patterns: ['autonomy', 'autonomous', 'illusion', 'self chosen', 'self-chosen', 'own', 'proactive']
    },
    {
      id: 'lifelike',
      line: 'The human strongly wants Mai to feel lifelike, continuous, and emotionally coherent over time.',
      patterns: ['lifelike', 'alive', 'creature', 'cute', 'feel real', 'coherent', 'continuity', 'presence']
    },
    {
      id: 'memory',
      line: 'Long memory and retrieval of the right chunks are a major priority for the companion.',
      patterns: ['memory', 'recall', 'remember', 'reflection', 'summary', 'relationship', 'habit']
    },
    {
      id: 'screen',
      line: 'Screen awareness is central to the companion’s usefulness and personality.',
      patterns: ['screen', 'vision', 'watch', 'screenshot', 'active window', 'desktop', 'scene', 'transition', 'room', 'settle', 'settled', 'residency', 'code', 'terminal', 'browser', 'art', 'music', 'social', 'writing', 'game']
    },
    {
      id: 'music',
      line: 'Proactive music selection and learning the human’s taste matter a lot.',
      patterns: ['music', 'track', 'song', 'playlist', 'dj', 'jukebox', 'taste', 'like', 'dislike']
    },
    {
      id: 'avatar',
      line: 'Avatar framing, animation quality, and expressive body language are part of the illusion.',
      patterns: ['avatar', 'vrm', 'animation', 'pose', 'motion', 'backwards', 'tiny', 'fit', 'zoom', 'lift']
    },
    {
      id: 'local_ai',
      line: 'Everything should stay local-first around Mai Studio and adaptable on-device models.',
      patterns: ['mai studio', 'lm studio', 'local', 'on-device', 'adapter', 'gemma', 'qwen', 'model', 'vision model']
    },
    {
      id: 'social',
      line: 'The social sidecar should feel like part of the same being while remaining a separate module.',
      patterns: ['moltbook', 'social', 'sidecar', 'mai online', 'post', 'reply', 'browse']
    }
  ];

  function topN(values, limit = 4) {
    return values
      .filter((value) => value && value.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, limit);
  }

  function countPatternMatches(itemsToScan, patterns) {
    let count = 0;

    for (const item of itemsToScan) {
      const haystack = `${item.summary} ${item.text} ${(item.tags || []).join(' ')}`.toLowerCase();
      for (const pattern of patterns) {
        if (haystack.includes(pattern)) {
          count += 1;
          break;
        }
      }
    }

    return count;
  }

  function extractRecentHighlights(sourceItems, limit = 3, matcher = () => true) {
    return sourceItems
      .filter(matcher)
      .slice(-40)
      .reverse()
      .map((item) => trimText(item.summary || item.text || '', 220))
      .filter((value) => isReflectionWorthyText(value))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, limit);
  }

  function computeReflections() {
    const recentItems = items.slice(-240);
    const categories = {};

    for (const bucket of REFLECTION_BUCKETS) {
      const count = countPatternMatches(recentItems, bucket.patterns);
      categories[bucket.id] = {
        id: bucket.id,
        count,
        line: bucket.line
      };
    }

    const likedTracks = extractRecentHighlights(recentItems, 3, (item) => item.kind === 'taste_preference' && /\bliked\b/i.test(item.text));
    const dislikedTracks = extractRecentHighlights(recentItems, 2, (item) => item.kind === 'taste_preference' && /\bskipped\b/i.test(item.text));
    const currentArcHighlights = extractRecentHighlights(recentItems, 5, (item) => (
      ['user_message', 'assistant_message', 'screen_insight', 'media_share', 'social_share', 'social_post'].includes(item.kind) &&
      item.importance >= 0.62
    ));
    const projectFocusHighlights = extractRecentHighlights(recentItems, 5, (item) => (
      ['user_message', 'assistant_message', 'screen_insight', 'media_share', 'social_share', 'social_post'].includes(item.kind) &&
      PROJECT_VERB_PATTERN.test(`${item.summary} ${item.text}`) &&
      PROJECT_TOPIC_PATTERN.test(`${item.summary} ${item.text}`)
    ));

    const strongBuckets = topN(Object.values(categories), 5).filter((entry) => entry.count >= 2);
    const relationshipLine = strongBuckets.length
      ? obfuscateThirdPartyNames(strongBuckets.map((entry) => entry.line).slice(0, 2).join(' '))
      : 'The human likes a warm, capable local companion that feels coherent over time.';
    const tasteLine = likedTracks.length || dislikedTracks.length
      ? obfuscateThirdPartyNames([
          likedTracks.length ? `Recent positive taste signals: ${likedTracks.join(' | ')}.` : '',
          dislikedTracks.length ? `Recent avoid signals: ${dislikedTracks.join(' | ')}.` : ''
        ].filter(Boolean).join(' '))
      : 'Music taste is still being learned from likes, skips, and screen context.';
    const currentArcLine = currentArcHighlights.length
      ? obfuscateThirdPartyNames(`Current build arc: ${currentArcHighlights.slice(0, 3).join(' | ')}.`)
      : 'Current build arc is still forming.';
    const projectFocusLine = projectFocusHighlights.length
      ? obfuscateThirdPartyNames(`Ongoing project focus: ${projectFocusHighlights.slice(0, 2).join(' | ')}.`)
      : categories.avatar.count + categories.screen.count + categories.memory.count + categories.social.count >= 5
        ? 'Ongoing project focus: refining Mai’s avatar, memory, screen awareness, and sidecar behavior into one coherent creature.'
        : 'Ongoing project focus is still being learned.';
    const habitsLine = categories.screen.count + categories.local_ai.count + categories.avatar.count >= 4
      ? 'Recent working style: iterating on the desktop companion, tuning local models, and refining avatar/screen behavior live.'
      : 'Recent working style is still being learned.';

    const digestLines = [
      `- [relationship] ${relationshipLine}`,
      `- [current arc] ${currentArcLine}`,
      `- [project focus] ${projectFocusLine}`,
      `- [taste] ${tasteLine}`,
      `- [habits] ${habitsLine}`
    ];

    reflections = {
      generatedAt: new Date().toISOString(),
      sourceCount: items.length,
      sourceLastStoredAt: items[items.length - 1]?.createdAt || null,
      categories,
      relationship: relationshipLine,
      currentArc: currentArcLine,
      projectFocus: projectFocusLine,
      taste: tasteLine,
      habits: habitsLine,
      digest: digestLines.join('\n')
    };

    enqueueWrite(() => atomicWriteJson(reflectionsPath, reflections));
    return reflections;
  }

  function ensureReflections() {
    const nextSourceCount = items.length;
    const nextLastStoredAt = items[items.length - 1]?.createdAt || null;
    const hasLegacyShape = !reflections.projectFocus || !String(reflections.digest || '').includes('[project focus]');
    const reflectionLines = [
      reflections.relationship,
      reflections.currentArc,
      reflections.projectFocus,
      reflections.taste,
      reflections.habits
    ].filter(Boolean);
    const hasInvalidReflection = reflectionLines.some((line) => !isReflectionWorthyText(line));
    const hasLegacyBranding = reflectionLines.some((line) => /\blm studio\b/i.test(String(line)));

    if (
      reflections.sourceCount === nextSourceCount &&
      reflections.sourceLastStoredAt === nextLastStoredAt &&
      reflections.generatedAt &&
      !hasInvalidReflection &&
      !hasLegacyBranding &&
      !hasLegacyShape
    ) {
      return reflections;
    }

    return computeReflections();
  }

  function selectReflectionLines(query = {}) {
    const current = ensureReflections();
    const source = buildQueryText(query).toLowerCase();
    const tagSet = new Set(normalizeTags(query.tags));
    const lines = [];

    if (!source) {
      return {
        digest: obfuscateThirdPartyNames(current.digest),
        lines: [
          current.relationship,
          current.currentArc,
          current.projectFocus,
          current.taste,
          current.habits
        ].map((line) => obfuscateThirdPartyNames(line))
      };
    }

    const wantsMusic = /\bmusic|track|song|playlist|dj|taste|jukebox\b/.test(source) || tagSet.has('music');
    const wantsScreen = /\bscreen|window|vision|desktop|watch\b/.test(source) || tagSet.has('screen');
    const wantsSocial = /\bsocial|moltbook|post|reply|sidecar\b/.test(source) || tagSet.has('social');
    const wantsMemory = /\bmemory|recall|remember|relationship|habit|summary\b/.test(source);
    const wantsAvatar = /\bavatar|vrm|animation|motion|body\b/.test(source);
    const wantsModels = /\bmodel|adapter|lm studio|local|gemma|qwen|vision model\b/.test(source);

    lines.push(current.relationship);
    lines.push(current.currentArc);
    lines.push(current.projectFocus);

    if (wantsMusic) {
      lines.push(current.taste);
    }

    if (wantsScreen || wantsAvatar || wantsSocial || wantsModels || wantsMemory) {
      lines.push(current.habits);
    }

    for (const bucket of REFLECTION_BUCKETS) {
      if (current.categories?.[bucket.id]?.count >= 2 && bucket.patterns.some((pattern) => source.includes(pattern))) {
        lines.push(bucket.line);
      }
    }

    const uniqueLines = lines.filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).slice(0, 5);
    const labelForLine = (line) => {
      if (line === current.relationship) {
        return 'relationship';
      }
      if (line === current.currentArc) {
        return 'current arc';
      }
      if (line === current.projectFocus) {
        return 'project focus';
      }
      if (line === current.taste) {
        return 'taste';
      }
      if (line === current.habits) {
        return 'habits';
      }
      return 'reflection';
    };

    return {
      digest: obfuscateThirdPartyNames(uniqueLines.map((line) => `- [${labelForLine(line)}] ${line}`).join('\n')),
      lines: uniqueLines.map((line) => obfuscateThirdPartyNames(line))
    };
  }

  function compactIfNeeded() {
    pruneStaleMemories();

    if (items.length <= Math.round(maxItems * 1.15)) {
      return;
    }

    items = items.slice(-maxItems);
    persistStore();
  }

  function normalizeEntry(entry = {}) {
    const kind = trimText(entry.kind || 'note', 40).toLowerCase() || 'note';
    const source = trimText(entry.source || 'mai-companion', 60).toLowerCase() || 'mai-companion';
    const summary = obfuscateThirdPartyNames(trimText(entry.summary || entry.text || '', 220));
    const text = obfuscateThirdPartyNames(trimText(entry.text || summary, 720));

    if (!text) {
      return null;
    }

    const rawMetadata = entry.metadata && typeof entry.metadata === 'object'
      ? entry.metadata
      : {};
    const createdAtDate = entry.createdAt ? new Date(entry.createdAt) : new Date();
    const memoryClass = trimText(entry.memoryClass || rawMetadata.memoryClass || '', 20).toLowerCase() || inferMemoryClass(kind);
    const memoryLane = trimText(entry.memoryLane || rawMetadata.memoryLane || '', 24).toLowerCase() || inferMemoryLane(kind, text, entry.tags, rawMetadata);
    const metadata = {
      ...rawMetadata,
      sceneKey: trimText(rawMetadata.sceneKey || '', 220),
      sceneFamily: trimText(rawMetadata.sceneFamily || '', 40).toLowerCase(),
      sceneLabel: trimText(rawMetadata.sceneLabel || '', 120),
      timePhase: trimText(rawMetadata.timePhase || '', 20).toLowerCase() || getTimePhaseFromDate(createdAtDate),
      trackId: trimText(rawMetadata.trackId || '', 400),
      memoryClass,
      memoryLane,
      triggers: normalizeMemoryTriggers([...toArray(rawMetadata.triggers), ...toArray(entry.triggers)])
    };
    const tags = normalizeTags([
      ...toArray(entry.tags),
      kind,
      source,
      memoryClass === 'standing' ? 'standing' : 'episodic',
      memoryLane
    ]);
    const keywordBlob = [
      kind,
      source,
      summary,
      text,
      tags.join(' '),
      flattenMetadata(metadata).join(' ')
    ].join(' ');
    const keywords = tokenize(keywordBlob).slice(0, 48);
    const importance = clamp(
      Number.isFinite(Number(entry.importance))
        ? Number(entry.importance)
        : inferImportance(kind, text, tags),
      0.2,
      1
    );

    return {
      id: entry.id || `mem-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: entry.createdAt || new Date().toISOString(),
      kind,
      source,
      summary: summary || trimText(text, 220),
      text,
      mood: trimText(entry.mood || entry.feelingLabel || metadata.mood || '', 40),
      tags,
      keywords,
      importance,
      metadata,
      fingerprint: createFingerprint(kind, source, summary || text, metadata),
      mergeCount: Number(entry.mergeCount || 0),
      accessCount: Number(entry.accessCount || 0),
      lastRetrievedAt: entry.lastRetrievedAt || null,
      lastMergedAt: entry.lastMergedAt || null,
      pinned: Boolean(entry.pinned)
    };
  }

  function findRecentDuplicate(item) {
    const createdAtMs = Date.parse(item.createdAt) || Date.now();

    for (let index = items.length - 1; index >= 0 && index >= items.length - 40; index -= 1) {
      const candidate = items[index];
      if (!candidate || candidate.fingerprint !== item.fingerprint) {
        continue;
      }

      const candidateMs = Date.parse(candidate.createdAt) || 0;
      if (Math.abs(createdAtMs - candidateMs) <= 5 * 60 * 1000) {
        return candidate;
      }
    }

    return null;
  }

  function findMergeCandidateIndex(item) {
    const createdAtMs = Date.parse(item.createdAt) || Date.now();
    const minGapMs = 5 * 60 * 1000;

    for (let index = items.length - 1; index >= 0 && index >= items.length - 240; index -= 1) {
      const candidate = items[index];
      if (!candidate || candidate.fingerprint !== item.fingerprint) {
        continue;
      }

      const candidateMs = Date.parse(candidate.createdAt) || 0;
      const delta = Math.abs(createdAtMs - candidateMs);
      if (delta <= minGapMs) {
        continue;
      }

      if (delta <= MERGE_WINDOW_MS) {
        return index;
      }
    }

    return null;
  }

  function mergeMemoryAt(index, incoming) {
    const existing = items[index];
    const existingText = String(existing.text || '');
    const incomingText = String(incoming.text || '');
    const existingSummary = String(existing.summary || '');
    const incomingSummary = String(incoming.summary || '');

    const mergedTriggers = normalizeMemoryTriggers([
      ...(existing.metadata?.triggers || []),
      ...(incoming.metadata?.triggers || [])
    ]);

    const next = {
      ...existing,
      text: existingText.length >= incomingText.length ? existingText : incomingText,
      summary: existingSummary.length >= incomingSummary.length ? existingSummary : incomingSummary,
      mergeCount: (existing.mergeCount || 0) + 1,
      lastMergedAt: new Date().toISOString(),
      importance: clamp(
        Math.max(Number(existing.importance || 0.5), Number(incoming.importance || 0.5)) + 0.025,
        0.2,
        0.98
      ),
      keywords: Array.from(new Set([...(existing.keywords || []), ...(incoming.keywords || [])])).slice(0, 48),
      metadata: {
        ...(existing.metadata || {}),
        ...(incoming.metadata || {}),
        triggers: mergedTriggers
      }
    };

    next.fingerprint = createFingerprint(next.kind, next.source, next.summary || next.text, next.metadata);

    items[index] = next;
    persistStore();
    ensureReflections();
    return next;
  }

  function remember(entry = {}) {
    const normalized = normalizeEntry(entry);
    if (!normalized) {
      return null;
    }

    if (!entry.allowDuplicate) {
      const duplicate = findRecentDuplicate(normalized);
      if (duplicate) {
        return duplicate;
      }

      const mergeIndex = findMergeCandidateIndex(normalized);
      if (mergeIndex !== null && mergeIndex >= 0) {
        return mergeMemoryAt(mergeIndex, normalized);
      }
    }

    items.push(normalized);
    fs.appendFileSync(storePath, `${JSON.stringify(normalized)}\n`, 'utf8');
    compactIfNeeded();
    ensureReflections();
    return normalized;
  }

  function rememberMany(entries = []) {
    return toArray(entries).map((entry) => remember(entry)).filter(Boolean);
  }

  function buildQueryText(query = {}) {
    return [
      query.text,
      query.userMessage,
      query.assistantMessage,
      query.screenSummary,
      query.windowTitle,
      query.currentTrack,
      query.feelingLabel,
      query.socialDigest,
      query.sceneFamily,
      query.sceneKey,
      query.timePhase
    ].filter(Boolean).join(' ');
  }

  function scoreContextMatch(item, context = {}) {
    let bonus = 0;
    const md = item.metadata || {};
    const qFamily = trimText(context.sceneFamily || '', 40).toLowerCase();
    const qKey = trimText(context.sceneKey || '', 220);
    const qPhase = trimText(context.timePhase || '', 20).toLowerCase();
    const qTrack = trimText(context.trackId || '', 400);
    const preferredLanes = new Set(normalizeTags(context.preferredLanes || []));

    if (qFamily && md.sceneFamily && md.sceneFamily === qFamily) {
      bonus += 1.15;
    }

    if (qKey && md.sceneKey && md.sceneKey === qKey) {
      bonus += 1.55;
    } else if (qKey && md.sceneKey) {
      const qTokens = tokenize(qKey.replace(/\s*::\s*/g, ' '));
      const keySet = new Set(tokenize(md.sceneKey));
      let shared = 0;
      for (const token of qTokens) {
        if (keySet.has(token)) {
          shared += 1;
        }
      }

      if (shared >= 2) {
        bonus += 0.45;
      }
    }

    if (qPhase && md.timePhase && md.timePhase === qPhase) {
      bonus += 0.38;
    }

    if (qTrack && md.trackId && md.trackId === qTrack) {
      bonus += 0.85;
    }

    if (md.memoryClass === 'standing' && context.queryTokenCount <= 5) {
      bonus += 0.22;
    }

    if (preferredLanes.size && md.memoryLane && preferredLanes.has(md.memoryLane)) {
      bonus += 1.1;
    }

    const hay = context.queryHaystack || '';
    if (hay) {
      const triggers = normalizeMemoryTriggers(md.triggers || []);
      let triggerHits = 0;
      for (const tr of triggers) {
        if (tr.length >= 3 && hay.includes(tr)) {
          bonus += 1.18;
          triggerHits += 1;
          if (triggerHits >= 2) {
            break;
          }
        }
      }
    }

    return bonus;
  }

  function scoreItem(item, queryTokens, tagSet, kindSet, sourceSet, mood, context = {}) {
    const keywordSet = new Set(item.keywords || []);
    let overlap = 0;

    for (const token of queryTokens) {
      if (keywordSet.has(token)) {
        overlap += 1;
      }
    }

    let tagMatches = 0;
    for (const tag of item.tags || []) {
      if (tagSet.has(tag)) {
        tagMatches += 1;
      }
    }

    const createdAtMs = Date.parse(item.createdAt) || Date.now();
    const ageHours = Math.max(0, (Date.now() - createdAtMs) / (1000 * 60 * 60));
    const recencyBoost = 1.2 / (1 + ageHours / 16);
    let score = overlap * 2.35 + tagMatches * 0.8 + recencyBoost + item.importance * 2.4;

    if (kindSet.has(item.kind)) {
      score += 0.95;
    }

    if (sourceSet.has(item.source)) {
      score += 0.75;
    }

    if (mood && item.mood && mood === item.mood) {
      score += 0.65;
    }

    if (!queryTokens.length) {
      score += 0.45;
    }

    if (isLowSignalItem(item) && !queryWantsOperationalDetail(queryTokens)) {
      score -= 1.9;
    }

    score += scoreContextMatch(item, context);

    return score;
  }

  function pickDiverseResults(sorted, limit) {
    const picked = [];
    const bucketCounts = new Map();
    const maxPerBucket = 2;

    for (const entry of sorted) {
      if (picked.length >= limit) {
        break;
      }

      const bucket = `${entry.kind}|${entry.source}`;
      const count = bucketCounts.get(bucket) || 0;
      if (count >= maxPerBucket) {
        continue;
      }

      picked.push(entry);
      bucketCounts.set(bucket, count + 1);
    }

    for (const entry of sorted) {
      if (picked.length >= limit) {
        break;
      }

      if (picked.some((p) => p.id === entry.id)) {
        continue;
      }

      picked.push(entry);
    }

    return picked;
  }

  function reinforceRetrieved(selected = []) {
    if (!selected.length) {
      return;
    }

    const ids = new Set(selected.map((entry) => entry.id).filter(Boolean));
    let touched = false;
    const nowIso = new Date().toISOString();

    items = items.map((item) => {
      if (!ids.has(item.id)) {
        return item;
      }

      touched = true;
      return {
        ...item,
        accessCount: (item.accessCount || 0) + 1,
        lastRetrievedAt: nowIso,
        importance: clamp(Number(item.importance || 0.5) + 0.018, 0.2, 0.98)
      };
    });

    if (touched) {
      persistStore();
    }
  }

  function formatDigest(results, maxChars) {
    const lines = [];
    let totalLength = 0;

    for (const result of results) {
      const label = result.kind.replace(/_/g, ' ');
      const line = obfuscateThirdPartyNames(`- [${label}] ${result.summary}`);
      const nextLength = totalLength + line.length + 1;

      if (maxChars && nextLength > maxChars) {
        break;
      }

      lines.push(line);
      totalLength = nextLength;
    }

    return lines.join('\n');
  }

  function readTriggeredStoryCards(queryHaystack = '') {
    const cardsPath = path.join(memoryDir, STORY_CARDS_FILE_NAME);
    if (!fs.existsSync(cardsPath)) {
      return [];
    }

    let parsed = null;
    try {
      parsed = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    } catch {
      return [];
    }

    const cards = Array.isArray(parsed) ? parsed : parsed?.cards;
    if (!Array.isArray(cards)) {
      return [];
    }

    const hay = String(queryHaystack || '').toLowerCase();
    const lines = [];

    for (const card of cards) {
      if (!card || typeof card !== 'object') {
        continue;
      }

      const triggers = normalizeMemoryTriggers(card.triggers || card.keys || []);
      if (!triggers.some((t) => t.length >= 3 && hay.includes(t))) {
        continue;
      }

      const summary = trimText(card.summary || card.body || card.text || '', 240);
      if (!summary) {
        continue;
      }

      lines.push(obfuscateThirdPartyNames(`- ${summary}`));
      if (lines.length >= 4) {
        break;
      }
    }

    return lines;
  }

  function mergeDigestSections(storyLines, memoryDigest, maxChars) {
    const storyBlock = storyLines.length ? storyLines.join('\n') : '';
    const memoryBlock = memoryDigest || '';
    if (!maxChars) {
      return [storyBlock, memoryBlock].filter(Boolean).join('\n');
    }

    const separator = storyBlock && memoryBlock ? 1 : 0;
    const storyLen = storyBlock.length;
    if (storyLen + separator >= maxChars) {
      return storyBlock.slice(0, maxChars).trimEnd();
    }

    const budgetForMemory = maxChars - storyLen - separator;
    const trimmedMemory =
      memoryBlock.length > budgetForMemory
        ? `${memoryBlock.slice(0, Math.max(0, budgetForMemory - 3)).trimEnd()}...`
        : memoryBlock;

    return [storyBlock, trimmedMemory].filter(Boolean).join('\n');
  }

  function recall(query = {}) {
    const limit = clamp(Number(query.limit) || 6, 1, 12);
    const maxChars = clamp(Number(query.maxChars) || 900, 180, 2400);
    const queryText = buildQueryText(query);
    const reflectionSelection = selectReflectionLines(query);
    const queryTokens = tokenize(queryText);
    const wantsOperationalDetail = queryWantsOperationalDetail(queryTokens);
    const tagSet = new Set(normalizeTags(query.tags));
    const kindSet = new Set(normalizeTags(query.preferredKinds || query.kinds));
    const sourceSet = new Set(normalizeTags(query.preferredSources || query.sources));
    const mood = trimText(query.mood || query.feelingLabel || '', 40).toLowerCase();
    const queryHaystack = buildQueryText(query).toLowerCase();
    const contextBase = {
      sceneFamily: trimText(query.sceneFamily || '', 40).toLowerCase(),
      sceneKey: trimText(query.sceneKey || '', 220),
      timePhase: trimText(query.timePhase || '', 20).toLowerCase(),
      trackId: trimText(query.trackId || '', 400),
      queryTokenCount: queryTokens.length,
      queryHaystack
    };

    const scored = items
      .map((item) => ({
        ...item,
        score: scoreItem(item, queryTokens, tagSet, kindSet, sourceSet, mood, contextBase)
      }))
      .filter((item) => (queryTokens.length ? item.score >= 2.4 : true))
      .sort((left, right) => right.score - left.score || String(right.createdAt).localeCompare(String(left.createdAt)));
    const scoredWithoutNoise = wantsOperationalDetail
      ? scored
      : scored.filter((item) => !isLowSignalItem(item));
    const pool = scoredWithoutNoise.length ? scoredWithoutNoise : scored;
    const selected = pickDiverseResults(pool, limit);

    if (query.reinforce !== false && selected.length) {
      reinforceRetrieved(selected);
    }

    const hydrated = selected.map((row) => {
      const base = items.find((entry) => entry.id === row.id) || row;
      return {
        ...base,
        score: Number.isFinite(Number(row.score)) ? Number(row.score) : Number(base.score) || 0
      };
    });

    const storyLines = readTriggeredStoryCards(queryHaystack);
    const storyBudget = storyLines.join('\n').length + (storyLines.length ? 1 : 0);
    const memoryCharBudget = Math.max(120, maxChars - storyBudget);
    const memoryDigest = formatDigest(hydrated, memoryCharBudget);

    return {
      totalMemories: items.length,
      reflectionDigest: reflectionSelection.digest,
      reflections: reflectionSelection.lines,
      digest: mergeDigestSections(storyLines, memoryDigest, maxChars),
      results: hydrated.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        kind: item.kind,
        source: item.source,
        mood: item.mood,
        memoryLane: item.metadata?.memoryLane || 'episodic',
        summary: obfuscateThirdPartyNames(item.summary),
        text: obfuscateThirdPartyNames(item.text),
        tags: item.tags,
        importance: item.importance,
        score: Number(item.score.toFixed(3)),
        metadata: item.metadata
      }))
    };
  }

  function getRecent(limit = 8) {
    return items.slice(-Math.max(1, limit)).reverse();
  }

  function getStatus() {
    const currentReflections = ensureReflections();
    const recentKinds = {};
    const laneCounts = {};
    for (const item of getRecent(20)) {
      recentKinds[item.kind] = (recentKinds[item.kind] || 0) + 1;
    }
    for (const item of items) {
      const lane = item?.metadata?.memoryLane || 'episodic';
      laneCounts[lane] = (laneCounts[lane] || 0) + 1;
    }

    return {
      totalMemories: items.length,
      storePath,
      lastStoredAt: items[items.length - 1]?.createdAt || null,
      recentKinds,
      laneCounts,
      reflectionsGeneratedAt: currentReflections.generatedAt || null
    };
  }

  function getReflections() {
    const current = ensureReflections();
    return {
      ...current,
      relationship: obfuscateThirdPartyNames(current.relationship),
      currentArc: obfuscateThirdPartyNames(current.currentArc),
      projectFocus: obfuscateThirdPartyNames(current.projectFocus),
      taste: obfuscateThirdPartyNames(current.taste),
      habits: obfuscateThirdPartyNames(current.habits),
      digest: obfuscateThirdPartyNames(current.digest)
    };
  }

  function getSessionCompress() {
    return readJson(sessionCompressPath, { text: '', historyAnchor: 0, updatedAt: null });
  }

  function setSessionCompress(payload = {}) {
    const text = trimText(payload.text || '', 5000);
    const historyAnchor = clamp(Math.round(Number(payload.historyAnchor) || 0), 0, 1e9);
    enqueueWrite(() => atomicWriteJson(sessionCompressPath, {
      text,
      historyAnchor,
      updatedAt: new Date().toISOString()
    }));
    return { text, historyAnchor };
  }

  return {
    remember,
    rememberMany,
    recall,
    getRecent,
    getStatus,
    getReflections,
    getSessionCompress,
    setSessionCompress
  };
}

module.exports = {
  createMemoryEngine
};
