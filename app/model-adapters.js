function trimText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function cloneContent(content) {
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part && typeof part === 'object') {
        return { ...part };
      }

      return part;
    });
  }

  return content;
}

function familyFromId(modelId = '') {
  const id = String(modelId || '').toLowerCase();

  if (/(^|[\/\-_ ])gemma[-_ ]?4\b|google\/gemma-4|gemma4/.test(id)) {
    return 'gemma4';
  }

  if (/qwen3\.?5|qwen35/.test(id)) {
    return 'qwen35';
  }

  if (/qwen3[^a-z]?vl|qwen\/qwen3-vl/.test(id)) {
    return 'qwen3-vl';
  }

  if (/qwen3/.test(id)) {
    return 'qwen3';
  }

  if (/gemma[-_ ]?3|gemma3/.test(id)) {
    return 'gemma3';
  }

  if (/glm-4|glm/.test(id)) {
    return 'glm';
  }

  if (/granite/.test(id)) {
    return 'granite';
  }

  if (/gpt-oss/.test(id)) {
    return 'gpt-oss';
  }

  if (/olmo/.test(id)) {
    return 'olmo';
  }

  if (/phi-4|reasoning/.test(id)) {
    return 'reasoning-small';
  }

  if (/codestral|devstral|magistral|ministral|mistral/.test(id)) {
    return 'mistral';
  }

  if (/wayfarer|harbinger|muse/.test(id)) {
    return 'story';
  }

  if (/coder/.test(id)) {
    return 'coder';
  }

  return 'generic';
}

function inferModelProfile(modelId = '') {
  const family = familyFromId(modelId);
  const id = String(modelId || '').trim();
  const lower = id.toLowerCase();

  const base = {
    id,
    family,
    label: id || 'Unknown model',
    adapterTier: 'lean',
    supportsVision: false,
    supportsToolUse: false,
    supportsReasoning: false,
    supportsSystemRole: true,
    contextWindow: 32768,
    preferredHistoryTurns: 4,
    preferredMemoryChars: 420,
    preferredDjCandidates: 4,
    preferredSocialMemoryChars: 320,
    maxMessageChars: 1800,
    notes: 'Use compact prompts and shorter recall windows.'
  };

  if (family === 'gemma4') {
    return {
      ...base,
      adapterTier: 'flagship',
      supportsVision: true,
      supportsToolUse: true,
      supportsReasoning: true,
      contextWindow: 262144,
      preferredHistoryTurns: 10,
      preferredMemoryChars: 1200,
      preferredDjCandidates: 8,
      preferredSocialMemoryChars: 850,
      maxMessageChars: 5200,
      notes: 'Primary target. Rich multimodal prompts are safe.'
    };
  }

  if (family === 'qwen35') {
    return {
      ...base,
      adapterTier: 'flagship',
      supportsVision: true,
      supportsToolUse: true,
      supportsReasoning: true,
      contextWindow: 262144,
      preferredHistoryTurns: 9,
      preferredMemoryChars: 1050,
      preferredDjCandidates: 7,
      preferredSocialMemoryChars: 760,
      maxMessageChars: 4600,
      notes: 'Primary target. Strong multimodal reasoning with long context.'
    };
  }

  if (family === 'qwen3-vl') {
    return {
      ...base,
      adapterTier: 'strong',
      supportsVision: true,
      supportsToolUse: true,
      supportsReasoning: true,
      contextWindow: 131072,
      preferredHistoryTurns: 8,
      preferredMemoryChars: 900,
      preferredDjCandidates: 6,
      preferredSocialMemoryChars: 640,
      maxMessageChars: 3600,
      notes: 'Strong fallback target with full vision support.'
    };
  }

  if (family === 'glm') {
    return {
      ...base,
      adapterTier: 'strong',
      supportsVision: /4\.6v|vision|vl/.test(lower),
      supportsToolUse: true,
      supportsReasoning: true,
      contextWindow: 131072,
      preferredHistoryTurns: 8,
      preferredMemoryChars: 920,
      preferredDjCandidates: 6,
      preferredSocialMemoryChars: 620,
      maxMessageChars: 3400,
      notes: 'Strong multimodal fallback with good reasoning.'
    };
  }

  if (family === 'granite' || family === 'gpt-oss' || family === 'olmo') {
    return {
      ...base,
      adapterTier: 'balanced',
      supportsToolUse: true,
      supportsReasoning: /think|granite-4|gpt-oss|olmo-3/.test(lower),
      contextWindow: 65536,
      preferredHistoryTurns: 6,
      preferredMemoryChars: 680,
      preferredDjCandidates: 5,
      preferredSocialMemoryChars: 480,
      maxMessageChars: 2600,
      notes: 'Text-first fallback with solid reasoning headroom.'
    };
  }

  if (family === 'qwen3' || family === 'gemma3' || family === 'mistral') {
    return {
      ...base,
      adapterTier: 'strong',
      supportsVision: /vl|vision|gemma-3|gemma3/.test(lower),
      supportsToolUse: true,
      supportsReasoning: /reason|qwen3|magistral|devstral/.test(lower),
      contextWindow: /128|256/.test(lower) ? 131072 : 65536,
      preferredHistoryTurns: 7,
      preferredMemoryChars: 760,
      preferredDjCandidates: 6,
      preferredSocialMemoryChars: 560,
      maxMessageChars: 3000,
      notes: 'Strong fallback. Keep prompts focused and structured.'
    };
  }

  if (family === 'story' || family === 'coder') {
    return {
      ...base,
      adapterTier: 'balanced',
      supportsToolUse: true,
      supportsReasoning: /harbinger|wayfarer|coder/.test(lower),
      contextWindow: 65536,
      preferredHistoryTurns: 6,
      preferredMemoryChars: 620,
      preferredDjCandidates: 5,
      preferredSocialMemoryChars: 440,
      maxMessageChars: 2400,
      notes: 'Useful specialty model. Use tighter context windows.'
    };
  }

  if (family === 'reasoning-small') {
    return {
      ...base,
      adapterTier: 'balanced',
      supportsReasoning: true,
      supportsSystemRole: true,
      contextWindow: 65536,
      preferredHistoryTurns: 6,
      preferredMemoryChars: 600,
      preferredDjCandidates: 5,
      preferredSocialMemoryChars: 420,
      maxMessageChars: 2200,
      notes: 'Reasoning-heavy but compact. Favor concise prompts.'
    };
  }

  if (/vl|vision|glm-4\.6v|olmocr/.test(lower)) {
    return {
      ...base,
      supportsVision: true,
      preferredHistoryTurns: 5,
      preferredMemoryChars: 520,
      preferredDjCandidates: 5,
      preferredSocialMemoryChars: 360,
      maxMessageChars: 2100,
      notes: 'Vision-capable fallback. Keep context compact.'
    };
  }

  if (/gpt2|tiny|135m|500m|1\.2b|2b|3b|4b/.test(lower)) {
    return {
      ...base,
      adapterTier: 'lean',
      supportsSystemRole: !/gpt2/.test(lower),
      contextWindow: 16384,
      preferredHistoryTurns: 3,
      preferredMemoryChars: 300,
      preferredDjCandidates: 3,
      preferredSocialMemoryChars: 240,
      maxMessageChars: 1300,
      notes: 'Small fallback model. Keep only the essentials.'
    };
  }

  return base;
}

