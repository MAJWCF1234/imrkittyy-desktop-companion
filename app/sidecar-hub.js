function trimText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function createSidecarHub({ memoryEngine } = {}) {
  const sidecars = new Map();
  let listener = null;

  function rememberContextPatch(patch = {}, origin = 'mai-companion') {
    if (!memoryEngine) {
      return;
    }

    const entries = [];

    if (patch.userMessage) {
      entries.push({
        kind: 'user_message',
        source: origin,
        text: patch.userMessage,
        summary: trimText(patch.userMessage, 220),
        tags: ['chat', 'user'],
        importance: 0.74
      });
    }

    if (patch.assistantMessage) {
      entries.push({
        kind: 'assistant_message',
        source: origin,
        text: patch.assistantMessage,
        summary: trimText(patch.assistantMessage, 220),
        mood: patch.feelingLabel || '',
        tags: ['chat', 'assistant'],
        importance: 0.72
      });
    }

    if (patch.screenInsight?.summary) {
      entries.push({
        kind: 'screen_insight',
        source: 'screen-watch',
        text: [
          patch.screenInsight.summary,
          patch.screenInsight.mood ? `Mood: ${patch.screenInsight.mood}` : '',
          patch.screenInsight.activeWindowTitle ? `Window: ${patch.screenInsight.activeWindowTitle}` : '',
          patch.screenInsight.suggestedMusicVibe ? `Vibe: ${patch.screenInsight.suggestedMusicVibe}` : ''
        ].filter(Boolean).join(' | '),
        summary: patch.screenInsight.summary,
        mood: patch.screenInsight.mood || '',
        tags: ['screen', 'vision'],
        importance: 0.82,
        metadata: patch.screenInsight
      });
    }

    if (patch.currentTrack?.title) {
      entries.push({
        kind: 'music_moment',
        source: 'auto-dj',
        text: `${patch.currentTrack.artist || 'Unknown artist'} - ${patch.currentTrack.title}${patch.currentTrack.reason ? ` | ${patch.currentTrack.reason}` : ''}`,
        summary: `${patch.currentTrack.artist || 'Unknown artist'} - ${patch.currentTrack.title}`,
        tags: ['music', 'track'],
        importance: 0.64,
        metadata: patch.currentTrack
      });
    }

    if (patch.preferenceNote) {
      entries.push({
        kind: 'taste_preference',
        source: 'auto-dj',
        text: patch.preferenceNote,
        summary: trimText(patch.preferenceNote, 220),
        tags: ['music', 'taste'],
        importance: 0.85
      });
    }

    if (entries.length) {
      memoryEngine.rememberMany(entries);
    }
  }

  function rememberSidecarEvent(sidecarId, event) {
    if (!memoryEngine || !event || event.type === 'status') {
      return;
    }

    const baseText = trimText(event.contextDigest || event.chatLine || '', 360);
    if (!baseText) {
      return;
    }

    let kind = 'sidecar_event';
    let importance = 0.7;

    if (event.type === 'share') {
      kind = 'social_share';
      importance = 0.84;
    } else if (event.type === 'post') {
      kind = 'social_post';
      importance = 0.88;
    } else if (event.type === 'warning' || event.type === 'error') {
      kind = 'sidecar_alert';
      importance = 0.92;
    }

    memoryEngine.remember({
      kind,
      source: sidecarId,
      text: baseText,
      summary: trimText(event.chatLine || event.contextDigest || '', 220),
      tags: ['sidecar', sidecarId, event.type || 'event'],
      importance,
      metadata: event.post || {}
    });
  }

  function emit(sidecarId, event) {
    const payload = {
      sidecarId,
      ...event
    };

    rememberSidecarEvent(sidecarId, payload);

    if (typeof listener === 'function') {
      listener(payload);
    }
  }

  function register(sidecarId, sidecar, options = {}) {
    const record = {
      id: sidecarId,
      label: options.label || sidecarId,
      sidecar
    };

    sidecars.set(sidecarId, record);
    sidecar.setEventHandler((event) => emit(sidecarId, event));
    return record;
  }

  function getRecord(sidecarId) {
    const record = sidecars.get(sidecarId);
    if (!record) {
      throw new Error(`Unknown sidecar: ${sidecarId}`);
    }
    return record;
  }

  function getStatus(sidecarId) {
    return getRecord(sidecarId).sidecar.getStatus();
  }

  function getStatuses() {
    return Array.from(sidecars.entries()).map(([sidecarId, record]) => ({
      id: sidecarId,
      label: record.label,
      status: record.sidecar.getStatus()
    }));
  }

  function getContextForMain(sidecarId) {
    return getRecord(sidecarId).sidecar.getContextForMain();
  }

  function updateContext(patch = {}, origin = 'mai-companion') {
    rememberContextPatch(patch, origin);
    for (const record of sidecars.values()) {
      record.sidecar.updateContext(patch);
    }
    return getStatuses();
  }

  function setEnabled(sidecarId, enabled, origin = 'manual') {
    return getRecord(sidecarId).sidecar.setEnabled(Boolean(enabled), origin);
  }

  function runNow(sidecarId, trigger = 'manual') {
    return getRecord(sidecarId).sidecar.runNow(trigger);
  }

  function maybeAutostartAll() {
    for (const record of sidecars.values()) {
      record.sidecar.maybeAutostart();
    }
  }

  function setEventHandler(nextListener) {
    listener = nextListener;
  }

  return {
    register,
    getStatus,
    getStatuses,
    getContextForMain,
    updateContext,
    setEnabled,
    runNow,
    maybeAutostartAll,
    setEventHandler
  };
}

module.exports = {
  createSidecarHub
};