function summarizeModelProfile(profile = {}) {
  const parts = [];

  if (profile.adapterTier === 'flagship') {
    parts.push('Mai flagship lane');
  } else if (profile.adapterTier === 'strong') {
    parts.push('Mai strong lane');
  } else if (profile.adapterTier === 'balanced') {
    parts.push('Mai balanced lane');
  } else {
    parts.push('Mai lean lane');
  }

  if (profile.supportsVision) {
    parts.push('vision');
  }

  if (profile.supportsToolUse) {
    parts.push('tools');
  }

  if (profile.supportsReasoning) {
    parts.push('reasoning');
  }

  return parts.join(' | ');
}

function buildModelProfiles(models = []) {
  return models.map((model) => {
    const profile = inferModelProfile(model?.id || '');
    return {
      ...model,
      profile
    };
  });
}

function adaptMessagesForModel(profile, rawMessages = [], options = {}) {
  const messages = Array.isArray(rawMessages)
    ? rawMessages.map((message) => ({
        ...message,
        content: cloneContent(message.content)
      }))
    : [];
  const nonSystemMessages = messages.filter((message) => message.role !== 'system');
  const historyWindow = Math.max(2, Number(options.historyWindow) || Number(profile.preferredHistoryTurns) || 4);
  const trimmedMessages = messages.filter((message) => message.role === 'system');
  const recentMessages = nonSystemMessages.slice(-historyWindow * 2);

  for (const message of recentMessages) {
    trimmedMessages.push(message);
  }

  const normalizedMessages = trimmedMessages.map((message) => {
    if (typeof message.content === 'string') {
      return {
        ...message,
        content: trimText(message.content, profile.maxMessageChars)
      };
    }

    if (!Array.isArray(message.content)) {
      return message;
    }

    const nextParts = [];
    let removedImage = false;

    for (const part of message.content) {
      if (!part || typeof part !== 'object') {
        nextParts.push(part);
        continue;
      }

      if (part.type === 'image_url' && !profile.supportsVision) {
        removedImage = true;
        continue;
      }

      if (part.type === 'text') {
        nextParts.push({
          ...part,
          text: trimText(part.text, profile.maxMessageChars)
        });
        continue;
      }

      nextParts.push(part);
    }

    if (removedImage) {
      nextParts.unshift({
        type: 'text',
        text: 'Visual pixels were omitted because this model does not support native vision. Infer cautiously from the remaining text context only.'
      });
    }

    return {
      ...message,
      content: nextParts
    };
  });

  if (profile.supportsSystemRole) {
    return normalizedMessages;
  }

  const systemText = normalizedMessages
    .filter((message) => message.role === 'system')
    .map((message) => {
      if (typeof message.content === 'string') {
        return message.content;
      }

      if (Array.isArray(message.content)) {
        return message.content
          .map((part) => (typeof part === 'string' ? part : part?.text || ''))
          .join('\n');
      }

      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  const withoutSystem = normalizedMessages.filter((message) => message.role !== 'system');
  if (!systemText) {
    return withoutSystem;
  }

  const firstUserIndex = withoutSystem.findIndex((message) => message.role === 'user');
  const instructionPrefix = `[System instructions folded in for compatibility]\n${trimText(systemText, profile.maxMessageChars)}\n\n`;

  if (firstUserIndex >= 0) {
    const target = withoutSystem[firstUserIndex];
    if (typeof target.content === 'string') {
      withoutSystem[firstUserIndex] = {
        ...target,
        content: trimText(`${instructionPrefix}${target.content}`, profile.maxMessageChars)
      };
    } else if (Array.isArray(target.content)) {
      withoutSystem[firstUserIndex] = {
        ...target,
        content: [
          { type: 'text', text: trimText(instructionPrefix, profile.maxMessageChars) },
          ...target.content
        ]
      };
    }
    return withoutSystem;
  }

  return [
    {
      role: 'user',
      content: trimText(instructionPrefix, profile.maxMessageChars)
    },
    ...withoutSystem
  ];
}

module.exports = {
  adaptMessagesForModel,
  buildModelProfiles,
  inferModelProfile,
  summarizeModelProfile
};
