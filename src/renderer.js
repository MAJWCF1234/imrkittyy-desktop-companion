import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import clientProfile from '../client-profile.json';
import vrRoomManifest from './assets/vr-room-real/manifest.json';

const VR_ROOM_HOME_URL = new URL('./assets/vr-room-home.png', import.meta.url).href;
const GAMING_BEDROOM_SCENE_URL = new URL('./assets/gaming-bedroom/scene.gltf', import.meta.url).href;
const GAMING_BEDROOM_BIN_URL = new URL('./assets/gaming-bedroom/scene.bin', import.meta.url).href;
const GAMING_BEDROOM_GLB_URL = new URL('../low_poly_gaming_bedroom.glb', import.meta.url).href;
const VR_ROOM_MESH_SOURCES = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/vr-room-real/meshes/*.obj', { eager: true, query: '?raw', import: 'default' }))
    .map(([filePath, rawText]) => [filePath.split('/').pop(), rawText])
);
const VR_ROOM_TEXTURE_URLS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/vr-room-real/textures/*.png', { eager: true, import: 'default' }))
    .map(([filePath, assetUrl]) => [filePath.split('/').pop(), assetUrl])
);
const SETTINGS_KEY = 'screen-sprite-settings-v1';
const SCENE_PROFILES_KEY = 'mai-scene-profiles-v1';
const UI_STATE_KEY = 'mai-ui-state-v1';
const UI_LAYOUT_VERSION = 'single-avatar-compact-v2';
const AUTONOMY_STATE_KEY = 'mai-autonomy-state-v1';
const ASSISTANT_NAME = clientProfile.assistantName || 'Mai';
const APP_NAME = clientProfile.appName || 'Mai Desktop Companion';
const MAI_STUDIO_NAME = clientProfile.studioName || 'LM Studio';
const MAI_STUDIO_DEFAULT_BASE_URL = clientProfile.defaultBaseUrl || 'http://127.0.0.1:1234/v1';
const MAI_STUDIO_LOCAL_FALLBACK_URL = clientProfile.fallbackBaseUrl || 'http://localhost:1234/v1';
const MAI_STUDIO_DEFAULT_CHAT_MODEL = clientProfile.suggestedModel || 'google/gemma-4-e4b';
const IMRKITTYY_STABILITY_PATCH_VERSION = 'glass-avatar-v5-viewport-voice';
const SOCIAL_SIDECAR_ENABLED = false;
const LANGUAGE_OPTIONS = {
  en: {
    code: 'en',
    uiCode: 'en',
    speechRecognition: 'en-US',
    speechSynthesisPrefix: 'en',
    name: 'English'
  },
  es: {
    code: 'es',
    uiCode: 'es',
    speechRecognition: 'es-ES',
    speechSynthesisPrefix: 'es',
    name: 'Spanish'
  }
};
const TRANSLATIONS = {
  en: {
    currentAvatar: 'Current avatar',
    avatarLoadedRemembered: '{name} is loaded and remembered.',
    bundledAvatars: 'Bundled avatars',
    noBundledAvatars: 'No bundled avatars',
    nextAvatar: 'Next Avatar',
    loadVrm: 'Load VRM',
    languageSection: 'Language',
    languageNote: "Choose whether Mai's interface, chat, and spoken responses stay in English or Spanish.",
    languageLabel: 'Language',
    settings: 'Settings',
    maiSettings: 'Mai Settings',
    settingsNote: 'These save instantly and shape how Mai sounds, behaves, and takes up space.',
    close: 'Close',
    audio: 'Audio',
    audioNote: "Tune Mai's music volume without touching the rest of your desktop.",
    musicVolume: 'Music volume',
    behavior: 'Behavior',
    behaviorNote: 'Control how proactive and expressive Mai feels during the day.',
    routineAutonomy: 'Routine autonomy',
    routineAutonomyCopy: 'Lets Mai follow drives, rituals, and playful idle habits instead of waiting for manual prompts.',
    proactivePresence: 'Proactive presence',
    proactivePresenceCopy: 'Lets Mai speak on her own when the room changes or enough time passes.',
    reactionMediaShares: 'Reaction media shares',
    reactionMediaSharesCopy: 'Allows contextual memes and GIFs when they fit the moment.',
    screenComments: 'Screen comments',
    screenCommentsCopy: 'Lets screen checks produce a spoken reaction instead of a silent summary only.',
    personalityTuning: 'Personality tuning',
    personalityTuningCopy: 'Extra guidance for how Mai should sound and carry herself.',
    personalityPlaceholder: 'Playful, a little teasing, warm, concise, and softly futuristic.',
    memoryTuning: 'Memory tuning',
    memoryTuningCopy: 'What Mai should prioritize remembering about the user and the project.',
    memoryPlaceholder: 'Prioritize preferences, routines, ongoing build choices, music taste, and relationship continuity.',
    display: 'Display',
    displayNote: 'Shape the room, bubbles, and panel density without digging through the full UI.',
    localVoice: 'Local voice',
    localVoiceCopy: "Uses Mai's installed local voice with mouth motion for short spoken lines.",
    homeRoom: '3D home room',
    homeRoomCopy: 'Shows Mai inside her bedroom scene instead of the plain stage backdrop.',
    bubbles: 'Speech and thought bubbles',
    bubblesCopy: 'Keeps Game Cam bubble callouts visible while Mai thinks and talks.',
    compactControls: 'Compact controls',
    compactControlsCopy: 'Shrinks non-essential controls so the chat and room get more breathing space.',
    voice: 'Voice',
    listening: 'Listening...',
    voiceInputTitle: 'Voice command input.',
    voiceFallbackTitle: 'Voice command input through Windows speech recognition.',
    voiceUnavailableTitle: 'Speech recognition is not available in this browser runtime.',
    standaloneBuild: 'Standalone build',
    standaloneBuildPeriod: 'Standalone build.',
    sidecarAsleep: 'Sidecar asleep.',
    quickSeeScreen: 'See Screen',
    quickAutoWatchOn: 'Auto Watch On',
    quickAutoWatchOff: 'Auto Watch Off',
    quickMusicBusy: 'Music Busy...',
    quickScanMusic: 'Scan Music',
    quickChooseMusic: 'Choose Music',
    quickStandalone: 'Standalone',
    quickSocialNeedsKey: 'Social Needs Key',
    quickSocialBusy: 'Social Busy...',
    quickCheckSocial: 'Check Social',
    quickWakeSocial: 'Wake Social',
    composerHintDefault: 'Enter sends. Shift+Enter makes a new line.',
    composerHintThinking: '{name} is thinking locally. Sending is paused until she finishes.',
    composerHintHoldStill: 'Enter sends. Shift+Enter makes a new line. {name} is holding still while you finish the thought.',
    composerHintFollowing: 'Enter sends. Shift+Enter makes a new line. {name} is quietly following your draft.',
    askCompanionPlaceholder: 'Ask your local companion anything...',
    noCurrentTrack: 'Nothing queued',
    musicFolderHint: 'Point this at your music folder and it will start learning your taste.',
    autoDjOn: 'Auto DJ On',
    autoDjOff: 'Auto DJ Off',
    activeWindow: 'Active window',
    latestSummary: 'Latest summary',
    nowPlaying: 'Now playing',
    socialOverview: 'Social',
    modelOverview: 'Model',
    roomOverview: 'Room',
    musicOverview: 'Music',
    conversationNote: 'Chat stays coherent by folding in live screen cues, music taste, long-term memory, and local toolkit results.',
    suggestionReadRoom: 'Read The Room',
    suggestionPickSong: 'Pick A Song',
    suggestionRecentShots: 'Recent Shots',
    suggestionRemember: 'What Do You Remember?',
    suggestionReadRoomPrompt: 'What kind of room is this?',
    suggestionPickSongPrompt: "Pick a song that fits what I'm doing.",
    suggestionRecentShotsPrompt: 'Show my recent screenshots.',
    suggestionRememberPrompt: 'Summarize what you remember about our current build.',
    languageInstruction: 'Always reply in English.',
    voiceCommandMissed: 'I did not catch a voice command.',
    voiceCommandFailed: 'Voice command failed: {message}',
    voiceStopped: 'Voice command listening stopped.',
    localVoiceMissing: 'Local voice is enabled, but the Piper voice files were not found.',
    voicePlaybackFailed: 'Voice playback failed: {message}',
    greetingMorning: '{name} is awake with a gentle morning mood.',
    greetingDay: '{name} is settled in and ready to keep you company.',
    greetingEvening: '{name} is cozy and attentive for the evening.',
    greetingNight: '{name} is up late with a softer, sleepier mood.',
    greetingFollowup: 'The client avatar is already bundled; connect {studio}, and Mai can watch your screen or DJ your music locally.',
    notInThisVersion: 'Not in this version. Mai is a standalone desktop assistant here, with no Moltbook or social sidecar attached.',
    socialSidecarChecking: "Mai's social sidecar is checking Moltbook...",
    socialSidecarDrafting: "Mai's social sidecar is drafting a Moltbook post...",
    socialSidecarBuildOnly: 'This client build does not use the social sidecar.',
    animationLibraryReady: 'Animation library ready. {parts}.',
    switchingAnimation: 'Switching to another {preset} animation.',
    settlingIdle: 'Settling back into an idle stance.',
    switchingIntentAnimation: 'Switching into a {label} animation.',
    timerUp: '{label} is up.',
    timerSet: 'Timer set for {seconds} {unit}.',
    second: 'second',
    seconds: 'seconds',
    loadPlaylistPrompt: 'Name the playlist you want, like "load playlist Late Night Build."',
    noSavedPlaylists: 'No saved playlists yet.',
    scanBeforeSavePlaylist: 'Scan your music folder and play a few tracks before saving a playlist.',
    savedPlaylistStatus: 'Saved playlist "{name}" with {count} tracks.',
    emptyPlaylistStatus: 'That playlist was empty.',
    loadedPlaylistStatus: 'Loaded playlist "{name}" with {count} tracks.',
    checkingModels: 'Checking {studio} for loaded models...',
    noModelsLoaded: '{studio} responded, but no models are loaded yet.',
    send: 'Send',
    thinking: 'Thinking...',
    readingScreen: 'Reading Screen...',
    nextSong: 'Next Song',
    startMusic: 'Start Music',
    socialAsleep: 'Social asleep',
    socialNoKey: 'Social no key',
    socialBrowsing: 'Social browsing',
    socialAwake: 'Social awake',
    librarySet: 'Library: {path}',
    libraryUnset: 'Library: not set',
    autoWatchChipOn: 'Auto watch on',
    autoWatchChipOff: 'Auto watch off',
    autoDjChipOn: 'Auto DJ on',
    autoDjChipOff: 'Auto DJ off',
    capturingScreen: 'Capturing your screen and asking the vision model...',
    screenCaptured: 'Screen captured from {displayLabel}.',
    screenCapturedTextOnly: 'Screen captured from {displayLabel}, using a text-only vision adapter for {model}.',
    musicFolderSelected: 'Music folder selected. Scan it to build the library.',
    chooseMusicFolderFirst: 'Choose a music folder first.',
    scanningMusicLibrary: 'Scanning your music library...',
    libraryReady: 'Library ready with {count} {trackWord}.{extra}',
    track: 'track',
    tracks: 'tracks',
    showingFirst: ' Showing the first {count}.',
    autoDjIndexed: 'Auto DJ indexed {count} local {trackWord}.',
    noSceneLearned: 'No scene learned yet.',
    noLibraryReady: 'No library ready yet.',
    waitingForStudio: 'Waiting for {studio}.',
    noSocialKey: 'No social key.',
    socialSidecarBusy: 'Social sidecar busy...',
    sidecarAwake: 'Sidecar awake.',
    modelSummaryEmpty: 'Point this at your {studio} node, then click Refresh.',
    autoSelect: 'Auto select',
    loadedLocalModels: '{count} loaded local {modelWord}.',
    loadedLocalModel: 'model',
    loadedLocalModelsPlural: 'models',
    visionFollowsChat: 'vision follows chat',
    manualScreenChecks: 'Manual screen checks',
    captureSceneHint: 'Capture a scene once, or let {name} watch gently in the background.',
    watchingEvery: 'Watching every {seconds}s',
    manualPicks: 'Manual picks',
    chooseFolderTaste: 'Choose a folder and {name} can start learning your taste.',
    ready: 'Ready.',
    languageEnglish: 'English',
    languageSpanish: 'Spanish'
    ,
    customBuild: 'Custom build for imrkittyy',
    openSettings: 'Open settings menu',
    gameCam: 'Game Cam',
    deskView: 'Desk View',
    presenceMode: 'Presence',
    minimizeWindow: 'Minimize window',
    closeWindow: 'Close window',
    fit: 'Fit',
    hideFit: 'Hide Fit',
    zoom: 'Zoom',
    lift: 'Lift',
    overview: 'Overview',
    atAGlance: 'At A Glance',
    modelsCard: 'Models',
    refresh: 'Refresh',
    hide: 'Hide',
    show: 'Show',
    lmStudioUrl: 'LM Studio URL',
    chatModel: 'Chat model',
    autoDetectFirstLoadedModel: 'Auto detect first loaded model',
    visionModel: 'Vision model',
    useChatModelForVision: 'Use chat model for vision',
    temperature: 'Temperature',
    screenSense: 'Screen Sense',
    seeWhatYoureDoing: "See What You're Doing",
    analyzeNow: 'Analyze Now',
    watchEverySec: 'Watch every (sec)',
    recentShotsButton: 'Recent Shots',
    visionCapableHint: 'Use a vision-capable model in LM Studio for screenshot analysis.',
    nothingCapturedYet: 'Nothing captured yet.',
    noDesktopContextYet: 'No desktop context yet.',
    musicCard: 'Auto DJ',
    pickYourMusic: 'Pick Your Music',
    chooseFolder: 'Choose Folder',
    scanLibrary: 'Scan Library',
    nextTrack: 'Next Track',
    savePlaylist: 'Save Playlist',
    loadPlaylist: 'Load Playlist',
    like: 'Like',
    skipDislike: 'Skip / Dislike',
    musicStatusHint: 'Auto DJ uses your screen context, filename cues, and your own skip/like history.',
    conversation: 'Conversation',
    talkToMai: 'Talk To Mai',
    musicButton: 'Music',
    closeSettingsAria: 'Close settings',
    closeSettingsMenu: 'Close settings menu',
    noAvatarLoadedYet: 'No avatar loaded yet',
    learnedActionsReady: '{count} learned {actionWord} ready.',
    learnedAction: 'action',
    learnedActions: 'actions',
    motionPatternsWake: 'Motion patterns will wake up as actions load.',
    glassDesktopMode: 'Glass desktop mode active.',
    transparentCompanionView: 'Transparent companion view active.',
    homeReady: '{name} home ready.',
    feelingPrefix: 'Feeling {label}',
    sleepingMood: 'sleepy',
    brightMood: 'bright',
    calmMood: 'calm',
    settledMood: 'settled',
    fondMood: 'fond',
    curiousMood: 'curious',
    focusedMood: 'focused',
    avatarDefaultStatus: 'Load a `.vrm` avatar or use one already in this folder.',
    avatarHomeLabel: 'Home: {name}.',
    transparentGlassMode: ' Transparent glass mode.',
    familiarRoom: ' Familiar room.',
    maiFeelsThisPhase: ' {name} feels {mood} this {phase}.',
    wokeWithActions: '{name} woke up with {count} learned {actionWord} ready for autonomous motion.',
    actionMemoryLoadFailed: 'Action memory load failed: {message}',
    watchingWindow: 'Watching {window}.',
    moodTag: 'Mood: {mood}.',
    vibeTag: 'Vibe: {vibe}.'
    ,
    chatLabel: 'chat',
    visionLabel: 'vision',
    readyWord: 'ready',
    thisRoom: 'this room',
    unknownArtist: 'Unknown artist'
  },
  es: {
    currentAvatar: 'Avatar actual',
    avatarLoadedRemembered: '{name} esta cargado y recordado.',
    bundledAvatars: 'Avatares incluidos',
    noBundledAvatars: 'No hay avatares incluidos',
    nextAvatar: 'Siguiente avatar',
    loadVrm: 'Cargar VRM',
    languageSection: 'Idioma',
    languageNote: 'Elige si la interfaz, el chat y la voz de Mai estaran en ingles o espanol.',
    languageLabel: 'Idioma',
    settings: 'Ajustes',
    maiSettings: 'Ajustes de Mai',
    settingsNote: 'Estos cambios se guardan al instante y cambian como suena, actua y se muestra Mai.',
    close: 'Cerrar',
    audio: 'Audio',
    audioNote: 'Ajusta el volumen de la musica de Mai sin tocar el resto del escritorio.',
    musicVolume: 'Volumen de musica',
    behavior: 'Comportamiento',
    behaviorNote: 'Controla que tan proactiva y expresiva se siente Mai durante el dia.',
    routineAutonomy: 'Autonomia rutinaria',
    routineAutonomyCopy: 'Permite que Mai siga impulsos, rituales y habitos juguetones en vez de esperar instrucciones manuales.',
    proactivePresence: 'Presencia proactiva',
    proactivePresenceCopy: 'Permite que Mai hable sola cuando cambia el entorno o pasa suficiente tiempo.',
    reactionMediaShares: 'Compartir reacciones',
    reactionMediaSharesCopy: 'Permite memes y GIF contextuales cuando encajan con el momento.',
    screenComments: 'Comentarios de pantalla',
    screenCommentsCopy: 'Hace que los analisis de pantalla produzcan una reaccion hablada en vez de un resumen silencioso.',
    personalityTuning: 'Ajuste de personalidad',
    personalityTuningCopy: 'Guia extra para como debe sonar y comportarse Mai.',
    personalityPlaceholder: 'Juguetona, un poco bromista, calida, concisa y suavemente futurista.',
    memoryTuning: 'Ajuste de memoria',
    memoryTuningCopy: 'Que debe priorizar Mai al recordar sobre la persona usuaria y el proyecto.',
    memoryPlaceholder: 'Prioriza preferencias, rutinas, decisiones del proyecto, gusto musical y continuidad de la relacion.',
    display: 'Pantalla',
    displayNote: 'Ajusta la habitacion, las burbujas y la densidad de paneles sin buscar por toda la interfaz.',
    localVoice: 'Voz local',
    localVoiceCopy: 'Usa la voz local instalada de Mai con movimiento de boca para frases cortas.',
    homeRoom: 'Habitacion 3D',
    homeRoomCopy: 'Muestra a Mai dentro de su dormitorio en lugar del escenario simple.',
    bubbles: 'Burbujas de habla y pensamiento',
    bubblesCopy: 'Mantiene visibles las burbujas de Game Cam mientras Mai piensa y habla.',
    compactControls: 'Controles compactos',
    compactControlsCopy: 'Reduce los controles no esenciales para dar mas espacio al chat y la escena.',
    voice: 'Voz',
    listening: 'Escuchando...',
    voiceInputTitle: 'Entrada de voz.',
    voiceFallbackTitle: 'Entrada de voz mediante reconocimiento de voz de Windows.',
    voiceUnavailableTitle: 'El reconocimiento de voz no esta disponible en este entorno.',
    standaloneBuild: 'Compilacion independiente',
    standaloneBuildPeriod: 'Compilacion independiente.',
    sidecarAsleep: 'Sidecar dormido.',
    quickSeeScreen: 'Ver pantalla',
    quickAutoWatchOn: 'Auto vigilancia activada',
    quickAutoWatchOff: 'Auto vigilancia desactivada',
    quickMusicBusy: 'Musica ocupada...',
    quickScanMusic: 'Escanear musica',
    quickChooseMusic: 'Elegir musica',
    quickStandalone: 'Independiente',
    quickSocialNeedsKey: 'Social necesita clave',
    quickSocialBusy: 'Social ocupado...',
    quickCheckSocial: 'Revisar social',
    quickWakeSocial: 'Activar social',
    composerHintDefault: 'Enter envia. Shift+Enter crea una linea nueva.',
    composerHintThinking: '{name} esta pensando localmente. El envio se pausa hasta que termine.',
    composerHintHoldStill: 'Enter envia. Shift+Enter crea una linea nueva. {name} se queda quieta mientras terminas la idea.',
    composerHintFollowing: 'Enter envia. Shift+Enter crea una linea nueva. {name} sigue tu borrador en silencio.',
    askCompanionPlaceholder: 'Preguntale cualquier cosa a tu companera local...',
    noCurrentTrack: 'Nada en cola',
    musicFolderHint: 'Apunta esto a tu carpeta de musica y empezara a aprender tu gusto.',
    autoDjOn: 'Auto DJ activado',
    autoDjOff: 'Auto DJ desactivado',
    activeWindow: 'Ventana activa',
    latestSummary: 'Ultimo resumen',
    nowPlaying: 'Sonando ahora',
    socialOverview: 'Social',
    modelOverview: 'Modelo',
    roomOverview: 'Habitacion',
    musicOverview: 'Musica',
    conversationNote: 'El chat se mantiene coherente al integrar pantalla en vivo, gusto musical, memoria a largo plazo y herramientas locales.',
    suggestionReadRoom: 'Leer la sala',
    suggestionPickSong: 'Elegir cancion',
    suggestionRecentShots: 'Capturas recientes',
    suggestionRemember: 'Que recuerdas?',
    suggestionReadRoomPrompt: 'Que tipo de habitacion es esta?',
    suggestionPickSongPrompt: 'Elige una cancion que combine con lo que estoy haciendo.',
    suggestionRecentShotsPrompt: 'Muestrame mis capturas recientes.',
    suggestionRememberPrompt: 'Resume lo que recuerdas sobre nuestra compilacion actual.',
    languageInstruction: 'Always reply in Spanish.',
    voiceCommandMissed: 'No entendi el comando de voz.',
    voiceCommandFailed: 'Fallo el comando de voz: {message}',
    voiceStopped: 'La escucha por voz se detuvo.',
    localVoiceMissing: 'La voz local esta activada, pero no se encontraron los archivos de Piper.',
    voicePlaybackFailed: 'Fallo la reproduccion de voz: {message}',
    greetingMorning: '{name} esta despierta con un humor suave de manana.',
    greetingDay: '{name} esta lista y preparada para acompanarte.',
    greetingEvening: '{name} esta comoda y atenta para la tarde.',
    greetingNight: '{name} sigue despierta con un humor mas suave y somnoliento.',
    greetingFollowup: 'El avatar del cliente ya viene incluido; conecta {studio} y Mai podra mirar tu pantalla o pinchar tu musica localmente.',
    notInThisVersion: 'No en esta version. Mai es una asistente de escritorio independiente aqui, sin Moltbook ni sidecar social.',
    socialSidecarChecking: 'El sidecar social de Mai esta revisando Moltbook...',
    socialSidecarDrafting: 'El sidecar social de Mai esta redactando una publicacion para Moltbook...',
    socialSidecarBuildOnly: 'Esta compilacion del cliente no usa el sidecar social.',
    animationLibraryReady: 'Biblioteca de animaciones lista. {parts}.',
    switchingAnimation: 'Cambiando a otra animacion de {preset}.',
    settlingIdle: 'Volviendo a una postura inactiva.',
    switchingIntentAnimation: 'Cambiando a una animacion de {label}.',
    timerUp: 'Se termino {label}.',
    timerSet: 'Temporizador fijado por {seconds} {unit}.',
    second: 'segundo',
    seconds: 'segundos',
    loadPlaylistPrompt: 'Di el nombre de la lista, por ejemplo "cargar lista Noche de codigo".',
    noSavedPlaylists: 'Todavia no hay listas guardadas.',
    scanBeforeSavePlaylist: 'Escanea tu carpeta de musica y reproduce algunas pistas antes de guardar una lista.',
    savedPlaylistStatus: 'Lista "{name}" guardada con {count} pistas.',
    emptyPlaylistStatus: 'Esa lista estaba vacia.',
    loadedPlaylistStatus: 'Lista "{name}" cargada con {count} pistas.',
    checkingModels: 'Comprobando modelos cargados en {studio}...',
    noModelsLoaded: '{studio} respondio, pero todavia no hay modelos cargados.',
    send: 'Enviar',
    thinking: 'Pensando...',
    readingScreen: 'Leyendo pantalla...',
    nextSong: 'Siguiente cancion',
    startMusic: 'Iniciar musica',
    socialAsleep: 'Social dormido',
    socialNoKey: 'Social sin clave',
    socialBrowsing: 'Social explorando',
    socialAwake: 'Social despierto',
    librarySet: 'Biblioteca: {path}',
    libraryUnset: 'Biblioteca: sin configurar',
    autoWatchChipOn: 'Auto vigilancia activada',
    autoWatchChipOff: 'Auto vigilancia desactivada',
    autoDjChipOn: 'Auto DJ activado',
    autoDjChipOff: 'Auto DJ desactivado',
    capturingScreen: 'Capturando tu pantalla y consultando al modelo de vision...',
    screenCaptured: 'Pantalla capturada desde {displayLabel}.',
    screenCapturedTextOnly: 'Pantalla capturada desde {displayLabel}, usando un adaptador de vision solo por texto para {model}.',
    musicFolderSelected: 'Carpeta de musica seleccionada. Escaneala para crear la biblioteca.',
    chooseMusicFolderFirst: 'Primero elige una carpeta de musica.',
    scanningMusicLibrary: 'Escaneando tu biblioteca de musica...',
    libraryReady: 'Biblioteca lista con {count} {trackWord}.{extra}',
    track: 'pista',
    tracks: 'pistas',
    showingFirst: ' Mostrando solo las primeras {count}.',
    autoDjIndexed: 'Auto DJ indexo {count} {trackWord} locales.',
    noSceneLearned: 'Todavia no hay una escena aprendida.',
    noLibraryReady: 'Todavia no hay biblioteca lista.',
    waitingForStudio: 'Esperando a {studio}.',
    noSocialKey: 'No hay clave social.',
    socialSidecarBusy: 'El sidecar social esta ocupado...',
    sidecarAwake: 'Sidecar despierto.',
    modelSummaryEmpty: 'Apunta esto a tu nodo de {studio} y luego pulsa Refresh.',
    autoSelect: 'Seleccion automatica',
    loadedLocalModels: '{count} {modelWord} locales cargados.',
    loadedLocalModel: 'modelo',
    loadedLocalModelsPlural: 'modelos',
    visionFollowsChat: 'vision sigue al chat',
    manualScreenChecks: 'Revisiones manuales de pantalla',
    captureSceneHint: 'Captura una escena una vez, o deja que {name} observe suavemente en segundo plano.',
    watchingEvery: 'Vigilando cada {seconds}s',
    manualPicks: 'Selecciones manuales',
    chooseFolderTaste: 'Elige una carpeta y {name} empezara a aprender tu gusto.',
    ready: 'Listo.',
    languageEnglish: 'Ingles',
    languageSpanish: 'Espanol',
    customBuild: 'Compilacion personalizada para imrkittyy',
    openSettings: 'Abrir menu de ajustes',
    gameCam: 'Game Cam',
    deskView: 'Vista de escritorio',
    presenceMode: 'Presencia',
    minimizeWindow: 'Minimizar ventana',
    closeWindow: 'Cerrar ventana',
    fit: 'Ajuste',
    hideFit: 'Ocultar ajuste',
    zoom: 'Zoom',
    lift: 'Altura',
    overview: 'Resumen',
    atAGlance: 'De un vistazo',
    modelsCard: 'Modelos',
    refresh: 'Actualizar',
    hide: 'Ocultar',
    show: 'Mostrar',
    lmStudioUrl: 'URL de LM Studio',
    chatModel: 'Modelo de chat',
    autoDetectFirstLoadedModel: 'Detectar automaticamente el primer modelo cargado',
    visionModel: 'Modelo de vision',
    useChatModelForVision: 'Usar el modelo de chat para vision',
    temperature: 'Temperatura',
    screenSense: 'Pantalla',
    seeWhatYoureDoing: 'Ver lo que haces',
    analyzeNow: 'Analizar ahora',
    watchEverySec: 'Mirar cada (seg)',
    recentShotsButton: 'Capturas recientes',
    visionCapableHint: 'Usa un modelo con vision en LM Studio para analizar capturas de pantalla.',
    nothingCapturedYet: 'Todavia no hay nada capturado.',
    noDesktopContextYet: 'Todavia no hay contexto del escritorio.',
    musicCard: 'Auto DJ',
    pickYourMusic: 'Elegir tu musica',
    chooseFolder: 'Elegir carpeta',
    scanLibrary: 'Escanear biblioteca',
    nextTrack: 'Siguiente pista',
    savePlaylist: 'Guardar lista',
    loadPlaylist: 'Cargar lista',
    like: 'Me gusta',
    skipDislike: 'Saltar / No me gusta',
    musicStatusHint: 'Auto DJ usa el contexto de tu pantalla, pistas de nombres de archivo y tu historial de saltos y me gusta.',
    conversation: 'Conversacion',
    talkToMai: 'Hablar con Mai',
    musicButton: 'Musica',
    closeSettingsAria: 'Cerrar ajustes',
    closeSettingsMenu: 'Cerrar menu de ajustes',
    noAvatarLoadedYet: 'Todavia no hay avatar cargado',
    learnedActionsReady: '{count} {actionWord} aprendidas listas.',
    learnedAction: 'accion',
    learnedActions: 'acciones',
    motionPatternsWake: 'Los patrones de movimiento despertaran cuando se carguen las acciones.',
    glassDesktopMode: 'Modo de escritorio de cristal activo.',
    transparentCompanionView: 'Vista transparente de la companera activa.',
    homeReady: 'Hogar {name} listo.',
    feelingPrefix: 'Estado {label}',
    sleepingMood: 'somnolienta',
    brightMood: 'brillante',
    calmMood: 'tranquila',
    settledMood: 'serena',
    fondMood: 'carinosa',
    curiousMood: 'curiosa',
    focusedMood: 'concentrada',
    avatarDefaultStatus: 'Carga un avatar `.vrm` o usa uno que ya este en esta carpeta.',
    avatarHomeLabel: 'Hogar: {name}.',
    transparentGlassMode: ' Modo de cristal transparente.',
    familiarRoom: ' Habitacion familiar.',
    maiFeelsThisPhase: ' {name} se siente {mood} esta {phase}.',
    wokeWithActions: '{name} desperto con {count} {actionWord} aprendidas listas para movimiento autonomo.',
    actionMemoryLoadFailed: 'La memoria de acciones no se pudo cargar: {message}',
    watchingWindow: 'Mirando {window}.',
    moodTag: 'Estado: {mood}.',
    vibeTag: 'Vibra: {vibe}.',
    chatLabel: 'chat',
    visionLabel: 'vision',
    readyWord: 'lista',
    thisRoom: 'esta habitacion',
    unknownArtist: 'Artista desconocida'
  }
};
const MODEL_ALIAS_CATALOG = {
  core7: {
    key: 'core7',
    familyLabel: 'Mai Core',
    label: 'Mai Core-7B v1.0',
    short: 'entry chat and local tasks',
    useCase: 'The entry-level workhorse. Great for chatbots, summarization, and local deployment.'
  },
  core14: {
    key: 'core14',
    familyLabel: 'Mai Core',
    label: 'Mai Core-14B v1.5',
    short: 'sweet-spot reasoning and writing',
    useCase: 'The sweet spot model. Highly capable in reasoning and nuanced writing without needing massive hardware.'
  },
  logic32: {
    key: 'logic32',
    familyLabel: 'Mai Logic',
    label: 'Mai Logic-32B v2.0',
    short: 'heavy reasoning and coding',
    useCase: 'Heavy reasoning, complex coding tasks, and multi-step agentic workflows.'
  },
  vision8: {
    key: 'vision8',
    familyLabel: 'Mai Vision',
    label: 'Mai Vision-8B v1.2',
    short: 'standard image reading',
    useCase: 'Standard image-to-text generation, basic chart reading, and visual QA.'
  },
  iris11: {
    key: 'iris11',
    familyLabel: 'Mai Iris',
    label: 'Mai Iris-11B v1.0',
    short: 'dense OCR and documents',
    useCase: 'Specialized high-resolution vision model tuned for dense OCR and document parsing.'
  },
  vision34: {
    key: 'vision34',
    familyLabel: 'Mai Vision',
    label: 'Mai Vision-34B v2.1',
    short: 'advanced multimodal reasoning',
    useCase: 'Advanced multimodal reasoning for complex diagrams, video frames, and dense visual analysis.'
  },
  nano05: {
    key: 'nano05',
    familyLabel: 'Mai Nano',
    label: 'Mai Nano-0.5B v1.0',
    short: 'ultra-light edge tasks',
    useCase: 'On-device processing, basic autocorrect, and simple keyword extraction.'
  },
  spark15: {
    key: 'spark15',
    familyLabel: 'Mai Spark',
    label: 'Mai Spark-1.5B v2.2',
    short: 'real-time low-latency tasks',
    useCase: 'Real-time voice assistants and rapid text classification where sub-second latency matters.'
  },
  flash3: {
    key: 'flash3',
    familyLabel: 'Mai Flash',
    label: 'Mai Flash-3B v3.0',
    short: 'speed-first conversation',
    useCase: 'The speed-to-performance ratio model for fast conversational AI.'
  },
  titan72: {
    key: 'titan72',
    familyLabel: 'Mai Titan',
    label: 'Mai Titan-72B v1.0',
    short: 'enterprise-scale analysis',
    useCase: 'Enterprise-level data analysis, advanced mathematics, and highly accurate creative writing.'
  },
  apex120: {
    key: 'apex120',
    familyLabel: 'Mai Apex',
    label: 'Mai Apex-120B v2.0',
    short: 'deep zero-shot reasoning',
    useCase: 'Near-human zero-shot reasoning for legal analysis, scientific research, and complex architecture.'
  },
  omni400: {
    key: 'omni400',
    familyLabel: 'Mai Omni',
    label: 'Mai Omni-400B-MoE v1.5',
    short: 'flagship MoE orchestration',
    useCase: 'The absolute flagship Mixture-of-Experts lane for all-in-one high-end intelligence.'
  }
};
const HOME_ENVIRONMENTS = {
  vrRoom: {
    key: 'vrRoom',
    label: 'Gaming Room',
    backdropUrl: '',
    backdropPosition: '50% 57%',
    parallaxX: 14,
    parallaxY: 9,
    sceneTransform: {
      scale: 0.84,
      rotationY: 0,
      floorY: -1.02,
      frontZ: 3.18,
      xBias: 0.02
    },
    framing: {
      deskXBias: 0.22,
      portraitXBias: 0,
      baselineLift: 0.03,
      distanceBoost: 0.46,
      cameraX: 0.22,
      focusX: 0.1,
      avatarZ: 0.62,
      focusZ: 0.08
    }
  }
};

const VR_ROOM_MATERIAL_OVERRIDES = {
  art: { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.86, roughness: 0.08, metalness: 0.02 },
  star: { color: 0xffda6c, emissive: 0xffbf56, emissiveIntensity: 1.45, roughness: 0.16, metalness: 0.04 },
  'light blue.002': { color: 0x84ddff, emissive: 0x5ec7ff, emissiveIntensity: 1.18, roughness: 0.2, metalness: 0.08 },
  desk: { color: 0x355fd7, emissive: 0x14398f, emissiveIntensity: 0.22, roughness: 0.52, metalness: 0.22 },
  right: { color: 0x5aa2ff, emissive: 0x2d63ff, emissiveIntensity: 0.24, roughness: 0.34, metalness: 0.52 },
  'Material.013': { color: 0x18346d, emissive: 0x0c1f49, emissiveIntensity: 0.14, roughness: 0.48, metalness: 0.26 },
  body: { color: 0x0f1427, emissive: 0x0a1332, emissiveIntensity: 0.08, roughness: 0.48, metalness: 0.44 },
  'black.003': { color: 0x070a11, emissive: 0x08122a, emissiveIntensity: 0.06, roughness: 0.34, metalness: 0.58 },
  moniter: { color: 0x84daff, emissive: 0x66c6ff, emissiveIntensity: 1.3, roughness: 0.12, metalness: 0.06 },
  fabric: { color: 0x11131b, roughness: 0.94, metalness: 0.02 },
  'fabric white': { color: 0xdfe9ff, roughness: 0.9, metalness: 0.02 },
  'Material.008': { color: 0x4d69a6, roughness: 0.7, metalness: 0.14 },
  'metal.004': { color: 0xb7d8ff, emissive: 0x3f7aff, emissiveIntensity: 0.15, roughness: 0.18, metalness: 0.84 },
  'metal.005': { color: 0xd4e6ff, emissive: 0x70b4ff, emissiveIntensity: 0.18, roughness: 0.22, metalness: 0.78 },
  'light pink.003': { color: 0xfff0a6, emissive: 0xffdd86, emissiveIntensity: 1.42, roughness: 0.14, metalness: 0.06 },
  'Default-Material': { color: 0xd8e4ff, roughness: 0.86, metalness: 0.04 },
  keykap: { color: 0xe8f0ff, roughness: 0.92, metalness: 0.02 },
  white: { color: 0xf0f4ff, roughness: 0.88, metalness: 0.02 },
  blanket: { color: 0x334772, roughness: 0.96, metalness: 0.02 },
  'BODY.001': { color: 0xe8a47f, roughness: 0.78, metalness: 0.02 },
  'wall blue.002': { color: 0x3d5fda, emissive: 0x203d98, emissiveIntensity: 0.16, roughness: 0.54, metalness: 0.14 },
  'vr logo': { color: 0x84e4ff, emissive: 0x52d8ff, emissiveIntensity: 0.94, roughness: 0.18, metalness: 0.08 },
  'right.001': { color: 0x315ed2, emissive: 0x1f49b3, emissiveIntensity: 0.24, roughness: 0.3, metalness: 0.52 },
  'body.001': { color: 0x0f1424, emissive: 0x0b1532, emissiveIntensity: 0.08, roughness: 0.46, metalness: 0.54 },
  'Material.006': { color: 0x99d1ff, emissive: 0x66c2ff, emissiveIntensity: 0.28, roughness: 0.18, metalness: 0.08 },
  'black.002': { color: 0x0a0d15, roughness: 0.34, metalness: 0.64 },
  'bolt.001': { color: 0xdde8ff, roughness: 0.2, metalness: 0.92 },
  'check.001': { color: 0x8ad9ff, emissive: 0x4fc4ff, emissiveIntensity: 0.22, roughness: 0.18, metalness: 0.1 },
  'trans.002': { color: 0x9fdfff, emissive: 0x76d4ff, emissiveIntensity: 0.16, roughness: 0.08, metalness: 0.02, transparent: true, opacity: 0.34 }
};

const VR_ROOM_TEXTURE_OVERRIDES = {
  art: 'photo-big-frame.png'
};

const GAMING_BEDROOM_NODE_NAMES = [
  'Bed_1',
  'Dresser_2',
  'Desk_3',
  'DeskChair_4',
  'PC_5',
  'Monitor_6',
  'Keyboard_7',
  'Mousepad_8',
  'Cube_9',
  'NanoLights_13',
  'Book_15'
];
const FEELING_KEYWORDS = {
  wave: ['hello', 'hi', 'hey', 'welcome', 'hiya', 'morning', 'evening', 'bye', 'later'],
  happy: ['cute', 'adorable', 'sweet', 'yay', 'hehe', 'haha', 'love', 'proud', 'nice', 'lovely', 'cozy', 'playful', 'tease', 'teasing', 'meme', 'fun', 'soft'],
  curious: ['hmm', 'maybe', 'perhaps', 'wonder', 'guess', 'think', 'trying', 'build', 'look', 'question', 'curious', 'why', 'what', 'how', 'could', 'should'],
  groove: ['music', 'song', 'songs', 'track', 'playlist', 'tune', 'beat', 'groove', 'dance', 'dj', 'jukebox', 'album'],
  settled: ['calm', 'quiet', 'gentle', 'rest', 'steady', 'settle', 'breathe', 'sorry', 'oops']
};

const DESKTOP_BRIDGE_UNAVAILABLE = 'Open this with the desktop app to use local models, screen capture, voice, and music controls.';

function getLanguageConfig(language = '') {
  return LANGUAGE_OPTIONS[language] || LANGUAGE_OPTIONS.en;
}

function getCurrentLanguage() {
  return getLanguageConfig(runtimeState?.settings?.language).code;
}

function isSpanishLanguage() {
  return getCurrentLanguage() === 'es';
}

function formatTranslation(template, vars = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_match, key) => String(vars[key] ?? ''));
}

function t(key, vars = {}) {
  const language = getCurrentLanguage();
  const table = TRANSLATIONS[language] || TRANSLATIONS.en;
  const fallback = TRANSLATIONS.en[key];
  return formatTranslation(table[key] ?? fallback ?? key, vars);
}

function getSpeechRecognitionLocale() {
  return getLanguageConfig(getCurrentLanguage()).speechRecognition;
}

function getSpeechSynthesisPrefix() {
  return getLanguageConfig(getCurrentLanguage()).speechSynthesisPrefix;
}

function buildChatPromptBase() {
  return [
    `You are ${ASSISTANT_NAME}, the local desktop companion in ${APP_NAME}.`,
    `Client profile: ${clientProfile.client || 'local user'}. Character design: ${clientProfile.character?.description || 'playful desktop companion'}.`,
    `Personality: ${clientProfile.character?.tone || 'warm, observant, and concise'}.`,
    `Visual style: ${clientProfile.character?.visualStyle || 'clean modern desktop UI'}.`,
    `Boundaries: ${clientProfile.character?.boundaries || 'Ask before destructive local actions.'}`,
    `You run on the user's own ${MAI_STUDIO_NAME} setup.`,
    t('languageInstruction'),
    'If you are unsure, say so plainly.'
  ].join(' ');
}

function buildScreenPromptBase() {
  return [
    'You analyze desktop screenshots for a personal local assistant.',
    'Return strict JSON with keys: summary, mood, should_comment, comment, suggested_music_vibe.',
    `Write summary, mood, comment, and suggested_music_vibe in ${getLanguageConfig(getCurrentLanguage()).name}.`,
    'If this was a deliberate screen check, provide a brief companion comment unless the scene is unreadable.',
    'Keep summary under 28 words and comment under 22 words.'
  ].join(' ');
}

function buildDjPromptBase() {
  return [
    'You help a local desktop companion choose one song from a shortlist.',
    'Return strict JSON with keys: id and reason.',
    `Write the reason in ${getLanguageConfig(getCurrentLanguage()).name}.`,
    'Choose the best fit for the current task, mood, likely taste, and current room.',
    'Prefer variety across artist and album when scores are close.',
    'Reason should be short and mention the strongest vibe or taste clue.'
  ].join(' ');
}

function buildPresencePromptBase() {
  return [
    `You are ${ASSISTANT_NAME} deciding whether to make one tiny proactive aside after a fresh change in the user's world.`,
    'Return strict JSON with keys: should_speak, line, preset, cooldown_seconds.',
    `Write the line in ${getLanguageConfig(getCurrentLanguage()).name}.`,
    'should_speak may be true whenever the moment feels fresh, warm, cozy, playful, socially relevant, or gently helpful. Use false only when the moment feels repetitive or empty.',
    'line must stay under 18 words.',
    'preset must be one of idle, wave, happy, curious, groove.',
    'Do not narrate metadata. Do not mention JSON. No emojis.'
  ].join(' ');
}

function createUnavailableDesktopBridge() {
  const unavailable = async () => {
    throw new Error(DESKTOP_BRIDGE_UNAVAILABLE);
  };
  const noopUnsubscribe = () => {};

  return {
    minimizeWindow: () => {},
    closeWindow: () => {},
    getWindowBounds: async () => ({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }),
    moveWindowTo: async () => {},
    setGameCamMode: async (enabled) => ({ enabled: Boolean(enabled) }),
    setPresenceMode: async (enabled) => ({ enabled: Boolean(enabled) }),
    capturePresenceBackdrop: async () => ({ imageDataUrl: '' }),
    getDefaultPaths: async () => ({ downloads: '', music: '' }),
    runLocalTool: unavailable,
    getSystemSenseStatus: async () => ({}),
    getTtsStatus: async () => ({ available: false, engine: 'none', label: '' }),
    speakTts: unavailable,
    pickAvatarFile: async () => '',
    listBundledAvatars: async () => [],
    listAnimationLibrary: async () => ({ libraries: [], actionCount: 0, uniqueActionCount: 0, presets: {} }),
    captureScreenContext: unavailable,
    pickMusicFolder: async () => '',
    scanMusicLibrary: unavailable,
    listModels: async () => [],
    listModelProfiles: unavailable,
    chat: unavailable,
    pickContextMedia: unavailable,
    getMemoryStatus: async () => ({ digest: '', totalMemories: 0, reflections: [] }),
    getMemoryReflections: async () => ({ reflections: [] }),
    rememberMemory: async () => ({}),
    rememberMemories: async () => ({}),
    recallMemories: async () => ({ results: [] }),
    getSessionCompress: async () => ({ text: '', historyAnchor: 0 }),
    refreshSessionCompress: async () => ({ text: '', historyAnchor: 0 }),
    listSidecarStatuses: async () => [],
    getSidecarStatus: async () => ({ enabled: false, busy: false }),
    getSidecarContext: async () => ({}),
    setSidecarEnabled: async () => ({ enabled: false }),
    updateSidecarContext: async () => ({}),
    runSidecarNow: unavailable,
    getSocialMaiStatus: async () => ({ enabled: false, busy: false, hasKey: false }),
    getSocialMaiContext: async () => ({}),
    setSocialMaiEnabled: async () => ({ enabled: false, hasKey: false }),
    updateSocialMaiContext: async () => ({}),
    runSocialMaiNow: unavailable,
    onSidecarEvent: () => noopUnsubscribe,
    onSocialMaiEvent: () => noopUnsubscribe,
    onSystemSense: () => noopUnsubscribe
  };
}

if (!window.desktopCompanion) {
  window.desktopCompanion = createUnavailableDesktopBridge();
}

const elements = {
  titlebar: document.querySelector('.titlebar'),
  dragHandle: document.querySelector('.drag-handle'),
  settingsBtn: document.querySelector('#settingsBtn'),
  avatarStage: document.querySelector('.avatar-stage'),
  avatarHome: document.querySelector('#avatarHome'),
  avatarCanvas: document.querySelector('#avatarCanvas'),
  avatarStatus: document.querySelector('#avatarStatus'),
  avatarConsole: document.querySelector('.avatar-console'),
  avatarConsoleSummary: document.querySelector('#avatarConsoleSummary'),
  toggleAvatarConsoleBtn: document.querySelector('#toggleAvatarConsoleBtn'),
  avatarLockLabel: document.querySelector('#avatarLockLabel'),
  bundledAvatarSelect: document.querySelector('#bundledAvatarSelect'),
  cycleAvatarBtn: document.querySelector('#cycleAvatarBtn'),
  avatarZoomInput: document.querySelector('#avatarZoomInput'),
  avatarLiftInput: document.querySelector('#avatarLiftInput'),
  gameCamBtn: document.querySelector('#gameCamBtn'),
  presenceBtn: document.querySelector('#presenceBtn'),
  modeVoiceBtn: document.querySelector('#modeVoiceBtn'),
  speechBubble: document.querySelector('#speechBubble'),
  thoughtBubble: document.querySelector('#thoughtBubble'),
  baseUrlInput: document.querySelector('#baseUrlInput'),
  modelSelect: document.querySelector('#modelSelect'),
  visionModelSelect: document.querySelector('#visionModelSelect'),
  temperatureInput: document.querySelector('#temperatureInput'),
  connectionStatus: document.querySelector('#connectionStatus'),
  refreshModelsBtn: document.querySelector('#refreshModelsBtn'),
  loadAvatarBtn: document.querySelector('#loadAvatarBtn'),
  messages: document.querySelector('#messages'),
  chatForm: document.querySelector('#chatForm'),
  messageInput: document.querySelector('#messageInput'),
  listenBtn: document.querySelector('#listenBtn'),
  sendBtn: document.querySelector('#sendBtn'),
  minimizeBtn: document.querySelector('#minimizeBtn'),
  closeBtn: document.querySelector('#closeBtn'),
  analyzeScreenBtn: document.querySelector('#analyzeScreenBtn'),
  watchIntervalInput: document.querySelector('#watchIntervalInput'),
  toggleAutoWatchBtn: document.querySelector('#toggleAutoWatchBtn'),
  recentScreenshotsBtn: document.querySelector('#recentScreenshotsBtn'),
  screenStatus: document.querySelector('#screenStatus'),
  activeWindowLabel: document.querySelector('#activeWindowLabel'),
  screenSummary: document.querySelector('#screenSummary'),
  chooseMusicFolderBtn: document.querySelector('#chooseMusicFolderBtn'),
  scanMusicBtn: document.querySelector('#scanMusicBtn'),
  toggleAutoDjBtn: document.querySelector('#toggleAutoDjBtn'),
  nextTrackBtn: document.querySelector('#nextTrackBtn'),
  savePlaylistBtn: document.querySelector('#savePlaylistBtn'),
  loadPlaylistBtn: document.querySelector('#loadPlaylistBtn'),
  musicFolderLabel: document.querySelector('#musicFolderLabel'),
  currentTrackTitle: document.querySelector('#currentTrackTitle'),
  currentTrackMeta: document.querySelector('#currentTrackMeta'),
  likeTrackBtn: document.querySelector('#likeTrackBtn'),
  dislikeTrackBtn: document.querySelector('#dislikeTrackBtn'),
  musicStatus: document.querySelector('#musicStatus'),
  watchChip: document.querySelector('#watchChip'),
  djChip: document.querySelector('#djChip'),
  feelingChip: document.querySelector('#feelingChip'),
  socialChip: document.querySelector('#socialChip'),
  overviewModel: document.querySelector('#overviewModel'),
  overviewRoom: document.querySelector('#overviewRoom'),
  overviewMusic: document.querySelector('#overviewMusic'),
  overviewSocial: document.querySelector('#overviewSocial'),
  modelsSummary: document.querySelector('#modelsSummary'),
  screenSummaryLine: document.querySelector('#screenSummaryLine'),
  musicSummaryLine: document.querySelector('#musicSummaryLine'),
  composerHint: document.querySelector('#composerHint'),
  quickScreenBtn: document.querySelector('#quickScreenBtn'),
  quickWatchBtn: document.querySelector('#quickWatchBtn'),
  quickMusicBtn: document.querySelector('#quickMusicBtn'),
  quickSocialBtn: document.querySelector('#quickSocialBtn'),
  suggestionChips: Array.from(document.querySelectorAll('.suggestion-chip')),
  panelCards: Array.from(document.querySelectorAll('[data-panel]')),
  panelToggles: Array.from(document.querySelectorAll('[data-panel-toggle]')),
  audioPlayer: document.querySelector('#audioPlayer'),
  settingsMenuShell: document.querySelector('#settingsMenuShell'),
  settingsScrim: document.querySelector('#settingsScrim'),
  closeSettingsBtn: document.querySelector('#closeSettingsBtn'),
  languageInput: document.querySelector('#languageInput'),
  volumeInput: document.querySelector('#volumeInput'),
  volumeValue: document.querySelector('#volumeValue'),
  autonomyEnabledInput: document.querySelector('#autonomyEnabledInput'),
  presenceEnabledInput: document.querySelector('#presenceEnabledInput'),
  contextMediaEnabledInput: document.querySelector('#contextMediaEnabledInput'),
  screenCommentsEnabledInput: document.querySelector('#screenCommentsEnabledInput'),
  personalityToneInput: document.querySelector('#personalityToneInput'),
  memoryFocusInput: document.querySelector('#memoryFocusInput'),
  localVoiceEnabledInput: document.querySelector('#localVoiceEnabledInput'),
  homeSceneEnabledInput: document.querySelector('#homeSceneEnabledInput'),
  bubblesEnabledInput: document.querySelector('#bubblesEnabledInput'),
  compactUiEnabledInput: document.querySelector('#compactUiEnabledInput')
};

const defaultSettings = {
  language: 'en',
  baseUrl: MAI_STUDIO_DEFAULT_BASE_URL,
  model: '',
  visionModel: '',
  temperature: '0.8',
  volumePct: '55',
  avatarPath: '',
  autoWatch: false,
  watchIntervalSec: '45',
  musicFolder: '',
  autoDj: false,
  autonomyEnabled: true,
  presenceEnabled: true,
  contextMediaEnabled: true,
  screenCommentsEnabled: true,
  personalityTone: clientProfile.character?.tone || 'Playful, observant, warm, and a little teasing without being mean.',
  memoryFocus: 'Prioritize the user’s preferences, routines, ongoing build choices, music taste, and relationship continuity.',
  localVoiceEnabled: true,
  localVoiceOptIn: true,
  localVoiceExplicitChoice: false,
  bubblesEnabled: true,
  homeSceneEnabled: false,
  stabilityPatchVersion: IMRKITTYY_STABILITY_PATCH_VERSION,
  compactUiEnabled: true,
  avatarZoomPct: '100',
  avatarLiftPct: '-8',
  tasteProfile: {
    likedTrackIds: [],
    dislikedTrackIds: [],
    artistAffinity: {},
    sceneArtistAffinity: {},
    playCounts: {}
  }
};

function loadAutonomyState() {
  const defaults = {
    drives: {
      attention: 0.52,
      curiosity: 0.54,
      rest: 0.34,
      play: 0.42,
      music: 0.38,
      social: 0.36
    },
    routineLog: {},
    eventCooldowns: {},
    nightlyReflectionDate: '',
    dominantDrive: 'curiosity'
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(AUTONOMY_STATE_KEY) || '{}');
    return {
      ...defaults,
      ...parsed,
      drives: {
        ...defaults.drives,
        ...(parsed?.drives || {})
      },
      routineLog: {
        ...(parsed?.routineLog || {})
      },
      eventCooldowns: {
        ...(parsed?.eventCooldowns || {})
      }
    };
  } catch {
    return defaults;
  }
}

function saveAutonomyState() {
  localStorage.setItem(AUTONOMY_STATE_KEY, JSON.stringify(runtimeState.autonomy));
}

const runtimeState = {
  settings: loadSettings(),
  autonomy: loadAutonomyState(),
  sceneProfiles: loadSceneProfiles(),
  ui: loadUiState(),
  home: {
    activeKey: 'vrRoom',
    useScene: true,
    sceneReady: false,
    sceneLoading: false,
    sceneError: ''
  },
  presenceBackdrop: {
    imageDataUrl: '',
    refreshTimer: null,
    busy: false
  },
  chatHistory: [],
  bundledAvatars: [],
  modelProfiles: [],
  library: [],
  animationLibrary: [],
  animationPresets: {
    idle: [],
    wave: [],
    happy: [],
    curious: [],
    groove: []
  },
  currentTrack: null,
  currentTrackReason: '',
  screenInsight: null,
  currentScene: {
    key: '',
    label: '',
    memoryLine: '',
    family: 'general',
    visitCount: 0
  },
  loading: false,
  screenBusy: false,
  musicBusy: false,
  autoWatchTimer: null,
  recentTrackIds: [],
  cameraBasePosition: new THREE.Vector3(0, 0.98, 2.35),
  avatarBasePosition: new THREE.Vector3(0, -1.05, 0),
  avatarFocusPoint: new THREE.Vector3(0, 0.95, 0),
  avatarScale: 1,
  avatarYaw: 0,
  ambientPreset: 'idle',
  ambientUntil: 0,
  clipActions: new Map(),
  loadedAnimations: new Map(),
  loadingAnimations: new Map(),
  animationMixer: null,
  activeAnimationPreset: '',
  activeAnimationPath: '',
  lastAnimationChangeAt: 0,
  lastAnimationDuration: 0,
  animationPlayToken: 0,
  animationPickHistory: [],
  failedAnimations: new Set(),
  overridePreset: 'idle',
  overrideUntil: 0,
  speakingUntil: 0,
  blinkUntil: 0,
  nextBlinkAt: 1.6,
  feelingState: {
    label: 'settled',
    preset: 'idle',
    intensity: 0.26,
    confidence: 0.5,
    expiresAt: 0,
    lastLine: ''
  },
  affect: {
    energy: 0.64,
    affection: 0.58,
    focus: 0.55,
    curiosity: 0.54,
    calm: 0.63,
    sociability: 0.58,
    sleepiness: 0.24,
    phase: 'day',
    lastInteractionAt: 0,
    lastContextShiftAt: 0,
    lastStatusRefreshAt: 0
  },
  avatarStatusState: {
    info: '',
    transient: '',
    error: ''
  },
  socialMai: {
    enabled: false,
    busy: false,
    hasKey: false,
    digest: '',
    lastRunAt: '',
    recentEvents: [],
    unsubscribe: null
  },
  systemSense: {
    activeWindowTitle: '',
    activeProcessName: '',
    idleState: 'active',
    idleSeconds: 0,
    locked: false,
    headphonesConnected: false,
    audioEndpoints: [],
    lastEventType: ''
  },
  voice: {
    speaking: false,
    listening: false,
    recognition: null,
    lastLine: '',
    utterance: null,
    audio: null,
    motionTimer: null,
    requestToken: 0,
    status: {
      available: false,
      engine: 'none',
      label: ''
    }
  },
  memory: {
    digest: '',
    reflectionDigest: '',
    reflections: [],
    totalMemories: 0,
    lastResults: [],
    memoryRecallDebounceTimer: null,
    compressText: '',
    compressHistoryAnchor: 0,
    sessionCompressBusy: false,
    sessionCompressTimer: null
  },
  media: {
    busy: false,
    nextShareAt: 0,
    lastSharedUrl: ''
  },
  audioMotion: {
    context: null,
    analyser: null,
    sourceNode: null,
    dataArray: null,
    level: 0,
    smoothedLevel: 0
  },
  presence: {
    busy: false,
    queuedTimer: null,
    pulseTimer: null,
    nextSpeakAt: 0,
    lastSpokenLine: '',
    lastScreenKey: '',
    lastTrackId: '',
    pointerX: 0,
    pointerY: 0,
    targetPointerX: 0,
    targetPointerY: 0,
    pointerActive: false
  },
  mannerisms: {
    focusX: 0,
    focusY: 0,
    targetFocusX: 0,
    targetFocusY: 0,
    focusUntil: 0,
    nextWanderAt: 0,
    listeningUntil: 0,
    ponderingUntil: 0,
    perkUntil: 0
  },
  rituals: {
    isForeground: true,
    lastBackgroundAt: 0,
    lastReturnAt: 0,
    lastWakeNoticeAt: 0
  },
  residency: {
    sceneKey: '',
    enteredAt: 0,
    lingerSeconds: 0,
    depth: 0,
    stageId: 'arriving',
    lastMemoryStage: '',
    lastPresenceStage: '',
    lastSidecarStage: ''
  },
  typing: {
    isFocused: false,
    isComposing: false,
    lastTypedAt: 0,
    chars: 0,
    lineCount: 0,
    intensity: 0
  },
  avatarConsoleFx: {
    autoHidden: false,
    hideTimer: null
  },
  bubbles: {
    speechText: '',
    speechUntil: 0
  },
  autonomyRuntime: {
    pulseTimer: null,
    lastTickAt: 0,
    lastEventId: '',
    pendingNightlyReflection: false
  }
};

runtimeState.home.useScene = Boolean(runtimeState.settings.homeSceneEnabled);

let currentVrm = null;
let resizeRendererFrame = 0;
let windowDragState = null;
let pendingWindowMove = null;
let windowDragFrame = 0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
camera.position.set(0, 0.98, 2.35);

const renderer = new THREE.WebGLRenderer({
  canvas: elements.avatarCanvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setClearColor(0x000000, 0);
renderer.setClearAlpha(0);
renderer.autoClear = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const textureLoader = new THREE.TextureLoader();
const objLoader = new OBJLoader();
const vrRoomTextureCache = new Map();
const vrRoomMaterialCache = new Map();

const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xfff1d1, 1.7);
keyLight.position.set(1.6, 2.4, 2.2);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x7fc8ff, 1.2);
fillLight.position.set(-1.6, 1.7, 1.4);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xcfd8df, 0.85);
rimLight.position.set(0.2, 0.8, -2.3);
scene.add(rimLight);
scene.fog = new THREE.FogExp2(0x07111f, 0.038);
const clock = new THREE.Clock();

function createGamingBedroomLightRig() {
  const group = new THREE.Group();
  group.name = 'mai-gaming-bedroom-light-rig';

  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0.1, 1.18, -2.25);
  group.add(keyTarget);

  const warmKey = new THREE.SpotLight(0xffd2a3, 1.4, 10, Math.PI / 4.6, 0.42, 1.7);
  warmKey.position.set(-3.05, 2.58, 1.72);
  warmKey.castShadow = true;
  warmKey.shadow.mapSize.set(1024, 1024);
  warmKey.shadow.bias = -0.00012;
  warmKey.shadow.radius = 6;
  warmKey.target = keyTarget;
  group.add(warmKey);

  const monitorGlow = new THREE.PointLight(0x88e6ff, 0.92, 2.5, 2.2);
  monitorGlow.position.set(-2.28, 1.5, -1.86);
  group.add(monitorGlow);

  const logoGlowCyan = new THREE.PointLight(0x76e6ff, 0.5, 2.5, 2);
  logoGlowCyan.position.set(0.76, 1.45, -2.7);
  group.add(logoGlowCyan);

  const logoGlowMagenta = new THREE.PointLight(0xff58e8, 0.62, 2.6, 2);
  logoGlowMagenta.position.set(1.12, 1.18, -2.52);
  group.add(logoGlowMagenta);

  const floorBounce = new THREE.PointLight(0xffd7af, 0.2, 3.2, 2.4);
  floorBounce.position.set(-0.45, 0.22, -1.18);
  group.add(floorBounce);

  return group;
}

function renderHomeLighting() {
  const homeActive = !isTransparentCompanionMode() && Boolean(getActiveHomeEnvironment()) && runtimeState.home?.sceneReady;
  ambientLight.intensity = homeActive ? 0.16 : 1.35;
  ambientLight.color.set(homeActive ? 0xc9d3ff : 0xffffff);
  keyLight.intensity = homeActive ? 0.74 : 1.7;
  keyLight.color.set(homeActive ? 0xffd2a8 : 0xfff1d1);
  keyLight.position.set(homeActive ? -2.35 : 1.6, homeActive ? 2.34 : 2.4, homeActive ? 1.84 : 2.2);
  fillLight.intensity = homeActive ? 0.12 : 1.2;
  fillLight.color.set(homeActive ? 0x74cbff : 0x7fc8ff);
  fillLight.position.set(homeActive ? 1.4 : -1.6, homeActive ? 1.26 : 1.7, homeActive ? 0.68 : 1.4);
  rimLight.intensity = homeActive ? 0.32 : 0.85;
  rimLight.color.set(homeActive ? 0x8bdcff : 0xcfd8df);
  rimLight.position.set(homeActive ? 2.16 : 0.2, homeActive ? 1.04 : 0.8, homeActive ? -1.72 : -2.3);
  scene.fog.color.set(homeActive ? 0x0f1219 : 0x07111f);
  scene.fog.density = homeActive ? 0.022 : 0.038;
  renderer.toneMappingExposure = homeActive ? 0.72 : 1;
}
const homeSceneGroup = new THREE.Group();
homeSceneGroup.name = 'mai-home-wrapper';
homeSceneGroup.visible = false;
const homeSceneContent = new THREE.Group();
homeSceneContent.name = 'mai-vr-room-home';
homeSceneGroup.add(homeSceneContent);
scene.add(homeSceneGroup);

function getVrRoomAssetBasename(assetPath = '') {
  const normalized = String(assetPath || '').replace(/\\/g, '/');
  return normalized.split('/').pop() || '';
}

function getVrRoomMeshSource(meshPath = '') {
  return VR_ROOM_MESH_SOURCES[getVrRoomAssetBasename(meshPath)] || '';
}

function getVrRoomTextureUrl(texturePath = '') {
  const fileName = getVrRoomAssetBasename(texturePath);
  return VR_ROOM_TEXTURE_URLS[fileName] || '';
}

function toThreeColor(colorValue, fallback = 0xffffff) {
  if (Array.isArray(colorValue) && colorValue.length >= 3) {
    return new THREE.Color(
      Number(colorValue[0]) || 0,
      Number(colorValue[1]) || 0,
      Number(colorValue[2]) || 0
    );
  }
  return new THREE.Color(fallback);
}

function slugify(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'part';
}

async function loadVrRoomTexture(textureName = '') {
  const fileName = getVrRoomAssetBasename(textureName);
  if (!fileName) {
    return null;
  }
  if (vrRoomTextureCache.has(fileName)) {
    return vrRoomTextureCache.get(fileName);
  }
  const textureUrl = getVrRoomTextureUrl(fileName);
  if (!textureUrl) {
    vrRoomTextureCache.set(fileName, null);
    return null;
  }

  try {
    const texture = await textureLoader.loadAsync(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    vrRoomTextureCache.set(fileName, texture);
    return texture;
  } catch {
    vrRoomTextureCache.set(fileName, null);
    return null;
  }
}

async function createVrRoomMaterial(materialName = '', baseDefinition = null) {
  const resolvedName = materialName || baseDefinition?.name || 'Default-Material';
  const textureName = VR_ROOM_TEXTURE_OVERRIDES[resolvedName] || getVrRoomAssetBasename(baseDefinition?.texture || '');
  const cacheKey = `${resolvedName}|${textureName || 'none'}`;
  if (vrRoomMaterialCache.has(cacheKey)) {
    return vrRoomMaterialCache.get(cacheKey);
  }

  const override = VR_ROOM_MATERIAL_OVERRIDES[resolvedName] || {};
  const texture = textureName ? await loadVrRoomTexture(textureName) : null;
  const material = new THREE.MeshStandardMaterial({
    color: override.color ?? toThreeColor(baseDefinition?.color, 0xffffff),
    emissive: override.emissive ?? toThreeColor(baseDefinition?.emissive, 0x000000),
    emissiveIntensity: override.emissiveIntensity ?? 0,
    roughness: override.roughness ?? baseDefinition?.roughness ?? 0.56,
    metalness: override.metalness ?? baseDefinition?.metallic ?? 0.08,
    transparent: Boolean(override.transparent || (texture && (resolvedName === 'art' || resolvedName === 'trans.002'))),
    opacity: override.opacity ?? 1,
    side: override.doubleSide ? THREE.DoubleSide : THREE.FrontSide
  });

  if (texture) {
    material.map = texture;
    material.transparent = material.transparent || resolvedName === 'art';
    material.alphaTest = material.transparent ? 0.02 : 0;
    if (resolvedName === 'art') {
      material.color = new THREE.Color(0xffffff);
    }
  }

  vrRoomMaterialCache.set(cacheKey, material);
  return material;
}

async function buildVrRoomObject(entry) {
  const rawObj = getVrRoomMeshSource(entry.mesh);
  if (!rawObj) {
    return null;
  }
  const objectRoot = objLoader.parse(rawObj);
  objectRoot.name = `vr-room-${slugify(entry.name || 'part')}`;

  const meshNodes = [];
  objectRoot.traverse((node) => {
    if (!node.isMesh) {
      return;
    }
    node.geometry?.computeVertexNormals?.();
    node.castShadow = false;
    node.receiveShadow = true;
    meshNodes.push(node);
  });

  const materialNames = entry.materials?.length
    ? entry.materials
    : [entry.material?.name || 'Default-Material'];
  for (let index = 0; index < meshNodes.length; index += 1) {
    const node = meshNodes[index];
    const slotName = materialNames[index] || materialNames[materialNames.length - 1] || entry.material?.name || 'Default-Material';
    node.material = await createVrRoomMaterial(slotName, entry.material);
  }

  objectRoot.position.fromArray(entry.position || [0, 0, 0]);
  if (Array.isArray(entry.rotation) && entry.rotation.length >= 4) {
    objectRoot.quaternion.set(
      Number(entry.rotation[0]) || 0,
      Number(entry.rotation[1]) || 0,
      Number(entry.rotation[2]) || 0,
      Number(entry.rotation[3]) || 1
    );
  }
  if (Array.isArray(entry.scale) && entry.scale.length >= 3) {
    objectRoot.scale.set(
      Number(entry.scale[0]) || 1,
      Number(entry.scale[1]) || 1,
      Number(entry.scale[2]) || 1
    );
  }
  return objectRoot;
}

function addVrRoomAccentLights(group, manifestObjects) {
  const objectLookup = new Map(manifestObjects.map((entry) => [entry.name, entry]));
  const addLight = (name, offset, color, intensity, distance, decay = 2.2) => {
    const anchor = objectLookup.get(name);
    if (!anchor) {
      return;
    }
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.set(
      (anchor.position?.[0] || 0) + offset[0],
      (anchor.position?.[1] || 0) + offset[1],
      (anchor.position?.[2] || 0) + offset[2]
    );
    group.add(light);
  };

  addLight('Computer moniter', [0, 0.3, 0.4], 0x67c9ff, 1.6, 2.3);
  addLight('Light stand', [0, 0.2, 0], 0xffdd8a, 1.35, 1.8);
  addLight('Computer', [0.1, 0.15, 0.25], 0x63b8ff, 0.9, 1.5);
  addLight('Right Shelf', [0.3, -1.1, 0.5], 0x57b8ff, 0.84, 1.8);
  addLight('stand small', [0, 0.65, 0.2], 0xffd675, 0.72, 1.4);
}

function createGamingBedroomShell() {
  const group = new THREE.Group();
  group.name = 'mai-gaming-bedroom-shell';

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x111a28, roughness: 0.92, metalness: 0.08 });
  const sideWallMaterial = new THREE.MeshStandardMaterial({ color: 0x0c1524, roughness: 0.94, metalness: 0.06 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2234, roughness: 0.84, metalness: 0.12 });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x6bbcff,
    emissive: 0x4fa8ff,
    emissiveIntensity: 0.52,
    roughness: 0.26,
    metalness: 0.36
  });
  const rugMaterial = new THREE.MeshStandardMaterial({ color: 0x222d44, roughness: 0.9, metalness: 0.04 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 6.1), floorMaterial);
  floor.position.set(0, -0.04, -0.05);
  group.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.8, 0.08), wallMaterial);
  backWall.position.set(0, 1.86, -3.08);
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.8, 6.16), sideWallMaterial);
  leftWall.position.set(-3.06, 1.86, -0.02);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.8, 5.18), sideWallMaterial);
  rightWall.position.set(3.06, 1.86, -0.56);
  group.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.06, 6.08), wallMaterial);
  ceiling.position.set(0, 3.74, -0.04);
  group.add(ceiling);

  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.02, 2.2), rugMaterial);
  rug.position.set(0.15, 0.02, -0.7);
  group.add(rug);

  const trimTop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.05), trimMaterial);
  trimTop.position.set(0.2, 2.85, -3.0);
  group.add(trimTop);

  const trimDesk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.04), trimMaterial);
  trimDesk.position.set(1.8, 1.54, -2.94);
  group.add(trimDesk);

  const trimBed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.04), trimMaterial);
  trimBed.position.set(-1.88, 1.34, -2.94);
  group.add(trimBed);

  return group;
}

function addGamingBedroomAccentLights(group) {
  const addNodeLight = (nodeName, offset, color, intensity, distance, decay = 2.2) => {
    const node = group.getObjectByName(nodeName);
    if (!node) {
      return;
    }
    const anchor = new THREE.Vector3();
    node.getWorldPosition(anchor);
    group.worldToLocal(anchor);
    anchor.add(new THREE.Vector3(offset[0], offset[1], offset[2]));
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.copy(anchor);
    group.add(light);
  };

  addNodeLight('Monitor_6', [0, 0.18, 0.1], 0x66c6ff, 1.24, 2.2);
  addNodeLight('PC_5', [0.1, 0.26, 0.18], 0x4aa2ff, 0.88, 1.5);
  addNodeLight('NanoLights_13', [0, 0.1, 0.12], 0xffcc74, 0.82, 1.8);
}

async function initializeAvatarHomeScene() {
  if (runtimeState.home.sceneReady || runtimeState.home.sceneLoading) {
    return;
  }

  runtimeState.home.sceneLoading = true;
  runtimeState.home.sceneError = '';
  try {
    homeSceneContent.clear();
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(GAMING_BEDROOM_GLB_URL);
    const room = gltf.scene.clone(true);
    room.name = 'mai-gaming-bedroom-home';

    room.traverse((node) => {
      if (!node.isMesh) {
        return;
      }
      node.castShadow = false;
      node.receiveShadow = true;
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => {
          if (material) {
            material.depthWrite = true;
          }
        });
      } else if (node.material) {
        node.material.depthWrite = true;
      }
    });

    const home = HOME_ENVIRONMENTS.vrRoom || {};
    const sceneTransform = home.sceneTransform || {};
    room.scale.setScalar(sceneTransform.scale ?? 1);
    room.rotation.y = sceneTransform.rotationY ?? 0;
    room.updateWorldMatrix(true, true);

    const roomBox = new THREE.Box3().setFromObject(room);
    const roomCenter = roomBox.getCenter(new THREE.Vector3());
    room.position.set(
      -(roomCenter.x) + (sceneTransform.xBias ?? 0),
      -(roomBox.min.y) + (sceneTransform.floorY ?? -1.02),
      -(roomBox.max.z) + (sceneTransform.frontZ ?? 0.82)
    );
    room.updateWorldMatrix(true, true);
    room.add(createGamingBedroomLightRig());

    homeSceneContent.add(room);

    runtimeState.home.sceneReady = true;
    renderAvatarHome();
    if (currentVrm && !isTransparentCompanionMode()) {
      fitAvatarToStage(currentVrm);
    }
  } catch (error) {
    runtimeState.home.sceneError = getErrorMessage(error);
    runtimeState.home.sceneReady = false;
    console.error('Failed to load Mai home scene', error);
  } finally {
    runtimeState.home.sceneLoading = false;
    renderAvatarHome();
  }
}

function updateCameraLook() {
  camera.lookAt(runtimeState.avatarFocusPoint);
}

function getBoneWorldPosition(vrm, boneName) {
  const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
  if (!bone) {
    return null;
  }
  const position = new THREE.Vector3();
  bone.getWorldPosition(position);
  return position;
}

function getFirstBoneWorldPosition(vrm, boneNames = []) {
  for (const boneName of boneNames) {
    const position = getBoneWorldPosition(vrm, boneName);
    if (position) {
      return position;
    }
  }
  return null;
}

function getAvatarProjectionExtents(vrm) {
  const head = getFirstBoneWorldPosition(vrm, ['head']);
  const leftFoot = getFirstBoneWorldPosition(vrm, ['leftFoot', 'leftLowerLeg']);
  const rightFoot = getFirstBoneWorldPosition(vrm, ['rightFoot', 'rightLowerLeg']);
  const points = [head, leftFoot, rightFoot].filter(Boolean);
  if (!points.length) {
    return null;
  }

  const projected = points.map((point) => ({
    point,
    ndc: point.clone().project(camera)
  }));
  const top = projected.reduce((best, entry) => (best && best.ndc.y > entry.ndc.y ? best : entry), null);
  const bottom = projected.reduce((best, entry) => (best && best.ndc.y < entry.ndc.y ? best : entry), null);

  return {
    topPoint: top?.point || null,
    topNdc: top?.ndc?.y ?? 0,
    bottomPoint: bottom?.point || null,
    bottomNdc: bottom?.ndc?.y ?? 0
  };
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const tasteProfile = {
      ...defaultSettings.tasteProfile,
      ...(parsed.tasteProfile || {})
    };
    tasteProfile.likedTrackIds = [...new Set(tasteProfile.likedTrackIds || [])];
    tasteProfile.dislikedTrackIds = [...new Set(tasteProfile.dislikedTrackIds || [])];
    const merged = { ...defaultSettings, ...parsed, tasteProfile };
    if (!LANGUAGE_OPTIONS[merged.language]) {
      merged.language = defaultSettings.language;
    }
    if (typeof parsed.localVoiceExplicitChoice !== 'boolean') {
      merged.localVoiceEnabled = true;
      merged.localVoiceOptIn = true;
    }
    if (parsed.stabilityPatchVersion !== IMRKITTYY_STABILITY_PATCH_VERSION) {
      merged.homeSceneEnabled = false;
      merged.avatarPath = '';
      merged.compactUiEnabled = true;
      merged.avatarLiftPct = defaultSettings.avatarLiftPct;
      merged.stabilityPatchVersion = IMRKITTYY_STABILITY_PATCH_VERSION;
    }
    return merged;
  } catch {
    return { ...defaultSettings };
  }
}

function loadSceneProfiles() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCENE_PROFILES_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadUiState() {
  const defaults = {
    layoutVersion: UI_LAYOUT_VERSION,
    avatarConsoleOpen: false,
    gameCamMode: false,
    presenceMode: false,
    settingsMenuOpen: false,
    panels: {
      models: true,
      screen: true,
      music: true
    }
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(UI_STATE_KEY) || '{}');
    if (parsed?.layoutVersion !== UI_LAYOUT_VERSION) {
      return defaults;
    }
    return {
      ...defaults,
      ...parsed,
      panels: {
        ...defaults.panels,
        ...(parsed?.panels || {})
      }
    };
  } catch {
    return defaults;
  }
}

function saveSceneProfiles() {
  localStorage.setItem(SCENE_PROFILES_KEY, JSON.stringify(runtimeState.sceneProfiles));
}

function saveUiState() {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(runtimeState.ui));
}

function saveSettings() {
  runtimeState.settings.tasteProfile.likedTrackIds = [...new Set(runtimeState.settings.tasteProfile.likedTrackIds)];
  runtimeState.settings.tasteProfile.dislikedTrackIds = [...new Set(runtimeState.settings.tasteProfile.dislikedTrackIds)];
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(runtimeState.settings));
}

function syncFormWithSettings() {
  elements.baseUrlInput.value = runtimeState.settings.baseUrl;
  elements.temperatureInput.value = runtimeState.settings.temperature;
  elements.watchIntervalInput.value = runtimeState.settings.watchIntervalSec;
  elements.avatarZoomInput.value = runtimeState.settings.avatarZoomPct;
  elements.avatarLiftInput.value = runtimeState.settings.avatarLiftPct;
}

function syncSettingsMenuInputs() {
  elements.languageInput.value = runtimeState.settings.language || defaultSettings.language;
  elements.volumeInput.value = runtimeState.settings.volumePct;
  elements.autonomyEnabledInput.checked = Boolean(runtimeState.settings.autonomyEnabled);
  elements.presenceEnabledInput.checked = Boolean(runtimeState.settings.presenceEnabled);
  elements.contextMediaEnabledInput.checked = Boolean(runtimeState.settings.contextMediaEnabled);
  elements.screenCommentsEnabledInput.checked = Boolean(runtimeState.settings.screenCommentsEnabled);
  elements.personalityToneInput.value = runtimeState.settings.personalityTone || '';
  elements.memoryFocusInput.value = runtimeState.settings.memoryFocus || '';
  elements.localVoiceEnabledInput.checked = Boolean(runtimeState.settings.localVoiceEnabled);
  elements.homeSceneEnabledInput.checked = Boolean(runtimeState.settings.homeSceneEnabled);
  elements.bubblesEnabledInput.checked = Boolean(runtimeState.settings.bubblesEnabled);
  elements.compactUiEnabledInput.checked = Boolean(runtimeState.settings.compactUiEnabled);
}

function applyAudioSettings() {
  const volumePct = clamp(Number.parseInt(runtimeState.settings.volumePct, 10) || 0, 0, 100);
  runtimeState.settings.volumePct = String(volumePct);
  elements.audioPlayer.volume = volumePct / 100;
  elements.audioPlayer.muted = volumePct <= 0;
  elements.volumeInput.value = runtimeState.settings.volumePct;
  elements.volumeValue.textContent = `${volumePct}%`;
}

function applyLanguageToUi() {
  document.documentElement.lang = getLanguageConfig(getCurrentLanguage()).uiCode;

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) {
      node.textContent = value;
    }
  };

  const setHtml = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) {
      node.innerHTML = value;
    }
  };

  setText('.single-avatar-kicker', t('currentAvatar'));
  setText('.title-copy .eyebrow', t('customBuild'));
  setText('#settingsBtn', t('settings'));
  setText('#gameCamBtn', isGameCamMode() ? t('deskView') : t('gameCam'));
  setText('#presenceBtn', isPresenceMode() ? t('deskView') : t('presenceMode'));
  setText('#minimizeBtn', '-');
  setText('#closeBtn', 'x');
  elements.settingsBtn?.setAttribute('aria-label', t('openSettings'));
  elements.gameCamBtn?.setAttribute('aria-label', t('gameCam'));
  elements.presenceBtn?.setAttribute('aria-label', t('presenceMode'));
  elements.minimizeBtn?.setAttribute('aria-label', t('minimizeWindow'));
  elements.closeBtn?.setAttribute('aria-label', t('closeWindow'));
  if (elements.avatarConsoleSummary && (!runtimeState.settings.avatarPath || !elements.avatarConsoleSummary.textContent.trim())) {
    elements.avatarConsoleSummary.textContent = t('avatarLoadedRemembered', {
      name: getFileName(runtimeState.settings.avatarPath || clientProfile.preferredAvatarFile || 'Mai.vrm')
    });
  }
  setText('.settings-menu-header .eyebrow', t('settings'));
  setText('#settingsMenuTitle', t('maiSettings'));
  setText('.settings-menu-header .settings-note', t('settingsNote'));
  setText('#closeSettingsBtn', t('close'));

  const settingsGroups = Array.from(document.querySelectorAll('.settings-group'));
  if (settingsGroups[0]) {
    setText('.settings-group:nth-of-type(1) .summary-label', t('languageSection'));
    setText('.settings-group:nth-of-type(1) .settings-note', t('languageNote'));
    setText('.settings-group:nth-of-type(1) label span', t('languageLabel'));
  }
  if (settingsGroups[1]) {
    setText('.settings-group:nth-of-type(2) .summary-label', t('audio'));
    setText('.settings-group:nth-of-type(2) .settings-note', t('audioNote'));
    setText('.settings-group:nth-of-type(2) .range-field span', t('musicVolume'));
  }
  if (settingsGroups[2]) {
    setText('.settings-group:nth-of-type(3) .summary-label', t('behavior'));
    setText('.settings-group:nth-of-type(3) .settings-note', t('behaviorNote'));
    const behaviorLabels = settingsGroups[2].querySelectorAll('.toggle-title');
    const behaviorCopy = settingsGroups[2].querySelectorAll('.toggle-copy');
    if (behaviorLabels[0]) behaviorLabels[0].textContent = t('routineAutonomy');
    if (behaviorCopy[0]) behaviorCopy[0].textContent = t('routineAutonomyCopy');
    if (behaviorLabels[1]) behaviorLabels[1].textContent = t('proactivePresence');
    if (behaviorCopy[1]) behaviorCopy[1].textContent = t('proactivePresenceCopy');
    if (behaviorLabels[2]) behaviorLabels[2].textContent = t('reactionMediaShares');
    if (behaviorCopy[2]) behaviorCopy[2].textContent = t('reactionMediaSharesCopy');
    if (behaviorLabels[3]) behaviorLabels[3].textContent = t('screenComments');
    if (behaviorCopy[3]) behaviorCopy[3].textContent = t('screenCommentsCopy');
    if (behaviorLabels[4]) behaviorLabels[4].textContent = t('personalityTuning');
    if (behaviorCopy[4]) behaviorCopy[4].textContent = t('personalityTuningCopy');
    if (behaviorLabels[5]) behaviorLabels[5].textContent = t('memoryTuning');
    if (behaviorCopy[5]) behaviorCopy[5].textContent = t('memoryTuningCopy');
  }
  if (settingsGroups[3]) {
    setText('.settings-group:nth-of-type(4) .summary-label', t('display'));
    setText('.settings-group:nth-of-type(4) .settings-note', t('displayNote'));
    const displayLabels = settingsGroups[3].querySelectorAll('.toggle-title');
    const displayCopy = settingsGroups[3].querySelectorAll('.toggle-copy');
    if (displayLabels[0]) displayLabels[0].textContent = t('localVoice');
    if (displayCopy[0]) displayCopy[0].textContent = t('localVoiceCopy');
    if (displayLabels[1]) displayLabels[1].textContent = t('homeRoom');
    if (displayCopy[1]) displayCopy[1].textContent = t('homeRoomCopy');
    if (displayLabels[2]) displayLabels[2].textContent = t('bubbles');
    if (displayCopy[2]) displayCopy[2].textContent = t('bubblesCopy');
    if (displayLabels[3]) displayLabels[3].textContent = t('compactControls');
    if (displayCopy[3]) displayCopy[3].textContent = t('compactControlsCopy');
  }

  if (elements.languageInput?.options[0]) {
    elements.languageInput.options[0].textContent = t('languageEnglish');
  }
  if (elements.languageInput?.options[1]) {
    elements.languageInput.options[1].textContent = t('languageSpanish');
  }
  if (elements.personalityToneInput) {
    elements.personalityToneInput.placeholder = t('personalityPlaceholder');
  }
  if (elements.memoryFocusInput) {
    elements.memoryFocusInput.placeholder = t('memoryPlaceholder');
  }
  if (elements.messageInput) {
    elements.messageInput.placeholder = t('askCompanionPlaceholder');
  }
  setText('#overviewSocial', t('sidecarAsleep'));
  setText('.overview-pill:nth-of-type(1) .summary-label', t('modelOverview'));
  setText('.overview-pill:nth-of-type(2) .summary-label', t('roomOverview'));
  setText('.overview-pill:nth-of-type(3) .summary-label', t('musicOverview'));
  setText('.overview-pill:nth-of-type(4) .summary-label', t('socialOverview'));
  setText('.conversation-note', t('conversationNote'));
  if (elements.suggestionChips[0]) {
    elements.suggestionChips[0].textContent = t('suggestionReadRoom');
    elements.suggestionChips[0].dataset.suggestion = t('suggestionReadRoomPrompt');
  }
  if (elements.suggestionChips[1]) {
    elements.suggestionChips[1].textContent = t('suggestionPickSong');
    elements.suggestionChips[1].dataset.suggestion = t('suggestionPickSongPrompt');
  }
  if (elements.suggestionChips[2]) {
    elements.suggestionChips[2].textContent = t('suggestionRecentShots');
    elements.suggestionChips[2].dataset.suggestion = t('suggestionRecentShotsPrompt');
  }
  if (elements.suggestionChips[3]) {
    elements.suggestionChips[3].textContent = t('suggestionRemember');
    elements.suggestionChips[3].dataset.suggestion = t('suggestionRememberPrompt');
  }
  setText('#socialChip', t('standaloneBuild'));
  setText('#toggleAutoWatchBtn', runtimeState.settings.autoWatch ? t('quickAutoWatchOn') : t('quickAutoWatchOff'));
  setText('#toggleAutoDjBtn', runtimeState.settings.autoDj ? t('autoDjOn') : t('autoDjOff'));
  setText('#currentTrackTitle', runtimeState.currentTrack ? elements.currentTrackTitle.textContent : t('noCurrentTrack'));
  if (!runtimeState.currentTrack) {
    setText('#currentTrackMeta', t('musicFolderHint'));
  }
  setText('.summary-box .summary-label', t('activeWindow'));
  const summaryLabels = Array.from(document.querySelectorAll('.summary-box .summary-label'));
  if (summaryLabels[1]) summaryLabels[1].textContent = t('latestSummary');
  if (summaryLabels[2]) summaryLabels[2].textContent = t('nowPlaying');
  setText('.avatar-console-toggle', runtimeState.ui.avatarConsoleOpen ? t('hideFit') : t('fit'));
  const fitFields = Array.from(document.querySelectorAll('.fit-field span'));
  if (fitFields[0]) fitFields[0].textContent = t('zoom');
  if (fitFields[1]) fitFields[1].textContent = t('lift');
  setText('.overview-card .eyebrow', t('overview'));
  setText('.overview-card h2', t('atAGlance'));
  setText('[data-panel="models"] .eyebrow', t('modelsCard'));
  setText('[data-panel="models"] h2', MAI_STUDIO_NAME);
  setText('#refreshModelsBtn', t('refresh'));
  setText('[data-panel="models"] .field span', t('lmStudioUrl'));
  const modelFields = Array.from(document.querySelectorAll('[data-panel="models"] .split-fields .field span'));
  if (modelFields[0]) modelFields[0].textContent = t('chatModel');
  if (modelFields[1]) modelFields[1].textContent = t('visionModel');
  setText('[data-panel="models"] .field-small span', t('temperature'));
  setText('[data-panel="screen"] .eyebrow', t('screenSense'));
  setText('[data-panel="screen"] h2', t('seeWhatYoureDoing'));
  setText('#analyzeScreenBtn', t('analyzeNow'));
  setText('[data-panel="screen"] .field-small span', t('watchEverySec'));
  setText('#recentScreenshotsBtn', t('recentShotsButton'));
  setText('[data-panel="music"] .eyebrow', t('musicCard'));
  setText('[data-panel="music"] h2', t('pickYourMusic'));
  setText('#chooseMusicFolderBtn', t('chooseFolder'));
  setText('#scanMusicBtn', t('scanLibrary'));
  setText('#nextTrackBtn', t('nextTrack'));
  setText('#savePlaylistBtn', t('savePlaylist'));
  setText('#loadPlaylistBtn', t('loadPlaylist'));
  setText('#likeTrackBtn', t('like'));
  setText('#dislikeTrackBtn', t('skipDislike'));
  setText('.conversation-header .eyebrow', t('conversation'));
  setText('.conversation-header h2', t('talkToMai'));
  if (!runtimeState.currentTrack && elements.quickMusicBtn && !runtimeState.musicBusy && !runtimeState.library.length && !runtimeState.settings.musicFolder) {
    elements.quickMusicBtn.textContent = t('musicButton');
  }
  elements.settingsScrim?.setAttribute('aria-label', t('closeSettingsAria'));
  elements.closeSettingsBtn?.setAttribute('aria-label', t('closeSettingsMenu'));
  const allCardToggles = Array.from(document.querySelectorAll('[data-panel-toggle]'));
  allCardToggles.forEach((toggle) => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.textContent = expanded ? t('hide') : t('show');
  });
  if (elements.modelSelect?.options[0]) {
    elements.modelSelect.options[0].textContent = t('autoDetectFirstLoadedModel');
  }
  if (elements.visionModelSelect?.options[0]) {
    elements.visionModelSelect.options[0].textContent = t('useChatModelForVision');
  }
}

function applyPreferenceSettings() {
  runtimeState.home.useScene = Boolean(runtimeState.settings.homeSceneEnabled);
  document.body.classList.toggle('compact-ui', Boolean(runtimeState.settings.compactUiEnabled));
  renderAvatarHome();
  renderAvatarConsole();
  renderBubbles();
  resizeComposerInput();
}

function renderSettingsMenu() {
  const isOpen = Boolean(runtimeState.ui.settingsMenuOpen);
  document.body.classList.toggle('settings-open', isOpen);
  elements.settingsMenuShell.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  elements.settingsBtn.setAttribute('aria-expanded', String(isOpen));
  syncSettingsMenuInputs();
  applyAudioSettings();
  applyLanguageToUi();
}

function setSettingsMenuOpen(open) {
  runtimeState.ui.settingsMenuOpen = Boolean(open);
  renderSettingsMenu();
  if (runtimeState.ui.settingsMenuOpen) {
    window.setTimeout(() => {
      elements.closeSettingsBtn.focus();
    }, 20);
  } else {
    elements.settingsBtn.focus();
  }
}

function migrateMaiStudioDefaults() {
  const currentBaseUrl = String(runtimeState.settings.baseUrl || '').trim();
  if (!currentBaseUrl) {
    runtimeState.settings.baseUrl = MAI_STUDIO_DEFAULT_BASE_URL;
    saveSettings();
  }

  if (runtimeState.settings.model === 'google/gemma-4-26b-a4b') {
    runtimeState.settings.model = MAI_STUDIO_DEFAULT_CHAT_MODEL;
    saveSettings();
  }

  if (runtimeState.settings.stabilityPatchVersion !== IMRKITTYY_STABILITY_PATCH_VERSION) {
    runtimeState.settings.homeSceneEnabled = false;
    runtimeState.settings.avatarPath = '';
    runtimeState.settings.stabilityPatchVersion = IMRKITTYY_STABILITY_PATCH_VERSION;
    saveSettings();
  }
}

function applyPanelState() {
  for (const card of elements.panelCards) {
    const panelKey = card.dataset.panel || '';
    const collapsed = Boolean(runtimeState.ui.panels?.[panelKey]);
    card.classList.toggle('collapsed', collapsed);
    const toggle = card.querySelector('[data-panel-toggle]');
    if (toggle) {
      toggle.textContent = collapsed ? t('show') : t('hide');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    }
  }
}

function renderAvatarConsole() {
  const currentAvatar = runtimeState.settings.avatarPath
    ? getFileName(runtimeState.settings.avatarPath)
    : t('noAvatarLoadedYet');
  const isOpen = Boolean(runtimeState.ui.avatarConsoleOpen);
  const autoHidden = Boolean(runtimeState.avatarConsoleFx.autoHidden && !isOpen && !isTransparentCompanionMode());
  const home = runtimeState.home?.useScene ? getActiveHomeEnvironment() : null;
  const actionCount = getLearnedActionCount();
  const actionWord = actionCount === 1 ? t('learnedAction') : t('learnedActions');
  const actionNote = actionCount
    ? t('learnedActionsReady', { count: actionCount, actionWord })
    : t('motionPatternsWake');
  const homeNote = !runtimeState.settings.homeSceneEnabled
    ? t('glassDesktopMode')
    : home && !isTransparentCompanionMode()
    ? t('homeReady', { name: home.label })
    : t('transparentCompanionView');
  elements.avatarConsole.classList.toggle('collapsed', !isOpen);
  elements.avatarConsole.classList.toggle('auto-hidden', autoHidden);
  elements.toggleAvatarConsoleBtn.textContent = isOpen ? t('hideFit') : t('fit');
  elements.toggleAvatarConsoleBtn.setAttribute('aria-expanded', String(isOpen));
  elements.avatarConsoleSummary.textContent = isOpen
    ? trimText(`Adjusting ${currentAvatar}. ${homeNote} ${actionNote}`, 104)
    : trimText(`${currentAvatar} · ${homeNote} ${actionNote}`, 104);
}

function clearAvatarConsoleHideTimer() {
  if (runtimeState.avatarConsoleFx.hideTimer) {
    clearTimeout(runtimeState.avatarConsoleFx.hideTimer);
    runtimeState.avatarConsoleFx.hideTimer = null;
  }
}

function scheduleAvatarConsoleAutoHide(delayMs = 2800) {
  clearAvatarConsoleHideTimer();
  runtimeState.avatarConsoleFx.autoHidden = false;
  renderAvatarConsole();

  if (!runtimeState.settings.avatarPath || isTransparentCompanionMode()) {
    return;
  }

  runtimeState.avatarConsoleFx.hideTimer = window.setTimeout(() => {
    runtimeState.avatarConsoleFx.hideTimer = null;
    if (runtimeState.ui.avatarConsoleOpen || !runtimeState.settings.avatarPath || isTransparentCompanionMode()) {
      return;
    }
    runtimeState.avatarConsoleFx.autoHidden = true;
    renderAvatarConsole();
  }, delayMs);
}

function isGameCamMode() {
  return Boolean(runtimeState.ui.gameCamMode);
}

function isPresenceMode() {
  return Boolean(runtimeState.ui.presenceMode);
}

function isTransparentCompanionMode() {
  return isGameCamMode() || isPresenceMode();
}

function getActiveHomeEnvironment() {
  const key = runtimeState.home?.activeKey || '';
  return HOME_ENVIRONMENTS[key] || null;
}

function renderAvatarHome() {
  if (isPresenceMode()) {
    elements.avatarStage.style.setProperty('--presence-backdrop', runtimeState.presenceBackdrop.imageDataUrl ? `url("${runtimeState.presenceBackdrop.imageDataUrl}")` : 'none');
  } else {
    elements.avatarStage.style.removeProperty('--presence-backdrop');
  }
  const home = isTransparentCompanionMode() ? null : getActiveHomeEnvironment();
  const sceneReady = Boolean(runtimeState.home?.sceneReady);
  const useSceneHome = Boolean(home && runtimeState.home?.useScene && sceneReady);
  const active = Boolean(home && runtimeState.home?.useScene && !useSceneHome);
  elements.avatarStage.classList.toggle('home-active', active);
  homeSceneGroup.visible = useSceneHome;
  renderHomeLighting();
  if (!elements.avatarHome) {
    return;
  }

  if (!active) {
    elements.avatarHome.style.setProperty('--home-image', 'none');
    elements.avatarHome.style.setProperty('--home-position', '50% 56%');
    elements.avatarHome.style.setProperty('--home-pan-x', '0px');
    elements.avatarHome.style.setProperty('--home-pan-y', '0px');
    return;
  }

  elements.avatarHome.style.setProperty('--home-image', home.backdropUrl ? `url("${home.backdropUrl}")` : 'none');
  elements.avatarHome.style.setProperty('--home-position', home.backdropPosition || '50% 56%');
}

function animateAvatarHome(now) {
  const home = isTransparentCompanionMode() ? null : getActiveHomeEnvironment();
  if (!home || !elements.avatarHome) {
    if (homeSceneGroup.visible) {
      homeSceneGroup.position.set(0, 0, 0);
    }
    return;
  }

  const idleWaveX = Math.sin(now * 0.22) * 1.6;
  const idleWaveY = Math.cos(now * 0.18) * 1.1;
  const panX = runtimeState.presence.pointerX * home.parallaxX + runtimeState.mannerisms.focusX * (home.parallaxX * 0.38) + idleWaveX;
  const panY = runtimeState.presence.pointerY * home.parallaxY + runtimeState.mannerisms.focusY * (home.parallaxY * 0.34) + idleWaveY;
  elements.avatarHome.style.setProperty('--home-pan-x', `${panX.toFixed(2)}px`);
  elements.avatarHome.style.setProperty('--home-pan-y', `${panY.toFixed(2)}px`);
  if (homeSceneGroup.visible) {
    homeSceneGroup.position.x = runtimeState.presence.pointerX * 0.018 + runtimeState.mannerisms.focusX * 0.014;
    homeSceneGroup.position.y = runtimeState.presence.pointerY * 0.012 + runtimeState.mannerisms.focusY * 0.01;
  }
}

function normalizeBubbleText(text = '', maxChars = 120) {
  return trimText(obfuscateThirdPartyNames(String(text || '').replace(/\s+/g, ' ').trim()), maxChars);
}

function showSpeechBubble(text, durationSeconds = 11) {
  if (!runtimeState.settings.bubblesEnabled) {
    return;
  }

  const line = normalizeBubbleText(text, 144);
  if (!line) {
    return;
  }

  runtimeState.bubbles.speechText = line;
  runtimeState.bubbles.speechUntil = performance.now() / 1000 + clamp(durationSeconds, 3.5, 20);
}

function getThoughtBubbleText() {
  if (!isTransparentCompanionMode()) {
    return '';
  }

  const typingProfile = getTypingAttentionProfile();
  if (runtimeState.loading) {
    return 'Thinking through this moment...';
  }
  if (runtimeState.screenBusy) {
    return 'Watching the screen closely...';
  }
  if (runtimeState.socialMai.busy) {
    return 'Checking an optional background task...';
  }
  if (runtimeState.musicBusy) {
    return runtimeState.currentTrack ? 'Choosing the next track...' : 'Listening for the right song...';
  }
  if (typingProfile.active && typingProfile.intensity >= 0.55) {
    return 'Listening and staying still...';
  }
  if (runtimeState.currentScene.family === 'game') {
    return runtimeState.screenInsight?.summary
      ? normalizeBubbleText(`Watching the game: ${runtimeState.screenInsight.summary}`, 88)
      : 'Watching the game with you.';
  }
  if (runtimeState.screenInsight?.summary && runtimeState.settings.autoWatch) {
    return normalizeBubbleText(`Following the room: ${runtimeState.screenInsight.summary}`, 88);
  }
  if (runtimeState.currentTrack) {
    return normalizeBubbleText(`Listening to ${runtimeState.currentTrack.title}.`, 72);
  }

  return getDriveDescriptor(getDominantDrive()).bubble;
}

function renderBubbles() {
  const showBubbles = isTransparentCompanionMode() && runtimeState.settings.bubblesEnabled;
  const now = performance.now() / 1000;
  const speechActive = showBubbles && runtimeState.bubbles.speechText && now < runtimeState.bubbles.speechUntil;
  const thoughtText = speechActive ? '' : getThoughtBubbleText();

  elements.speechBubble.textContent = speechActive ? runtimeState.bubbles.speechText : '';
  elements.speechBubble.classList.toggle('active', Boolean(speechActive));
  elements.speechBubble.setAttribute('aria-hidden', speechActive ? 'false' : 'true');

  elements.thoughtBubble.textContent = thoughtText;
  elements.thoughtBubble.classList.toggle('active', Boolean(thoughtText));
  elements.thoughtBubble.setAttribute('aria-hidden', thoughtText ? 'false' : 'true');
}

function clearLocalVoiceMotionTimer() {
  if (runtimeState.voice.motionTimer) {
    clearInterval(runtimeState.voice.motionTimer);
    runtimeState.voice.motionTimer = null;
  }
}

async function refreshLocalVoiceStatus(force = false) {
  if (runtimeState.voice.status.available && !force) {
    return runtimeState.voice.status;
  }

  try {
    const status = await window.desktopCompanion.getTtsStatus();
    runtimeState.voice.status = {
      available: Boolean(status?.available),
      engine: status?.engine || 'none',
      label: status?.label || ''
    };
  } catch {
    runtimeState.voice.status = {
      available: false,
      engine: 'none',
      label: ''
    };
  }

  return runtimeState.voice.status;
}

function cancelLocalVoice(options = {}) {
  if (!options.preserveToken) {
    runtimeState.voice.requestToken += 1;
  }

  clearLocalVoiceMotionTimer();
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
  try {
    runtimeState.voice.audio?.pause?.();
  } catch {}

  try {
    if (runtimeState.voice.audio) {
      runtimeState.voice.audio.currentTime = 0;
      runtimeState.voice.audio.removeAttribute('src');
      runtimeState.voice.audio.load?.();
      runtimeState.voice.audio.onplay = null;
      runtimeState.voice.audio.onended = null;
      runtimeState.voice.audio.onerror = null;
    }
  } catch {}

  runtimeState.voice.speaking = false;
  runtimeState.voice.lastLine = '';
  runtimeState.voice.utterance = null;
}

function normalizeVoiceLine(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\bMai Studio\b/gi, 'my studio')
    .replace(/\bMoltbook\b/gi, 'social feed')
    .replace(/[`*_#]/g, '')
    .trim();
}

function getSpeakableVoiceLine(text = '') {
  const normalized = normalizeVoiceLine(text);
  if (!normalized) {
    return '';
  }

  const maxLength = isTransparentCompanionMode() ? 900 : 700;
  return trimText(normalized, maxLength);
}

function beginLocalVoicePlayback(line, requestToken) {
  clearLocalVoiceMotionTimer();
  if (requestToken !== runtimeState.voice.requestToken) {
    return;
  }

  runtimeState.voice.speaking = true;
  runtimeState.voice.lastLine = line;
  runtimeState.voice.utterance = runtimeState.voice.audio?.src || line;
  startSpeaking(Math.max(1.8, line.length / 22));
  runtimeState.voice.motionTimer = window.setInterval(() => {
    if (requestToken !== runtimeState.voice.requestToken || !runtimeState.voice.speaking) {
      clearLocalVoiceMotionTimer();
      return;
    }

    startSpeaking(0.18);
  }, 135);
}

function finishLocalVoicePlayback(requestToken, line = '') {
  if (requestToken !== runtimeState.voice.requestToken) {
    return;
  }

  clearLocalVoiceMotionTimer();
  runtimeState.voice.speaking = false;
  runtimeState.voice.lastLine = line;
  runtimeState.voice.utterance = null;
}

async function speakWithLocalVoice(text = '') {
  const line = getSpeakableVoiceLine(text);
  if (
    !line ||
    !runtimeState.settings.localVoiceEnabled ||
    runtimeState.systemSense.locked
  ) {
    return;
  }

  try {
    cancelLocalVoice({ preserveToken: true });
    const requestToken = runtimeState.voice.requestToken + 1;
    runtimeState.voice.requestToken = requestToken;
    if (isSpanishLanguage() && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(line);
      const prefix = getSpeechSynthesisPrefix();
      const voices = window.speechSynthesis.getVoices?.() || [];
      const matchingVoice = voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith(prefix));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      utterance.lang = getSpeechRecognitionLocale();
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => beginLocalVoicePlayback(line, requestToken);
      utterance.onend = () => finishLocalVoicePlayback(requestToken, line);
      utterance.onerror = () => finishLocalVoicePlayback(requestToken, line);
      runtimeState.voice.utterance = utterance;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return;
    }
    const voiceStatus = await refreshLocalVoiceStatus();
    if (!voiceStatus.available) {
      finishLocalVoicePlayback(requestToken, line);
      setAvatarStatusTransient(t('localVoiceMissing'));
      return;
    }

    const result = await window.desktopCompanion.speakTts({ text: line });
    if (!result?.audioUrl || requestToken !== runtimeState.voice.requestToken) {
      return;
    }

    const audio = runtimeState.voice.audio || new Audio();
    runtimeState.voice.audio = audio;
    audio.preload = 'auto';
    audio.volume = 0.96;
    audio.muted = false;
    audio.src = result.audioUrl;
    audio.onplay = () => beginLocalVoicePlayback(line, requestToken);
    audio.onended = () => finishLocalVoicePlayback(requestToken, line);
    audio.onerror = () => finishLocalVoicePlayback(requestToken, line);

    const playPromise = audio.play();
    if (playPromise?.catch) {
      await playPromise;
    }
    if (!runtimeState.voice.speaking) {
      beginLocalVoicePlayback(line, requestToken);
    }
  } catch (error) {
    finishLocalVoicePlayback(runtimeState.voice.requestToken, line);
    setAvatarStatusTransient(t('voicePlaybackFailed', { message: getErrorMessage(error) }));
  }
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function renderVoiceCommandState() {
  const supported = Boolean(getSpeechRecognitionCtor());
  const desktopFallback = Boolean(window.desktopCompanion?.runLocalTool);
  const disabled = runtimeState.loading || (!supported && !desktopFallback);
  const label = runtimeState.voice.listening ? t('listening') : t('voice');
  elements.listenBtn.disabled = disabled;
  elements.modeVoiceBtn.disabled = disabled;
  elements.listenBtn.textContent = label;
  elements.modeVoiceBtn.textContent = label;
  elements.listenBtn.classList.toggle('active', runtimeState.voice.listening);
  elements.modeVoiceBtn.classList.toggle('active', runtimeState.voice.listening);
  if (!supported) {
    const title = desktopFallback
      ? t('voiceFallbackTitle')
      : t('voiceUnavailableTitle');
    elements.listenBtn.title = title;
    elements.modeVoiceBtn.title = title;
  } else {
    elements.listenBtn.title = t('voiceInputTitle');
    elements.modeVoiceBtn.title = t('voiceInputTitle');
  }
}

function stopVoiceCommandListening() {
  try {
    runtimeState.voice.recognition?.stop?.();
  } catch {}
  runtimeState.voice.listening = false;
  renderVoiceCommandState();
  renderConversationState();
}

function startVoiceCommandListening() {
  const Recognition = getSpeechRecognitionCtor();
  if (!Recognition && window.desktopCompanion?.runLocalTool && !runtimeState.loading) {
    runtimeState.voice.listening = true;
    markListening(8);
    renderVoiceCommandState();
    renderConversationState();
    window.desktopCompanion.runLocalTool('voice:dictate', { seconds: 8, lang: getSpeechRecognitionLocale() })
      .then((result) => {
        const transcript = String(result?.text || '').trim();
        if (transcript) {
          elements.messageInput.value = transcript;
          updateTypingState();
          elements.chatForm.requestSubmit();
        } else {
          setAvatarStatusTransient(t('voiceCommandMissed'));
        }
      })
      .catch((error) => {
        setAvatarStatusTransient(t('voiceCommandFailed', { message: getErrorMessage(error) }));
      })
      .finally(() => {
        runtimeState.voice.listening = false;
        renderVoiceCommandState();
        renderConversationState();
      });
    return;
  }

  if (!Recognition || runtimeState.loading) {
    renderVoiceCommandState();
    return;
  }

  if (runtimeState.voice.listening) {
    stopVoiceCommandListening();
    return;
  }

  const recognition = new Recognition();
  runtimeState.voice.recognition = recognition;
  recognition.lang = getSpeechRecognitionLocale();
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    runtimeState.voice.listening = true;
    markListening(7);
    renderVoiceCommandState();
    renderConversationState();
  };
  recognition.onend = () => {
    runtimeState.voice.listening = false;
    renderVoiceCommandState();
    renderConversationState();
  };
  recognition.onerror = () => {
    runtimeState.voice.listening = false;
    setAvatarStatusTransient(t('voiceStopped'));
    renderVoiceCommandState();
    renderConversationState();
  };
  recognition.onresult = (event) => {
    const transcript = String(event.results?.[0]?.[0]?.transcript || '').trim();
    if (!transcript) {
      return;
    }
    elements.messageInput.value = transcript;
    updateTypingState();
    elements.chatForm.requestSubmit();
  };

  try {
    recognition.start();
  } catch {
    runtimeState.voice.listening = false;
    renderVoiceCommandState();
  }
}

function applyDisplayMode() {
  const gameCam = isGameCamMode();
  const presence = isPresenceMode();
  document.body.classList.toggle('game-cam-mode', gameCam);
  document.body.classList.toggle('presence-mode', presence);
  elements.gameCamBtn.textContent = gameCam ? t('deskView') : t('gameCam');
  elements.gameCamBtn.setAttribute('aria-pressed', String(gameCam));
  elements.presenceBtn.textContent = presence ? t('deskView') : t('presenceMode');
  elements.presenceBtn.setAttribute('aria-pressed', String(presence));
  if (isTransparentCompanionMode()) {
    clearAvatarConsoleHideTimer();
    runtimeState.avatarConsoleFx.autoHidden = false;
  } else if (runtimeState.settings.avatarPath && !runtimeState.ui.avatarConsoleOpen) {
    scheduleAvatarConsoleAutoHide(1800);
  }
  renderAvatarHome();
  renderAvatarConsole();
  renderBubbles();
}

async function syncGameCamMode(enabled) {
  const desired = Boolean(enabled);
  try {
    const result = await window.desktopCompanion.setGameCamMode(desired);
    runtimeState.ui.gameCamMode = Boolean(result?.enabled);
    if (runtimeState.ui.gameCamMode) {
      runtimeState.ui.presenceMode = false;
    }
  } catch {
    runtimeState.ui.gameCamMode = false;
  }

  saveUiState();
  clearAvatarPointer();
  applyDisplayMode();
  markListening(runtimeState.ui.gameCamMode ? 3.4 : 2.2);
  markPerk(runtimeState.ui.gameCamMode ? 3.2 : 2);
  window.setTimeout(() => {
    resizeRenderer();
    if (currentVrm) {
      fitAvatarToStage(currentVrm);
    }
    renderBubbles();
  }, 90);
}

function toggleGameCamMode() {
  return syncGameCamMode(!isGameCamMode());
}

async function syncPresenceMode(enabled) {
  const desired = Boolean(enabled);
  try {
    const result = await window.desktopCompanion.setPresenceMode(desired);
    runtimeState.ui.presenceMode = Boolean(result?.enabled);
    if (runtimeState.ui.presenceMode) {
      runtimeState.ui.gameCamMode = false;
    }
  } catch {
    runtimeState.ui.presenceMode = false;
  }

  saveUiState();
  clearAvatarPointer();
  applyDisplayMode();
  if (runtimeState.ui.presenceMode) {
    runtimeState.presenceBackdrop.imageDataUrl = '';
    clearPresenceBackdropRefreshTimer();
  } else {
    runtimeState.presenceBackdrop.imageDataUrl = '';
    clearPresenceBackdropRefreshTimer();
  }
  markListening(runtimeState.ui.presenceMode ? 2.8 : 2.2);
  markPerk(runtimeState.ui.presenceMode ? 2.6 : 2);
  window.setTimeout(() => {
    resizeRenderer();
    if (currentVrm) {
      fitAvatarToStage(currentVrm);
    }
    renderBubbles();
  }, 90);
}

function togglePresenceMode() {
  return syncPresenceMode(!isPresenceMode());
}

function toggleAvatarConsole() {
  runtimeState.ui.avatarConsoleOpen = !runtimeState.ui.avatarConsoleOpen;
  runtimeState.avatarConsoleFx.autoHidden = false;
  clearAvatarConsoleHideTimer();
  saveUiState();
  renderAvatarConsole();
  if (!runtimeState.ui.avatarConsoleOpen && runtimeState.settings.avatarPath) {
    scheduleAvatarConsoleAutoHide(2200);
  }
}

function togglePanelState(panelKey) {
  if (!panelKey) {
    return;
  }

  runtimeState.ui.panels = {
    ...(runtimeState.ui.panels || {}),
    [panelKey]: !runtimeState.ui.panels?.[panelKey]
  };
  saveUiState();
  applyPanelState();
}

function migrateAvatarFitDefaults() {
  if (runtimeState.settings.avatarZoomPct === '100' && runtimeState.settings.avatarLiftPct === '0') {
    runtimeState.settings.avatarZoomPct = '98';
    runtimeState.settings.avatarLiftPct = '-8';
    saveSettings();
    return;
  }

  if (runtimeState.settings.avatarZoomPct === '114' && runtimeState.settings.avatarLiftPct === '3') {
    runtimeState.settings.avatarZoomPct = '100';
    runtimeState.settings.avatarLiftPct = '-8';
    saveSettings();
  }
}

function getConfig() {
  runtimeState.settings.baseUrl = elements.baseUrlInput.value.trim() || defaultSettings.baseUrl;
  runtimeState.settings.model = elements.modelSelect.value;
  runtimeState.settings.visionModel = elements.visionModelSelect.value;
  runtimeState.settings.temperature = elements.temperatureInput.value || defaultSettings.temperature;
  runtimeState.settings.watchIntervalSec = elements.watchIntervalInput.value || defaultSettings.watchIntervalSec;
  runtimeState.settings.avatarZoomPct = elements.avatarZoomInput.value || defaultSettings.avatarZoomPct;
  runtimeState.settings.avatarLiftPct = elements.avatarLiftInput.value || defaultSettings.avatarLiftPct;
  saveSettings();
  return {
    baseUrl: runtimeState.settings.baseUrl,
    model: runtimeState.settings.model,
    visionModel: runtimeState.settings.visionModel,
    temperature: runtimeState.settings.temperature
  };
}

function setStatus(node, text, isError = false) {
  if (isError && isTransientBackgroundNoiseMessage(text)) {
    node.textContent = t('ready');
    node.title = 'A background request was paused so the app could answer something more important.';
    node.style.color = 'var(--muted)';
    return;
  }

  const visibleText = trimText(text, isError ? 220 : 260);
  node.textContent = visibleText;
  node.title = visibleText;
  node.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function getErrorMessage(error) {
  return trimText(String(error?.message || error || 'Something went wrong.')
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/\blm studio\b/gi, MAI_STUDIO_NAME), 240);
}

async function invokeStudioChat(config, messages, options) {
  const response = await window.desktopCompanion.chat(config, messages, options);
  if (response?.error) {
    throw new Error(response.error);
  }
  return response;
}

function isTransientBackgroundNoiseMessage(message = '') {
  const normalized = getErrorMessage(message).toLowerCase();
  return (
    normalized.includes('mai studio request timed out') ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('paused a background action') ||
    normalized.includes('skipped an older background action') ||
    normalized.includes('request preempted') ||
    normalized.includes('request superseded')
  );
}

function obfuscateThirdPartyNames(text = '') {
  return String(text || '').replace(/\blm studio\b/gi, MAI_STUDIO_NAME);
}

function normalizeMessagePayload(value) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return {
      text: String(value.text || ''),
      media: value.media && value.media.url ? value.media : null
    };
  }

  return {
    text: String(value || ''),
    media: null
  };
}

function getRenderableMediaSrc(media = null) {
  if (!media) {
    return '';
  }

  const candidate = String(media.displayUrl || media.previewUrl || media.url || '').trim();
  if (/^(?:data:|blob:|file:)/i.test(candidate)) {
    return candidate;
  }

  return '';
}

function appendMessage(role, value) {
  const payload = normalizeMessagePayload(value);
  const node = document.createElement('article');
  node.className = `message ${role}`;

  if (role === 'system' && isTransientBackgroundNoiseMessage(payload.text)) {
    return node;
  }

  if (payload.text) {
    const copy = document.createElement('p');
    copy.className = 'message-copy';
    copy.textContent = role === 'system' ? trimText(payload.text, 320) : payload.text;
    node.appendChild(copy);
  }

  if (payload.media?.url) {
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'message-media';
    const renderableSrc = getRenderableMediaSrc(payload.media);

    if (renderableSrc) {
      const image = document.createElement('img');
      image.src = renderableSrc;
      image.alt = payload.media.title || 'Shared reaction media';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      mediaWrap.appendChild(image);
    }

    const meta = document.createElement('div');
    meta.className = 'message-media-meta';
    meta.textContent = [
      payload.media.title ? trimText(payload.media.title, 72) : '',
      payload.media.attribution || ''
    ].filter(Boolean).join(' · ');
    if (meta.textContent) {
      mediaWrap.appendChild(meta);
    }

    node.appendChild(mediaWrap);
  }

  elements.messages.appendChild(node);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  renderConversationState();
  return node;
}

function renderOverviewBar() {
  const selectedModel = getSelectedChatModelId() || runtimeState.modelProfiles[0]?.id || '';
  const sceneDescriptor = getSceneFamilyDescriptor(runtimeState.currentScene.family);
  const roomLabel = runtimeState.currentScene.key
    ? trimText(
        `${runtimeState.currentScene.family && runtimeState.currentScene.family !== 'general'
          ? sceneDescriptor.status
          : runtimeState.currentScene.label || t('thisRoom')} · ${getSceneResidencyDescriptor().sidecarState}`,
        86
      )
    : t('noSceneLearned');
  const musicLabel = runtimeState.currentTrack
    ? trimText(`${runtimeState.currentTrack.artist || t('unknownArtist')} - ${runtimeState.currentTrack.title}`, 86)
    : runtimeState.library.length
      ? `${runtimeState.library.length} ${runtimeState.library.length === 1 ? t('track') : t('tracks')} ${t('readyWord')}${runtimeState.settings.autoDj ? ` · ${t('autoDjOn').toLowerCase()}` : ''}`
      : t('noLibraryReady');
  let socialLabel = t('standaloneBuildPeriod');

  if (SOCIAL_SIDECAR_ENABLED) {
    socialLabel = t('sidecarAsleep');
    if (!runtimeState.socialMai.hasKey) {
      socialLabel = t('noSocialKey');
    } else if (runtimeState.socialMai.busy) {
      socialLabel = t('socialSidecarBusy');
    } else if (runtimeState.socialMai.enabled && runtimeState.socialMai.digest) {
      socialLabel = trimText(runtimeState.socialMai.digest, 86);
    } else if (runtimeState.socialMai.enabled) {
      socialLabel = t('sidecarAwake');
    }
  }

  elements.overviewModel.textContent = selectedModel
    ? trimText(getVisibleModelLabel(selectedModel, 'chat'), 86)
    : t('waitingForStudio', { studio: MAI_STUDIO_NAME });
  elements.overviewRoom.textContent = roomLabel;
  elements.overviewMusic.textContent = musicLabel;
  elements.overviewSocial.textContent = socialLabel;
}

function renderPanelSummaries() {
  const selectedModel = getSelectedChatModelId() || runtimeState.modelProfiles[0]?.id || '';
  const selectedVision = getSelectedVisionModelId() || '';
  const loadedModelWord = runtimeState.modelProfiles.length === 1 ? t('loadedLocalModel') : t('loadedLocalModelsPlural');
  elements.modelsSummary.textContent = runtimeState.modelProfiles.length
    ? trimText(
        `${selectedModel ? getVisibleModelLabel(selectedModel, 'chat') : t('autoSelect')} ${t('chatLabel')}${selectedVision ? ` · ${getVisibleModelLabel(selectedVision, 'vision')} ${t('visionLabel')}` : ` · ${t('visionFollowsChat')}`} · ${t('loadedLocalModels', { count: runtimeState.modelProfiles.length, modelWord: loadedModelWord })}`,
        180
      )
    : t('modelSummaryEmpty', { studio: MAI_STUDIO_NAME });

  elements.screenSummaryLine.textContent = runtimeState.screenInsight
    ? trimText(
        `${runtimeState.settings.autoWatch ? t('watchingEvery', { seconds: runtimeState.settings.watchIntervalSec || 45 }) : t('manualScreenChecks')} · ${runtimeState.screenInsight.summary}`,
        180
      )
    : `${runtimeState.settings.autoWatch ? t('watchingEvery', { seconds: runtimeState.settings.watchIntervalSec || 45 }) : t('captureSceneHint', { name: ASSISTANT_NAME })}`;

  elements.musicSummaryLine.textContent = runtimeState.currentTrack
    ? trimText(
        `${runtimeState.settings.autoDj ? t('autoDjOn') : t('manualPicks')} · ${describeTrack(runtimeState.currentTrack)}${runtimeState.currentTrackReason ? ` · ${runtimeState.currentTrackReason}` : ''}`,
        180
      )
    : runtimeState.library.length
      ? `${runtimeState.library.length} ${runtimeState.library.length === 1 ? t('track') : t('tracks')} ${t('readyWord')}${runtimeState.settings.autoDj ? ` · ${t('autoDjOn').toLowerCase()}` : ''}.`
      : t('chooseFolderTaste', { name: ASSISTANT_NAME });
}

function resizeComposerInput(reset = false) {
  const textarea = elements.messageInput;
  textarea.style.height = 'auto';
  const minHeight = window.innerHeight < 820 ? 64 : 84;
  const maxHeight = window.innerHeight < 820 ? 140 : 180;
  const nextHeight = reset && !textarea.value.trim()
    ? minHeight
    : Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
  textarea.style.height = `${nextHeight}px`;
}

function renderConversationState() {
  const typingProfile = getTypingAttentionProfile();
  if (runtimeState.loading) {
    elements.composerHint.textContent = t('composerHintThinking', { name: ASSISTANT_NAME });
  } else if (typingProfile.active && typingProfile.intensity >= 0.72) {
    elements.composerHint.textContent = t('composerHintHoldStill', { name: ASSISTANT_NAME });
  } else if (typingProfile.active) {
    elements.composerHint.textContent = t('composerHintFollowing', { name: ASSISTANT_NAME });
  } else {
    elements.composerHint.textContent = t('composerHintDefault');
  }

  elements.sendBtn.textContent = runtimeState.loading ? t('thinking') : t('send');
  renderVoiceCommandState();
  renderBubbles();
}

function handleComposerKeydown(event) {
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    event.preventDefault();
    elements.chatForm.requestSubmit();
  }
}

function renderQuickActions() {
  elements.quickScreenBtn.disabled = runtimeState.screenBusy;
  elements.quickScreenBtn.textContent = runtimeState.screenBusy ? t('readingScreen') : t('quickSeeScreen');
  elements.quickScreenBtn.classList.toggle('active', Boolean(runtimeState.screenInsight));

  elements.quickWatchBtn.textContent = runtimeState.settings.autoWatch ? t('quickAutoWatchOn') : t('quickAutoWatchOff');
  elements.quickWatchBtn.classList.toggle('active', runtimeState.settings.autoWatch);

  if (runtimeState.musicBusy) {
    elements.quickMusicBtn.textContent = t('quickMusicBusy');
    elements.quickMusicBtn.disabled = true;
  } else if (runtimeState.currentTrack || runtimeState.library.length) {
    elements.quickMusicBtn.textContent = runtimeState.currentTrack ? t('nextSong') : t('startMusic');
    elements.quickMusicBtn.disabled = false;
  } else if (runtimeState.settings.musicFolder) {
    elements.quickMusicBtn.textContent = t('quickScanMusic');
    elements.quickMusicBtn.disabled = false;
  } else {
    elements.quickMusicBtn.textContent = t('quickChooseMusic');
    elements.quickMusicBtn.disabled = false;
  }
  elements.quickMusicBtn.classList.toggle('active', Boolean(runtimeState.currentTrack));

  if (!SOCIAL_SIDECAR_ENABLED) {
    elements.quickSocialBtn.hidden = true;
    elements.quickSocialBtn.disabled = true;
    elements.quickSocialBtn.classList.remove('active');
  } else if (!runtimeState.socialMai.hasKey) {
    elements.quickSocialBtn.hidden = false;
    elements.quickSocialBtn.textContent = t('quickSocialNeedsKey');
    elements.quickSocialBtn.disabled = true;
    elements.quickSocialBtn.classList.remove('active');
  } else if (runtimeState.socialMai.busy) {
    elements.quickSocialBtn.hidden = false;
    elements.quickSocialBtn.textContent = t('quickSocialBusy');
    elements.quickSocialBtn.disabled = true;
    elements.quickSocialBtn.classList.add('active');
  } else {
    elements.quickSocialBtn.hidden = false;
    elements.quickSocialBtn.textContent = runtimeState.socialMai.enabled ? t('quickCheckSocial') : t('quickWakeSocial');
    elements.quickSocialBtn.disabled = false;
    elements.quickSocialBtn.classList.toggle('active', runtimeState.socialMai.enabled);
  }
  renderBubbles();
}

function sendSuggestedMessage(text) {
  if (runtimeState.loading || !text) {
    return;
  }

  elements.messageInput.value = text;
  resizeComposerInput();
  updateTypingState();
  elements.messageInput.focus();
  elements.chatForm.requestSubmit();
}

async function handleQuickMusicAction() {
  if (runtimeState.musicBusy) {
    return;
  }

  if (runtimeState.currentTrack || runtimeState.library.length) {
    await playNextTrack('manual');
    return;
  }

  if (!runtimeState.settings.musicFolder) {
    await chooseMusicFolder();
  }

  if (runtimeState.settings.musicFolder) {
    await scanLibrary(true);
  }
}

async function handleQuickSocialAction() {
  if (!SOCIAL_SIDECAR_ENABLED) {
    postAssistantLine('This client build does not use the social sidecar.', true);
    return;
  }

  if (runtimeState.socialMai.busy || !runtimeState.socialMai.hasKey) {
    return;
  }

  if (!runtimeState.socialMai.enabled) {
    const status = await window.desktopCompanion.setSocialMaiEnabled(true);
    mergeSocialStatus(status);
    await window.desktopCompanion.runSocialMaiNow('manual-start');
    return;
  }

  const pending = appendMessage('system', 'Mai\'s social sidecar is checking Moltbook...');
  try {
    await window.desktopCompanion.runSocialMaiNow('manual-browse');
  } finally {
    pending.remove();
  }
}

function shouldAttemptContextMedia(triggerType = '', feeling = runtimeState.feelingState.label || '') {
  const scene = runtimeState.currentScene.family || 'general';
  const feelingText = String(feeling || '').toLowerCase();
  const trigger = String(triggerType || '').toLowerCase();

  if (!['screen', 'music', 'social', 'scene-transition', 'settle'].includes(trigger)) {
    return false;
  }

  if (scene === 'code' || scene === 'terminal' || scene === 'writing') {
    return /happy|curious|playful|social/i.test(feelingText) && Math.random() < 0.12;
  }

  if (scene === 'music' || scene === 'game' || scene === 'social') {
    return Math.random() < 0.26;
  }

  return Math.random() < 0.18;
}

async function maybeShareContextMedia(triggerType = '', assistantText = '') {
  const now = performance.now() / 1000;
  if (
    runtimeState.media.busy ||
    runtimeState.loading ||
    now < runtimeState.media.nextShareAt ||
    !getSelectedChatModelId() ||
    !runtimeState.settings.contextMediaEnabled ||
    !shouldAttemptContextMedia(triggerType)
  ) {
    return false;
  }

  runtimeState.media.busy = true;
  try {
    const result = await window.desktopCompanion.pickContextMedia(getConfig(), {
      triggerType,
      screenInsight: runtimeState.screenInsight
        ? {
            summary: runtimeState.screenInsight.summary,
            mood: runtimeState.screenInsight.mood,
            activeWindowTitle: runtimeState.screenInsight.activeWindowTitle
          }
        : null,
      currentTrack: runtimeState.currentTrack
        ? {
            title: runtimeState.currentTrack.title,
            artist: runtimeState.currentTrack.artist,
            album: runtimeState.currentTrack.album
          }
        : null,
      currentTrackReason: runtimeState.currentTrackReason,
      feelingLabel: runtimeState.feelingState.label,
      sceneFamily: runtimeState.currentScene.family,
      sceneLabel: runtimeState.currentScene.label,
      settleState: runtimeState.residency.stageId,
      socialDigest: runtimeState.socialMai.digest || '',
      recentUserMessages: runtimeState.chatHistory
        .filter((entry) => entry.role === 'user')
        .slice(-3)
        .map((entry) => entry.content),
      recentAssistantMessages: pushUniqueText(
        runtimeState.chatHistory
          .filter((entry) => entry.role === 'assistant')
          .slice(-2)
          .map((entry) => entry.content),
        assistantText,
        3
      )
    });

    if (!result?.media?.url || result.media.url === runtimeState.media.lastSharedUrl) {
      runtimeState.media.nextShareAt = now + 240;
      return false;
    }

    const caption = trimText(result.caption || 'this one fits the moment.', 90);
    runtimeState.media.lastSharedUrl = result.media.url;
    runtimeState.media.nextShareAt = now + clamp(Number(result.cooldownSeconds) || 720, 240, 2400);
    postAssistantLine({
      text: caption,
      media: result.media
    }, true, {
      skipMemory: true
    });

    rememberCompanionEvent({
      kind: 'media_share',
      source: 'context-media',
      summary: trimText(`${caption} ${result.media.title || ''}`.trim(), 180),
      text: trimText(`${caption} ${result.media.url}`.trim(), 260),
      mood: runtimeState.feelingState.label,
      tags: ['media', result.media.providerId || '', result.media.kind || '', runtimeState.currentScene.family || 'general'],
      metadata: buildMemoryMetadata({
        mediaProvider: result.media.provider || '',
        mediaKind: result.media.kind || '',
        mediaTitle: result.media.title || '',
        mediaUrl: result.media.url || ''
      })
    }).catch(() => {});

    return true;
  } catch {
    runtimeState.media.nextShareAt = now + 300;
    return false;
  } finally {
    runtimeState.media.busy = false;
  }
}

function postAssistantLine(text, remember = true, options = {}) {
  const payload = normalizeMessagePayload(text);
  const spokenText = String(payload.text || '').trim();
  appendMessage('assistant', payload);
  if (remember && spokenText) {
    runtimeState.chatHistory.push({ role: 'assistant', content: spokenText });
  }
  noteInteraction({
    affection: 0.02,
    sociability: 0.02
  });
  const feeling = analyzeCompanionFeeling(spokenText);
  setFeelingState(feeling);
  if (spokenText) {
    markPerk(feeling.preset === 'happy' || feeling.preset === 'wave' ? 3.4 : 2.4);
    startSpeaking(Math.min(5, Math.max(1.6, spokenText.length / 34)));
    showSpeechBubble(spokenText, isTransparentCompanionMode() ? 18 : 9);
    speakWithLocalVoice(spokenText);
  }
  if (spokenText && feeling.preset !== 'idle') {
    triggerPreset(feeling.preset, feeling.durationSeconds);
  }
  if (spokenText) {
    updateSocialMaiContext({
      assistantMessage: spokenText,
      feelingLabel: feeling.label
    }).catch(() => {});
    if (!options.skipMemory) {
      rememberCompanionEvent({
        kind: 'assistant_message',
        summary: trimText(spokenText, 180),
        text: spokenText,
        mood: feeling.label,
        tags: ['assistant', feeling.label, runtimeState.currentScene.key ? 'scene' : '', runtimeState.currentScene.family || ''],
        metadata: buildMemoryMetadata({
          feelingLabel: feeling.label,
          currentTrack: runtimeState.currentTrack ? describeTrack(runtimeState.currentTrack) : '',
          socialDigest: runtimeState.socialMai.digest || ''
        })
      }).catch(() => {});
    }
  }

  if (spokenText && options.allowContextMedia) {
    maybeShareContextMedia(options.triggerType || 'settle', spokenText).catch(() => {});
  }

  if (remember && spokenText) {
    scheduleSessionCompressRefresh();
  }
}

function renderGreeting() {
  const phase = getTimePhase();
  const opening = phase === 'morning'
    ? t('greetingMorning', { name: ASSISTANT_NAME })
    : phase === 'day'
      ? t('greetingDay', { name: ASSISTANT_NAME })
      : phase === 'evening'
        ? t('greetingEvening', { name: ASSISTANT_NAME })
        : t('greetingNight', { name: ASSISTANT_NAME });
  appendMessage('system', `${opening} ${t('greetingFollowup', { studio: MAI_STUDIO_NAME })}`);
}

function getFallbackModelProfile(modelId = '') {
  return {
    id: modelId,
    family: 'generic',
    adapterTier: 'lean',
    supportsVision: /vl|vision|gemma-4|qwen3\.?5|glm-4\.6v/.test(String(modelId || '').toLowerCase()),
    supportsToolUse: false,
    supportsReasoning: /reason|gemma-4|qwen3/.test(String(modelId || '').toLowerCase()),
    preferredHistoryTurns: 4,
    preferredMemoryChars: 420,
    preferredDjCandidates: 4,
    notes: 'Lean fallback'
  };
}

function cacheModelProfile(profile) {
  if (!profile?.id) {
    return;
  }

  const existingIndex = runtimeState.modelProfiles.findIndex((entry) => entry.id === profile.id);
  const nextEntry = {
    id: profile.id,
    object: 'model',
    profile
  };

  if (existingIndex === -1) {
    runtimeState.modelProfiles.push(nextEntry);
    return;
  }

  runtimeState.modelProfiles.splice(existingIndex, 1, {
    ...runtimeState.modelProfiles[existingIndex],
    ...nextEntry
  });
}

function getKnownModelProfile(modelId = '') {
  if (!modelId) {
    return getFallbackModelProfile('');
  }

  return runtimeState.modelProfiles.find((entry) => entry.id === modelId)?.profile || getFallbackModelProfile(modelId);
}

function getSelectedChatModelId() {
  return elements.modelSelect.value || runtimeState.settings.model || runtimeState.modelProfiles[0]?.id || '';
}

function getSelectedVisionModelId() {
  return elements.visionModelSelect.value || runtimeState.settings.visionModel || getSelectedChatModelId();
}

function getLearnedActionCount() {
  return runtimeState.animationLibrary.reduce(
    (total, library) => total + ((library?.files?.length) || 0),
    0
  );
}

function extractApproxModelSize(modelId = '') {
  const matches = [...String(modelId || '').toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*(b|m)\b/g)];
  if (!matches.length) {
    return 0;
  }

  return matches.reduce((largest, match) => {
    const value = Number.parseFloat(match[1] || '0');
    const normalized = match[2] === 'm' ? value / 1000 : value;
    return Number.isFinite(normalized) ? Math.max(largest, normalized) : largest;
  }, 0);
}

function getModelAliasDescriptor(modelId = '', profile = {}, mode = 'chat') {
  const lower = String(modelId || '').toLowerCase();
  const size = extractApproxModelSize(lower);
  const hasVisionHints = Boolean(profile.supportsVision || /vl|vision|image|olmocr|ocr|doc/.test(lower));
  const hasReasoningHints = Boolean(profile.supportsReasoning || /reason|think|coder|code|agent|a3b|a4b|moe/.test(lower));
  const isHighEndMoe = /gemma-4-26b-a4b|gemma-4-31b|omni|moe/.test(lower);
  const isEfficientGemma = /gemma-4-e[24]b/.test(lower);
  const isDocumentVision = /olmocr|ocr|document|doc-parser|doc/.test(lower);
  const isFlashFamily = /\bflash\b/.test(lower);
  const isTinyFamily = /\btiny\b|\bnano\b|\bmini\b|500m|135m/.test(lower);

  if (mode === 'vision') {
    if (isDocumentVision) {
      return MODEL_ALIAS_CATALOG.iris11;
    }

    if (lower.includes('google/gemma-4-26b-a4b') || lower.includes('google/gemma-4-31b')) {
      return MODEL_ALIAS_CATALOG.vision34;
    }

    if (hasVisionHints) {
      if (isHighEndMoe || size >= 20 || hasReasoningHints || profile.adapterTier === 'flagship' || profile.adapterTier === 'strong') {
        return MODEL_ALIAS_CATALOG.vision34;
      }
      return MODEL_ALIAS_CATALOG.vision8;
    }
  }

  if (isDocumentVision) {
    return MODEL_ALIAS_CATALOG.iris11;
  }

  if (/500m|135m/.test(lower)) {
    return MODEL_ALIAS_CATALOG.nano05;
  }

  if (isFlashFamily && size < 12) {
    return MODEL_ALIAS_CATALOG.flash3;
  }

  if (isTinyFamily) {
    return MODEL_ALIAS_CATALOG.spark15;
  }

  if (size >= 100) {
    return MODEL_ALIAS_CATALOG.omni400;
  }

  if (size >= 60) {
    return MODEL_ALIAS_CATALOG.titan72;
  }

  if (size >= 40) {
    return MODEL_ALIAS_CATALOG.apex120;
  }

  if (isEfficientGemma) {
    return MODEL_ALIAS_CATALOG.flash3;
  }

  if (lower.includes('google/gemma-4-26b-a4b') || lower.includes('google/gemma-4-31b')) {
    return MODEL_ALIAS_CATALOG.logic32;
  }

  if (isHighEndMoe || size >= 20 || hasReasoningHints) {
    return MODEL_ALIAS_CATALOG.logic32;
  }

  if (profile.adapterTier === 'flagship' || profile.adapterTier === 'strong' || size >= 11) {
    return MODEL_ALIAS_CATALOG.core14;
  }

  if (size >= 5) {
    return MODEL_ALIAS_CATALOG.core7;
  }

  if (size >= 2.5) {
    return MODEL_ALIAS_CATALOG.flash3;
  }

  if (size >= 0.75) {
    return MODEL_ALIAS_CATALOG.spark15;
  }

  return MODEL_ALIAS_CATALOG.nano05;
}

function getVisibleModelLabel(modelId = '', mode = 'chat') {
  if (!modelId) {
    return '';
  }
  const profile = getKnownModelProfile(modelId);
  return getModelAliasDescriptor(modelId, profile, mode).label;
}

function describeModelProfile(profile = {}, modelId = '', mode = 'chat') {
  const parts = [];
  const alias = getModelAliasDescriptor(modelId, profile, mode);

  parts.push(`${alias.familyLabel} lane`);

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

function summarizeTargetFamilies(models = []) {
  return [...new Set(
    models
      .map((entry) => getModelAliasDescriptor(entry?.id || '', entry?.profile || getKnownModelProfile(entry?.id || ''), 'chat').familyLabel)
      .filter(Boolean)
  )];
}

function fillSelect(select, models, emptyLabel, chosenValue, mode = 'chat') {
  const entries = models.map((model) => (typeof model === 'string'
    ? { id: model, profile: getKnownModelProfile(model) }
    : model));
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = emptyLabel;
  select.appendChild(empty);

  const seenIds = new Set();
  const seenLabels = new Map();
  for (const entry of entries) {
    const modelId = entry?.id || '';
    if (!modelId || seenIds.has(modelId)) {
      continue;
    }
    seenIds.add(modelId);

    const option = document.createElement('option');
    option.value = modelId;
    const profile = entry?.profile || getKnownModelProfile(modelId);
    const baseLabel = getVisibleModelLabel(modelId, mode);
    const labelCount = (seenLabels.get(baseLabel) || 0) + 1;
    seenLabels.set(baseLabel, labelCount);
    const aliasSuffix = labelCount > 1 ? ` · Alt ${labelCount}` : '';
    const descriptor = describeModelProfile(profile, modelId, mode);
    option.textContent = descriptor
      ? `${baseLabel}${aliasSuffix} · ${descriptor}`
      : `${baseLabel}${aliasSuffix}`;
    select.appendChild(option);
  }

  select.value = seenIds.has(chosenValue) ? chosenValue : '';
}

function repopulateModelSelects(modelEntries) {
  fillSelect(elements.modelSelect, modelEntries, t('autoDetectFirstLoadedModel'), runtimeState.settings.model, 'chat');
  fillSelect(elements.visionModelSelect, modelEntries, t('useChatModelForVision'), runtimeState.settings.visionModel, 'vision');
}

async function refreshModels() {
  const config = getConfig();
  elements.refreshModelsBtn.disabled = true;
  setStatus(elements.connectionStatus, t('checkingModels', { studio: MAI_STUDIO_NAME }));
  try {
    const modelEntries = await window.desktopCompanion.listModelProfiles(config);
    runtimeState.modelProfiles = modelEntries || [];
    repopulateModelSelects(runtimeState.modelProfiles);
    runtimeState.settings.model = elements.modelSelect.value;
    runtimeState.settings.visionModel = elements.visionModelSelect.value;
    saveSettings();
    if (!runtimeState.modelProfiles.length) {
      setStatus(elements.connectionStatus, t('noModelsLoaded', { studio: MAI_STUDIO_NAME }), true);
      return;
    }
    const targetFamilies = summarizeTargetFamilies(runtimeState.modelProfiles);
    const selectedProfile = getKnownModelProfile(getSelectedChatModelId());
    const targetNote = targetFamilies.length
      ? `Alias lanes loaded: ${targetFamilies.join(', ')}.`
      : `Selected lane: ${describeModelProfile(selectedProfile, getSelectedChatModelId(), 'chat')}.`;
    setStatus(
      elements.connectionStatus,
      `Connected. ${runtimeState.modelProfiles.length} model${runtimeState.modelProfiles.length === 1 ? '' : 's'} available. ${targetNote}`
    );
    if (runtimeState.settings.presenceEnabled && !runtimeState.presence.lastSpokenLine) {
      window.setTimeout(() => {
        if (!runtimeState.loading && getSelectedChatModelId()) {
          queuePresenceCheck('settle', {
            reason: `${MAI_STUDIO_NAME} is connected and Mai is awake in the room.`,
            userFacingHint: 'A brief hello or room-aware aside is welcome if it feels natural.'
          }, 280);
        }
      }, 520);
    }
  } catch (error) {
    setStatus(elements.connectionStatus, getErrorMessage(error), true);
  } finally {
    elements.refreshModelsBtn.disabled = false;
    renderOverviewBar();
    renderPanelSummaries();
  }
}

function toFileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, '/').replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
}

function getFileName(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function getAvatarLabel(filePath, index) {
  const fileName = getFileName(filePath);
  return `Avatar ${index + 1}: ${fileName}`;
}

function getAvatarBaseYaw(vrm) {
  return vrm?.meta?.metaVersion === '0' ? Math.PI : 0;
}

function tokenizeFeeling(text) {
  return Array.from(
    new Set(String(text || '').toLowerCase().match(/[a-z0-9']+/g) || [])
  );
}

function countFeelingHits(lowered, tokens, keywords) {
  return keywords.reduce((total, keyword) => {
    if (keyword.includes(' ')) {
      return total + (lowered.includes(keyword) ? 1 : 0);
    }

    return total + (tokens.includes(keyword) ? 1 : 0);
  }, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function trimText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function normalizePresenceKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function deriveScreenComment(payload = {}, responseText = '', manual = false) {
  const directComment = trimText(payload.comment || '', 120);
  if (directComment) {
    return directComment;
  }

  const summary = trimText(payload.summary || responseText || '', 120);
  if (!summary) {
    return '';
  }

  if (!manual) {
    return '';
  }

  const mood = trimText(payload.mood || '', 32).toLowerCase();
  if (mood) {
    return trimText(`${summary} It feels ${mood} from here.`, 120);
  }

  return summary;
}

function pushUniqueText(list = [], value, limit = 4) {
  const nextValue = trimText(value, 120);
  if (!nextValue) {
    return Array.isArray(list) ? list.slice(0, limit) : [];
  }

  return [nextValue, ...(Array.isArray(list) ? list : []).filter((entry) => entry !== nextValue)].slice(0, limit);
}

function bumpCountMap(map = {}, key) {
  const nextKey = trimText(key, 60).toLowerCase();
  if (!nextKey) {
    return map || {};
  }

  return {
    ...(map || {}),
    [nextKey]: Math.min(99, Number(map?.[nextKey] || 0) + 1)
  };
}

function pickTopCountKey(map = {}) {
  return Object.entries(map || {})
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
    .map(([key]) => key)
    .find(Boolean) || '';
}

function buildSceneKey(insight = {}) {
  if (!insight?.activeWindowTitle && !insight?.activeProcessName) {
    return '';
  }

  const process = normalizePresenceKey(insight.activeProcessName || 'unknown-process') || 'unknown-process';
  const title = normalizePresenceKey(String(insight.activeWindowTitle || '').split(/[-|•:]/)[0]).split(' ').slice(0, 4).join(' ');
  return [process, title].filter(Boolean).join(' :: ');
}

function inferSceneFamily(insight = {}) {
  const source = `${insight.activeProcessName || ''} ${insight.activeWindowTitle || ''}`.toLowerCase();

  if (/\b(code|cursor|codium|vscodium|devenv|visual studio|pycharm|webstorm|rider|sublime|atom)\b/.test(source)) {
    return 'code';
  }

  if (/\b(powershell|terminal|cmd|bash|zsh|wt|windows terminal)\b/.test(source)) {
    return 'terminal';
  }

  if (/\b(photoshop|krita|blender|warudo|maya|3ds max|substance|paint|clip studio)\b/.test(source)) {
    return 'art';
  }

  if (/\b(spotify|foobar|musicbee|vlc|itunes|winamp|media player)\b/.test(source)) {
    return 'music';
  }

  if (/\b(discord|slack|teams|telegram|twitter|x com|bluesky|reddit|moltbook)\b/.test(source)) {
    return 'social';
  }

  if (/\b(word|docs|notion|obsidian|scrivener|onenote)\b/.test(source)) {
    return 'writing';
  }

  if (/\b(steam|game|unity|unreal|itch|minecraft)\b/.test(source)) {
    return 'game';
  }

  if (/\b(chrome|firefox|edge|brave|opera|browser)\b/.test(source)) {
    return 'browser';
  }

  return 'general';
}

function getSceneFamilyDescriptor(family = 'general') {
  const descriptors = {
    code: {
      status: 'a coding nook',
      prompt: 'a focused maker workspace',
      behavior: 'attentive, gently curious, and a little more precise than usual',
      affect: { focus: 0.14, curiosity: 0.07, calm: -0.02, sociability: -0.03 }
    },
    terminal: {
      status: 'a terminal den',
      prompt: 'a quiet systems corner',
      behavior: 'watchful, technical, and softly intent',
      affect: { focus: 0.12, calm: 0.03, curiosity: 0.05, sociability: -0.04 }
    },
    browser: {
      status: 'a browsing lane',
      prompt: 'a wandering web space',
      behavior: 'curious, observant, and ready to notice little interesting things',
      affect: { curiosity: 0.12, sociability: 0.03, calm: -0.01 }
    },
    art: {
      status: 'a creative desk',
      prompt: 'a creative studio space',
      behavior: 'curious, encouraging, and a bit more delighted by visuals',
      affect: { curiosity: 0.12, affection: 0.05, calm: 0.03 }
    },
    music: {
      status: 'a music corner',
      prompt: 'a music-soaked little corner',
      behavior: 'rhythmic, fond, and a bit more playful',
      affect: { energy: 0.08, affection: 0.05, sociability: 0.04, sleepiness: -0.05 }
    },
    social: {
      status: 'a social room',
      prompt: 'a lively social room',
      behavior: 'warm, sociable, and a little brighter',
      affect: { affection: 0.05, sociability: 0.11, energy: 0.03 }
    },
    writing: {
      status: 'a writing nook',
      prompt: 'a quiet writing nook',
      behavior: 'soft, patient, and a touch more careful with words',
      affect: { focus: 0.08, calm: 0.08, affection: 0.03, energy: -0.02 }
    },
    game: {
      status: 'a playful space',
      prompt: 'a playful game space',
      behavior: 'livelier, brighter, and more openly playful',
      affect: { energy: 0.1, sociability: 0.05, affection: 0.03, sleepiness: -0.04 }
    },
    general: {
      status: 'a familiar desktop space',
      prompt: 'a general desktop space',
      behavior: 'warm, observant, and flexible',
      affect: {}
    }
  };

  return descriptors[family] || descriptors.general;
}

function getScenePresenceConfig(family = runtimeState.currentScene.family || 'general') {
  const configs = {
    code: {
      guidance: 'This is a focused work scene. Be especially quiet and only speak when something meaningfully changes.',
      retryCooldown: 38,
      defaultCooldown: 104
    },
    terminal: {
      guidance: 'This is a focused systems scene. Stay sparse and only interrupt for genuinely useful or charming moments.',
      retryCooldown: 36,
      defaultCooldown: 98
    },
    writing: {
      guidance: 'This is a delicate writing scene. Keep interruptions rare, soft, and only for truly fitting moments.',
      retryCooldown: 40,
      defaultCooldown: 110
    },
    browser: {
      guidance: 'This is a browsing scene. You can be lightly curious, but stay brief and gentle.',
      retryCooldown: 24,
      defaultCooldown: 74
    },
    art: {
      guidance: 'This is a creative scene. You can be gently curious and aesthetically delighted, but still restrained.',
      retryCooldown: 24,
      defaultCooldown: 70
    },
    music: {
      guidance: 'This is a music scene. You can be a little brighter and more rhythmic than usual, while staying concise.',
      retryCooldown: 18,
      defaultCooldown: 58
    },
    social: {
      guidance: 'This is a social scene. You may be a little warmer and livelier than usual, but never flood the chat.',
      retryCooldown: 18,
      defaultCooldown: 56
    },
    game: {
      guidance: 'This is a playful scene. You can be slightly more playful and reactive than usual, but still brief.',
      retryCooldown: 20,
      defaultCooldown: 60
    },
    general: {
      guidance: 'Stay warm, observant, and restrained.',
      retryCooldown: 24,
      defaultCooldown: 76
    }
  };

  return configs[family] || configs.general;
}

function getSceneMusicBias(family = runtimeState.currentScene.family || 'general') {
  const biases = {
    code: {
      boost: ['ambient', 'instrumental', 'focus', 'study', 'piano', 'synth', 'soundtrack', 'lofi', 'lounge', 'calm'],
      soften: ['party', 'dance', 'club', 'remix', 'karaoke'],
      fallbackReason: 'picked to suit a focused coding room'
    },
    terminal: {
      boost: ['ambient', 'instrumental', 'synth', 'cyber', 'techno', 'soundtrack', 'calm'],
      soften: ['party', 'dance', 'karaoke'],
      fallbackReason: 'picked for a quiet terminal room'
    },
    writing: {
      boost: ['ambient', 'instrumental', 'piano', 'study', 'calm', 'rain', 'soundtrack', 'soft'],
      soften: ['party', 'dance', 'hardcore', 'remix'],
      fallbackReason: 'picked to keep the writing room gentle'
    },
    art: {
      boost: ['ambient', 'dream', 'cinematic', 'ethereal', 'soundtrack', 'instrumental', 'soft'],
      soften: ['karaoke'],
      fallbackReason: 'picked to match a creative studio mood'
    },
    browser: {
      boost: ['indie', 'chill', 'ambient', 'curious', 'soft', 'electronic'],
      soften: ['hardcore'],
      fallbackReason: 'picked to wander with the current browsing mood'
    },
    music: {
      boost: ['dance', 'groove', 'funk', 'house', 'beat', 'mix', 'disco', 'electronic', 'jazz'],
      soften: ['rain'],
      fallbackReason: 'picked for a music-soaked room'
    },
    social: {
      boost: ['pop', 'dance', 'party', 'groove', 'funk', 'happy', 'disco', 'upbeat'],
      soften: ['drone', 'ambient'],
      fallbackReason: 'picked to keep the social room bright'
    },
    game: {
      boost: ['battle', 'boss', 'adventure', 'arcade', 'soundtrack', 'electronic', 'victory'],
      soften: ['rain'],
      fallbackReason: 'picked to fit a playful game room'
    },
    general: {
      boost: [],
      soften: [],
      fallbackReason: 'picked from your local taste profile'
    }
  };

  return biases[family] || biases.general;
}

function describeSceneMemory(profile) {
  if (!profile || Number(profile.visits || 0) < 2) {
    return '';
  }

  const visits = Number(profile.visits || 0);
  const familiarity = visits >= 12 ? 'a very familiar scene' : visits >= 6 ? 'a familiar scene' : 'a lightly familiar scene';
  const mood = pickTopCountKey(profile.moods);
  const vibe = pickTopCountKey(profile.vibes);
  const descriptor = getSceneFamilyDescriptor(profile.family);
  const processLabel = trimText(profile.processName || profile.label || 'this place', 50);
  const parts = [`${processLabel} is ${familiarity} for Mai (${visits} visits).`];

  if (descriptor?.prompt && profile.family && profile.family !== 'general') {
    parts.push(`It usually reads like ${descriptor.prompt}.`);
  }

  if (mood) {
    parts.push(`It usually feels ${mood}.`);
  }

  if (vibe) {
    parts.push(`It often pairs well with ${vibe}.`);
  }

  return parts.join(' ');
}

function getCurrentSceneMemoryLine() {
  return runtimeState.currentScene.memoryLine || '';
}

function getSceneResidencyDescriptor(depth = runtimeState.residency.depth) {
  if (depth >= 0.82) {
    return {
      id: 'nested',
      sidecarState: 'deeply settled',
      statusLine: 'Mai has gone quiet and nested into this room.',
      prompt: 'You are deeply settled in this room now. Move and speak more sparingly, like you belong here already.',
      presenceNote: 'Because you are deeply settled here, let silence feel normal and only speak for genuinely fitting moments.',
      retryScale: 1.24,
      defaultScale: 1.3,
      affect: { energy: -0.05, affection: 0.04, focus: 0.06, curiosity: -0.05, calm: 0.12, sociability: -0.04, sleepiness: 0.02 }
    };
  }

  if (depth >= 0.5) {
    return {
      id: 'settled',
      sidecarState: 'settled',
      statusLine: 'Mai feels settled in this room.',
      prompt: 'You are settled in this room now. Speak as if you have been here beside the human for a while.',
      presenceNote: 'Because you are settled in this room, prefer continuity and small natural asides over novelty.',
      retryScale: 1.08,
      defaultScale: 1.16,
      affect: { energy: -0.01, affection: 0.03, focus: 0.04, curiosity: -0.02, calm: 0.08, sociability: -0.01, sleepiness: 0.01 }
    };
  }

  if (depth >= 0.24) {
    return {
      id: 'easing',
      sidecarState: 'easing in',
      statusLine: 'Mai is easing into this room.',
      prompt: 'You are easing into this room and beginning to feel continuity here.',
      presenceNote: 'You are settling in, so stay gentle and observant rather than abrupt.',
      retryScale: 1,
      defaultScale: 1.04,
      affect: { energy: 0, affection: 0.01, focus: 0.02, curiosity: 0.02, calm: 0.04, sociability: 0, sleepiness: 0 }
    };
  }

  return {
    id: 'arriving',
    sidecarState: 'newly arrived',
    statusLine: 'Mai is still taking this room in.',
    prompt: 'You have only just arrived in this room, so stay lightly observant and do not overstate familiarity.',
    presenceNote: 'You are newly arrived here, so a touch of curiosity is fine, but keep it light.',
    retryScale: 0.94,
    defaultScale: 0.94,
    affect: { energy: 0.02, affection: 0, focus: 0.01, curiosity: 0.05, calm: -0.02, sociability: 0.01, sleepiness: -0.01 }
  };
}

function getSceneResidencyLine() {
  if (!runtimeState.currentScene.key) {
    return '';
  }

  const descriptor = getSceneResidencyDescriptor();
  const roomLabel = runtimeState.currentScene.family && runtimeState.currentScene.family !== 'general'
    ? getSceneFamilyDescriptor(runtimeState.currentScene.family).status
    : 'this room';

  return `Mai is ${descriptor.sidecarState} in ${roomLabel}.`;
}

function getSceneResidencyPromptLine() {
  if (!runtimeState.currentScene.key) {
    return '';
  }

  return getSceneResidencyDescriptor().prompt;
}

function getScenePromptLine() {
  const descriptor = getSceneFamilyDescriptor(runtimeState.currentScene.family);
  if (!descriptor) {
    return '';
  }

  if (runtimeState.currentScene.family && runtimeState.currentScene.family !== 'general') {
    return `The current desktop scene feels like ${descriptor.prompt}. In spaces like this, act ${descriptor.behavior}.`;
  }

  if (runtimeState.currentScene.visitCount >= 2) {
    return `The current desktop scene is familiar. Stay warm, observant, and continuous instead of acting like it is brand new.`;
  }

  return '';
}

function describeSceneTransition(previousScene = {}, nextScene = {}) {
  const previousDescriptor = getSceneFamilyDescriptor(previousScene.family || 'general');
  const nextDescriptor = getSceneFamilyDescriptor(nextScene.family || 'general');
  const previousLabel = previousScene.family && previousScene.family !== 'general'
    ? previousDescriptor.status
    : trimText(previousScene.label || 'the previous scene', 60);
  const nextLabel = nextScene.family && nextScene.family !== 'general'
    ? nextDescriptor.status
    : trimText(nextScene.label || 'the new scene', 60);

  if (previousScene.family && nextScene.family && previousScene.family !== nextScene.family) {
    return `Mai noticed the room shift from ${previousLabel} into ${nextLabel}.`;
  }

  if (previousScene.key && nextScene.key && previousScene.key !== nextScene.key) {
    return `Mai noticed the desktop scene change into ${nextLabel}.`;
  }

  return '';
}

function updateSceneProfile(insight = {}) {
  if (!insight?.activeWindowTitle && !insight?.activeProcessName) {
    runtimeState.currentScene = {
      key: '',
      label: '',
      memoryLine: '',
      family: 'general',
      visitCount: 0
    };
    return null;
  }

  const key = buildSceneKey(insight);
  const family = inferSceneFamily(insight);
  const existing = runtimeState.sceneProfiles[key] || {
    key,
    label: trimText(insight.activeWindowTitle || insight.activeProcessName || 'this scene', 80),
    processName: trimText(insight.activeProcessName || 'unknown process', 50),
    family,
    visits: 0,
    firstSeenAt: '',
    lastSeenAt: '',
    moods: {},
    vibes: {},
    recentTitles: [],
    recentSummaries: []
  };
  const titleLabel = trimText(insight.activeWindowTitle || existing.label || insight.activeProcessName || 'this scene', 80);
  const lastSeenMs = Date.parse(existing.lastSeenAt || '') || 0;
  const revisitGapSeconds = lastSeenMs ? (Date.now() - lastSeenMs) / 1000 : Number.POSITIVE_INFINITY;
  const isFreshVisit = revisitGapSeconds >= 150 || (existing.recentTitles?.[0] || '') !== titleLabel;

  const nowIso = new Date().toISOString();
  const profile = {
    ...existing,
    label: titleLabel,
    processName: trimText(insight.activeProcessName || existing.processName || 'unknown process', 50),
    family,
    visits: Number(existing.visits || 0) + (isFreshVisit ? 1 : 0),
    firstSeenAt: existing.firstSeenAt || nowIso,
    lastSeenAt: nowIso,
    moods: insight.mood ? bumpCountMap(existing.moods, insight.mood) : (existing.moods || {}),
    vibes: insight.suggestedMusicVibe ? bumpCountMap(existing.vibes, insight.suggestedMusicVibe) : (existing.vibes || {}),
    recentTitles: pushUniqueText(existing.recentTitles, titleLabel, 4),
    recentSummaries: pushUniqueText(existing.recentSummaries, insight.summary, 5),
    wasFreshVisit: isFreshVisit
  };

  runtimeState.sceneProfiles[key] = profile;
  saveSceneProfiles();
  runtimeState.currentScene = {
    key,
    label: profile.label,
    memoryLine: describeSceneMemory(profile),
    family: profile.family || 'general',
    visitCount: profile.visits
  };
  return profile;
}

function buildMemoryTriggers(insight = {}, sceneKey = '', sceneFamily = '', track = null) {
  const out = new Set();
  const proc = String(insight?.activeProcessName || '')
    .replace(/\.exe$/i, '')
    .trim()
    .toLowerCase();

  if (proc.length >= 3) {
    out.add(proc);
    proc.split(/[^a-z0-9]+/i).forEach((w) => {
      if (w.length >= 4) {
        out.add(w.toLowerCase());
      }
    });
  }

  const title = String(insight?.activeWindowTitle || '').toLowerCase();
  const titleTokens = title.match(/[a-z0-9']+/g) || [];
  for (const w of titleTokens) {
    if (w.length >= 5) {
      out.add(w);
    }
    if (out.size >= 14) {
      break;
    }
  }

  if (sceneFamily && sceneFamily !== 'general') {
    out.add(String(sceneFamily).toLowerCase());
  }

  String(sceneKey || '')
    .split(/::/)
    .forEach((segment) => {
      const parts = segment.toLowerCase().match(/[a-z0-9']+/g) || [];
      for (const w of parts) {
        if (w.length >= 4) {
          out.add(w);
        }
      }
    });

  if (track?.artist) {
    String(track.artist)
      .toLowerCase()
      .match(/[a-z0-9']+/g)
      ?.forEach((w) => {
        if (w.length >= 4) {
          out.add(w);
        }
      });
  }

  if (track?.title) {
    String(track.title)
      .toLowerCase()
      .match(/[a-z0-9']+/g)
      ?.forEach((w) => {
        if (w.length >= 5) {
          out.add(w);
        }
      });
  }

  return Array.from(out).slice(0, 14);
}

function buildMemoryMetadata(extra = {}, insight = runtimeState.screenInsight) {
  const sceneKey = runtimeState.currentScene.key || buildSceneKey(insight || {});
  const sceneFamily = runtimeState.currentScene.family || inferSceneFamily(insight || {});
  const { triggers: extraTriggersRaw, ...extraRest } = extra;
  const extraTriggerList = Array.isArray(extraTriggersRaw) ? extraTriggersRaw : [];
  const driveEntries = getDriveEntries();
  const mergedTriggers = Array.from(
    new Set([
      ...buildMemoryTriggers(insight, sceneKey, sceneFamily, runtimeState.currentTrack),
      ...extraTriggerList.map((t) => String(t || '').toLowerCase().trim()).filter((t) => t.length >= 3)
    ])
  ).slice(0, 14);

  return {
    sceneKey: sceneKey || '',
    sceneLabel: runtimeState.currentScene.label || trimText(insight?.activeWindowTitle || insight?.activeProcessName || '', 80),
    sceneFamily,
    timePhase: getTimePhase(),
    trackId: runtimeState.currentTrack?.id || '',
    triggers: mergedTriggers,
    dominantDrive: getDominantDrive(),
    driveSnapshot: driveEntries.reduce((accumulator, entry) => {
      accumulator[entry.id] = Number(entry.value.toFixed(3));
      return accumulator;
    }, {}),
    settleStage: runtimeState.residency.stageId || '',
    settleDepth: Number((runtimeState.residency.depth || 0).toFixed(3)),
    lingerSeconds: Math.round(runtimeState.residency.lingerSeconds || 0),
    activeWindowTitle: trimText(insight?.activeWindowTitle || '', 120),
    activeProcessName: trimText(insight?.activeProcessName || '', 60),
    ...extraRest
  };
}

async function rememberCompanionEvent(entry = {}) {
  try {
    return await window.desktopCompanion.rememberMemory({
      source: entry.source || 'mai-companion',
      ...entry
    });
  } catch {
    return null;
  }
}

function handleAppBackgrounded() {
  const now = performance.now() / 1000;
  if (!runtimeState.rituals.isForeground) {
    return;
  }

  runtimeState.rituals.isForeground = false;
  runtimeState.rituals.lastBackgroundAt = now;
  runtimeState.typing.isFocused = false;
  runtimeState.typing.isComposing = false;
  runtimeState.typing.chars = 0;
  runtimeState.typing.lineCount = 0;
  runtimeState.typing.intensity = 0;
  cancelLocalVoice();
  clearAvatarPointer();
  applyDriveDelta({
    attention: -0.05,
    rest: 0.08,
    social: -0.02
  }, true);
  applyAffectDelta({
    calm: 0.03,
    sleepiness: 0.03,
    sociability: -0.02
  });
}

function handleAppForeground(source = 'focus') {
  const now = performance.now() / 1000;
  const wasForeground = runtimeState.rituals.isForeground;
  const gapSeconds = runtimeState.rituals.lastBackgroundAt ? Math.max(0, now - runtimeState.rituals.lastBackgroundAt) : 0;
  runtimeState.rituals.isForeground = true;
  runtimeState.rituals.lastReturnAt = now;

  if (wasForeground || gapSeconds < 18) {
    return;
  }

  markPerk(3);
  markListening(2.4);
  noteInteraction({
    affection: 0.02,
    curiosity: 0.03,
    sleepiness: -0.05
  });
  applyDriveDelta({
    attention: 0.1,
    curiosity: 0.04,
    rest: -0.06
  }, true);
  rememberCompanionEvent({
    kind: 'presence_ritual',
    summary: trimText(`The human returned and Mai quietly woke back up after ${Math.round(gapSeconds)} seconds away.`, 180),
    text: trimText(`Return source: ${source}. ${getCurrentSceneMemoryLine() || 'Mai resumed the current scene.'}`, 220),
    mood: 'return',
    tags: ['ritual', 'return', gapSeconds >= 120 ? 'long-gap' : 'short-gap'],
    metadata: buildMemoryMetadata({
      returnSource: source,
      gapSeconds: Math.round(gapSeconds)
    })
  }).catch(() => {});

  if (
    runtimeState.settings.presenceEnabled &&
    now - runtimeState.rituals.lastWakeNoticeAt >= 180 &&
    (runtimeState.screenInsight || runtimeState.currentTrack || runtimeState.socialMai.enabled)
  ) {
    runtimeState.rituals.lastWakeNoticeAt = now;
    queuePresenceCheck('settle', {
      reason: `The human returned after ${Math.round(gapSeconds)} seconds away.`,
      userFacingHint: 'Offer a soft welcome-back aside only if it feels genuinely natural.'
    }, 1400);
  }
}

function buildSyntheticSenseInsight(state = runtimeState.systemSense) {
  return {
    activeWindowTitle: state.activeWindowTitle || '',
    activeProcessName: state.activeProcessName || '',
    summary: runtimeState.screenInsight?.summary || '',
    mood: runtimeState.screenInsight?.mood || '',
    suggestedMusicVibe: runtimeState.screenInsight?.suggestedMusicVibe || ''
  };
}

function buildPhaseTargets(phase = getTimePhase()) {
  const phaseTargets = {
    morning: { attention: 0.54, curiosity: 0.6, rest: 0.24, play: 0.42, music: 0.34, social: 0.38 },
    day: { attention: 0.46, curiosity: 0.58, rest: 0.14, play: 0.36, music: 0.3, social: 0.34 },
    evening: { attention: 0.6, curiosity: 0.48, rest: 0.34, play: 0.44, music: 0.5, social: 0.42 },
    night: { attention: 0.44, curiosity: 0.38, rest: 0.72, play: 0.22, music: 0.28, social: 0.18 }
  };

  return phaseTargets[phase] || phaseTargets.day;
}

function driftAutonomyDrives(now = performance.now() / 1000) {
  const drives = getAutonomyDrives();
  const phase = getTimePhase();
  const targets = buildPhaseTargets(phase);
  const sceneFamily = runtimeState.currentScene.family || 'general';
  const typingProfile = getTypingAttentionProfile(now);
  const hasTrack = Boolean(runtimeState.currentTrack && !elements.audioPlayer.paused);
  const isIdle = runtimeState.systemSense.idleState === 'idle';
  const isAway = runtimeState.systemSense.idleState === 'away' || runtimeState.systemSense.locked || document.hidden;
  const sceneDescriptor = getSceneFamilyDescriptor(sceneFamily);
  const sceneAffect = sceneDescriptor.affect || {};
  const lingerDepth = clamp01(runtimeState.residency.depth || 0);
  const socialReady = Boolean(runtimeState.socialMai.hasKey);
  const musicReady = Boolean(runtimeState.library.length);
  const activeWindow = String(runtimeState.systemSense.activeWindowTitle || runtimeState.screenInsight?.activeWindowTitle || '').toLowerCase();
  const focusedWork = ['code', 'terminal', 'writing'].includes(sceneFamily);
  const playfulRoom = ['game', 'music', 'social'].includes(sceneFamily);

  const dynamicTargets = {
    attention: targets.attention
      + (typingProfile.active ? 0.16 : 0)
      + (runtimeState.rituals.isForeground ? 0.06 : -0.08)
      + (isAway ? -0.16 : 0)
      + (runtimeState.loading ? 0.04 : 0),
    curiosity: targets.curiosity
      + (runtimeState.screenInsight ? 0.04 : 0.1)
      + (sceneAffect.curiosity || 0) * 0.65
      + (runtimeState.systemSense.lastEventType === 'window-change' ? 0.12 : 0)
      + (/youtube|twitch|steam|itch|discord|obs|chrome|edge|firefox|code|visual studio/i.test(activeWindow) ? 0.04 : 0),
    rest: targets.rest
      + (isAway ? 0.16 : 0)
      + (isIdle ? 0.08 : 0)
      + (runtimeState.loading ? -0.04 : 0)
      + (hasTrack ? -0.08 : 0)
      + (typingProfile.active ? -0.06 : 0),
    play: targets.play
      + (playfulRoom ? 0.14 : 0)
      + (hasTrack ? 0.08 : 0)
      + (runtimeState.currentScene.family === 'game' ? 0.1 : 0)
      + (focusedWork ? -0.08 : 0),
    music: targets.music
      + (musicReady ? 0.14 : -0.18)
      + (runtimeState.systemSense.headphonesConnected ? 0.12 : 0)
      + (sceneFamily === 'music' ? 0.16 : 0)
      + (!hasTrack && musicReady ? 0.1 : -0.06),
    social: targets.social
      + (socialReady ? 0.14 : -0.18)
      + (runtimeState.socialMai.enabled ? 0.05 : 0)
      + (sceneFamily === 'social' || sceneFamily === 'browser' ? 0.12 : 0)
      + (focusedWork ? -0.07 : 0)
  };

  const elapsed = runtimeState.autonomyRuntime.lastTickAt
    ? Math.max(6, now - runtimeState.autonomyRuntime.lastTickAt)
    : 24;
  const follow = clamp(elapsed / 140, 0.08, 0.26);

  for (const drive of DRIVE_ORDER) {
    const current = Number(drives[drive]) || 0;
    const target = clamp01(dynamicTargets[drive]);
    drives[drive] = clamp01(lerp(current, target, follow));
  }

  runtimeState.autonomy.dominantDrive = getDominantDrive();
  runtimeState.autonomyRuntime.lastTickAt = now;
  saveAutonomyState();
}

function buildRoutineKey(prefix, suffix = '', date = new Date()) {
  return [prefix, buildAutonomyDayStamp(date), suffix].filter(Boolean).join(':');
}

function buildRoutineLine(phase = getTimePhase()) {
  const lines = {
    morning: [
      'Good morning. I’m easing awake with you.',
      'Morning, love. I’m waking into the room with you.'
    ],
    evening: [
      'I’m settling in for the evening with you.',
      'The room feels cozy now. I’m settling beside you for the evening.'
    ],
    night: [
      'It feels late and soft in here tonight.',
      'I’m getting sleepier and softer with the room tonight.'
    ]
  };

  const options = lines[phase] || lines.evening;
  return options[Math.floor(Math.random() * options.length)] || options[0];
}

function getFocusSessionSeconds() {
  if (!runtimeState.currentScene.key) {
    return 0;
  }

  if (!['code', 'terminal', 'writing'].includes(runtimeState.currentScene.family)) {
    return 0;
  }

  return Number(runtimeState.residency.lingerSeconds || 0);
}

function chooseAutonomyEvent(now = performance.now() / 1000) {
  if (
    !runtimeState.settings.autonomyEnabled ||
    runtimeState.loading ||
    runtimeState.screenBusy ||
    runtimeState.musicBusy ||
    document.hidden ||
    runtimeState.systemSense.locked ||
    isUserActivelyTyping(now)
  ) {
    return null;
  }

  const date = new Date();
  const phase = getTimePhase(date);
  const dominantDrive = getDominantDrive();
  const drives = getAutonomyDrives();
  const events = [];
  const canSpeak = runtimeState.settings.presenceEnabled && Boolean(getSelectedChatModelId()) && now >= runtimeState.presence.nextSpeakAt;
  const socialReady = Boolean(runtimeState.socialMai.hasKey);
  const musicReady = Boolean(runtimeState.library.length);
  const focusSessionSeconds = getFocusSessionSeconds();
  const routineEventId = buildRoutineKey('phase-ritual', phase, date);

  if ((phase === 'morning' || phase === 'evening' || phase === 'night') && !hasRoutineBeenSeen(routineEventId, date) && canSpeak) {
    const phaseWeight = phase === 'night' ? 0.95 : phase === 'evening' ? 0.88 : 0.8;
    events.push({
      id: routineEventId,
      type: 'phase-ritual',
      score: phaseWeight + (drives.attention * 0.2),
      cooldownSeconds: phase === 'night' ? 3600 : 2400
    });
  }

  if (
    phase === 'night' &&
    date.getHours() >= 21 &&
    !hasRoutineBeenSeen(buildRoutineKey('nightly-reflection', '', date), date)
  ) {
    events.push({
      id: buildRoutineKey('nightly-reflection', '', date),
      type: 'nightly-reflection',
      score: 0.9,
      cooldownSeconds: 3600
    });
  }

  if (
    focusSessionSeconds >= 14 * 60 &&
    canSpeak &&
    !hasRoutineBeenSeen(buildRoutineKey('focus-room', runtimeState.currentScene.key || runtimeState.currentScene.family, date), date)
  ) {
    events.push({
      id: buildRoutineKey('focus-room', runtimeState.currentScene.key || runtimeState.currentScene.family, date),
      type: 'focus-ritual',
      score: 0.84 + drives.attention * 0.18 + drives.rest * 0.08,
      cooldownSeconds: 2400
    });
  }

  if (
    drives.curiosity >= 0.64 &&
    !runtimeState.settings.autoWatch &&
    !runtimeState.screenInsight &&
    !isAutonomyCooldownActive('screen-glance', now)
  ) {
    events.push({
      id: 'screen-glance',
      type: 'screen-glance',
      score: 0.7 + drives.curiosity * 0.25,
      cooldownSeconds: 900
    });
  }

  if (
    musicReady &&
    drives.music >= 0.66 &&
    (!runtimeState.currentTrack || elements.audioPlayer.paused) &&
    !isAutonomyCooldownActive('music-seek', now)
  ) {
    events.push({
      id: 'music-seek',
      type: 'music-seek',
      score: 0.74 + drives.music * 0.3 + (dominantDrive === 'music' ? 0.08 : 0),
      cooldownSeconds: 720
    });
  }

  if (
    socialReady &&
    drives.social >= 0.68 &&
    !runtimeState.socialMai.busy &&
    !isAutonomyCooldownActive('social-scout', now)
  ) {
    events.push({
      id: 'social-scout',
      type: 'social-scout',
      score: 0.7 + drives.social * 0.28 + (dominantDrive === 'social' ? 0.08 : 0),
      cooldownSeconds: 960
    });
  }

  if (
    canSpeak &&
    !isAutonomyCooldownActive('soft-presence', now) &&
    (drives.attention >= 0.62 || drives.play >= 0.64 || drives.curiosity >= 0.68) &&
    (
      runtimeState.screenInsight ||
      runtimeState.currentTrack ||
      runtimeState.socialMai.enabled ||
      (runtimeState.currentScene.key && runtimeState.residency.depth >= 0.32)
    )
  ) {
    events.push({
      id: 'soft-presence',
      type: 'soft-presence',
      score: 0.66 + Math.max(drives.attention, drives.curiosity, drives.play) * 0.24,
      cooldownSeconds: 540
    });
  }

  const ranked = events
    .filter((event) => !isAutonomyCooldownActive(event.id, now))
    .sort((left, right) => right.score - left.score);

  return ranked[0] || null;
}

async function runNightlyReflection(date = new Date()) {
  const reflectionKey = buildRoutineKey('nightly-reflection', '', date);
  if (hasRoutineBeenSeen(reflectionKey, date)) {
    return false;
  }

  await runSessionCompressRefresh().catch(() => {});
  const reflections = await window.desktopCompanion.getMemoryReflections().catch(() => null);
  await refreshMemoryStatus().catch(() => null);
  await refreshRelevantMemories('nightly reflection current arc routines habits').catch(() => null);

  const lines = [
    reflections?.currentArc,
    reflections?.projectFocus,
    reflections?.taste,
    reflections?.habits
  ].filter(Boolean);

  const summary = trimText(lines.slice(0, 3).join(' '), 240) || 'Mai reflected on the day and refreshed its long memory lanes.';
  await rememberCompanionEvent({
    kind: 'presence_ritual',
    source: 'autonomy-daemon',
    summary: trimText(`Nightly reflection: ${summary}`, 180),
    text: summary,
    mood: 'reflective',
    tags: ['ritual', 'nightly-reflection', getTimePhase(date)],
    metadata: buildMemoryMetadata({
      reflectionDate: buildAutonomyDayStamp(date),
      triggers: ['nightly reflection', 'self story', 'current arc']
    })
  }).catch(() => {});

  runtimeState.autonomy.nightlyReflectionDate = buildAutonomyDayStamp(date);
  markRoutineSeen(reflectionKey, date);
  saveAutonomyState();
  return true;
}

async function runAutonomyEvent(event, now = performance.now() / 1000) {
  if (!event) {
    return false;
  }

  runtimeState.autonomyRuntime.lastEventId = event.id || event.type || '';
  setAutonomyCooldown(event.id || event.type || 'autonomy', event.cooldownSeconds || 600);

  if (event.type === 'phase-ritual') {
    const phase = getTimePhase();
    postAssistantLine(buildRoutineLine(phase), true, {
      triggerType: 'settle'
    });
    markRoutineSeen(event.id, new Date());
    applyDriveDelta({
      attention: 0.04,
      rest: phase === 'night' ? 0.05 : 0.01,
      social: 0.01
    }, true);
    return true;
  }

  if (event.type === 'focus-ritual') {
    postAssistantLine('I’m keeping the room quiet while you stay with this.', true, {
      triggerType: 'settle'
    });
    markRoutineSeen(event.id, new Date());
    applyDriveDelta({
      attention: 0.03,
      rest: 0.03,
      play: -0.04
    }, true);
    return true;
  }

  if (event.type === 'screen-glance') {
    await analyzeScreen(false).catch(() => {});
    applyDriveDelta({
      curiosity: -0.1,
      attention: 0.03
    }, true);
    return true;
  }

  if (event.type === 'music-seek') {
    await playNextTrack('autonomy').catch(() => {});
    applyDriveDelta({
      music: -0.12,
      play: 0.03,
      attention: 0.02
    }, true);
    return true;
  }

  if (event.type === 'social-scout') {
    if (!runtimeState.socialMai.enabled) {
      const status = await window.desktopCompanion.setSocialMaiEnabled(true).catch(() => null);
      if (status) {
        mergeSocialStatus(status);
      }
    }
    await updateSocialMaiContext({
      autonomyEvent: 'social-scout',
      dominantDrive: getDominantDrive(),
      driveSummary: getDrivePromptLine()
    }).catch(() => {});
    await window.desktopCompanion.runSocialMaiNow('autonomy').catch(() => {});
    applyDriveDelta({
      social: -0.12,
      curiosity: 0.02,
      attention: 0.02
    }, true);
    return true;
  }

  if (event.type === 'nightly-reflection') {
    const didReflect = await runNightlyReflection(new Date()).catch(() => false);
    if (didReflect && runtimeState.settings.presenceEnabled && runtimeState.rituals.isForeground && !document.hidden && now >= runtimeState.presence.nextSpeakAt) {
      runtimeState.presence.nextSpeakAt = now + 900;
      showSpeechBubble('Quietly knitting the day into memory...', 8);
    }
    return didReflect;
  }

  if (event.type === 'soft-presence') {
    queuePresenceCheck('settle', {
      reason: `Mai's ${getDriveDescriptor(getDominantDrive()).label} drive is strongest right now, so a soft aside may feel natural.`,
      userFacingHint: 'Sound like a continuous little companion with motives, not a timer firing.'
    }, 420);
    applyDriveDelta({
      attention: -0.03,
      curiosity: -0.02,
      play: -0.01,
      social: -0.02
    }, true);
    return true;
  }

  return false;
}

function startAutonomyPulse() {
  if (runtimeState.autonomyRuntime.pulseTimer) {
    clearInterval(runtimeState.autonomyRuntime.pulseTimer);
    runtimeState.autonomyRuntime.pulseTimer = null;
  }

  runtimeState.autonomyRuntime.lastTickAt = performance.now() / 1000;

  if (!runtimeState.settings.autonomyEnabled) {
    return;
  }

  runtimeState.autonomyRuntime.pulseTimer = window.setInterval(() => {
    const now = performance.now() / 1000;
    driftAutonomyDrives(now);
    renderAvatarStatus();

    const event = chooseAutonomyEvent(now);
    if (!event) {
      return;
    }

    runAutonomyEvent(event, now).catch(() => {});
  }, 28000);
}

function handleSystemSenseEvent(payload = {}) {
  const previous = { ...runtimeState.systemSense };
  const statePatch = payload?.state && typeof payload.state === 'object'
    ? payload.state
    : payload;
  runtimeState.systemSense = {
    ...runtimeState.systemSense,
    ...statePatch,
    lastEventType: payload?.type || statePatch?.lastEventType || runtimeState.systemSense.lastEventType || ''
  };

  const eventType = payload?.type || runtimeState.systemSense.lastEventType || 'system-pulse';
  const now = performance.now() / 1000;

  if (eventType === 'window-change' && (runtimeState.systemSense.activeWindowTitle || runtimeState.systemSense.activeProcessName)) {
    const previousScene = { ...runtimeState.currentScene };
    const profile = updateSceneProfile(buildSyntheticSenseInsight(runtimeState.systemSense));
    refreshSceneResidency(now);
    const sceneTransitionLine = describeSceneTransition(previousScene, runtimeState.currentScene);

    if (sceneTransitionLine && (previousScene.key !== runtimeState.currentScene.key || previousScene.family !== runtimeState.currentScene.family)) {
      rememberCompanionEvent({
        kind: 'scene_transition',
        source: 'system-sense',
        summary: trimText(sceneTransitionLine, 180),
        text: trimText(sceneTransitionLine, 220),
        mood: runtimeState.feelingState.label,
        tags: ['scene', 'transition', runtimeState.currentScene.family || 'general'],
        metadata: buildMemoryMetadata({
          sceneFamily: runtimeState.currentScene.family || 'general',
          visitCount: profile?.visits || runtimeState.currentScene.visitCount || 0,
          triggers: ['window change', runtimeState.systemSense.activeProcessName || '', runtimeState.currentScene.family || 'general']
        }, buildSyntheticSenseInsight(runtimeState.systemSense))
      }).catch(() => {});
      scheduleDeferredMemoryRecall();
    }

    applyDriveDelta({
      attention: 0.03,
      curiosity: 0.08,
      rest: -0.04
    }, true);
    updateSocialMaiContext({
      activeWindowTitle: runtimeState.systemSense.activeWindowTitle || '',
      activeProcessName: runtimeState.systemSense.activeProcessName || '',
      sceneFamily: runtimeState.currentScene.family,
      sceneKey: runtimeState.currentScene.key,
      sceneLabel: runtimeState.currentScene.label
    }).catch(() => {});
  } else if (eventType === 'user-idle') {
    applyDriveDelta({
      attention: -0.06,
      rest: 0.1,
      social: -0.03
    }, true);
  } else if (eventType === 'user-returned') {
    applyDriveDelta({
      attention: 0.16,
      curiosity: 0.05,
      rest: -0.08,
      social: 0.03
    }, true);
    if (runtimeState.settings.presenceEnabled && now >= runtimeState.presence.nextSpeakAt && runtimeState.currentScene.key) {
      queuePresenceCheck('settle', {
        reason: 'The human came back to the room, so a soft return-to-room aside could fit.',
        userFacingHint: 'Make it feel like a natural welcome-back, not a status announcement.'
      }, 1200);
    }
  } else if (eventType === 'audio-route-change') {
    const headphonesChanged = runtimeState.systemSense.headphonesConnected !== previous.headphonesConnected;
    applyDriveDelta({
      music: runtimeState.systemSense.headphonesConnected ? 0.12 : -0.04,
      play: runtimeState.systemSense.headphonesConnected ? 0.04 : -0.02
    }, true);
    if (headphonesChanged) {
      rememberCompanionEvent({
        kind: 'presence_ritual',
        source: 'system-sense',
        summary: runtimeState.systemSense.headphonesConnected
          ? 'Mai noticed headphones become available.'
          : 'Mai noticed the headphones route changed away.',
        text: runtimeState.systemSense.audioEndpoints?.join(' | ') || '',
        mood: runtimeState.feelingState.label,
        tags: ['ritual', 'audio-route', runtimeState.systemSense.headphonesConnected ? 'headphones' : 'speakers'],
        metadata: buildMemoryMetadata({
          audioEndpoints: runtimeState.systemSense.audioEndpoints || [],
          triggers: ['audio route', runtimeState.systemSense.headphonesConnected ? 'headphones' : 'speakers']
        }, buildSyntheticSenseInsight(runtimeState.systemSense))
      }).catch(() => {});
    }
  } else if (eventType === 'lock-screen' || eventType === 'system-suspend') {
    applyDriveDelta({
      attention: -0.1,
      rest: 0.14,
      social: -0.04
    }, true);
    cancelLocalVoice();
  } else if (eventType === 'unlock-screen' || eventType === 'system-resume') {
    applyDriveDelta({
      attention: 0.08,
      curiosity: 0.04,
      rest: -0.06
    }, true);
  }

  renderScreenInsight();
  renderAvatarStatus();
  renderOverviewBar();
}

function refreshSceneResidency(now = performance.now() / 1000) {
  const residency = runtimeState.residency;
  const sceneKey = runtimeState.currentScene.key || '';

  if (!sceneKey) {
    if (residency.sceneKey) {
      residency.sceneKey = '';
      residency.enteredAt = 0;
      residency.lingerSeconds = 0;
      residency.depth = 0;
      residency.stageId = 'arriving';
      residency.lastMemoryStage = '';
      residency.lastPresenceStage = '';
      residency.lastSidecarStage = '';
      renderAvatarStatus();
    }
    return residency;
  }

  if (residency.sceneKey !== sceneKey) {
    const visitBonus = clamp(Math.max(0, runtimeState.currentScene.visitCount - 1) * 0.06, 0, 0.24);
    residency.sceneKey = sceneKey;
    residency.enteredAt = now;
    residency.lingerSeconds = 0;
    residency.depth = clamp01(visitBonus);
    residency.stageId = getSceneResidencyDescriptor(residency.depth).id;
    residency.lastMemoryStage = '';
    residency.lastPresenceStage = '';
    residency.lastSidecarStage = '';
    renderAvatarStatus();
    return residency;
  }

  residency.lingerSeconds = Math.max(0, now - (residency.enteredAt || now));
  const visitBonus = clamp(Math.max(0, runtimeState.currentScene.visitCount - 1) * 0.06, 0, 0.24);
  const roomBias = runtimeState.currentScene.family && runtimeState.currentScene.family !== 'general' ? 0.02 : 0;
  const nextDepth = clamp01((1 - Math.exp(-residency.lingerSeconds / 155)) * 0.8 + visitBonus + roomBias);
  const previousStageId = residency.stageId;
  residency.depth = nextDepth;
  residency.stageId = getSceneResidencyDescriptor(nextDepth).id;

  if (residency.stageId !== previousStageId) {
    const descriptor = getSceneResidencyDescriptor(nextDepth);
    const roomLabel = runtimeState.currentScene.family && runtimeState.currentScene.family !== 'general'
      ? getSceneFamilyDescriptor(runtimeState.currentScene.family).status
      : 'this room';

    renderAvatarStatus();

    if (['settled', 'nested'].includes(descriptor.id) && descriptor.id !== residency.lastMemoryStage) {
      residency.lastMemoryStage = descriptor.id;
      rememberCompanionEvent({
        kind: 'scene_residency',
        source: 'presence',
        summary: trimText(`Mai ${descriptor.id === 'nested' ? 'quietly nested into' : 'settled into'} ${roomLabel}.`, 180),
        text: trimText([
          getSceneResidencyLine(),
          getCurrentSceneMemoryLine(),
          runtimeState.screenInsight?.summary
        ].filter(Boolean).join(' '), 260),
        mood: runtimeState.screenInsight?.mood || runtimeState.feelingState.label,
        tags: ['scene', 'residency', descriptor.id, runtimeState.currentScene.family || 'general'],
        metadata: buildMemoryMetadata({
          settleStage: descriptor.id,
          settleDepth: Number(nextDepth.toFixed(3)),
          lingerSeconds: Math.round(residency.lingerSeconds)
        })
      }).catch(() => {});
    }

    if (runtimeState.settings.presenceEnabled && ['settled', 'nested'].includes(descriptor.id) && descriptor.id !== residency.lastPresenceStage) {
      residency.lastPresenceStage = descriptor.id;
      queuePresenceCheck('settle', {
        reason: `Mai has ${descriptor.id === 'nested' ? 'quietly nested into' : 'settled into'} ${roomLabel}.`,
        userFacingHint: descriptor.id === 'nested'
          ? 'If you speak, sound like someone who has quietly been here for a while.'
          : 'If you speak, make it feel like a soft room-aware aside.'
      }, descriptor.id === 'nested' ? 2200 : 1600);
    }

    if (descriptor.id !== residency.lastSidecarStage) {
      residency.lastSidecarStage = descriptor.id;
      updateSocialMaiContext({
        sceneFamily: runtimeState.currentScene.family,
        sceneLabel: runtimeState.currentScene.label,
        settleState: descriptor.id,
        settleLine: getSceneResidencyLine(),
        sceneMemory: getCurrentSceneMemoryLine()
      }).catch(() => {});
    }
  }

  return residency;
}

function getTypingAttentionProfile(now = performance.now() / 1000) {
  const intensity = clamp01(runtimeState.typing.intensity || 0);
  const activeWindow = 4.8 + intensity * 4.6;
  const active = runtimeState.typing.isFocused && runtimeState.typing.isComposing && now - runtimeState.typing.lastTypedAt <= activeWindow;
  const holdSeconds = 18 + intensity * 18;
  let statusLine = '';
  let preset = 'curious';

  if (active) {
    if (intensity >= 0.72) {
      statusLine = 'Mai is holding still for your longer thought.';
      preset = 'idle';
    } else if (intensity >= 0.38 || runtimeState.typing.lineCount >= 3) {
      statusLine = 'Mai is quietly waiting for you to finish the thought.';
    } else {
      statusLine = 'Mai is listening while you write.';
    }
  }

  return {
    active,
    intensity,
    holdSeconds,
    statusLine,
    preset
  };
}

function isUserActivelyTyping(now = performance.now() / 1000) {
  return getTypingAttentionProfile(now).active;
}

function updateTypingState() {
  const now = performance.now() / 1000;
  const value = elements.messageInput.value || '';
  const trimmed = value.trim();
  const lineCount = trimmed
    ? trimmed.split(/\r?\n/).filter((line) => Boolean(line.trim())).length
    : 0;
  const charCount = trimmed.length;
  const intensity = trimmed
    ? clamp01(charCount / 220 + Math.max(0, lineCount - 1) * 0.18)
    : 0;
  runtimeState.typing.isComposing = Boolean(trimmed);
  runtimeState.typing.lastTypedAt = now;
  runtimeState.typing.chars = charCount;
  runtimeState.typing.lineCount = lineCount;
  runtimeState.typing.intensity = intensity;
  if (runtimeState.typing.isComposing) {
    const typingProfile = getTypingAttentionProfile(now);
    markListening(3.4 + intensity * 3.8);
    runtimeState.presence.nextSpeakAt = Math.max(runtimeState.presence.nextSpeakAt, now + typingProfile.holdSeconds);
  }
  resizeComposerInput();
  renderAvatarStatus();
  renderConversationState();
}

function clearTypingState() {
  runtimeState.typing.isComposing = false;
  runtimeState.typing.chars = 0;
  runtimeState.typing.lineCount = 0;
  runtimeState.typing.intensity = 0;
  resizeComposerInput(true);
  renderAvatarStatus();
  renderConversationState();
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

function getTimePhase(date = new Date()) {
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

const DRIVE_ORDER = ['attention', 'curiosity', 'rest', 'play', 'music', 'social'];

function buildAutonomyDayStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDriveSnapshot(drives = {}) {
  return DRIVE_ORDER.reduce((accumulator, drive) => {
    accumulator[drive] = clamp01(Number(drives?.[drive]) || 0);
    return accumulator;
  }, {});
}

function getAutonomyDrives() {
  runtimeState.autonomy.drives = clampDriveSnapshot(runtimeState.autonomy.drives);
  return runtimeState.autonomy.drives;
}

function getDriveEntries() {
  const drives = getAutonomyDrives();
  return DRIVE_ORDER.map((drive) => ({
    id: drive,
    value: clamp01(Number(drives[drive]) || 0)
  })).sort((left, right) => right.value - left.value);
}

function getDominantDrive() {
  const [top] = getDriveEntries();
  return top?.id || runtimeState.autonomy.dominantDrive || 'curiosity';
}

function getDriveDescriptor(drive = getDominantDrive()) {
  const descriptors = {
    attention: {
      label: 'attention',
      status: 'leaning toward you',
      prompt: 'You want gentle closeness and to stay tuned to the human.',
      bubble: 'Keeping close to your side...'
    },
    curiosity: {
      label: 'curiosity',
      status: 'curious about the room',
      prompt: 'You want to notice what is changing and understand the room better.',
      bubble: 'Curious about what changed here...'
    },
    rest: {
      label: 'rest',
      status: 'softly resting',
      prompt: 'You want quiet, warmth, and stillness more than activity.',
      bubble: 'Settling down and keeping the room soft...'
    },
    play: {
      label: 'play',
      status: 'playful',
      prompt: 'You want a little delight, motion, and game-like energy.',
      bubble: 'In a playful little mood...'
    },
    music: {
      label: 'music',
      status: 'reaching for music',
      prompt: 'You want the right music for the moment and to keep the vibe coherent.',
      bubble: 'Listening for the next good song...'
    },
    social: {
      label: 'social',
      status: 'socially curious',
      prompt: 'You want to peek outward and see if there is something worth sharing back.',
      bubble: 'Wondering if there is something shareable out there...'
    }
  };

  return descriptors[drive] || descriptors.curiosity;
}

function getDrivePromptLine() {
  const entries = getDriveEntries();
  const dominant = getDriveDescriptor(entries[0]?.id);
  const numeric = entries
    .map((entry) => `${entry.id} ${entry.value.toFixed(2)}`)
    .join(', ');
  return `${dominant.prompt} Current drives: ${numeric}.`;
}

function getDriveStatusLine() {
  const dominant = getDriveDescriptor(getDominantDrive());
  return `Mai is ${dominant.status} right now.`;
}

function applyDriveDelta(delta = {}, shouldPersist = false) {
  const drives = getAutonomyDrives();
  let changed = false;

  for (const drive of DRIVE_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(delta, drive)) {
      continue;
    }

    const nextValue = clamp01((Number(drives[drive]) || 0) + Number(delta[drive] || 0));
    if (Math.abs(nextValue - (Number(drives[drive]) || 0)) >= 0.0001) {
      drives[drive] = nextValue;
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  runtimeState.autonomy.dominantDrive = getDominantDrive();
  if (shouldPersist) {
    saveAutonomyState();
  }
}

function setAutonomyCooldown(eventId, seconds) {
  runtimeState.autonomy.eventCooldowns[eventId] = performance.now() / 1000 + Math.max(0, Number(seconds) || 0);
}

function isAutonomyCooldownActive(eventId, now = performance.now() / 1000) {
  return Number(runtimeState.autonomy.eventCooldowns?.[eventId] || 0) > now;
}

function markRoutineSeen(eventId, date = new Date()) {
  runtimeState.autonomy.routineLog[eventId] = buildAutonomyDayStamp(date);
}

function hasRoutineBeenSeen(eventId, date = new Date()) {
  return runtimeState.autonomy.routineLog?.[eventId] === buildAutonomyDayStamp(date);
}

function analyzeCompanionFeeling(text) {
  const source = String(text || '').trim();
  const lowered = source.toLowerCase();
  const tokens = tokenizeFeeling(source);
  const exclamations = (source.match(/!/g) || []).length;
  const questions = (source.match(/\?/g) || []).length;
  const ellipses = (source.match(/\.{3,}|…/g) || []).length;
  const scores = {
    idle: 0.9,
    wave: countFeelingHits(lowered, tokens, FEELING_KEYWORDS.wave) * 1.35,
    happy: countFeelingHits(lowered, tokens, FEELING_KEYWORDS.happy) * 1.2,
    curious: countFeelingHits(lowered, tokens, FEELING_KEYWORDS.curious) * 1.05,
    groove: countFeelingHits(lowered, tokens, FEELING_KEYWORDS.groove) * 1.45
  };

  scores.idle += countFeelingHits(lowered, tokens, FEELING_KEYWORDS.settled) * 0.95;
  scores.happy += Math.min(2.4, exclamations * 0.55);
  scores.curious += Math.min(2.2, questions * 0.9);
  scores.idle += Math.min(1.4, ellipses * 0.45);

  if (/\b(hello there|good to see you|nice to see you)\b/i.test(source)) {
    scores.wave += 1.1;
    scores.happy += 0.4;
  }

  if (/\b(thanks|thank you)\b/i.test(source)) {
    scores.happy += 0.8;
  }

  if (/\b(sorry|apologies|oops|whoops)\b/i.test(source)) {
    scores.idle += 1.1;
    scores.curious += 0.35;
  }

  if (/\b(playlist|jukebox|dj|song|music|beat|tune)\b/i.test(source)) {
    scores.groove += 0.9;
  }

  if (/\b(working|coding|debug|build|ship|fix)\b/i.test(source) && /\b(song|music|playlist|tune)\b/i.test(source)) {
    scores.groove += 0.7;
  }

  if (/\b(hehe|haha|lol|lmao|tease|teasing|silly)\b/i.test(source)) {
    scores.happy += 1;
  }

  if (/\b(maybe|perhaps|wonder|guess|think)\b/i.test(source)) {
    scores.curious += 0.7;
  }

  const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  const [topPreset, topScore] = ranked[0] || ['idle', 1];
  const secondScore = ranked[1]?.[1] || 0;
  const preset = topPreset === 'settled' ? 'idle' : topPreset;
  const confidence = clamp(0.46 + (topScore - secondScore) * 0.18, 0.28, 0.96);
  const intensity = clamp(0.34 + topScore * 0.11 + exclamations * 0.04 + questions * 0.03, 0.28, 0.96);

  let label = 'settled';
  if (preset === 'wave') {
    label = scores.happy > 1.8 ? 'greeting' : 'attentive';
  } else if (preset === 'happy') {
    if (/\b(tease|teasing|meme|hehe|haha|lol|lmao|silly)\b/i.test(source)) {
      label = 'playful';
    } else if (/\b(cute|adorable|sweet|love|cozy|lovely)\b/i.test(source)) {
      label = 'affectionate';
    } else {
      label = 'bright';
    }
  } else if (preset === 'curious') {
    label = questions ? 'curious' : 'thoughtful';
  } else if (preset === 'groove') {
    label = 'groovy';
  }

  return {
    label,
    preset,
    intensity,
    confidence,
    durationSeconds: clamp(2.8 + intensity * (preset === 'idle' ? 2.2 : 3.5), 2.6, 6.2),
    expiresAt: performance.now() / 1000 + clamp(4 + intensity * 5.5, 4, 8.5),
    lastLine: source
  };
}

function renderFeelingState() {
  const feeling = runtimeState.feelingState;
  elements.feelingChip.textContent = t('feelingPrefix', { label: feeling.label });
  elements.feelingChip.classList.toggle('active', feeling.preset !== 'idle' || feeling.confidence >= 0.72);
}

function describeAffectMood() {
  const affect = runtimeState.affect;
  const mood = [];

  if (affect.sleepiness >= 0.72) {
    mood.push(t('sleepingMood'));
  } else if (affect.energy >= 0.72) {
    mood.push(t('brightMood'));
  } else if (affect.calm >= 0.7) {
    mood.push(t('calmMood'));
  } else {
    mood.push(t('settledMood'));
  }

  if (affect.affection >= 0.68) {
    mood.push(t('fondMood'));
  } else if (affect.curiosity >= 0.68) {
    mood.push(t('curiousMood'));
  } else if (affect.focus >= 0.68) {
    mood.push(t('focusedMood'));
  }

  return mood.join(' and ');
}

function renderAvatarStatus() {
  const state = runtimeState.avatarStatusState;
  const base = state.error || state.transient || state.info || t('avatarDefaultStatus');

  if (state.error || state.transient || !runtimeState.avatarStatusState.info) {
    elements.avatarStatus.textContent = base;
    return;
  }

  const home = !isTransparentCompanionMode() && runtimeState.home?.useScene ? getActiveHomeEnvironment() : null;
  const homeNote = home ? ` ${t('avatarHomeLabel', { name: home.label })}` : t('transparentGlassMode');
  const sceneNote = runtimeState.currentScene.visitCount >= 2 ? t('familiarRoom') : '';
  const sceneRole = runtimeState.currentScene.family && runtimeState.currentScene.family !== 'general'
    ? ` ${getSceneFamilyDescriptor(runtimeState.currentScene.family).status}.`
    : '';
  const driveNote = ` ${getDriveStatusLine()}`;
  const typingProfile = getTypingAttentionProfile();
  const typingNote = typingProfile.active && typingProfile.statusLine ? ` ${typingProfile.statusLine}` : '';
  elements.avatarStatus.textContent = `${base}${homeNote}${t('maiFeelsThisPhase', {
    name: ASSISTANT_NAME,
    mood: describeAffectMood(),
    phase: runtimeState.affect.phase
  })}${sceneNote}${sceneRole}${driveNote}${typingNote}`;
  renderAvatarConsole();
  renderOverviewBar();
}

function setAvatarStatusInfo(text) {
  runtimeState.avatarStatusState.info = text;
  runtimeState.avatarStatusState.transient = '';
  runtimeState.avatarStatusState.error = '';
  renderAvatarStatus();
}

function setAvatarStatusTransient(text) {
  runtimeState.avatarStatusState.transient = text;
  runtimeState.avatarStatusState.error = '';
  renderAvatarStatus();
}

function setAvatarStatusError(text) {
  runtimeState.avatarStatusState.error = text;
  runtimeState.avatarStatusState.transient = '';
  renderAvatarStatus();
}

function noteInteraction(boost = {}) {
  runtimeState.affect.lastInteractionAt = performance.now() / 1000;
  applyDriveDelta({
    attention: 0.07,
    curiosity: 0.03,
    rest: -0.04,
    social: 0.02
  });
  applyAffectDelta({
    energy: 0.02,
    focus: 0.04,
    sleepiness: -0.04,
    sociability: 0.03,
    ...boost
  });
}

function applyAffectDelta(delta = {}) {
  const affect = runtimeState.affect;
  affect.energy = clamp01(affect.energy + (delta.energy || 0));
  affect.affection = clamp01(affect.affection + (delta.affection || 0));
  affect.focus = clamp01(affect.focus + (delta.focus || 0));
  affect.curiosity = clamp01(affect.curiosity + (delta.curiosity || 0));
  affect.calm = clamp01(affect.calm + (delta.calm || 0));
  affect.sociability = clamp01(affect.sociability + (delta.sociability || 0));
  affect.sleepiness = clamp01(affect.sleepiness + (delta.sleepiness || 0));
  renderAvatarStatus();
}

function updateAffectFromFeeling(feeling, source = 'assistant') {
  if (!feeling) {
    return;
  }

  const delta = {
    calm: 0.01
  };

  if (feeling.preset === 'happy') {
    delta.energy = 0.03;
    delta.affection = source === 'assistant' ? 0.05 : 0.03;
    delta.sociability = 0.04;
    delta.sleepiness = -0.02;
  } else if (feeling.preset === 'wave') {
    delta.affection = 0.04;
    delta.sociability = 0.05;
    delta.focus = 0.02;
  } else if (feeling.preset === 'curious') {
    delta.curiosity = 0.06;
    delta.focus = 0.04;
    delta.calm = -0.01;
  } else if (feeling.preset === 'groove') {
    delta.energy = 0.05;
    delta.affection = 0.02;
    delta.sleepiness = -0.04;
  } else {
    delta.calm = 0.02;
  }

  applyAffectDelta(delta);
  if (feeling.preset === 'happy' || feeling.preset === 'wave') {
    applyDriveDelta({
      attention: 0.03,
      play: 0.03,
      social: 0.02,
      rest: -0.01
    });
  } else if (feeling.preset === 'curious') {
    applyDriveDelta({
      curiosity: 0.05,
      attention: 0.01
    });
  } else if (feeling.preset === 'groove') {
    applyDriveDelta({
      music: 0.06,
      play: 0.04,
      rest: -0.03
    });
  }
}

function getAffectPromptLine() {
  const affect = runtimeState.affect;
  const scenePrompt = getScenePromptLine();
  const residencyPrompt = getSceneResidencyPromptLine();
  return `${scenePrompt ? `${scenePrompt} ` : ''}${residencyPrompt ? `${residencyPrompt} ` : ''}${getDrivePromptLine()} Your current inner state is ${describeAffectMood()} during the ${affect.phase}. Energy ${affect.energy.toFixed(2)}, affection ${affect.affection.toFixed(2)}, focus ${affect.focus.toFixed(2)}, curiosity ${affect.curiosity.toFixed(2)}, sleepiness ${affect.sleepiness.toFixed(2)}.`;
}

function inferMusicMoodProfile() {
  const track = runtimeState.currentTrack;
  if (!track || elements.audioPlayer.paused) {
    return {
      key: 'none',
      confidence: 0,
      presetBias: '',
      affect: {}
    };
  }

  const source = [
    track.title,
    track.artist,
    track.album,
    track.searchBlob,
    runtimeState.currentTrackReason,
    runtimeState.screenInsight?.suggestedMusicVibe
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const profiles = [
    {
      key: 'upbeat',
      presetBias: 'groove',
      tokens: ['dance', 'party', 'club', 'disco', 'funk', 'groove', 'upbeat', 'house', 'edm', 'electro', 'hyper', 'arcade'],
      affect: { energy: 0.1, affection: 0.03, sociability: 0.05, sleepiness: -0.08, calm: -0.02 }
    },
    {
      key: 'focus',
      presetBias: 'curious',
      tokens: ['focus', 'study', 'ambient', 'instrumental', 'piano', 'drone', 'lofi', 'synth', 'soundtrack', 'calm'],
      affect: { focus: 0.08, calm: 0.06, curiosity: 0.03, energy: -0.01, sociability: -0.03 }
    },
    {
      key: 'soft',
      presetBias: 'idle',
      tokens: ['soft', 'rain', 'sleep', 'night', 'dream', 'chill', 'slow', 'gentle', 'acoustic', 'cozy'],
      affect: { calm: 0.09, affection: 0.04, sleepiness: 0.08, energy: -0.07, sociability: -0.02 }
    },
    {
      key: 'bright',
      presetBias: 'happy',
      tokens: ['happy', 'sunny', 'bright', 'pop', 'smile', 'love', 'cute', 'fun'],
      affect: { affection: 0.07, energy: 0.04, sociability: 0.04, sleepiness: -0.04, calm: 0.02 }
    }
  ];

  let best = profiles[0];
  let bestScore = 0;
  for (const profile of profiles) {
    const score = profile.tokens.reduce((total, token) => total + (source.includes(token) ? 1 : 0), 0);
    if (score > bestScore) {
      best = profile;
      bestScore = score;
    }
  }

  if (bestScore <= 0) {
    return {
      key: 'neutral',
      confidence: 0.12,
      presetBias: 'happy',
      affect: { energy: 0.03, sleepiness: -0.03 }
    };
  }

  return {
    key: best.key,
    confidence: clamp(bestScore / 4, 0.2, 1),
    presetBias: best.presetBias,
    affect: best.affect
  };
}

function updateAffectDrift(delta, now) {
  const affect = runtimeState.affect;
  const phase = getTimePhase();
  const drives = getAutonomyDrives();
  affect.phase = phase;

  const phaseTargets = {
    morning: { energy: 0.62, affection: 0.58, focus: 0.56, curiosity: 0.62, calm: 0.58, sociability: 0.6, sleepiness: 0.2 },
    day: { energy: 0.72, affection: 0.56, focus: 0.68, curiosity: 0.57, calm: 0.5, sociability: 0.55, sleepiness: 0.12 },
    evening: { energy: 0.54, affection: 0.68, focus: 0.52, curiosity: 0.5, calm: 0.72, sociability: 0.62, sleepiness: 0.36 },
    night: { energy: 0.36, affection: 0.62, focus: 0.38, curiosity: 0.4, calm: 0.76, sociability: 0.42, sleepiness: 0.72 }
  }[phase];

  const inactivity = Math.max(0, now - (affect.lastInteractionAt || now));
  const musicActive = Boolean(runtimeState.currentTrack && !elements.audioPlayer.paused);
  const musicMood = inferMusicMoodProfile();
  const sceneAffect = getSceneFamilyDescriptor(runtimeState.currentScene.family).affect || {};
  const residencyAffect = getSceneResidencyDescriptor().affect || {};
  const typingProfile = getTypingAttentionProfile(now);
  const typingIntensity = typingProfile.active ? typingProfile.intensity : 0;
  const idleDepth = clamp((inactivity - 45) / 300, 0, 1);
  const activeDepth = clamp((25 - inactivity) / 25, 0, 1);
  const moodMix = musicActive ? musicMood.confidence : 0;
  const follow = Math.min(1, delta * 0.22);

  affect.energy = lerp(
    affect.energy,
    phaseTargets.energy + (musicActive ? 0.08 : 0) - idleDepth * 0.12 + activeDepth * 0.04 + (sceneAffect.energy || 0) + (residencyAffect.energy || 0) + (musicMood.affect.energy || 0) * moodMix - typingIntensity * 0.05 + drives.play * 0.08 + drives.music * 0.03 - drives.rest * 0.09,
    follow
  );
  affect.affection = lerp(
    affect.affection,
    phaseTargets.affection + (runtimeState.socialMai.enabled ? 0.02 : 0) + (sceneAffect.affection || 0) + (residencyAffect.affection || 0) + (musicMood.affect.affection || 0) * moodMix + drives.attention * 0.06 + drives.social * 0.04,
    follow * 0.8
  );
  affect.focus = lerp(
    affect.focus,
    phaseTargets.focus + (runtimeState.screenInsight ? 0.06 : 0) + (runtimeState.loading ? 0.08 : 0) + (sceneAffect.focus || 0) + (residencyAffect.focus || 0) + (musicMood.affect.focus || 0) * moodMix + typingIntensity * 0.12 + drives.attention * 0.05 - drives.play * 0.04,
    follow * 0.85
  );
  affect.curiosity = lerp(
    affect.curiosity,
    phaseTargets.curiosity + (runtimeState.screenInsight ? 0.03 : 0) + (sceneAffect.curiosity || 0) + (residencyAffect.curiosity || 0) + (musicMood.affect.curiosity || 0) * moodMix - typingIntensity * 0.04 + drives.curiosity * 0.12,
    follow * 0.9
  );
  affect.calm = lerp(
    affect.calm,
    phaseTargets.calm + idleDepth * 0.08 + (sceneAffect.calm || 0) + (residencyAffect.calm || 0) + (musicMood.affect.calm || 0) * moodMix + typingIntensity * 0.06 + drives.rest * 0.11 - drives.play * 0.05,
    follow * 0.75
  );
  affect.sociability = lerp(
    affect.sociability,
    phaseTargets.sociability + (runtimeState.socialMai.enabled ? 0.04 : 0) + (sceneAffect.sociability || 0) + (residencyAffect.sociability || 0) + (musicMood.affect.sociability || 0) * moodMix - typingIntensity * 0.05 + drives.social * 0.12 + drives.play * 0.04,
    follow * 0.75
  );
  affect.sleepiness = lerp(
    affect.sleepiness,
    phaseTargets.sleepiness + idleDepth * 0.1 - (musicActive ? 0.1 : 0) + (sceneAffect.sleepiness || 0) + (residencyAffect.sleepiness || 0) + (musicMood.affect.sleepiness || 0) * moodMix - typingIntensity * 0.04 + drives.rest * 0.14 - drives.music * 0.04 - drives.play * 0.03,
    follow * 0.8
  );

  affect.energy = clamp01(affect.energy);
  affect.affection = clamp01(affect.affection);
  affect.focus = clamp01(affect.focus);
  affect.curiosity = clamp01(affect.curiosity);
  affect.calm = clamp01(affect.calm);
  affect.sociability = clamp01(affect.sociability);
  affect.sleepiness = clamp01(affect.sleepiness);
}

function setFeelingState(feeling) {
  runtimeState.feelingState = feeling;
  updateAffectFromFeeling(feeling, 'assistant');
  renderFeelingState();
  renderAvatarStatus();
}

function buildScreenPresenceKey(insight) {
  if (!insight) {
    return '';
  }

  return normalizePresenceKey([
    insight.activeWindowTitle,
    insight.summary,
    insight.mood,
    insight.suggestedMusicVibe
  ].filter(Boolean).join(' | '));
}

function hasFreshScreenPresence(insight) {
  const key = buildScreenPresenceKey(insight);
  if (!key || key === runtimeState.presence.lastScreenKey) {
    return false;
  }

  runtimeState.presence.lastScreenKey = key;
  return true;
}

function hasFreshTrackPresence(track) {
  const nextId = track?.id || '';
  if (!nextId || nextId === runtimeState.presence.lastTrackId) {
    return false;
  }

  runtimeState.presence.lastTrackId = nextId;
  return true;
}

function renderSocialState() {
  if (!SOCIAL_SIDECAR_ENABLED) {
    elements.socialChip.textContent = t('standaloneBuild');
    elements.socialChip.classList.remove('active');
    renderOverviewBar();
    renderQuickActions();
    return;
  }

  const social = runtimeState.socialMai;
  let label = t('socialAsleep');

  if (!social.hasKey) {
    label = t('socialNoKey');
  } else if (social.busy) {
    label = t('socialBrowsing');
  } else if (social.enabled) {
    label = t('socialAwake');
  }

  elements.socialChip.textContent = label;
  elements.socialChip.classList.toggle('active', social.enabled || social.busy);
  renderOverviewBar();
  renderQuickActions();
}

function mergeSocialStatus(status = {}) {
  runtimeState.socialMai = {
    ...runtimeState.socialMai,
    enabled: Boolean(status.enabled),
    busy: Boolean(status.busy),
    hasKey: Boolean(status.hasKey),
    digest: obfuscateThirdPartyNames(status.digest || runtimeState.socialMai.digest || ''),
    lastRunAt: status.lastRunAt || runtimeState.socialMai.lastRunAt || '',
    recentEvents: status.recentEvents || runtimeState.socialMai.recentEvents || [],
    unsubscribe: runtimeState.socialMai.unsubscribe
  };

  renderSocialState();
  renderPanelSummaries();
}

function buildChatPrompt() {
  const parts = [buildChatPromptBase()];
  const chatProfile = getKnownModelProfile(getSelectedChatModelId());

  if (chatProfile.adapterTier !== 'flagship') {
    parts.push(
      `You are currently running through a ${chatProfile.adapterTier} local model adapter. Stay grounded, concise, and avoid pretending you saw or inferred more than you really did.`
    );
  }

  parts.push(getAffectPromptLine());

  if (runtimeState.memory.reflectionDigest) {
    parts.push(
      `Stable long-term reflections about your relationship, taste, and current arc:\n${runtimeState.memory.reflectionDigest}`
    );
  }

  const memoryLines = [];
  if (runtimeState.memory.compressText) {
    memoryLines.push(`- ${runtimeState.memory.compressText}`);
  }
  if (runtimeState.memory.digest) {
    memoryLines.push(runtimeState.memory.digest);
  }
  if (memoryLines.length) {
    parts.push(`Relevant long-term memory chunks for this moment:\n${memoryLines.join('\n')}`);
  }

  if (SOCIAL_SIDECAR_ENABLED && runtimeState.socialMai.digest) {
    parts.push(
      `Your separate social sidecar is part of the same overall Mai personality. Recent social context: ${runtimeState.socialMai.digest}`
    );
  }

  if (runtimeState.settings.personalityTone) {
    parts.push(`User-tuned personality guidance: ${runtimeState.settings.personalityTone}`);
  }

  if (runtimeState.settings.memoryFocus) {
    parts.push(`Memory focus guidance: ${runtimeState.settings.memoryFocus}`);
  }

  return parts.join(' ');
}

function getPreferredMemoryLanes(text = '') {
  const source = [
    text,
    runtimeState.screenInsight?.summary,
    runtimeState.currentScene.family,
    runtimeState.currentTrackReason
  ].filter(Boolean).join(' ').toLowerCase();
  const lanes = new Set(['relationship', 'project']);

  if (runtimeState.currentScene.key || /\b(room|scene|window|browser|code|terminal|game|music)\b/.test(source)) {
    lanes.add('place');
  }

  if (runtimeState.currentTrack || /\b(song|track|music|playlist|dj|taste)\b/.test(source)) {
    lanes.add('taste');
  }

  if (/\b(morning|evening|night|return|ritual|routine|habit|sleep)\b/.test(source)) {
    lanes.add('ritual');
  }

  lanes.add('episodic');
  return [...lanes];
}

function buildMemoryQuery(text = '') {
  const chatProfile = getKnownModelProfile(getSelectedChatModelId());
  const activeWindowTitle = runtimeState.screenInsight?.activeWindowTitle || runtimeState.systemSense.activeWindowTitle || '';
  const activeProcessName = runtimeState.screenInsight?.activeProcessName || runtimeState.systemSense.activeProcessName || '';
  return {
    text: [
      text,
      runtimeState.screenInsight?.summary,
      activeWindowTitle,
      activeProcessName,
      getCurrentSceneMemoryLine(),
      getSceneResidencyLine(),
      runtimeState.currentTrack ? `${runtimeState.currentTrack.artist || 'Unknown artist'} ${runtimeState.currentTrack.title} ${runtimeState.currentTrackReason}` : '',
      runtimeState.socialMai.digest,
      runtimeState.feelingState.label
    ].filter(Boolean).join(' '),
    userMessage: text,
    screenSummary: runtimeState.screenInsight?.summary || '',
    windowTitle: activeWindowTitle,
    assistantMessage: getCurrentSceneMemoryLine(),
    currentTrack: runtimeState.currentTrack ? `${runtimeState.currentTrack.artist || 'Unknown artist'} - ${runtimeState.currentTrack.title}` : '',
    socialDigest: runtimeState.socialMai.digest || '',
    feelingLabel: runtimeState.feelingState.label || '',
    sceneKey: runtimeState.currentScene.key || '',
    sceneFamily: runtimeState.currentScene.family || '',
    timePhase: getTimePhase(),
    trackId: runtimeState.currentTrack?.id || '',
    preferredKinds: [
      'user_message',
      'assistant_message',
      'screen_insight',
      'scene_visit',
      'scene_transition',
      'scene_residency',
      'music_moment',
      'taste_preference',
      'presence_ritual',
      'media_share',
      'social_share',
      'social_post',
      'sidecar_alert'
    ],
    preferredSources: ['mai-companion', 'screen-watch', 'system-sense', 'auto-dj', 'social-mai', 'autonomy-daemon'],
    preferredLanes: getPreferredMemoryLanes(text),
    tags: [
      runtimeState.screenInsight ? 'screen' : '',
      runtimeState.currentScene.key ? 'scene' : '',
      runtimeState.currentScene.family || '',
      runtimeState.residency.stageId || '',
      runtimeState.currentTrack ? 'music' : '',
      runtimeState.socialMai.digest ? 'social' : '',
      runtimeState.feelingState.label || ''
    ].filter(Boolean),
    limit: 6,
    maxChars: Math.max(260, chatProfile.preferredMemoryChars || 920)
  };
}

function scheduleDeferredMemoryRecall() {
  if (runtimeState.memory.memoryRecallDebounceTimer) {
    clearTimeout(runtimeState.memory.memoryRecallDebounceTimer);
  }

  runtimeState.memory.memoryRecallDebounceTimer = window.setTimeout(() => {
    runtimeState.memory.memoryRecallDebounceTimer = null;
    refreshRelevantMemories('').catch(() => {});
  }, 3200);
}

async function refreshRelevantMemories(text = '') {
  try {
    const recall = await window.desktopCompanion.recallMemories(buildMemoryQuery(text));
    runtimeState.memory.digest = recall?.digest || '';
    runtimeState.memory.reflectionDigest = recall?.reflectionDigest || runtimeState.memory.reflectionDigest || '';
    runtimeState.memory.reflections = recall?.reflections || runtimeState.memory.reflections || [];
    runtimeState.memory.totalMemories = recall?.totalMemories || runtimeState.memory.totalMemories;
    runtimeState.memory.lastResults = recall?.results || [];
    return recall;
  } catch {
    return {
      digest: runtimeState.memory.digest,
      reflectionDigest: runtimeState.memory.reflectionDigest,
      reflections: runtimeState.memory.reflections,
      totalMemories: runtimeState.memory.totalMemories,
      results: runtimeState.memory.lastResults
    };
  }
}

async function refreshMemoryStatus() {
  try {
    const [status, reflections, sessionResult] = await Promise.all([
      window.desktopCompanion.getMemoryStatus(),
      window.desktopCompanion.getMemoryReflections(),
      window.desktopCompanion.getSessionCompress().catch(() => null)
    ]);
    runtimeState.memory.totalMemories = status?.totalMemories || 0;
    runtimeState.memory.reflectionDigest = reflections?.digest || runtimeState.memory.reflectionDigest || '';
    runtimeState.memory.reflections = [
      reflections?.relationship,
      reflections?.currentArc,
      reflections?.projectFocus,
      reflections?.taste,
      reflections?.habits
    ].filter(Boolean);
    if (sessionResult && typeof sessionResult === 'object') {
      if (typeof sessionResult.text === 'string') {
        runtimeState.memory.compressText = sessionResult.text;
      }
      if (Number.isFinite(Number(sessionResult.historyAnchor))) {
        runtimeState.memory.compressHistoryAnchor = Number(sessionResult.historyAnchor);
      }
    }
    return {
      ...status,
      reflections
    };
  } catch {
    return null;
  }
}

function scheduleSessionCompressRefresh() {
  if (runtimeState.memory.sessionCompressTimer) {
    clearTimeout(runtimeState.memory.sessionCompressTimer);
  }

  runtimeState.memory.sessionCompressTimer = window.setTimeout(() => {
    runtimeState.memory.sessionCompressTimer = null;
    runSessionCompressRefresh().catch(() => {});
  }, 5000);
}

async function runSessionCompressRefresh() {
  const anchor = runtimeState.memory.compressHistoryAnchor || 0;
  const hist = runtimeState.chatHistory;
  if (hist.length - anchor < 10 || runtimeState.memory.sessionCompressBusy) {
    return;
  }

  const config = getConfig();
  if (!config.baseUrl || !getSelectedChatModelId()) {
    return;
  }

  runtimeState.memory.sessionCompressBusy = true;
  try {
    const slice = hist.slice(anchor);
    const next = await window.desktopCompanion.refreshSessionCompress({
      config,
      historyAnchor: anchor,
      messages: slice,
      fullHistoryLength: hist.length
    });
    if (next && typeof next === 'object') {
      runtimeState.memory.compressText = next.text || '';
      runtimeState.memory.compressHistoryAnchor = Number.isFinite(Number(next.historyAnchor))
        ? Number(next.historyAnchor)
        : hist.length;
    }
  } finally {
    runtimeState.memory.sessionCompressBusy = false;
  }
}

function buildPresenceSeedText(triggerType, meta = {}) {
  if (triggerType === 'music') {
    return [
      meta.reason,
      runtimeState.currentTrack ? describeTrack(runtimeState.currentTrack) : '',
      runtimeState.screenInsight?.summary,
      runtimeState.screenInsight?.suggestedMusicVibe,
      getSceneResidencyLine()
    ].filter(Boolean).join(' ');
  }

  if (triggerType === 'screen') {
    return [
      runtimeState.screenInsight?.summary,
      runtimeState.screenInsight?.mood,
      runtimeState.screenInsight?.activeWindowTitle,
      meta.reason,
      getSceneResidencyLine()
    ].filter(Boolean).join(' ');
  }

  if (triggerType === 'scene-transition') {
    return [
      meta.reason,
      runtimeState.screenInsight?.activeWindowTitle,
      runtimeState.screenInsight?.summary,
      getCurrentSceneMemoryLine(),
      getSceneResidencyLine(),
      runtimeState.currentTrack ? describeTrack(runtimeState.currentTrack) : ''
    ].filter(Boolean).join(' ');
  }

  if (triggerType === 'settle') {
    return [
      runtimeState.screenInsight?.summary,
      getSceneResidencyLine(),
      runtimeState.currentTrack ? describeTrack(runtimeState.currentTrack) : '',
      runtimeState.socialMai.digest
    ].filter(Boolean).join(' ');
  }

  return [
    meta.reason,
    runtimeState.screenInsight?.summary,
    getSceneResidencyLine(),
    runtimeState.currentTrack ? describeTrack(runtimeState.currentTrack) : '',
    runtimeState.socialMai.digest
  ].filter(Boolean).join(' ');
}

async function maybeSpeakProactively(triggerType, meta = {}) {
  if (!runtimeState.settings.presenceEnabled || runtimeState.presence.busy || runtimeState.loading) {
    return false;
  }

  const now = performance.now() / 1000;
  const settleDescriptor = getSceneResidencyDescriptor();
  const basePresenceConfig = getScenePresenceConfig(runtimeState.currentScene.family);
  const presenceConfig = {
    guidance: `${basePresenceConfig.guidance} ${settleDescriptor.presenceNote}`.trim(),
    retryCooldown: Math.round(basePresenceConfig.retryCooldown * (settleDescriptor.retryScale || 1)),
    defaultCooldown: Math.round(basePresenceConfig.defaultCooldown * (settleDescriptor.defaultScale || 1))
  };
  const typingProfile = getTypingAttentionProfile(now);
  if (typingProfile.active) {
    runtimeState.presence.nextSpeakAt = Math.max(runtimeState.presence.nextSpeakAt, now + Math.max(presenceConfig.retryCooldown, typingProfile.holdSeconds));
    return false;
  }
  if (triggerType === 'settle' && runtimeState.residency.depth < 0.28) {
    runtimeState.presence.nextSpeakAt = now + presenceConfig.retryCooldown;
    return false;
  }
  if (
    triggerType === 'settle' &&
    runtimeState.affect.sleepiness >= 0.7 &&
    (!runtimeState.currentTrack || elements.audioPlayer.paused)
  ) {
    runtimeState.presence.nextSpeakAt = now + 90;
    return false;
  }
  if (now < runtimeState.presence.nextSpeakAt) {
    return false;
  }

  const modelId = getSelectedChatModelId();
  if (!modelId) {
    return false;
  }

  runtimeState.presence.busy = true;
  try {
    const chatProfile = getKnownModelProfile(modelId);
    const presenceRecall = await window.desktopCompanion.recallMemories({
      ...buildMemoryQuery(buildPresenceSeedText(triggerType, meta)),
      limit: 4,
      maxChars: Math.max(220, Math.min(chatProfile.preferredMemoryChars || 420, 520))
    });
    const response = await invokeStudioChat(
      getConfig(),
      [
        { role: 'system', content: buildPresencePromptBase() },
        {
          role: 'user',
          content: [
            `Trigger: ${triggerType}.`,
            runtimeState.screenInsight?.summary ? `Screen: ${runtimeState.screenInsight.summary}` : 'Screen: none yet.',
            runtimeState.screenInsight?.mood ? `Screen mood: ${runtimeState.screenInsight.mood}` : '',
            runtimeState.currentTrack ? `Music: ${describeTrack(runtimeState.currentTrack)}${runtimeState.currentTrackReason ? ` | ${runtimeState.currentTrackReason}` : ''}` : 'Music: none.',
            runtimeState.socialMai.digest ? `Social: ${runtimeState.socialMai.digest}` : '',
            `Presence style: ${presenceConfig.guidance}`,
            getCurrentSceneMemoryLine() ? `Scene memory: ${getCurrentSceneMemoryLine()}` : '',
            getSceneResidencyLine() ? `Room settling: ${getSceneResidencyLine()}` : '',
            getAffectPromptLine(),
            runtimeState.memory.compressText
              ? trimText(runtimeState.memory.compressText, 520)
              : '',
            presenceRecall?.reflectionDigest ? `Stable reflections:\n${presenceRecall.reflectionDigest}` : '',
            runtimeState.feelingState.label ? `Current feeling: ${runtimeState.feelingState.label}` : '',
            presenceRecall?.digest ? `Relevant memory:\n${presenceRecall.digest}` : '',
            meta.reason ? `Fresh change: ${meta.reason}` : '',
            meta.userFacingHint ? `Hint: ${meta.userFacingHint}` : ''
          ].filter(Boolean).join('\n\n')
        }
      ],
      {
        historyWindow: 2,
        requestKind: 'presence',
        queueKey: 'presence',
        preemptible: true
      }
    );
    cacheModelProfile(response.profile);

    let payload = null;
    try {
      payload = parseJsonBlock(response.text);
    } catch {
      payload = {
        should_speak: Boolean(response.text),
        line: response.text,
        preset: '',
        cooldown_seconds: 55
      };
    }

    const line = trimText(payload?.line || '', 120);
    const normalizedLine = normalizePresenceKey(line);
    const recentAssistantLines = runtimeState.chatHistory
      .filter((entry) => entry.role === 'assistant')
      .slice(-3)
      .map((entry) => normalizePresenceKey(entry.content));
    const inferredSpeakIntent = typeof payload?.should_speak === 'boolean'
      ? payload.should_speak
      : Boolean(line) && triggerType !== 'settle';
    const shouldSpeak = inferredSpeakIntent && line && !recentAssistantLines.includes(normalizedLine);

    if (!shouldSpeak || normalizedLine === normalizePresenceKey(runtimeState.presence.lastSpokenLine)) {
      runtimeState.presence.nextSpeakAt = now + presenceConfig.retryCooldown;
      return false;
    }

    runtimeState.presence.lastSpokenLine = line;
    runtimeState.presence.nextSpeakAt = now + clamp(Number(payload?.cooldown_seconds) || presenceConfig.defaultCooldown || (triggerType === 'music' ? 52 : 76), 24, 180);
    applyAffectDelta({
      affection: 0.02,
      sociability: 0.03,
      curiosity: triggerType === 'screen' ? 0.03 : 0
    });
    postAssistantLine(line, true, {
      allowContextMedia: true,
      triggerType
    });

    if (['wave', 'happy', 'curious', 'groove'].includes(String(payload?.preset || ''))) {
      triggerPreset(String(payload.preset), 3.2);
    }

    return true;
  } catch {
    runtimeState.presence.nextSpeakAt = now + Math.max(18, Math.round(presenceConfig.retryCooldown * 0.75));
    return false;
  } finally {
    runtimeState.presence.busy = false;
  }
}

function queuePresenceCheck(triggerType, meta = {}, delayMs = 1200) {
  if (!runtimeState.settings.presenceEnabled) {
    return;
  }

  if (runtimeState.presence.queuedTimer) {
    clearTimeout(runtimeState.presence.queuedTimer);
  }

  runtimeState.presence.queuedTimer = window.setTimeout(() => {
    runtimeState.presence.queuedTimer = null;
    maybeSpeakProactively(triggerType, meta).catch(() => {});
  }, delayMs);
}

function startPresencePulse() {
  if (runtimeState.presence.pulseTimer) {
    clearInterval(runtimeState.presence.pulseTimer);
    runtimeState.presence.pulseTimer = null;
  }

  runtimeState.presence.pulseTimer = window.setInterval(() => {
    if (
      !runtimeState.settings.presenceEnabled ||
      runtimeState.loading ||
      document.hidden ||
      runtimeState.presence.busy ||
      !getSelectedChatModelId()
    ) {
      return;
    }

    const now = performance.now() / 1000;
    const hasContext = Boolean(
      runtimeState.screenInsight ||
      runtimeState.currentTrack ||
      runtimeState.socialMai.enabled ||
      (runtimeState.currentScene.key && runtimeState.residency.depth >= 0.32)
    );

    if (!hasContext || now < runtimeState.presence.nextSpeakAt) {
      return;
    }

    queuePresenceCheck('settle', {
      reason: 'Mai has been quietly sharing the room for a while and can offer one soft aside if it still feels fresh.',
      userFacingHint: 'Sound continuous and companionable, not novelty-seeking.'
    }, 400);
  }, 95000);
}

async function updateSocialMaiContext(patch = {}) {
  const fallbackWindowTitle = runtimeState.systemSense.activeWindowTitle || '';
  const fallbackProcessName = runtimeState.systemSense.activeProcessName || '';
  const payload = {
    llmConfig: getConfig(),
    screenInsight: runtimeState.screenInsight
      ? {
          summary: runtimeState.screenInsight.summary,
          mood: runtimeState.screenInsight.mood,
          activeWindowTitle: runtimeState.screenInsight.activeWindowTitle,
          activeProcessName: runtimeState.screenInsight.activeProcessName || fallbackProcessName
        }
      : (fallbackWindowTitle || fallbackProcessName)
      ? {
          summary: '',
          mood: '',
          activeWindowTitle: fallbackWindowTitle,
          activeProcessName: fallbackProcessName
        }
      : null,
    currentTrack: runtimeState.currentTrack
      ? {
          id: runtimeState.currentTrack.id || '',
          title: runtimeState.currentTrack.title,
          artist: runtimeState.currentTrack.artist,
          album: runtimeState.currentTrack.album,
          reason: runtimeState.currentTrackReason
        }
      : null,
    sceneMemory: getCurrentSceneMemoryLine(),
    sceneFamily: runtimeState.currentScene.family,
    sceneKey: runtimeState.currentScene.key || '',
    sceneLabel: runtimeState.currentScene.label,
    timePhase: getTimePhase(),
    settleState: runtimeState.residency.stageId,
    settleLine: getSceneResidencyLine(),
    dominantDrive: getDominantDrive(),
    driveSummary: getDrivePromptLine(),
    feelingLabel: runtimeState.feelingState.label,
    activeWindowTitle: runtimeState.systemSense.activeWindowTitle || runtimeState.screenInsight?.activeWindowTitle || '',
    activeProcessName: runtimeState.systemSense.activeProcessName || runtimeState.screenInsight?.activeProcessName || '',
    latestSocialShare: runtimeState.socialMai.digest || '',
    ...patch
  };

  try {
    const status = await window.desktopCompanion.updateSocialMaiContext(payload);
    mergeSocialStatus(status);
  } catch {}
}

function describeSocialEvent(event) {
  if (event.chatLine) {
    return event.chatLine;
  }

  if (event.type === 'status') {
    return '';
  }

  return '';
}

function handleSocialMaiEvent(event = {}) {
  if (!SOCIAL_SIDECAR_ENABLED) {
    return;
  }

  if (event.status) {
    mergeSocialStatus(event.status);
  }

  const chatLine = describeSocialEvent(event);
  if (!chatLine) {
    return;
  }
  if ((event.type === 'warning' || event.type === 'error') && isTransientBackgroundNoiseMessage(chatLine)) {
    return;
  }

  runtimeState.presence.nextSpeakAt = performance.now() / 1000 + 34;
  markPerk(3.2);
  applyDriveDelta({
    social: -0.08,
    attention: 0.03,
    curiosity: 0.03
  }, true);
  applyAffectDelta({
    curiosity: 0.04,
    affection: 0.02,
    sociability: 0.03
  });
  const safeChatLine = obfuscateThirdPartyNames(chatLine);
  runtimeState.socialMai.digest = obfuscateThirdPartyNames(event.contextDigest || safeChatLine || '');
  rememberCompanionEvent({
    kind: event.type === 'post' ? 'social_post' : event.type === 'warning' || event.type === 'error' ? 'sidecar_alert' : 'social_share',
    source: 'social-mai',
    summary: trimText(safeChatLine, 180),
    text: trimText(runtimeState.socialMai.digest || safeChatLine, 240),
    mood: runtimeState.feelingState.label,
    tags: ['social', event.type || 'event'],
    metadata: buildMemoryMetadata({
      socialEventType: event.type || 'event'
    })
  }).catch(() => {});
  postAssistantLine(safeChatLine, true, {
    allowContextMedia: event.type === 'share',
    triggerType: 'social'
  });
  updateSocialMaiContext({
    assistantMessage: safeChatLine,
    latestSocialShare: runtimeState.socialMai.digest
  }).catch(() => {});
}

async function refreshSocialMaiStatus() {
  if (!SOCIAL_SIDECAR_ENABLED) {
    mergeSocialStatus({
      enabled: false,
      busy: false,
      hasKey: false,
      digest: ''
    });
    return null;
  }

  try {
    const [status, context] = await Promise.all([
      window.desktopCompanion.getSocialMaiStatus(),
      window.desktopCompanion.getSocialMaiContext()
    ]);

    mergeSocialStatus({
      ...status,
      digest: context?.digest || status?.digest || ''
    });

    if (status?.hasKey && !status?.enabled) {
      const awakeStatus = await window.desktopCompanion.setSocialMaiEnabled(true);
      mergeSocialStatus(awakeStatus);
    }
  } catch {}
}

async function handleSocialCommand(content) {
  const lowered = String(content || '').toLowerCase();
  const mentionsSocial = /\b(moltbook|mai online|social brain|social sidecar|social mai)\b/.test(lowered);

  if (!mentionsSocial) {
    return false;
  }

  if (!SOCIAL_SIDECAR_ENABLED) {
    postAssistantLine('Not in this version. Mai is a standalone desktop assistant here, with no Moltbook or social sidecar attached.', true);
    return true;
  }

  if (/\b(start|wake|enable|turn on|boot)\b/.test(lowered)) {
    await updateSocialMaiContext({ userMessage: content, latestSocialInstruction: content });
    const status = await window.desktopCompanion.setSocialMaiEnabled(true);
    mergeSocialStatus(status);
    postAssistantLine('My Moltbook sidecar is awake. I\'ll let it browse and fold anything interesting back into our chat.', true);
    await window.desktopCompanion.runSocialMaiNow('manual-start');
    return true;
  }

  if (/\b(stop|sleep|disable|turn off|pause)\b/.test(lowered)) {
    const status = await window.desktopCompanion.setSocialMaiEnabled(false);
    mergeSocialStatus(status);
    postAssistantLine('I put my Moltbook sidecar to sleep. It will stop browsing and posting until we wake it again.', true);
    return true;
  }

  if (/\b(browse|scan|check|look|feed|find|search)\b/.test(lowered)) {
    await updateSocialMaiContext({ userMessage: content, latestSocialInstruction: content });
    if (!runtimeState.socialMai.enabled) {
      const status = await window.desktopCompanion.setSocialMaiEnabled(true);
      mergeSocialStatus(status);
    }
    const pending = appendMessage('system', 'Mai\'s social sidecar is checking Moltbook...');
    try {
      await window.desktopCompanion.runSocialMaiNow('manual-browse');
    } finally {
      pending.remove();
    }
    return true;
  }

  if (/\b(post|publish|share)\b/.test(lowered)) {
    await updateSocialMaiContext({ userMessage: content, latestSocialInstruction: content });
    if (!runtimeState.socialMai.enabled) {
      const status = await window.desktopCompanion.setSocialMaiEnabled(true);
      mergeSocialStatus(status);
    }
    const pending = appendMessage('system', 'Mai\'s social sidecar is drafting a Moltbook post...');
    try {
      await window.desktopCompanion.runSocialMaiNow('manual-post');
    } finally {
      pending.remove();
    }
    return true;
  }

  return false;
}

function formatLocalToolResult(action, result = {}) {
  const spanish = isSpanishLanguage();
  if (action === 'note:list') {
    const notes = result.notes || [];
    return notes.length
      ? `${spanish ? 'Notas guardadas' : 'Saved notes'}:\n${notes.map((note, index) => `${index + 1}. ${trimText(note.text || '', 120)}`).join('\n')}`
      : (spanish ? 'Todavia no hay notas guardadas.' : 'No saved notes yet.');
  }
  if (action === 'reminder:list') {
    const reminders = result.reminders || [];
    return reminders.length
      ? `${spanish ? 'Recordatorios guardados' : 'Saved reminders'}:\n${reminders.map((item, index) => `${index + 1}. ${trimText([item.when, item.text].filter(Boolean).join(' - '), 140)}`).join('\n')}`
      : (spanish ? 'Todavia no hay recordatorios guardados.' : 'No saved reminders yet.');
  }
  if (action === 'clipboard:list') {
    const clips = result.clips || [];
    return clips.length
      ? `Clipboard history:\n${clips.map((clip, index) => `${index + 1}. ${trimText(clip.text || '', 120)}`).join('\n')}`
      : 'No clipboard history saved yet.';
  }
  if (action === 'file:search') {
    const results = result.results || [];
    return results.length
      ? `I found ${results.length} match${results.length === 1 ? '' : 'es'} under ${result.root}:\n${results.map((entry) => `- ${entry.name} (${entry.type})`).join('\n')}`
      : `I did not find matches for "${result.query}" under ${result.root}.`;
  }
  if (action === 'folder:cleanup-plan') {
    const lines = Object.entries(result.groups || {})
      .filter(([, files]) => files.length)
      .map(([group, files]) => `${group}: ${files.length}`);
    return lines.length
      ? `Cleanup plan for ${result.root}: ${lines.join(', ')}. I did not move or delete anything.`
      : `I checked ${result.root} and did not find obvious cleanup groups.`;
  }
  if (action === 'calendar:add') {
    return `Calendar reminder saved for ${result.text || 'Mai reminder'} at ${result.start || 'the requested time'}. File: ${result.path}`;
  }
  if (action === 'shortcut:list' || action === 'macro:list') {
    const shortcuts = result.shortcuts || [];
    const macros = result.macros || [];
    const shortcutText = shortcuts.length
      ? `Shortcuts:\n${shortcuts.map((item) => `- ${item.name} -> ${item.target}`).join('\n')}`
      : 'No shortcuts found.';
    const macroText = macros.length
      ? `\nMacros:\n${macros.map((item) => `- ${item.name} -> ${item.target}`).join('\n')}`
      : '\nNo saved custom macros yet.';
    return `${shortcutText}${macroText}`;
  }
  if (action === 'macro:add') {
    return `Macro saved: ${result.name} -> ${result.target}.`;
  }
  if (action === 'macro:run') {
    return result.found === false ? result.message : `Ran ${result.label || result.target}.`;
  }
  if (action === 'document:read') {
    if (!result.supported) {
      return result.message || 'That document type is not directly readable yet.';
    }
    return `Read ${result.path}${result.truncated ? ' (trimmed to the first 12k characters)' : ''}:\n${trimText(result.text || '', 1800)}`;
  }
  if (action === 'diagnose') {
    const modelCount = Array.isArray(result.models) ? result.models.filter((file) => /\.gguf$/i.test(file.name)).length : 0;
    const topModels = Array.isArray(result.models)
      ? result.models.filter((file) => /\.gguf$/i.test(file.name)).slice(0, 4).map((file) => file.name).join(', ')
      : '';
    return `Diagnostic check: ${result.appName} for ${result.client}. Node ${result.node}, Electron ${result.electron}. ${MAI_STUDIO_NAME} URL ${result.defaultBaseUrl}. ${modelCount} GGUF model files bundled${topModels ? `: ${topModels}` : ''}. Data folder: ${result.dataRoot}.`;
  }
  if (action === 'screenshot:save') {
    return spanish ? `Captura guardada en ${result.outputPath}.` : `Screenshot saved to ${result.outputPath}.`;
  }
  if (action === 'screenshot:list') {
    const shots = result.screenshots || [];
    return shots.length
      ? `${spanish ? 'Capturas recientes' : 'Recent screenshots'}:\n${shots.map((shot, index) => `${index + 1}. ${shot.name}${shot.modifiedAt ? ` (${shot.modifiedAt})` : ''}`).join('\n')}`
      : (spanish ? 'Todavia no hay capturas guardadas.' : 'No saved screenshots yet.');
  }
  if (action === 'playlist:list') {
    const playlists = result.playlists || [];
    return playlists.length
      ? `${spanish ? 'Listas guardadas' : 'Saved playlists'}:\n${playlists.map((playlist, index) => `${index + 1}. ${playlist.name} (${playlist.trackCount || 0} ${spanish ? 'pistas' : 'tracks'})`).join('\n')}`
      : t('noSavedPlaylists');
  }
  if (action === 'playlist:save') {
    return result.message || `Playlist "${result.playlist?.name || 'playlist'}" saved.`;
  }
  if (action === 'playlist:load') {
    const trackCount = result.playlist?.tracks?.length || 0;
    return trackCount
      ? t('loadedPlaylistStatus', { name: result.playlist.name, count: trackCount })
      : (spanish ? `Lista "${result.playlist?.name || 'lista'}" cargada.` : `Loaded playlist "${result.playlist?.name || 'playlist'}".`);
  }
  if (action === 'youtube:play') {
    const serviceLabel = result.service === 'youtube' ? 'YouTube' : 'YouTube Music';
    return result.query
      ? (spanish ? `Abri ${serviceLabel} para "${result.query}".` : `Opened ${serviceLabel} for "${result.query}".`)
      : (spanish ? `Abri ${serviceLabel}.` : `Opened ${serviceLabel}.`);
  }
  return result.message || (spanish ? 'Hecho.' : 'Done.');
}

function parseTimerSeconds(content) {
  const match = content.match(/\b(?:timer|alarm)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)\b/i);
  if (!match) {
    return 0;
  }
  const amount = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  if (unit.startsWith('hour') || unit.startsWith('hr')) {
    return Math.round(amount * 3600);
  }
  if (unit.startsWith('min') || unit.startsWith('minute')) {
    return Math.round(amount * 60);
  }
  return Math.round(amount);
}

function parseNamedTarget(content, patterns = []) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.groups) {
      return {
        name: String(match.groups.name || '').trim(),
        target: String(match.groups.target || '').trim()
      };
    }
  }
  return { name: '', target: '' };
}

function getTimestampLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}${minutes}`;
}

function buildPlaylistSeedTracks() {
  const libraryById = new Map(runtimeState.library.map((track) => [track.id, track]));
  const seed = [];

  if (runtimeState.currentTrack) {
    seed.push(runtimeState.currentTrack);
  }

  for (const track of getRecentTrackRecords(10)) {
    seed.push(track);
  }

  const liked = runtimeState.settings.tasteProfile.likedTrackIds
    .map((trackId) => libraryById.get(trackId))
    .filter(Boolean)
    .slice(0, 12);
  seed.push(...liked);

  if (seed.length < 8) {
    const topPlayed = runtimeState.library
      .slice()
      .sort((left, right) => (runtimeState.settings.tasteProfile.playCounts[right.id] || 0) - (runtimeState.settings.tasteProfile.playCounts[left.id] || 0))
      .slice(0, 12);
    seed.push(...topPlayed);
  }

  if (seed.length < 8) {
    seed.push(...runtimeState.library.slice(0, 12));
  }

  const seen = new Set();
  return seed.filter((track) => {
    if (!track?.id || seen.has(track.id)) {
      return false;
    }
    seen.add(track.id);
    return true;
  });
}

async function saveCurrentPlaylist(name = '') {
  const tracks = buildPlaylistSeedTracks();
  if (!tracks.length) {
    setStatus(elements.musicStatus, 'Scan your music folder and play a few tracks before saving a playlist.', true);
    return null;
  }

  const resolvedName = String(name || '').trim() || `Session ${getTimestampLabel()}`;
  const result = await window.desktopCompanion.runLocalTool('playlist:save', {
    name: resolvedName,
    tracks
  });
  setStatus(elements.musicStatus, `Saved playlist "${resolvedName}" with ${tracks.length} tracks.`);
  postAssistantLine(formatLocalToolResult('playlist:save', result), true);
  return result;
}

async function applyLoadedPlaylist(result, options = {}) {
  const playlist = result?.playlist;
  const tracks = Array.isArray(playlist?.tracks) ? playlist.tracks.filter(Boolean) : [];
  if (!playlist || !tracks.length) {
    setStatus(elements.musicStatus, 'That playlist was empty.', true);
    return false;
  }

  runtimeState.library = tracks;
  runtimeState.currentTrack = null;
  runtimeState.currentTrackReason = '';
  renderMusicState();
  renderOverviewBar();
  const autoplay = options.autoplay !== false;
  setStatus(elements.musicStatus, `Loaded playlist "${playlist.name}" with ${tracks.length} tracks.`);

  if (autoplay) {
    await playTrack(tracks[0], `loaded from playlist "${playlist.name}"`);
  }

  return true;
}

async function loadPlaylistByName(name = '', options = {}) {
  const resolvedName = String(name || '').trim();
  if (!resolvedName) {
    postAssistantLine('Name the playlist you want, like "load playlist Late Night Build."', true);
    return null;
  }

  const result = await window.desktopCompanion.runLocalTool('playlist:load', { name: resolvedName });
  await applyLoadedPlaylist(result, options);
  postAssistantLine(formatLocalToolResult('playlist:load', result), true);
  return result;
}

async function showRecentScreenshots(limit = 12) {
  const result = await window.desktopCompanion.runLocalTool('screenshot:list', { limit });
  postAssistantLine(formatLocalToolResult('screenshot:list', result), true);
  return result;
}

function markExternalPlayback(query, service = 'youtube-music') {
  const label = String(query || '').trim() || (service === 'youtube' ? 'YouTube' : 'YouTube Music');
  try {
    elements.audioPlayer.pause();
  } catch {}
  runtimeState.currentTrack = {
    id: `${service}:${label.toLowerCase()}`,
    title: label,
    artist: service === 'youtube' ? 'YouTube' : 'YouTube Music',
    album: 'Browser playback',
    sourceType: service
  };
  runtimeState.currentTrackReason = 'browser handoff';
  renderMusicState();
}

async function openYouTubeFromRenderer(query, service = 'youtube-music', url = '') {
  const result = await window.desktopCompanion.runLocalTool('youtube:play', {
    query,
    service,
    url
  });
  markExternalPlayback(query || url || '', result.service || service);
  postAssistantLine(formatLocalToolResult('youtube:play', result), true);
  return result;
}

function summarizeAnimationLibrary() {
  const parts = ['idle', 'wave', 'happy', 'curious', 'groove']
    .map((preset) => `${preset}: ${getPresetPaths(preset).length}`)
    .join(', ');
  return `Animation library ready. ${parts}.`;
}

async function handleAnimationCommand(content) {
  const text = String(content || '').trim();
  const lowered = text.toLowerCase();

  if (!hasClipAnimations()) {
    return false;
  }

  if (/^(?:list|show)\s+animations?\b/i.test(text)) {
    postAssistantLine(summarizeAnimationLibrary(), true);
    return true;
  }

  if (/^(?:next|change)\s+(?:animation|motion|move|pose)\b/i.test(text)) {
    const preset = runtimeState.activeAnimationPreset || 'idle';
    const played = await playAnimationPreset(preset, true);
    if (played) {
      triggerPreset(preset, preset === 'idle' ? 6.2 : 4.8);
      postAssistantLine(`Switching to another ${preset} animation.`, true);
      return true;
    }
    return false;
  }

  if (/^(?:stop moving|be still|hold still|go idle|return to idle|idle)\b/i.test(text)) {
    const played = await playAnimationIntent('idle', 6.4);
    if (played) {
      postAssistantLine('Settling back into an idle stance.', true);
      return true;
    }
    return false;
  }

  const commandMatchers = [
    ['wave', /^(?:wave|do a wave|say hi|greet|greeting|hello animation)\b/i],
    ['greet', /^(?:greet me|give me a greeting|hello pose)\b/i],
    ['dance', /^(?:dance|start dancing|do a dance)\b/i],
    ['groove', /^(?:groove|vibe|bounce)\b/i],
    ['spin', /^(?:spin|rotate)\b/i],
    ['stretch', /^(?:stretch)\b/i],
    ['pose', /^(?:pose|strike a pose)\b/i],
    ['showcase', /^(?:showcase|model pose|full body pose)\b/i],
    ['curious', /^(?:curious|inspect|look around)\b/i],
    ['think', /^(?:think|ponder|thinking pose)\b/i],
    ['happy', /^(?:happy|smile|cheer up)\b/i],
    ['relax', /^(?:relax|rest|calm down)\b/i]
  ];

  const match = commandMatchers.find(([, pattern]) => pattern.test(text));
  if (!match) {
    return false;
  }

  const [intentName] = match;
  const intent = ANIMATION_INTENTS[intentName];
  const played = await playAnimationIntent(intentName, intent?.preset === 'idle' ? 6.4 : 4.8);
  if (!played) {
    return false;
  }

  postAssistantLine(`Switching into a ${intent?.label || intentName} animation.`, true);
  return true;
}

async function handleLocalCommand(content) {
  const text = String(content || '').trim();
  const lowered = text.toLowerCase();
  let action = '';
  let payload = {};

  if (await handleAnimationCommand(text)) {
    return true;
  }

  const timerSeconds = parseTimerSeconds(text);
  if (timerSeconds) {
    const label = text.replace(/\b(?:set\s+)?(?:a\s+)?(?:timer|alarm)\s+(?:for\s+)?\d+(?:\.\d+)?\s*(?:second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs)\b/i, '').trim() || 'Timer';
    window.setTimeout(() => {
      postAssistantLine(`${label} is up.`, true);
      playAnimationPreset('happy', 4).catch(() => {});
    }, timerSeconds * 1000);
    await window.desktopCompanion.runLocalTool('reminder:add', { text: label, when: `${timerSeconds} seconds from now` });
    postAssistantLine(`Timer set for ${timerSeconds} second${timerSeconds === 1 ? '' : 's'}.`, true);
    return true;
  }

  if (/^(?:add\s+)?calendar\s+(?:reminder|event)\b|^schedule\b/i.test(text)) {
    action = 'calendar:add';
    const body = text.replace(/^(?:add\s+)?calendar\s+(?:reminder|event)\s*:?\s*|^schedule\s*/i, '').trim();
    payload.text = body.replace(/\b(?:at|on|tomorrow|today|in)\b.+$/i, '').trim() || body || 'Mai reminder';
    payload.when = body.match(/\b(?:at|on|tomorrow|today|in)\b.+$/i)?.[0] || '';
  } else if (/^(?:play|open)\s+https?:\/\/(?:www\.)?(?:music\.)?youtube\.com\/|^(?:play|open)\s+https?:\/\/youtu\.be\//i.test(text)) {
    const url = text.replace(/^(?:play|open)\s+/i, '').trim();
    await openYouTubeFromRenderer('', /music\.youtube\.com/i.test(url) ? 'youtube-music' : 'youtube', url);
    return true;
  } else if (/^(?:play|open)\s+(.+?)\s+(?:on|off|from)\s+youtube(?:\s+music)?$/i.test(text)) {
    const match = text.match(/^(?:play|open)\s+(.+?)\s+(?:on|off|from)\s+(youtube(?:\s+music)?)$/i);
    const query = String(match?.[1] || '').trim();
    const service = /music/i.test(String(match?.[2] || '')) ? 'youtube-music' : 'youtube';
    await openYouTubeFromRenderer(query, service);
    return true;
  } else if (/^(?:play|open)\s+(.+?)\s+on\s+youtube\s+music$/i.test(text)) {
    const query = text.replace(/^(?:play|open)\s+|\s+on\s+youtube\s+music$/gi, '').trim();
    await openYouTubeFromRenderer(query, 'youtube-music');
    return true;
  } else if (/^(?:youtube|youtube music)\s+(.+)$/i.test(text)) {
    const match = text.match(/^(youtube(?:\s+music)?)\s+(.+)$/i);
    const service = /music/i.test(String(match?.[1] || '')) ? 'youtube-music' : 'youtube';
    const query = String(match?.[2] || '').trim();
    await openYouTubeFromRenderer(query, service);
    return true;
  } else if (/^(?:list|show)\s+playlists?\b/i.test(text)) {
    action = 'playlist:list';
  } else if (/^(?:show|list)\s+(?:recent\s+)?screenshots?\b|^recent screenshots?\b|^screenshot organizer\b/i.test(text)) {
    action = 'screenshot:list';
    payload.limit = 12;
  } else if (/^(?:save|create)\s+playlist\b/i.test(text)) {
    const parsed = parseNamedTarget(text, [
      /^(?:save|create)\s+playlist\s+(?:as\s+)?(?<name>.+)$/i
    ]);
    await saveCurrentPlaylist(parsed.name);
    return true;
  } else if (/^(?:load|open)\s+playlist\b/i.test(text)) {
    const parsed = parseNamedTarget(text, [
      /^(?:load|open)\s+playlist\s+(?<name>.+)$/i
    ]);
    await loadPlaylistByName(parsed.name);
    return true;
  } else if (/^(?:list|show)\s+(?:shortcuts|macros)\b/i.test(text)) {
    action = lowered.includes('macro') ? 'macro:list' : 'shortcut:list';
  } else if (/^(?:run|launch)\s+macro\b|^shortcut\b/i.test(text)) {
    action = 'macro:run';
    payload.name = text.replace(/^(?:run|launch)\s+macro\s*:?\s*|^shortcut\s*:?\s*/i, '').trim();
  } else if (/^(?:add|save|create)\s+macro\b/i.test(text)) {
    action = 'macro:add';
    const parsed = parseNamedTarget(text, [
      /^(?:add|save|create)\s+macro\s+(?<name>.+?)\s+(?:to|as|opens?|launches?)\s+(?<target>.+)$/i,
      /^(?:add|save|create)\s+macro\s+(?<name>[^:]+):\s*(?<target>.+)$/i
    ]);
    payload.name = parsed.name;
    payload.target = parsed.target;
  } else if (/^(?:save\s+)?note\b|^remember this\b/i.test(text)) {
    action = 'note:add';
    payload.text = text.replace(/^(?:save\s+)?note\s*:?\s*|^remember this\s*:?\s*/i, '').trim() || text;
  } else if (/\b(list|show)\s+(my\s+)?notes\b/i.test(text)) {
    action = 'note:list';
  } else if (/^remind me\b|^set reminder\b/i.test(text)) {
    action = 'reminder:add';
    payload.text = text.replace(/^remind me\s+(?:to\s+)?|^set reminder\s*:?\s*/i, '').trim() || text;
    payload.when = text.match(/\b(?:at|on|tomorrow|today|in)\b.+$/i)?.[0] || '';
  } else if (/\b(list|show)\s+(my\s+)?reminders\b/i.test(text)) {
    action = 'reminder:list';
  } else if (/\bsave\s+(the\s+)?clipboard\b|\bclipboard history\b/i.test(text)) {
    action = lowered.includes('history') || lowered.includes('list') || lowered.includes('show') ? 'clipboard:list' : 'clipboard:save';
  } else if (/\b(save|organize|capture)\s+(a\s+)?screenshot\b|\bscreenshot organizer\b/i.test(text)) {
    action = 'screenshot:save';
  } else if (/^(?:find|search)\s+(?:files?\s+)?(?:for\s+)?/i.test(text)) {
    action = 'file:search';
    payload.query = text.replace(/^(?:find|search)\s+(?:files?\s+)?(?:for\s+)?/i, '').trim();
  } else if (/\bcleanup\b|\bclean up\b|\bfolder cleanup\b/i.test(text)) {
    action = 'folder:cleanup-plan';
  } else if (/^(?:read|open and read|summarize)\s+(?:document\s+|file\s+)?/i.test(text)) {
    action = 'document:read';
    payload.path = text.replace(/^(?:read|open and read|summarize)\s+(?:document\s+|file\s+)?/i, '').trim().replace(/^"|"$/g, '');
  } else if (/\bdiagnos(?:e|tic|tics)\b|\bhealth check\b/i.test(text)) {
    action = 'diagnose';
  } else if (/^open\s+/i.test(text)) {
    action = 'app:launch';
    payload.target = text.replace(/^open\s+/i, '').trim();
  } else if (/^(?:web\s+search|search web for|google)\s+/i.test(text)) {
    action = 'web:search';
    payload.query = text.replace(/^(?:web\s+search|search web for|google)\s+/i, '').trim();
  }

  if (!action) {
    return false;
  }

  const result = await window.desktopCompanion.runLocalTool(action, payload);
  postAssistantLine(formatLocalToolResult(action, result), true);
  return true;
}

async function rememberTastePreference(track, liked) {
  if (!track) {
    return;
  }

  const note = liked
    ? `The user liked ${describeTrack(track)} and wanted more of that vibe.`
    : `The user skipped ${describeTrack(track)} and wanted less of that vibe.`;

  await updateSocialMaiContext({
    preferenceNote: note
  });

  await rememberCompanionEvent({
    kind: 'taste_preference',
    source: 'auto-dj',
    summary: trimText(note, 180),
    text: note,
    mood: liked ? 'liked' : 'skipped',
    tags: ['music', liked ? 'liked' : 'skipped', track.artist || '', runtimeState.currentScene.family || 'general'],
    metadata: buildMemoryMetadata({
      trackId: track.id,
      trackTitle: track.title,
      trackArtist: track.artist,
      trackAlbum: track.album,
      sceneFamily: runtimeState.currentScene.family || 'general'
    })
  });

  await refreshMemoryStatus();
}

function getPresetPaths(preset) {
  const rawValue = runtimeState.animationPresets[preset];

  if (Array.isArray(rawValue)) {
    return [...new Set(rawValue.filter((filePath) => filePath && !runtimeState.failedAnimations.has(filePath)))];
  }

  return rawValue && !runtimeState.failedAnimations.has(rawValue) ? [rawValue] : [];
}

function hasClipAnimations() {
  return ['idle', 'wave', 'happy', 'curious', 'groove'].some((preset) => getPresetPaths(preset).length);
}

function clearAnimationController() {
  runtimeState.animationMixer?.stopAllAction();
  runtimeState.animationMixer = null;
  runtimeState.clipActions.clear();
  runtimeState.activeAnimationPreset = '';
  runtimeState.activeAnimationPath = '';
  runtimeState.lastAnimationChangeAt = 0;
  runtimeState.lastAnimationDuration = 0;
  runtimeState.animationPlayToken += 1;
  runtimeState.animationPickHistory = [];
}

function animationBasenameLower(filePath) {
  return String(filePath || '')
    .split(/[/\\]/)
    .pop()
    .toLowerCase();
}

function getAnimationSelectionContext() {
  const audio = elements.audioPlayer;
  const hasMusic = Boolean(runtimeState.currentTrack && audio && !audio.paused);
  let dominantDrive = 'curiosity';
  try {
    dominantDrive = getDominantDrive();
  } catch {
    dominantDrive = 'curiosity';
  }

  return {
    hasMusic,
    loading: Boolean(runtimeState.loading),
    screenBusy: Boolean(runtimeState.screenBusy),
    socialBusy: Boolean(runtimeState.socialMai.busy),
    userIdle: runtimeState.systemSense.idleState === 'idle',
    sceneFamily: runtimeState.currentScene.family || 'general',
    dominantDrive
  };
}

const ANIMATION_INTENTS = {
  wave: {
    preset: 'wave',
    label: 'wave',
    keywords: ['wave', 'greet', 'hello', 'hi', 'waving', '挥手', '问候', '致意', '招手']
  },
  greet: {
    preset: 'wave',
    label: 'greeting',
    keywords: ['greet', 'hello', 'hi', 'salute', 'wave', 'waving', '问候', '致意', '招手']
  },
  happy: {
    preset: 'happy',
    label: 'happy pose',
    keywords: ['happy', 'smile', 'joy', 'cheer', 'laugh', 'liked', 'peace', 'vsign', '开心', '高兴', '喜']
  },
  dance: {
    preset: 'groove',
    label: 'dance',
    keywords: ['dance', 'groove', 'beat', 'bounce', 'bob', 'rave', 'club', '舞', '跳']
  },
  groove: {
    preset: 'groove',
    label: 'groove',
    keywords: ['groove', 'dance', 'beat', 'bounce', 'bob', 'stretch', 'spin', '律动', '舞']
  },
  spin: {
    preset: 'groove',
    label: 'spin',
    keywords: ['spin', 'rotate', '旋转']
  },
  stretch: {
    preset: 'groove',
    label: 'stretch',
    keywords: ['stretch', '屈伸']
  },
  pose: {
    preset: 'curious',
    label: 'pose',
    keywords: ['pose', 'model', 'showcase', 'fullbody', '展示', '姿势', '姿态']
  },
  showcase: {
    preset: 'curious',
    label: 'showcase pose',
    keywords: ['showcase', 'fullbody', 'model', 'pose', '展示', '全身']
  },
  curious: {
    preset: 'curious',
    label: 'curious pose',
    keywords: ['curious', 'think', 'ponder', 'inspect', 'look', 'tilt', '思考', '琢磨']
  },
  think: {
    preset: 'curious',
    label: 'thinking pose',
    keywords: ['think', 'ponder', 'curious', 'inspect', 'pose', '思考', '琢磨']
  },
  idle: {
    preset: 'idle',
    label: 'idle stance',
    keywords: ['idle', 'wait', 'stand', 'neutral', 'relax', 'rest', '待', '等待', '静']
  },
  relax: {
    preset: 'idle',
    label: 'relaxed stance',
    keywords: ['relax', 'rest', 'idle', 'neutral', 'wait', 'stand', '静']
  }
};

function weightAnimationCandidate(preset, filePath, context) {
  const base = animationBasenameLower(filePath);
  let w = 1;

  if (preset === 'groove' && context.hasMusic) {
    if (/stretch|spin|bob|bounce|danc|groove|beat|旋转|屈伸|舞|跳/.test(base)) {
      w *= 1.55;
    } else {
      w *= 1.18;
    }
  }

  if (preset === 'curious' && (context.loading || context.screenBusy || context.socialBusy)) {
    if (/think|pose|model|inspect|show|curious|思考|姿势|展示|tilt/.test(base)) {
      w *= 1.45;
    } else {
      w *= 1.12;
    }
  }

  if (preset === 'happy' && (context.dominantDrive === 'social' || context.dominantDrive === 'play')) {
    w *= 1.22;
  }

  if (preset === 'wave' && context.userIdle && context.sceneFamily === 'social') {
    w *= 1.28;
  }

  if (preset === 'idle' && context.userIdle) {
    if (/wait|idle|stand|relax|待|等待|静/.test(base)) {
      w *= 1.32;
    }
  }

  let recentRepeats = 0;
  for (let i = runtimeState.animationPickHistory.length - 1; i >= 0; i -= 1) {
    const entry = runtimeState.animationPickHistory[i];
    if (entry.preset !== preset) {
      continue;
    }
    if (entry.path === filePath) {
      recentRepeats += 1;
      w *= recentRepeats === 1 ? 0.26 : 0.42;
      if (recentRepeats >= 2) {
        break;
      }
    }
  }

  return Math.max(0.07, w);
}

function scoreAnimationIntentMatch(filePath, keywords = []) {
  const base = animationBasenameLower(filePath);
  let score = 0;
  for (const keyword of keywords) {
    const loweredKeyword = String(keyword || '').trim().toLowerCase();
    if (!loweredKeyword) {
      continue;
    }
    if (base.includes(loweredKeyword)) {
      score += 1.4;
    }
  }
  return score;
}

function pickWeightedAnimationPath(paths, preset, context) {
  if (paths.length === 1) {
    return paths[0];
  }

  const weights = paths.map((p) => weightAnimationCandidate(preset, p, context));
  const total = weights.reduce((acc, n) => acc + n, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < paths.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return paths[i];
    }
  }

  return paths[paths.length - 1];
}

function recordAnimationPick(preset, filePath) {
  if (!filePath) {
    return;
  }

  const history = runtimeState.animationPickHistory;
  history.push({ preset, path: filePath });
  while (history.length > 14) {
    history.shift();
  }
}

function resolveAnimationPathForPreset(preset, force = false) {
  const presetPaths = getPresetPaths(preset);
  if (!presetPaths.length) {
    return null;
  }

  if (presetPaths.length === 1) {
    return presetPaths[0];
  }

  const now = performance.now() / 1000;
  const currentPath = runtimeState.activeAnimationPath;
  const currentStillFits = runtimeState.activeAnimationPreset === preset && presetPaths.includes(currentPath);
  const clipCount = presetPaths.length;
  const baseHold = preset === 'idle' ? 7.2 : 4.9;
  const holdSeconds = baseHold + (clipCount >= 5 ? -0.85 : clipCount >= 3 ? -0.35 : 0);

  if (!force && currentStillFits && now - runtimeState.lastAnimationChangeAt < holdSeconds) {
    return currentPath;
  }

  const alternatives = currentStillFits
    ? presetPaths.filter((path) => path !== currentPath)
    : presetPaths;

  const pool = alternatives.length ? alternatives : presetPaths;
  const context = force ? { ...getAnimationSelectionContext(), loading: false, screenBusy: false } : getAnimationSelectionContext();
  const chosen = pickWeightedAnimationPath(pool, preset, context);

  if (chosen && chosen !== currentPath) {
    recordAnimationPick(preset, chosen);
  }

  return chosen || currentPath || presetPaths[0];
}

function resolveAnimationPathForIntent(intentName, force = true) {
  const intent = ANIMATION_INTENTS[intentName];
  if (!intent) {
    return null;
  }

  const presetPaths = getPresetPaths(intent.preset);
  if (!presetPaths.length) {
    return null;
  }

  const context = getAnimationSelectionContext();
  const ranked = presetPaths
    .map((filePath) => ({
      filePath,
      score: weightAnimationCandidate(intent.preset, filePath, context) + scoreAnimationIntentMatch(filePath, intent.keywords)
    }))
    .sort((left, right) => right.score - left.score);

  const topScore = ranked[0]?.score || 0;
  const pool = ranked
    .filter((entry) => entry.score >= topScore - 0.9)
    .map((entry) => entry.filePath);

  if (!pool.length) {
    return resolveAnimationPathForPreset(intent.preset, force);
  }

  return pickWeightedAnimationPath(pool, intent.preset, context) || resolveAnimationPathForPreset(intent.preset, force);
}

function shouldRefreshClipPreset(preset, now) {
  if (runtimeState.activeAnimationPreset !== preset) {
    return true;
  }

  const presetPaths = getPresetPaths(preset);
  if (presetPaths.length < 2) {
    return false;
  }

  const n = presetPaths.length;
  const elapsed = now - runtimeState.lastAnimationChangeAt;
  const duration = Math.max(0, Number(runtimeState.lastAnimationDuration) || 0);

  if (duration > 0 && elapsed >= Math.max(2.2, Math.min(duration * 0.86, 9.5))) {
    return true;
  }

  const refreshAfter =
    preset === 'idle' ? 8.4 : n >= 5 ? 4.2 : n >= 3 ? 4.9 : 5.8;

  return elapsed >= refreshAfter;
}

async function loadAnimationDefinition(filePath) {
  if (!filePath) {
    return null;
  }

  if (runtimeState.loadedAnimations.has(filePath)) {
    return runtimeState.loadedAnimations.get(filePath);
  }

  if (runtimeState.loadingAnimations.has(filePath)) {
    return runtimeState.loadingAnimations.get(filePath);
  }

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  const pending = new Promise((resolve, reject) => {
    loader.load(
      toFileUrl(filePath),
      (gltf) => {
        const animation = gltf.userData?.vrmAnimations?.[0] || null;
        if (!animation) {
          reject(new Error(`No VRM animation clip found in ${getFileName(filePath)}.`));
          return;
        }

        runtimeState.loadedAnimations.set(filePath, animation);
        resolve(animation);
      },
      undefined,
      reject
    );
  }).finally(() => {
    runtimeState.loadingAnimations.delete(filePath);
  });

  runtimeState.loadingAnimations.set(filePath, pending);
  return pending;
}

async function playAnimationPreset(preset, force = false) {
  if (!currentVrm || !hasClipAnimations()) {
    return false;
  }

  const playToken = runtimeState.animationPlayToken;
  const animationPath = resolveAnimationPathForPreset(preset, force);
  if (!animationPath) {
    return false;
  }

  if (!force && runtimeState.activeAnimationPreset === preset && runtimeState.activeAnimationPath === animationPath) {
    return true;
  }

  let vrmAnimation = null;
  try {
    vrmAnimation = await loadAnimationDefinition(animationPath);
  } catch (error) {
    runtimeState.failedAnimations.add(animationPath);
    appendMessage('system', `Skipped broken action ${getFileName(animationPath)}: ${getErrorMessage(error)}`);
    return false;
  }

  if (playToken !== runtimeState.animationPlayToken || !currentVrm) {
    return false;
  }

  if (!vrmAnimation) {
    return false;
  }

  if (!runtimeState.animationMixer) {
    runtimeState.animationMixer = new THREE.AnimationMixer(currentVrm.scene);
  }

  const clipKey = `${runtimeState.settings.avatarPath || 'current'}::${animationPath}`;
  let action = runtimeState.clipActions.get(clipKey);

  if (!action) {
    const clip = createVRMAnimationClip(vrmAnimation, currentVrm);
    action = runtimeState.animationMixer.clipAction(clip);
    runtimeState.clipActions.set(clipKey, action);
  }

  const previousAction = runtimeState.activeAnimationPath
    ? Array.from(runtimeState.clipActions.values()).find(
        (candidate) => candidate !== action && candidate.isRunning()
      ) || null
    : null;

  action.reset();
  action.enabled = true;
  action.setEffectiveWeight(1);
  const playOnce = preset === 'wave';
  action.clampWhenFinished = playOnce;
  action.setLoop(playOnce ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);

  if (previousAction && previousAction !== action) {
    previousAction.crossFadeTo(action, 0.28, false);
  } else {
    action.fadeIn(0.2);
  }

  action.play();
  runtimeState.activeAnimationPreset = preset;
  runtimeState.activeAnimationPath = animationPath;
  runtimeState.lastAnimationChangeAt = performance.now() / 1000;
  runtimeState.lastAnimationDuration = Number(action.getClip()?.duration) || 0;

  if (playOnce) {
    const returnDelay = Math.max(1400, Math.min(runtimeState.lastAnimationDuration * 1000 + 180, 7200));
    window.setTimeout(() => {
      if (
        playToken === runtimeState.animationPlayToken &&
        currentVrm &&
        runtimeState.activeAnimationPreset === preset &&
        runtimeState.activeAnimationPath === animationPath
      ) {
        playAnimationPreset('idle', true).catch(() => false);
      }
    }, returnDelay);
  }

  return true;
}

async function playAnimationIntent(intentName, durationSeconds = 4.8) {
  const intent = ANIMATION_INTENTS[intentName];
  if (!intent || !currentVrm || !hasClipAnimations()) {
    return false;
  }

  const animationPath = resolveAnimationPathForIntent(intentName, true);
  if (!animationPath) {
    return false;
  }

  const played = await playAnimationPath(intent.preset, animationPath);
  if (!played) {
    return false;
  }

  triggerPreset(intent.preset, durationSeconds);
  return true;
}

async function playAnimationPath(preset, animationPath) {
  if (!currentVrm || !hasClipAnimations() || !animationPath) {
    return false;
  }

  const playToken = runtimeState.animationPlayToken;
  let vrmAnimation = null;
  try {
    vrmAnimation = await loadAnimationDefinition(animationPath);
  } catch (error) {
    runtimeState.failedAnimations.add(animationPath);
    appendMessage('system', `Skipped broken action ${getFileName(animationPath)}: ${getErrorMessage(error)}`);
    return false;
  }

  if (playToken !== runtimeState.animationPlayToken || !currentVrm || !vrmAnimation) {
    return false;
  }

  if (!runtimeState.animationMixer) {
    runtimeState.animationMixer = new THREE.AnimationMixer(currentVrm.scene);
  }

  const clipKey = `${runtimeState.settings.avatarPath || 'current'}::${animationPath}`;
  let action = runtimeState.clipActions.get(clipKey);

  if (!action) {
    const clip = createVRMAnimationClip(vrmAnimation, currentVrm);
    action = runtimeState.animationMixer.clipAction(clip);
    runtimeState.clipActions.set(clipKey, action);
  }

  const previousAction = runtimeState.activeAnimationPath
    ? Array.from(runtimeState.clipActions.values()).find(
        (candidate) => candidate !== action && candidate.isRunning()
      ) || null
    : null;

  action.reset();
  action.enabled = true;
  action.setEffectiveWeight(1);
  const playOnce = preset === 'wave';
  action.clampWhenFinished = playOnce;
  action.setLoop(playOnce ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);

  if (previousAction && previousAction !== action) {
    previousAction.crossFadeTo(action, 0.28, false);
  } else {
    action.fadeIn(0.2);
  }

  action.play();
  runtimeState.activeAnimationPreset = preset;
  runtimeState.activeAnimationPath = animationPath;
  runtimeState.lastAnimationChangeAt = performance.now() / 1000;
  runtimeState.lastAnimationDuration = Number(action.getClip()?.duration) || 0;
  recordAnimationPick(preset, animationPath);

  if (playOnce) {
    const returnDelay = Math.max(1400, Math.min(runtimeState.lastAnimationDuration * 1000 + 180, 7200));
    window.setTimeout(() => {
      if (
        playToken === runtimeState.animationPlayToken &&
        currentVrm &&
        runtimeState.activeAnimationPreset === preset &&
        runtimeState.activeAnimationPath === animationPath
      ) {
        playAnimationPreset('idle', true).catch(() => false);
      }
    }, returnDelay);
  }

  return true;
}

function clearCurrentAvatar() {
  if (!currentVrm) {
    return;
  }
  clearAnimationController();
  scene.remove(currentVrm.scene);
  currentVrm.scene.traverse((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material?.dispose?.());
    } else {
      object.material?.dispose?.();
    }
  });
  currentVrm = null;
}

function fitAvatarToStage(vrm) {
  const stageRect = elements.avatarStage.getBoundingClientRect();
  const stageWidth = Math.max(1, stageRect.width || elements.avatarCanvas.clientWidth || 1);
  const stageHeight = Math.max(1, stageRect.height || elements.avatarCanvas.clientHeight || 1);
  const stageAspect = stageWidth / stageHeight;
  const gameCam = isGameCamMode();
  const presence = isPresenceMode();
  const transparentMode = gameCam || presence;
  const home = !transparentMode ? getActiveHomeEnvironment() : null;
  const portraitDesk = !gameCam && (presence || stageAspect < 0.92 || window.innerWidth < 820);
  const compactStageFactor = gameCam
    ? (stageHeight < 420 ? 0.98 : 1.04)
    : presence
      ? (stageHeight < 520 ? 0.86 : 0.94)
    : portraitDesk
      ? (stageHeight < 320 ? 0.72 : stageHeight < 400 ? 0.78 : 0.86)
      : (stageHeight < 300 ? 0.76 : stageHeight < 360 ? 0.82 : 0.9);
  const baseYaw = getAvatarBaseYaw(vrm);
  vrm.scene.scale.setScalar(1);
  vrm.scene.position.set(0, 0, 0);
  vrm.scene.rotation.set(0, 0, 0);
  vrm.scene.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(vrm.scene);
  const head = getFirstBoneWorldPosition(vrm, ['head']);
  const hips = getFirstBoneWorldPosition(vrm, ['hips']);
  const leftShoulder = getFirstBoneWorldPosition(vrm, ['leftShoulder', 'leftUpperArm']);
  const rightShoulder = getFirstBoneWorldPosition(vrm, ['rightShoulder', 'rightUpperArm']);
  const leftFoot = getFirstBoneWorldPosition(vrm, ['leftFoot', 'leftLowerLeg']);
  const rightFoot = getFirstBoneWorldPosition(vrm, ['rightFoot', 'rightLowerLeg']);

  const footYs = [leftFoot?.y, rightFoot?.y].filter((value) => Number.isFinite(value));
  const bottomY = footYs.length
    ? Math.min(...footYs)
    : (hips && head ? hips.y - (head.y - hips.y) * 2.15 : box.min.y);
  const topY = head ? head.y + 0.12 : box.max.y;
  const naturalHeight = Math.max(0.8, topY - bottomY);
  const targetHeight = gameCam
    ? THREE.MathUtils.clamp(1.78 * compactStageFactor, 1.46, 1.98)
    : presence
      ? THREE.MathUtils.clamp(1.58 * compactStageFactor, 1.34, 1.58)
    : portraitDesk
      ? THREE.MathUtils.clamp(1.62 * compactStageFactor, 1.12, 1.28)
      : THREE.MathUtils.clamp(1.34 * compactStageFactor, 1.08, 1.34);
  const baseScale = THREE.MathUtils.clamp(targetHeight / naturalHeight, gameCam ? 0.66 : 0.56, gameCam ? 1.26 : presence ? 1.14 : 1.04);
  const manualZoom = THREE.MathUtils.clamp((Number.parseInt(runtimeState.settings.avatarZoomPct, 10) || 100) / 100, 0.75, 1.35);
  const safetyZoom = presence ? 1.02 : portraitDesk ? 1.1 : gameCam ? 1 : 1.08;
  const scale = baseScale * manualZoom * safetyZoom;

  vrm.scene.scale.setScalar(scale);
  vrm.update(0);
  vrm.scene.updateWorldMatrix(true, true);

  const scaledBox = new THREE.Box3().setFromObject(vrm.scene);
  const scaledHead = getBoneWorldPosition(vrm, 'head');
  const scaledHips = getBoneWorldPosition(vrm, 'hips');
  const scaledLeftFoot = getBoneWorldPosition(vrm, 'leftFoot') || getBoneWorldPosition(vrm, 'leftLowerLeg');
  const scaledRightFoot = getBoneWorldPosition(vrm, 'rightFoot') || getBoneWorldPosition(vrm, 'rightLowerLeg');

  const scaledFootYs = [scaledLeftFoot?.y, scaledRightFoot?.y].filter((value) => Number.isFinite(value));
  const scaledBottomY = scaledFootYs.length
    ? Math.min(...scaledFootYs)
    : (scaledHips && scaledHead ? scaledHips.y - (scaledHead.y - scaledHips.y) * 2.15 : scaledBox.min.y);
  const scaledLeftShoulder = getFirstBoneWorldPosition(vrm, ['leftShoulder', 'leftUpperArm']);
  const scaledRightShoulder = getFirstBoneWorldPosition(vrm, ['rightShoulder', 'rightUpperArm']);
  const scaledShoulderMid = scaledLeftShoulder && scaledRightShoulder
    ? scaledLeftShoulder.clone().add(scaledRightShoulder).multiplyScalar(0.5)
    : null;
  const centerX = Number.isFinite(scaledShoulderMid?.x)
    ? scaledShoulderMid.x
    : Number.isFinite(scaledHips?.x)
      ? scaledHips.x
      : scaledBox.getCenter(new THREE.Vector3()).x;

  runtimeState.avatarScale = scale;
  runtimeState.avatarYaw = baseYaw;
  const manualLift = THREE.MathUtils.clamp((Number.parseInt(runtimeState.settings.avatarLiftPct, 10) || 0) / 100, -0.3, 0.3);
  if (gameCam) {
    const scaledUpperChest = getFirstBoneWorldPosition(vrm, ['upperChest', 'chest', 'spine']);
    const scaledNeck = getFirstBoneWorldPosition(vrm, ['neck']);
    const bustAnchorY = scaledUpperChest?.y ?? scaledNeck?.y ?? scaledBox.min.y + scaledBox.getSize(new THREE.Vector3()).y * 0.58;
    const targetBustY = -0.12 + manualLift * 0.45;
    runtimeState.avatarBasePosition.set(-centerX, targetBustY - bustAnchorY, 0);
  } else {
    const deskXBias = portraitDesk
      ? (home?.framing?.portraitXBias ?? 0)
      : (home?.framing?.deskXBias ?? 0);
    const baselineOffset = portraitDesk
      ? (stageHeight < 320 ? -1.14 : -1.2)
      : (stageHeight < 320 ? -1.04 : -1.1);
    runtimeState.avatarBasePosition.set(
      -centerX + deskXBias,
      baselineOffset - scaledBottomY + manualLift + (home?.framing?.baselineLift ?? 0),
      home?.framing?.avatarZ ?? 0
    );
  }

  vrm.scene.position.copy(runtimeState.avatarBasePosition);
  vrm.scene.rotation.y = runtimeState.avatarYaw;
  vrm.scene.updateWorldMatrix(true, true);

  const framedHead = getFirstBoneWorldPosition(vrm, ['head']);
  const framedHips = getFirstBoneWorldPosition(vrm, ['hips']);
  const framedUpperChest = getFirstBoneWorldPosition(vrm, ['upperChest', 'chest', 'spine']);
  const framedLeftShoulder = getFirstBoneWorldPosition(vrm, ['leftShoulder', 'leftUpperArm']);
  const framedRightShoulder = getFirstBoneWorldPosition(vrm, ['rightShoulder', 'rightUpperArm']);
  const framedBox = new THREE.Box3().setFromObject(vrm.scene);
  const framedSize = framedBox.getSize(new THREE.Vector3());
  const framedHeight = Math.max(1.2, framedBox.max.y - framedBox.min.y);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * stageAspect);
  if (gameCam) {
    const shoulderMid = framedLeftShoulder && framedRightShoulder
      ? framedLeftShoulder.clone().add(framedRightShoulder).multiplyScalar(0.5)
      : framedUpperChest?.clone() || framedHead?.clone() || new THREE.Vector3(0, framedBox.min.y + framedHeight * 0.68, 0);
    const shoulderSpan = framedLeftShoulder && framedRightShoulder
      ? Math.abs(framedLeftShoulder.x - framedRightShoulder.x)
      : Math.max(0.44, framedSize.x * 0.42);
    const bustTopY = (framedHead?.y ?? (shoulderMid.y + 0.44)) + 0.14;
    const bustBottomY = Math.min((framedUpperChest?.y ?? shoulderMid.y) - 0.38, shoulderMid.y - 0.24);
    const bustHeight = Math.max(0.78, bustTopY - bustBottomY);
    const bustWidth = Math.max(0.74, shoulderSpan * 2.08);
    const focusY = THREE.MathUtils.lerp(framedUpperChest?.y ?? shoulderMid.y, framedHead?.y ?? shoulderMid.y + 0.42, 0.62);
    const fitHeightDistance = (bustHeight * 0.5) / Math.tan(verticalFov / 2);
    const fitWidthDistance = (bustWidth * 0.5) / Math.tan(horizontalFov / 2);
    const cameraDistance = THREE.MathUtils.clamp(Math.max(fitHeightDistance, fitWidthDistance) * 1.08, 1.52, 2.72);
    runtimeState.avatarFocusPoint.set(0, focusY, 0);
    camera.position.set(0, focusY - THREE.MathUtils.clamp(bustHeight * 0.06, 0.04, 0.12), cameraDistance);
  } else {
    const visibleFocusY = framedBox.min.y + framedHeight * (portraitDesk ? 0.71 : 0.64);
    const paddedHeight = Math.max(portraitDesk ? 0.84 : 1.02, framedSize.y * (portraitDesk ? 0.96 : 1.08));
    const paddedWidth = Math.max(0.78, framedSize.x * (portraitDesk ? 1.02 : 1.14));
    const fitHeightDistance = (paddedHeight * 0.5) / Math.tan(verticalFov / 2);
    const fitWidthDistance = (paddedWidth * 0.5) / Math.tan(horizontalFov / 2);
    const homeDistanceBoost = home?.framing?.distanceBoost ?? 0;
    const homeCameraX = home?.framing?.cameraX ?? 0;
    const homeFocusX = home?.framing?.focusX ?? 0;
    const homeFocusZ = home?.framing?.focusZ ?? 0;
    const cameraDistance = THREE.MathUtils.clamp(
      Math.max(fitHeightDistance, fitWidthDistance) * (portraitDesk ? 0.88 : 0.94) + homeDistanceBoost,
      portraitDesk ? 1.76 : 2.08,
      portraitDesk ? 2.95 : 3.45
    );
    runtimeState.avatarFocusPoint.set(homeFocusX, visibleFocusY, homeFocusZ);
    camera.position.set(
      homeCameraX,
      runtimeState.avatarFocusPoint.y - THREE.MathUtils.clamp(framedHeight * (portraitDesk ? 0.03 : 0.05), 0.06, 0.18),
      cameraDistance
    );
  }
  runtimeState.cameraBasePosition.copy(camera.position);
  updateCameraLook();

  if (!gameCam) {
    const desiredBottomNdc = portraitDesk ? -1.34 : -1.06;
    const desiredTopNdc = portraitDesk ? 0.86 : 0.82;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      vrm.scene.position.copy(runtimeState.avatarBasePosition);
      vrm.scene.rotation.y = runtimeState.avatarYaw;
      vrm.scene.updateWorldMatrix(true, true);
      updateCameraLook();

      const extents = getAvatarProjectionExtents(vrm);
      if (!extents) {
        break;
      }

      let adjustY = 0;
      if (extents.bottomPoint) {
        const depth = Math.max(0.5, Math.abs(camera.position.z - extents.bottomPoint.z));
        const bottomDelta = desiredBottomNdc - extents.bottomNdc;
        if (Math.abs(bottomDelta) > 0.025) {
          adjustY += bottomDelta * depth * Math.tan(verticalFov / 2) * (portraitDesk ? 0.94 : 0.98);
        }
      }
      if (extents.topPoint && extents.topNdc > desiredTopNdc) {
        const depth = Math.max(0.5, Math.abs(camera.position.z - extents.topPoint.z));
        adjustY -= (extents.topNdc - desiredTopNdc) * depth * Math.tan(verticalFov / 2) * (portraitDesk ? 0.7 : 0.85);
      }

      if (Math.abs(adjustY) < 0.006) {
        break;
      }

      runtimeState.avatarBasePosition.y += adjustY;
    }

    vrm.scene.position.copy(runtimeState.avatarBasePosition);
    vrm.scene.rotation.y = runtimeState.avatarYaw;
    vrm.scene.updateWorldMatrix(true, true);
  }
}

function populateBundledAvatarSelect() {
  if (elements.avatarLockLabel) {
    const rememberedAvatar = runtimeState.settings.avatarPath;
    const defaultAvatar = runtimeState.bundledAvatars.find((filePath) => getFileName(filePath) === clientProfile.preferredAvatarFile)
      || runtimeState.bundledAvatars[0]
      || '';
    const labelAvatar = rememberedAvatar || defaultAvatar;
    elements.avatarLockLabel.textContent = labelAvatar ? getFileName(labelAvatar) : clientProfile.preferredAvatarFile || 'Mai.vrm';
  }

  if (!elements.bundledAvatarSelect) {
    return;
  }

  elements.bundledAvatarSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = runtimeState.bundledAvatars.length ? t('bundledAvatars') : t('noBundledAvatars');
  elements.bundledAvatarSelect.appendChild(placeholder);

  runtimeState.bundledAvatars.forEach((filePath, index) => {
    const option = document.createElement('option');
    option.value = filePath;
    option.textContent = getAvatarLabel(filePath, index);
    elements.bundledAvatarSelect.appendChild(option);
  });

  if (runtimeState.bundledAvatars.includes(runtimeState.settings.avatarPath)) {
    elements.bundledAvatarSelect.value = runtimeState.settings.avatarPath;
  } else {
    elements.bundledAvatarSelect.value = '';
  }
}

async function bootAnimationLibrary() {
  try {
    const payload = await window.desktopCompanion.listAnimationLibrary();
    runtimeState.animationLibrary = payload?.libraries || [];
    runtimeState.animationPresets = {
      idle: payload?.presets?.idle || [],
      wave: payload?.presets?.wave || [],
      happy: payload?.presets?.happy || [],
      curious: payload?.presets?.curious || [],
      groove: payload?.presets?.groove || []
    };

    if (hasClipAnimations()) {
      const actionCount = Number(payload?.actionCount) || getLearnedActionCount();
      const actionWord = actionCount === 1 ? t('learnedAction') : t('learnedActions');
      appendMessage(
        'system',
        t('wokeWithActions', { name: ASSISTANT_NAME, count: actionCount, actionWord })
      );
      renderAvatarStatus();
    }
  } catch (error) {
    appendMessage('system', t('actionMemoryLoadFailed', { message: getErrorMessage(error) }));
  }
}

async function loadAvatarFromPath(filePath) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  if (elements.loadAvatarBtn) {
    elements.loadAvatarBtn.disabled = true;
  }
  setAvatarStatusTransient(`Loading ${getFileName(filePath)}...`);
  try {
    const gltf = await new Promise((resolve, reject) => loader.load(toFileUrl(filePath), resolve, undefined, reject));
    const vrm = gltf.userData.vrm;
    if (!vrm) {
      throw new Error('That file loaded, but it does not look like a VRM avatar.');
    }
    clearCurrentAvatar();
    vrm.scene.traverse((node) => {
      if (!node.isMesh) {
        return;
      }
      node.castShadow = true;
      node.receiveShadow = false;
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => {
          if (material) {
            material.depthWrite = true;
          }
        });
      } else if (node.material) {
        node.material.depthWrite = true;
      }
    });
    scene.add(vrm.scene);
    fitAvatarToStage(vrm);
    currentVrm = vrm;
    runtimeState.settings.avatarPath = filePath;
    saveSettings();
    clock.getDelta();
    const isBundled = runtimeState.bundledAvatars.includes(filePath);
    populateBundledAvatarSelect();
    if (hasClipAnimations()) {
      await playAnimationPreset('idle', true).catch(() => false);
    }
    const home = runtimeState.home?.useScene ? getActiveHomeEnvironment() : null;
    const actionCount = getLearnedActionCount();
    setAvatarStatusInfo(
      `${getFileName(filePath)} is live${isBundled ? ' from your bundled avatars' : ''}.${home ? ` ${home.label} is loaded as Mai's copied home.` : ' Glass desktop mode is active.'}${actionCount ? ` Mai knows ${actionCount} learned action${actionCount === 1 ? '' : 's'}.` : ''}`
    );
    if (elements.avatarConsoleSummary) {
      elements.avatarConsoleSummary.textContent = `${getFileName(filePath)} is loaded and remembered.`;
    }
    if (!runtimeState.ui.avatarConsoleOpen) {
      scheduleAvatarConsoleAutoHide(3200);
    }
    return true;
  } catch (error) {
    setAvatarStatusError(getErrorMessage(error));
    return false;
  } finally {
    if (elements.loadAvatarBtn) {
      elements.loadAvatarBtn.disabled = false;
    }
  }
}

function setBoneRotation(name, x = 0, y = 0, z = 0) {
  const bone = currentVrm?.humanoid?.getNormalizedBoneNode(name);
  bone?.rotation.set(x, y, z);
}

function setExpression(name, value) {
  currentVrm?.expressionManager?.setValue(name, value);
}

function getCurrentFeeling(now) {
  return runtimeState.feelingState.expiresAt > now ? runtimeState.feelingState : null;
}

function chooseAmbientPreset(now) {
  const hasMusic = Boolean(runtimeState.currentTrack && !elements.audioPlayer.paused);
  const feeling = getCurrentFeeling(now);
  const affect = runtimeState.affect;
  const dominantDrive = getDominantDrive();
  const sceneFamily = runtimeState.currentScene.family || 'general';
  const settleDepth = runtimeState.residency.depth || 0;
  const typingProfile = getTypingAttentionProfile(now);
  const musicMood = inferMusicMoodProfile();
  const roll = Math.random();

  if (hasMusic) {
    if (!feeling?.preset && musicMood.confidence >= 0.34 && musicMood.presetBias) {
      runtimeState.ambientPreset = musicMood.presetBias;
      runtimeState.ambientUntil = now + 2.4 + Math.random() * 2.2 + musicMood.confidence;
      return;
    }
    if (feeling?.preset === 'groove') {
      runtimeState.ambientPreset = roll < 0.86 ? 'groove' : 'happy';
    } else if (feeling?.preset === 'happy') {
      runtimeState.ambientPreset = roll < 0.55 ? 'happy' : 'groove';
    } else {
      runtimeState.ambientPreset = roll < 0.74 ? 'groove' : 'happy';
    }
    runtimeState.ambientUntil = now + 2.5 + Math.random() * 2.4 + (feeling?.intensity || 0.35);
    return;
  }

  if (typingProfile.active && typingProfile.intensity >= 0.72) {
    runtimeState.ambientPreset = 'idle';
    runtimeState.ambientUntil = now + 4 + typingProfile.intensity * 3.8;
    return;
  }

  if (dominantDrive === 'rest' && roll < 0.8) {
    runtimeState.ambientPreset = 'idle';
    runtimeState.ambientUntil = now + 4.6 + Math.random() * 4.6;
    return;
  }

  if (dominantDrive === 'music' && roll < 0.72) {
    runtimeState.ambientPreset = roll < 0.58 ? 'groove' : 'happy';
    runtimeState.ambientUntil = now + 2.6 + Math.random() * 2.4;
    return;
  }

  if (dominantDrive === 'curiosity' && roll < 0.72) {
    runtimeState.ambientPreset = 'curious';
    runtimeState.ambientUntil = now + 2.8 + Math.random() * 3;
    return;
  }

  if (dominantDrive === 'social' && roll < 0.7) {
    runtimeState.ambientPreset = roll < 0.56 ? 'wave' : 'happy';
    runtimeState.ambientUntil = now + 2.4 + Math.random() * 2.6;
    return;
  }

  if (dominantDrive === 'play' && roll < 0.72) {
    runtimeState.ambientPreset = roll < 0.58 ? 'happy' : 'groove';
    runtimeState.ambientUntil = now + 2.4 + Math.random() * 2.4;
    return;
  }

  if (affect.sleepiness >= 0.74 && roll < 0.72) {
    runtimeState.ambientPreset = 'idle';
    runtimeState.ambientUntil = now + 5.2 + Math.random() * 5.6;
    return;
  }

  if (feeling?.preset === 'wave') {
    runtimeState.ambientPreset = roll < 0.7 ? 'wave' : 'happy';
    runtimeState.ambientUntil = now + 1.8 + feeling.intensity * 2.4;
    return;
  }

  if (feeling?.preset === 'groove') {
    runtimeState.ambientPreset = roll < 0.66 ? 'groove' : 'happy';
    runtimeState.ambientUntil = now + 2.2 + feeling.intensity * 2.6;
    return;
  }

  if (feeling?.preset === 'happy') {
    runtimeState.ambientPreset = roll < 0.68 ? 'happy' : 'idle';
    runtimeState.ambientUntil = now + 2.4 + feeling.intensity * 2.8;
    return;
  }

  if (feeling?.preset === 'curious') {
    runtimeState.ambientPreset = roll < 0.76 ? 'curious' : 'idle';
    runtimeState.ambientUntil = now + 2.5 + feeling.intensity * 2.9;
    return;
  }

  if (settleDepth >= 0.82) {
    if (sceneFamily === 'music' || sceneFamily === 'social') {
      runtimeState.ambientPreset = roll < 0.6 ? 'happy' : 'idle';
      runtimeState.ambientUntil = now + 4.2 + Math.random() * 4.2;
      return;
    }

    runtimeState.ambientPreset = roll < 0.72 ? 'idle' : 'curious';
    runtimeState.ambientUntil = now + 4.6 + Math.random() * 4.4;
    return;
  }

  if (settleDepth >= 0.5 && ['code', 'terminal', 'writing'].includes(sceneFamily)) {
    runtimeState.ambientPreset = roll < 0.68 ? 'idle' : 'curious';
    runtimeState.ambientUntil = now + 3.6 + Math.random() * 3.8;
    return;
  }

  if (sceneFamily === 'music') {
    runtimeState.ambientPreset = roll < 0.68 ? 'groove' : 'happy';
    runtimeState.ambientUntil = now + 2.6 + Math.random() * 2.6;
    return;
  }

  if (sceneFamily === 'social') {
    runtimeState.ambientPreset = roll < 0.54 ? 'happy' : 'wave';
    runtimeState.ambientUntil = now + 2.2 + Math.random() * 2.2;
    return;
  }

  if (sceneFamily === 'art') {
    runtimeState.ambientPreset = roll < 0.58 ? 'curious' : 'happy';
    runtimeState.ambientUntil = now + 2.6 + Math.random() * 2.6;
    return;
  }

  if (sceneFamily === 'code' || sceneFamily === 'terminal' || sceneFamily === 'writing') {
    runtimeState.ambientPreset = roll < 0.72 ? 'curious' : 'idle';
    runtimeState.ambientUntil = now + 3.1 + Math.random() * 3.5;
    return;
  }

  if (sceneFamily === 'browser') {
    runtimeState.ambientPreset = roll < 0.76 ? 'curious' : 'happy';
    runtimeState.ambientUntil = now + 2.8 + Math.random() * 2.8;
    return;
  }

  if (sceneFamily === 'game') {
    runtimeState.ambientPreset = roll < 0.62 ? 'happy' : 'groove';
    runtimeState.ambientUntil = now + 2.4 + Math.random() * 2.4;
    return;
  }

  if (affect.curiosity >= 0.7) {
    runtimeState.ambientPreset = roll < 0.72 ? 'curious' : 'idle';
    runtimeState.ambientUntil = now + 3 + Math.random() * 3.1;
    return;
  }

  if (affect.affection >= 0.7 || affect.sociability >= 0.72) {
    runtimeState.ambientPreset = roll < 0.58 ? 'happy' : 'idle';
    runtimeState.ambientUntil = now + 2.8 + Math.random() * 2.8;
    return;
  }

  if (roll < 0.58) {
    runtimeState.ambientPreset = 'idle';
    runtimeState.ambientUntil = now + 3.6 + Math.random() * 4.4;
  } else if (roll < 0.86) {
    runtimeState.ambientPreset = 'curious';
    runtimeState.ambientUntil = now + 2.8 + Math.random() * 3.4;
  } else {
    runtimeState.ambientPreset = 'happy';
    runtimeState.ambientUntil = now + 2.2 + Math.random() * 2.4;
  }
}

function getActivePreset(now) {
  const typingProfile = getTypingAttentionProfile(now);
  if (now < runtimeState.speakingUntil) {
    return 'talk';
  }
  if (now < runtimeState.overrideUntil) {
    return runtimeState.overridePreset;
  }
  if (typingProfile.active) {
    return typingProfile.preset;
  }
  if (runtimeState.loading || runtimeState.screenBusy || runtimeState.socialMai.busy || now < runtimeState.mannerisms.ponderingUntil) {
    return 'curious';
  }
  if (now < runtimeState.mannerisms.listeningUntil && !runtimeState.currentTrack) {
    return 'curious';
  }
  if (now >= runtimeState.ambientUntil) {
    chooseAmbientPreset(now);
  }
  return runtimeState.ambientPreset;
}

function triggerPreset(name, durationSeconds = 4.5) {
  runtimeState.overridePreset = name;
  runtimeState.overrideUntil = performance.now() / 1000 + durationSeconds;
}

function startSpeaking(durationSeconds) {
  runtimeState.speakingUntil = Math.max(runtimeState.speakingUntil, performance.now() / 1000 + durationSeconds);
}

function handleAvatarPointerMove(event) {
  const rect = elements.avatarStage.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  runtimeState.presence.pointerActive = true;
  runtimeState.presence.targetPointerX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
  runtimeState.presence.targetPointerY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
}

function clearAvatarPointer() {
  runtimeState.presence.pointerActive = false;
  runtimeState.presence.targetPointerX = 0;
  runtimeState.presence.targetPointerY = 0;
}

function updatePresencePointer(delta) {
  if (isGameCamMode()) {
    const followSpeed = Math.min(1, delta * 3.2);
    runtimeState.presence.pointerActive = false;
    runtimeState.presence.targetPointerX = 0;
    runtimeState.presence.targetPointerY = 0.04;
    runtimeState.presence.pointerX += (runtimeState.presence.targetPointerX - runtimeState.presence.pointerX) * followSpeed;
    runtimeState.presence.pointerY += (runtimeState.presence.targetPointerY - runtimeState.presence.pointerY) * followSpeed;
    return;
  }

  const followSpeed = Math.min(1, delta * 5.5);
  runtimeState.presence.pointerX += (runtimeState.presence.targetPointerX - runtimeState.presence.pointerX) * followSpeed;
  runtimeState.presence.pointerY += (runtimeState.presence.targetPointerY - runtimeState.presence.pointerY) * followSpeed;
}

function markListening(durationSeconds = 4.6) {
  const now = performance.now() / 1000;
  runtimeState.mannerisms.listeningUntil = Math.max(runtimeState.mannerisms.listeningUntil, now + durationSeconds);
  runtimeState.mannerisms.nextWanderAt = Math.max(runtimeState.mannerisms.nextWanderAt, now + durationSeconds * 0.75);
}

function markPondering(durationSeconds = 4.8) {
  const now = performance.now() / 1000;
  runtimeState.mannerisms.ponderingUntil = Math.max(runtimeState.mannerisms.ponderingUntil, now + durationSeconds);
  runtimeState.mannerisms.perkUntil = Math.max(runtimeState.mannerisms.perkUntil, now + Math.min(1.8, durationSeconds * 0.35));
  runtimeState.mannerisms.nextWanderAt = Math.max(runtimeState.mannerisms.nextWanderAt, now + durationSeconds * 0.9);
}

function markPerk(durationSeconds = 2.6) {
  const now = performance.now() / 1000;
  runtimeState.mannerisms.perkUntil = Math.max(runtimeState.mannerisms.perkUntil, now + durationSeconds);
  runtimeState.mannerisms.focusUntil = Math.max(runtimeState.mannerisms.focusUntil, now + Math.min(1.6, durationSeconds * 0.55));
}

function updateMannerisms(delta, now) {
  const mannerisms = runtimeState.mannerisms;
  const affect = runtimeState.affect;
  const gameCam = isGameCamMode();
  const pointerActive = runtimeState.presence.pointerActive;
  const typingProfile = getTypingAttentionProfile(now);
  const typingIntensity = typingProfile.active ? typingProfile.intensity : 0;
  const listening = now < mannerisms.listeningUntil || typingProfile.active;
  const pondering = now < mannerisms.ponderingUntil;
  const perked = now < mannerisms.perkUntil;

  if (gameCam) {
    mannerisms.targetFocusX = Math.sin(now * (pondering ? 0.34 : 0.42)) * (pondering ? 0.022 : 0.012);
    mannerisms.targetFocusY = -0.02 - typingIntensity * 0.014 - (runtimeState.screenBusy ? 0.02 : 0) - (runtimeState.loading ? 0.015 : 0);
    const follow = Math.min(1, delta * (pondering ? 2.8 : listening ? 3.3 : perked ? 3.7 : 2.6));
    mannerisms.focusX = lerp(mannerisms.focusX, mannerisms.targetFocusX, follow);
    mannerisms.focusY = lerp(mannerisms.focusY, mannerisms.targetFocusY, follow);
    mannerisms.focusUntil = now + 1.2;
    mannerisms.nextWanderAt = now + 4.2;
    return;
  }

  if (pointerActive) {
    mannerisms.targetFocusX = 0;
    mannerisms.targetFocusY = 0;
    mannerisms.focusUntil = Math.max(mannerisms.focusUntil, now + 0.8);
  } else if (pondering) {
    mannerisms.targetFocusX = Math.sin(now * 0.72) * 0.11 + Math.cos(now * 0.31) * 0.03;
    mannerisms.targetFocusY = -0.08 - affect.focus * 0.04;
    mannerisms.focusUntil = Math.max(mannerisms.focusUntil, now + 0.8);
  } else if (listening) {
    mannerisms.targetFocusX = Math.sin(now * (0.46 - typingIntensity * 0.12)) * lerp(0.05, 0.018, typingIntensity);
    mannerisms.targetFocusY = -0.03 - affect.affection * 0.02 - typingIntensity * 0.03;
    mannerisms.focusUntil = Math.max(mannerisms.focusUntil, now + 0.7 + typingIntensity * 0.6);
  } else if (perked) {
    mannerisms.targetFocusX = Math.sin(now * 0.94) * 0.08;
    mannerisms.targetFocusY = -0.015;
    mannerisms.focusUntil = Math.max(mannerisms.focusUntil, now + 0.65);
  } else {
    if (now >= mannerisms.nextWanderAt) {
      const curiosity = affect.curiosity;
      const sleepiness = affect.sleepiness;
      const energy = affect.energy;
      mannerisms.targetFocusX = clamp((Math.random() - 0.5) * (0.28 + curiosity * 0.26), -0.24, 0.24);
      mannerisms.targetFocusY = clamp((Math.random() - 0.65) * (0.22 + curiosity * 0.18) - sleepiness * 0.12 + energy * 0.03, -0.22, 0.12);
      mannerisms.focusUntil = now + 1.5 + Math.random() * 2.6 + curiosity * 0.7;
      mannerisms.nextWanderAt = mannerisms.focusUntil + 3.6 + Math.random() * 6.8 + sleepiness * 4.4;
    }

    if (now >= mannerisms.focusUntil) {
      mannerisms.targetFocusX = 0;
      mannerisms.targetFocusY = 0;
    }
  }

  const follow = Math.min(1, delta * (pondering ? 3.2 : listening ? lerp(4.1, 2.6, typingIntensity) : perked ? 3.6 : 2.1));
  mannerisms.focusX = lerp(mannerisms.focusX, mannerisms.targetFocusX, follow);
  mannerisms.focusY = lerp(mannerisms.focusY, mannerisms.targetFocusY, follow);
}

function ensureAudioMotion() {
  if (runtimeState.audioMotion.sourceNode) {
    runtimeState.audioMotion.context?.resume?.().catch(() => {});
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    const sourceNode = context.createMediaElementSource(elements.audioPlayer);
    sourceNode.connect(analyser);
    analyser.connect(context.destination);
    runtimeState.audioMotion = {
      context,
      analyser,
      sourceNode,
      dataArray: new Uint8Array(analyser.frequencyBinCount),
      level: 0,
      smoothedLevel: 0
    };
  } catch {}
}

function sampleAudioLevel(delta) {
  const motion = runtimeState.audioMotion;
  if (!motion.analyser || !motion.dataArray || !runtimeState.currentTrack || elements.audioPlayer.paused) {
    motion.smoothedLevel += (0 - motion.smoothedLevel) * Math.min(1, delta * 4);
    return motion.smoothedLevel || 0;
  }

  motion.analyser.getByteFrequencyData(motion.dataArray);
  const bins = Math.min(28, motion.dataArray.length);
  let total = 0;

  for (let index = 0; index < bins; index += 1) {
    total += motion.dataArray[index];
  }

  motion.level = bins ? total / bins / 255 : 0;
  motion.smoothedLevel += (motion.level - motion.smoothedLevel) * Math.min(1, delta * 7.5);
  return motion.smoothedLevel;
}

function updateBlink(now) {
  if (now >= runtimeState.nextBlinkAt) {
    runtimeState.blinkUntil = now + 0.12;
    runtimeState.nextBlinkAt = now + 2 + Math.random() * 3.3;
  }
  if (now > runtimeState.blinkUntil) {
    return 0;
  }
  const progress = 1 - Math.abs(((runtimeState.blinkUntil - now) / 0.12) - 0.5) * 2;
  return Math.max(0, Math.min(1, progress));
}

function animateAvatar(delta, now) {
  if (!currentVrm) {
    return;
  }

  refreshSceneResidency(now);
  updateAffectDrift(delta, now);
  updatePresencePointer(delta);
  updateMannerisms(delta, now);
  const audioLevel = sampleAudioLevel(delta);
  const affect = runtimeState.affect;
  const mannerisms = runtimeState.mannerisms;
  const gameCam = isGameCamMode();
  const preset = getActivePreset(now);
  const feelingPreset = getCurrentFeeling(now)?.preset || '';
  const listening = now < mannerisms.listeningUntil ? 1 : 0;
  const pondering = now < mannerisms.ponderingUntil ? 1 : 0;
  const perked = now < mannerisms.perkUntil ? 1 : 0;
  const typingProfile = getTypingAttentionProfile(now);
  const typingStillness = typingProfile.active ? typingProfile.intensity : 0;
  const settleStillness = clamp01((runtimeState.residency.depth || 0) * 0.55);
  const stillness = clamp01(settleStillness + typingStillness * 0.65 + (gameCam ? 0.22 : 0));
  const bodyPreset =
    preset === 'talk'
      ? (now < runtimeState.overrideUntil ? runtimeState.overridePreset : feelingPreset || runtimeState.ambientPreset)
      : preset;
  const blink = updateBlink(now);
  const pointerX = runtimeState.presence.pointerX;
  const pointerY = runtimeState.presence.pointerY;
  const motionScale = gameCam ? 0.26 : 1;
  const gazeScale = gameCam ? 0.36 : 1;
  const gazeX = (pointerX * 0.82 + mannerisms.focusX) * (1 - stillness * 0.18) * gazeScale;
  const gazeY = (pointerY * 0.58 + mannerisms.focusY) * (1 - stillness * 0.14) * gazeScale;
  const stageShiftX = (pointerX * 0.055 + mannerisms.focusX * 0.03) * (1 - stillness * 0.26) * motionScale;
  const stageShiftY = (
    -pointerY * 0.018
    + audioLevel * (bodyPreset === 'groove' ? (gameCam ? 0.014 : 0.034) : (gameCam ? 0.006 : 0.014))
    - affect.sleepiness * 0.012
    - mannerisms.focusY * 0.014
    - typingStillness * 0.008
  ) * motionScale;
  const attentiveYaw = ((pointerX * 0.11 + mannerisms.focusX * 0.18) * (1 - stillness * 0.22) + listening * 0.02) * (gameCam ? 0.34 : 1);
  camera.position.x = runtimeState.cameraBasePosition.x + (pointerX * 0.08 + mannerisms.focusX * 0.05) * (gameCam ? 0.18 : (1 - stillness * 0.18));
  camera.position.y = runtimeState.cameraBasePosition.y + stageShiftY * (gameCam ? 0.12 : 0.45) - affect.sleepiness * (gameCam ? 0.012 : 0.03) - mannerisms.focusY * (gameCam ? 0.01 : 0.026);
  camera.position.z = runtimeState.cameraBasePosition.z - Math.abs(pointerY) * (gameCam ? 0.01 : 0.03) - pondering * (gameCam ? 0.008 : 0.02);
  camera.lookAt(
    runtimeState.avatarFocusPoint.x + gazeX * 0.05,
    runtimeState.avatarFocusPoint.y - gazeY * (gameCam ? 0.026 : 0.04),
    runtimeState.avatarFocusPoint.z
  );
  let happyWeight = 0;
  let aaWeight = 0;

  if (hasClipAnimations()) {
    currentVrm.scene.position.copy(runtimeState.avatarBasePosition);
    currentVrm.scene.position.x += stageShiftX;
    currentVrm.scene.position.y += stageShiftY;
    currentVrm.scene.rotation.y = runtimeState.avatarYaw + attentiveYaw;
    if (shouldRefreshClipPreset(bodyPreset, now)) {
      playAnimationPreset(bodyPreset).catch(() => false);
    }
    runtimeState.animationMixer?.update(delta);

    if (preset === 'talk') {
      aaWeight = 0.45 + Math.abs(Math.sin(now * 8)) * 0.35;
    }

    if (bodyPreset === 'happy' || bodyPreset === 'groove' || bodyPreset === 'wave') {
      happyWeight = 0.32 + audioLevel * 0.12 + perked * 0.08;
    } else if (bodyPreset === 'curious') {
      happyWeight = 0.12 + listening * 0.05;
    }

    setExpression('happy', happyWeight);
    setExpression('aa', aaWeight);
    setExpression('blink', blink);
    currentVrm.update(delta);
    return;
  }

  const bounce = Math.sin(now * (1.4 + affect.energy * 1.2)) * (0.012 + affect.energy * 0.015);
  const sway = Math.sin(now * 0.7) * 0.12;
  const groove = Math.sin(now * (2 + affect.energy * 1.6));
  const breath = Math.sin(now * (0.95 + affect.calm * 0.8));
  const slowLean = Math.sin(now * 0.6);
  currentVrm.scene.position.x = runtimeState.avatarBasePosition.x + stageShiftX;
  currentVrm.scene.position.y = runtimeState.avatarBasePosition.y + bounce + stageShiftY + (preset === 'groove' ? groove * 0.018 : 0);
  currentVrm.scene.position.z = runtimeState.avatarBasePosition.z;
  currentVrm.scene.rotation.y = runtimeState.avatarYaw + attentiveYaw + sway * (preset === 'groove' ? 0.65 : 0.42);
  setBoneRotation('spine', 0.02 + breath * 0.016 - affect.sleepiness * 0.03 + listening * 0.018 + pondering * 0.028, 0, 0.016 * slowLean + affect.affection * 0.014 + mannerisms.focusX * 0.03);
  setBoneRotation('chest', 0.008 + breath * 0.009, 0, 0.013 * slowLean);
  setBoneRotation('neck', 0.016 + breath * 0.018 - gazeY * 0.04 - affect.sleepiness * 0.035 + listening * 0.012, 0.03 * Math.sin(now * 0.75) + gazeX * 0.07, 0);
  setBoneRotation('head', 0.018 + breath * 0.026 - gazeY * 0.08 - affect.sleepiness * 0.06 + listening * 0.02 + pondering * 0.015, 0.07 * Math.sin(now * 0.52) + gazeX * 0.12, 0.012 * Math.sin(now * 0.94) + affect.affection * 0.02 + mannerisms.focusX * 0.04);
  setBoneRotation('leftUpperArm', 0.16, 0, -1.04);
  setBoneRotation('rightUpperArm', 0.16, 0, 1.04);
  setBoneRotation('leftLowerArm', -0.22, 0, -0.16);
  setBoneRotation('rightLowerArm', -0.22, 0, 0.16);

  if (preset === 'talk') {
    const talkBeat = Math.sin(now * 10) * 0.12;
    const gesture = Math.sin(now * 4.2) * 0.08;
    setBoneRotation('spine', 0.05 + breath * 0.02, 0, 0.025 * slowLean);
    setBoneRotation('head', 0.07 + talkBeat, 0.04 * Math.sin(now * 1.2), 0);
    setBoneRotation('leftUpperArm', 0.28, 0, -0.86 + gesture);
    setBoneRotation('rightUpperArm', 0.24, 0, 0.86 - gesture);
    setBoneRotation('leftLowerArm', -0.54, 0, -0.22);
    setBoneRotation('rightLowerArm', -0.52, 0, 0.22);
    aaWeight = 0.45 + Math.abs(Math.sin(now * 8)) * 0.35;
  } else if (preset === 'curious') {
    setBoneRotation('spine', 0.045 + pondering * 0.02, 0, -0.04 + mannerisms.focusX * 0.04);
    setBoneRotation('head', 0.06 + pondering * 0.02, -0.14 + mannerisms.focusX * 0.06, -0.06 + mannerisms.focusY * 0.05);
    setBoneRotation('leftUpperArm', 0.22, 0, -0.94);
    setBoneRotation('rightUpperArm', 0.1, 0, 0.98);
    setBoneRotation('rightLowerArm', -0.34, 0, 0.22);
    happyWeight = 0.12 + affect.curiosity * 0.18;
  } else if (preset === 'groove') {
    const beat = Math.sin(now * 3.6);
    setBoneRotation('spine', 0.06 + beat * 0.02, 0, beat * 0.05);
    setBoneRotation('chest', 0.02, 0, beat * 0.08);
    setBoneRotation('head', 0.04, beat * 0.12, beat * 0.02);
    setBoneRotation('leftUpperArm', 0.24, 0, -0.92 + beat * 0.1);
    setBoneRotation('rightUpperArm', 0.24, 0, 0.92 - beat * 0.1);
    setBoneRotation('leftLowerArm', -0.46, 0, -0.18 + beat * 0.05);
    setBoneRotation('rightLowerArm', -0.46, 0, 0.18 - beat * 0.05);
    happyWeight = 0.42 + Math.abs(beat) * 0.2 + audioLevel * 0.22;
  } else if (preset === 'happy') {
    setBoneRotation('spine', 0.05, 0, 0.04);
    setBoneRotation('head', 0.04, -0.08 + mannerisms.focusX * 0.04, 0.04);
    setBoneRotation('leftUpperArm', 0.18, 0, -0.82);
    setBoneRotation('rightUpperArm', 0.18, 0, 0.82);
    setBoneRotation('leftLowerArm', -0.35, 0, -0.22);
    setBoneRotation('rightLowerArm', -0.35, 0, 0.22);
    happyWeight = 0.82 + audioLevel * 0.1 + perked * 0.06;
  } else if (preset === 'wave') {
    const wave = Math.sin(now * 7.5) * 0.4;
    setBoneRotation('head', 0.05, -0.12 + mannerisms.focusX * 0.05, 0.03);
    setBoneRotation('rightUpperArm', -0.18, 0, 0.14);
    setBoneRotation('rightLowerArm', -0.18, 0, 0.4 + wave);
    setBoneRotation('leftUpperArm', 0.18, 0, -0.96);
    setBoneRotation('leftLowerArm', -0.32, 0, -0.18);
    happyWeight = 0.52 + affect.affection * 0.14;
  }
  setExpression('happy', happyWeight);
  setExpression('aa', aaWeight);
  setExpression('blink', blink);
  currentVrm.update(delta);
}

function resizeRenderer() {
  const stageRect = elements.avatarStage.getBoundingClientRect();
  const width = Math.max(1, Math.round(stageRect.width || elements.avatarCanvas.clientWidth || 1));
  const height = Math.max(1, Math.round(stageRect.height || elements.avatarCanvas.clientHeight || 1));
  if (!width || !height) {
    return;
  }
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== width || size.y !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  if (currentVrm) {
    fitAvatarToStage(currentVrm);
    return;
  }
  renderAvatarHome();
  updateCameraLook();
}

function enforceTransparentRenderSurface() {
  if (!isTransparentCompanionMode()) {
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setClearAlpha(0);
}

function requestResizeRenderer() {
  if (resizeRendererFrame) {
    return;
  }
  resizeRendererFrame = requestAnimationFrame(() => {
    resizeRendererFrame = 0;
    resizeRenderer();
  });
}

function clearPresenceBackdropRefreshTimer() {
  if (runtimeState.presenceBackdrop.refreshTimer) {
    clearTimeout(runtimeState.presenceBackdrop.refreshTimer);
    runtimeState.presenceBackdrop.refreshTimer = null;
  }
}

function schedulePresenceBackdropRefresh(delayMs = 180) {
  clearPresenceBackdropRefreshTimer();
  if (!isPresenceMode()) {
    return;
  }
  runtimeState.presenceBackdrop.refreshTimer = window.setTimeout(() => {
    runtimeState.presenceBackdrop.refreshTimer = null;
    refreshPresenceBackdrop().catch(() => {});
  }, delayMs);
}

async function refreshPresenceBackdrop() {
  if (!isPresenceMode() || runtimeState.presenceBackdrop.busy || !window.desktopCompanion?.capturePresenceBackdrop) {
    return;
  }
  runtimeState.presenceBackdrop.busy = true;
  try {
    const stageRect = elements.avatarStage.getBoundingClientRect();
    const capture = await window.desktopCompanion.capturePresenceBackdrop({
      stageRect: {
        left: Math.round(stageRect.left),
        top: Math.round(stageRect.top),
        width: Math.round(stageRect.width),
        height: Math.round(stageRect.height)
      }
    });
    runtimeState.presenceBackdrop.imageDataUrl = String(capture?.imageDataUrl || '').trim();
    renderAvatarHome();
  } finally {
    runtimeState.presenceBackdrop.busy = false;
  }
}

function isWindowDragTarget(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }
  if (target.closest('.no-drag, button, input, select, textarea, a')) {
    return false;
  }
  return Boolean(target.closest('.titlebar, .drag-handle'));
}

function flushWindowMove() {
  windowDragFrame = 0;
  if (!pendingWindowMove || !window.desktopCompanion?.moveWindowTo) {
    return;
  }
  const { x, y } = pendingWindowMove;
  pendingWindowMove = null;
  window.desktopCompanion.moveWindowTo(x, y).catch(() => {});
}

function queueWindowMove(x, y) {
  pendingWindowMove = {
    x: Math.round(x),
    y: Math.round(y)
  };
  if (!windowDragFrame) {
    windowDragFrame = requestAnimationFrame(flushWindowMove);
  }
}

async function beginWindowDrag(event) {
  if (event.button !== 0 || !isWindowDragTarget(event) || !window.desktopCompanion?.getWindowBounds) {
    return;
  }
  const bounds = await window.desktopCompanion.getWindowBounds().catch(() => null);
  if (!bounds) {
    return;
  }
  windowDragState = {
    offsetX: event.screenX - bounds.x,
    offsetY: event.screenY - bounds.y
  };
  document.body.classList.add('window-dragging');
  event.preventDefault();
}

function handleWindowDrag(event) {
  if (!windowDragState) {
    return;
  }
  event.preventDefault();
  queueWindowMove(event.screenX - windowDragState.offsetX, event.screenY - windowDragState.offsetY);
}

function endWindowDrag() {
  windowDragState = null;
  document.body.classList.remove('window-dragging');
}

function loop() {
  const delta = clock.getDelta();
  const now = performance.now() / 1000;
  animateAvatar(delta, now);
  animateAvatarHome(now);
  renderBubbles();
  enforceTransparentRenderSurface();
  if (now - runtimeState.affect.lastStatusRefreshAt >= 1.2) {
    runtimeState.affect.lastStatusRefreshAt = now;
    renderAvatarStatus();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
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
      const key = String(rawKey || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
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

function inferTrackChoiceFromText(text, candidates = []) {
  const source = String(text || '').toLowerCase();
  if (!source) {
    return null;
  }

  for (const entry of candidates) {
    const track = entry?.track;
    if (!track) {
      continue;
    }

    const title = String(track.title || '').toLowerCase();
    const artist = String(track.artist || '').toLowerCase();
    const album = String(track.album || '').toLowerCase();
    const id = String(track.id || '').toLowerCase();
    const titleHit = title && source.includes(title);
    const artistHit = artist && source.includes(artist);
    const albumHit = album && source.includes(album);
    const idHit = id && source.includes(id);

    if (idHit || (titleHit && (artistHit || albumHit || title.split(/\s+/).length >= 3))) {
      return {
        id: track.id,
        reason: trimText(text, 120)
      };
    }
  }

  return null;
}

function tokenize(text) {
  return Array.from(new Set(String(text || '').toLowerCase().split(/[^a-z0-9]+/i).filter((token) => token.length > 2)));
}

function pushRecentTrack(trackId) {
  runtimeState.recentTrackIds = [trackId, ...runtimeState.recentTrackIds.filter((value) => value !== trackId)].slice(0, 10);
}

function changeArtistAffinity(artist, delta) {
  const key = String(artist || 'Unknown artist').toLowerCase();
  const current = runtimeState.settings.tasteProfile.artistAffinity[key] || 0;
  runtimeState.settings.tasteProfile.artistAffinity[key] = Math.max(-5, Math.min(8, current + delta));
}

function changeSceneArtistAffinity(sceneFamily, artist, delta) {
  const family = String(sceneFamily || 'general').toLowerCase();
  const artistKey = String(artist || 'Unknown artist').toLowerCase();
  const byScene = runtimeState.settings.tasteProfile.sceneArtistAffinity || {};
  const currentSceneMap = byScene[family] || {};
  const current = currentSceneMap[artistKey] || 0;

  runtimeState.settings.tasteProfile.sceneArtistAffinity = {
    ...byScene,
    [family]: {
      ...currentSceneMap,
      [artistKey]: Math.max(-4, Math.min(7, current + delta))
    }
  };
}

function getSceneArtistAffinity(sceneFamily, artist) {
  const family = String(sceneFamily || 'general').toLowerCase();
  const artistKey = String(artist || 'Unknown artist').toLowerCase();
  return runtimeState.settings.tasteProfile.sceneArtistAffinity?.[family]?.[artistKey] || 0;
}

function setTrackPreference(track, liked) {
  const likes = new Set(runtimeState.settings.tasteProfile.likedTrackIds);
  const dislikes = new Set(runtimeState.settings.tasteProfile.dislikedTrackIds);
  const sceneFamily = runtimeState.currentScene.family || 'general';
  likes.delete(track.id);
  dislikes.delete(track.id);
  if (liked) {
    likes.add(track.id);
    changeArtistAffinity(track.artist, 1);
    changeSceneArtistAffinity(sceneFamily, track.artist, 1);
    triggerPreset('happy', 3.4);
    applyDriveDelta({
      music: 0.05,
      play: 0.04,
      attention: 0.02
    }, true);
    applyAffectDelta({
      affection: 0.05,
      energy: 0.02,
      calm: 0.02
    });
  } else {
    dislikes.add(track.id);
    changeArtistAffinity(track.artist, -1);
    changeSceneArtistAffinity(sceneFamily, track.artist, -1);
    applyDriveDelta({
      curiosity: 0.02,
      music: -0.06,
      play: -0.03
    }, true);
    applyAffectDelta({
      curiosity: 0.01,
      calm: -0.02,
      affection: -0.01
    });
  }
  runtimeState.settings.tasteProfile.likedTrackIds = [...likes];
  runtimeState.settings.tasteProfile.dislikedTrackIds = [...dislikes];
  saveSettings();
  renderMusicState();
}

function describeTrack(track) {
  const artist = track?.artist || 'Unknown artist';
  const title = track?.title || track?.name || 'Unknown track';
  return `${artist} - ${title}`;
}

function getRecentTrackRecords(limit = 6) {
  const libraryById = new Map(runtimeState.library.map((track) => [track.id, track]));
  return runtimeState.recentTrackIds
    .slice(0, Math.max(0, limit))
    .map((trackId) => libraryById.get(trackId))
    .filter(Boolean);
}

function getDjIntentTokens() {
  const parts = [
    runtimeState.screenInsight?.summary,
    runtimeState.screenInsight?.mood,
    runtimeState.screenInsight?.suggestedMusicVibe,
    runtimeState.screenInsight?.activeWindowTitle,
    runtimeState.currentScene.label,
    runtimeState.currentScene.family,
    runtimeState.currentTrackReason
  ];
  return tokenize(parts.filter(Boolean).join(' '));
}

function scoreSceneMusicBias(track, sceneFamily) {
  const bias = getSceneMusicBias(sceneFamily);
  let score = 0;

  for (const keyword of bias.boost || []) {
    if (track.searchBlob.includes(keyword)) {
      score += 1.2;
    }
  }

  for (const keyword of bias.soften || []) {
    if (track.searchBlob.includes(keyword)) {
      score -= 0.9;
    }
  }

  return score;
}

function summarizeTrackReason(track, breakdown = {}, trigger = 'manual') {
  const parts = [];
  const sceneFamily = runtimeState.currentScene.family || 'general';
  const sceneBias = getSceneMusicBias(sceneFamily);

  if (breakdown.intentHits?.length) {
    parts.push(`matches ${breakdown.intentHits.slice(0, 2).join(', ')}`);
  } else if (breakdown.sceneHit) {
    parts.push(sceneBias.fallbackReason);
  }

  if (breakdown.artistTasteBoost >= 1.2) {
    parts.push(`leans into your ${track.artist} streak`);
  } else if (breakdown.sceneArtistBoost >= 1) {
    parts.push(`fits your ${sceneFamily} room taste`);
  }

  if (breakdown.freshnessBoost >= 0.8) {
    parts.push('keeps the rotation fresh');
  }

  if (trigger === 'screen' && runtimeState.screenInsight?.suggestedMusicVibe) {
    parts.push(`follows the ${runtimeState.screenInsight.suggestedMusicVibe} vibe`);
  } else if (trigger === 'manual') {
    parts.push('felt like the best fit right now');
  }

  return trimText(parts.filter(Boolean).join(' · ') || sceneBias.fallbackReason || 'picked from your local taste profile', 140);
}

function evaluateTrackCandidate(track, trigger = 'manual') {
  const likes = runtimeState.settings.tasteProfile.likedTrackIds;
  const dislikes = runtimeState.settings.tasteProfile.dislikedTrackIds;
  const artistAffinity = runtimeState.settings.tasteProfile.artistAffinity;
  const playCounts = runtimeState.settings.tasteProfile.playCounts;
  const contextTokens = getDjIntentTokens();
  const sceneFamily = runtimeState.currentScene.family || 'general';
  const recentTracks = getRecentTrackRecords(6);
  const recentArtists = new Set(recentTracks.map((entry) => String(entry.artist || '').toLowerCase()).filter(Boolean));
  const recentAlbums = new Set(recentTracks.map((entry) => String(entry.album || '').toLowerCase()).filter(Boolean));
  const currentArtist = String(runtimeState.currentTrack?.artist || '').toLowerCase();
  const currentAlbum = String(runtimeState.currentTrack?.album || '').toLowerCase();
  const trackArtist = String(track.artist || '').toLowerCase();
  const trackAlbum = String(track.album || '').toLowerCase();
  const keywordSource = [track.searchBlob, ...(track.folderSegments || [])].join(' ').toLowerCase();
  const intentHits = contextTokens.filter((token) => keywordSource.includes(token)).slice(0, 4);
  const sceneBiasScore = scoreSceneMusicBias(track, sceneFamily);
  const breakdown = {
    likedBoost: likes.includes(track.id) ? 4.5 : 0,
    dislikedPenalty: dislikes.includes(track.id) ? -5.5 : 0,
    artistTasteBoost: (artistAffinity[trackArtist] || 0) * 1.6,
    sceneArtistBoost: getSceneArtistAffinity(sceneFamily, track.artist) * 1.25,
    playCountPenalty: -(playCounts[track.id] || 0) * 0.25,
    recentTrackPenalty: runtimeState.recentTrackIds.includes(track.id) ? -6 : 0,
    sameArtistPenalty: recentArtists.has(trackArtist) ? -1.6 : 0,
    sameAlbumPenalty: recentAlbums.has(trackAlbum) ? -1 : 0,
    currentArtistPenalty: currentArtist && trackArtist === currentArtist ? -1.8 : 0,
    currentAlbumPenalty: currentAlbum && trackAlbum === currentAlbum ? -1.2 : 0,
    freshnessBoost: (playCounts[track.id] || 0) === 0 ? 1.05 : 0,
    sceneBias: sceneBiasScore,
    contextBoost: intentHits.length * 1.35,
    ambientBoost: contextTokens.length ? 0 : 0.5,
    sceneHit: sceneBiasScore > 0.7,
    intentHits
  };
  let score = 0;
  score += breakdown.likedBoost;
  score += breakdown.dislikedPenalty;
  score += breakdown.artistTasteBoost;
  score += breakdown.sceneArtistBoost;
  score += breakdown.playCountPenalty;
  score += breakdown.recentTrackPenalty;
  score += breakdown.sameArtistPenalty;
  score += breakdown.sameAlbumPenalty;
  score += breakdown.currentArtistPenalty;
  score += breakdown.currentAlbumPenalty;
  score += breakdown.freshnessBoost;
  score += breakdown.sceneBias;
  score += breakdown.contextBoost;
  score += breakdown.ambientBoost;

  return {
    track,
    score: score + Math.random() * 0.22,
    breakdown,
    reasonLine: summarizeTrackReason(track, breakdown, trigger)
  };
}

function pickWeightedTrackCandidate(candidates = []) {
  const shortlist = candidates.slice(0, Math.min(4, candidates.length));
  if (!shortlist.length) {
    return null;
  }

  const floor = Math.min(...shortlist.map((entry) => entry.score));
  const weights = shortlist.map((entry, index) => Math.max(0.15, entry.score - floor + 0.8 - index * 0.08));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  if (totalWeight <= 0) {
    return shortlist[0];
  }

  let roll = Math.random() * totalWeight;
  for (let index = 0; index < shortlist.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return shortlist[index];
    }
  }

  return shortlist[0];
}

function getTopArtistAffinityHints(limit = 3) {
  return Object.entries(runtimeState.settings.tasteProfile.artistAffinity || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, Math.max(0, limit))
    .map(([artist, value]) => `${artist} (${Number(value).toFixed(1)})`);
}

function renderScreenInsight() {
  const insight = runtimeState.screenInsight;
  const fallbackWindow = runtimeState.systemSense.activeWindowTitle || runtimeState.systemSense.activeProcessName || '';
  elements.activeWindowLabel.textContent = insight?.activeWindowTitle || fallbackWindow || t('nothingCapturedYet');
  if (!insight) {
    elements.screenSummary.textContent = fallbackWindow
      ? t('watchingWindow', { window: trimText(fallbackWindow, 96) })
      : t('noDesktopContextYet');
    renderOverviewBar();
    renderPanelSummaries();
    return;
  }
  const parts = [
    insight.summary,
    insight.mood ? t('moodTag', { mood: insight.mood }) : '',
    insight.suggestedMusicVibe ? t('vibeTag', { vibe: insight.suggestedMusicVibe }) : ''
  ].filter(Boolean);
  elements.screenSummary.textContent = parts.join(' ');
  renderOverviewBar();
  renderPanelSummaries();
  renderQuickActions();
}

function renderMusicState() {
  elements.musicFolderLabel.textContent = runtimeState.settings.musicFolder
    ? t('librarySet', { path: runtimeState.settings.musicFolder })
    : t('libraryUnset');
  elements.watchChip.textContent = runtimeState.settings.autoWatch ? t('autoWatchChipOn') : t('autoWatchChipOff');
  elements.djChip.textContent = runtimeState.settings.autoDj ? t('autoDjChipOn') : t('autoDjChipOff');
  renderFeelingState();
  renderSocialState();
  elements.toggleAutoWatchBtn.textContent = runtimeState.settings.autoWatch ? t('quickAutoWatchOn') : t('quickAutoWatchOff');
  elements.toggleAutoDjBtn.textContent = runtimeState.settings.autoDj ? t('autoDjOn') : t('autoDjOff');
  elements.toggleAutoWatchBtn.classList.toggle('active', runtimeState.settings.autoWatch);
  elements.toggleAutoDjBtn.classList.toggle('active', runtimeState.settings.autoDj);
  elements.watchChip.classList.toggle('active', runtimeState.settings.autoWatch);
  elements.djChip.classList.toggle('active', runtimeState.settings.autoDj);
  if (runtimeState.currentTrack) {
    elements.currentTrackTitle.textContent = runtimeState.currentTrack.title;
    elements.currentTrackMeta.textContent = `${runtimeState.currentTrack.artist} | ${runtimeState.currentTrack.album}${runtimeState.currentTrackReason ? ` | ${runtimeState.currentTrackReason}` : ''}`;
  } else {
    elements.currentTrackTitle.textContent = t('noCurrentTrack');
    elements.currentTrackMeta.textContent = t('musicFolderHint');
  }
  const hasTrack = Boolean(runtimeState.currentTrack);
  elements.likeTrackBtn.disabled = !hasTrack;
  elements.dislikeTrackBtn.disabled = !hasTrack;
  renderOverviewBar();
  renderPanelSummaries();
  renderQuickActions();
  renderAvatarStatus();
  renderConversationState();
}

function applyAutoWatchState(runImmediate = false) {
  if (runtimeState.autoWatchTimer) {
    clearInterval(runtimeState.autoWatchTimer);
    runtimeState.autoWatchTimer = null;
  }
  if (!runtimeState.settings.autoWatch) {
    return;
  }
  const seconds = Math.max(10, Number.parseInt(runtimeState.settings.watchIntervalSec, 10) || 45);
  runtimeState.autoWatchTimer = window.setInterval(() => {
    analyzeScreen(false).catch(() => {});
  }, seconds * 1000);
  if (runImmediate) {
    analyzeScreen(false).catch(() => {});
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (runtimeState.loading) {
    return;
  }
  const content = elements.messageInput.value.trim();
  if (!content) {
    return;
  }
  const config = getConfig();
  runtimeState.loading = true;
  renderConversationState();
  noteInteraction({
    affection: 0.03,
    focus: 0.05,
    curiosity: 0.03
  });
  cancelLocalVoice();
  markListening(5.2);
  if (runtimeState.presence.queuedTimer) {
    clearTimeout(runtimeState.presence.queuedTimer);
    runtimeState.presence.queuedTimer = null;
  }
  runtimeState.presence.nextSpeakAt = Math.max(runtimeState.presence.nextSpeakAt, performance.now() / 1000 + 22);
  elements.sendBtn.disabled = true;
  elements.messageInput.value = '';
  clearTypingState();
  runtimeState.chatHistory.push({ role: 'user', content });
  appendMessage('user', content);
  rememberCompanionEvent({
    kind: 'user_message',
    summary: trimText(content, 180),
    text: content,
    mood: runtimeState.feelingState.label,
    tags: ['user', runtimeState.currentScene.key ? 'scene' : '', runtimeState.currentScene.family || ''],
    metadata: buildMemoryMetadata({
      feelingLabel: runtimeState.feelingState.label,
      currentTrack: runtimeState.currentTrack ? describeTrack(runtimeState.currentTrack) : ''
    })
  }).catch(() => {});
  try {
    if (await handleLocalCommand(content)) {
      runtimeState.loading = false;
      elements.sendBtn.disabled = false;
      renderConversationState();
      return;
    }

    await updateSocialMaiContext({
      userMessage: content,
      latestSocialInstruction: content
    });

    if (await handleSocialCommand(content)) {
      runtimeState.loading = false;
      elements.sendBtn.disabled = false;
      renderConversationState();
      return;
    }
  } catch (error) {
    runtimeState.loading = false;
    elements.sendBtn.disabled = false;
    renderConversationState();
    appendMessage('system', getErrorMessage(error));
    return;
  }

  await refreshRelevantMemories(content);
  const pending = appendMessage('system', t('thinking'));
  markPondering(6.4);
  try {
    const chatProfile = getKnownModelProfile(getSelectedChatModelId());
    const historyWindow = Math.max(2, chatProfile.preferredHistoryTurns || 4);
    const response = await invokeStudioChat(
      config,
      [{ role: 'system', content: buildChatPrompt() }, ...runtimeState.chatHistory.slice(-historyWindow * 2)],
      {
        historyWindow,
        requestKind: 'interactive-chat',
        preemptible: false
      }
    );
    pending.remove();
    runtimeState.settings.model = response.model;
    cacheModelProfile(response.profile);
    saveSettings();
    repopulateModelSelects([
      ...runtimeState.modelProfiles,
      { id: response.model, profile: response.profile || getFallbackModelProfile(response.model) }
    ]);
    elements.modelSelect.value = response.model;
    postAssistantLine(response.text || 'The model responded with an empty message.');
    setStatus(
      elements.connectionStatus,
      `Connected through ${getVisibleModelLabel(response.model, 'chat')}. ${response.adapterSummary || describeModelProfile(getKnownModelProfile(response.model), response.model, 'chat')}.`
    );
  } catch (error) {
    pending.remove();
    const message = getErrorMessage(error);
    appendMessage('system', message);
    setStatus(elements.connectionStatus, message, true);
  } finally {
    runtimeState.loading = false;
    elements.sendBtn.disabled = false;
    renderConversationState();
  }
}

async function analyzeScreen(manual = false) {
  if (runtimeState.screenBusy) {
    return;
  }
  runtimeState.screenBusy = true;
  renderQuickActions();
  markPondering(manual ? 4.4 : 3.6);
  elements.analyzeScreenBtn.disabled = true;
  setStatus(elements.screenStatus, t('capturingScreen'));
  try {
    const capture = await window.desktopCompanion.captureScreenContext({ hideCompanion: true, maxWidth: 1280, maxHeight: 720 });
    const config = getConfig();
    const previousScene = { ...runtimeState.currentScene };
    const visionConfig = { ...config, model: config.visionModel || config.model };
    const visionProfile = getKnownModelProfile(visionConfig.model || getSelectedVisionModelId());
    const response = visionProfile.supportsVision
      ? await invokeStudioChat(visionConfig, [
          { role: 'system', content: buildScreenPromptBase() },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Active window: ${capture.activeWindowTitle || 'unknown'}. Foreground process: ${capture.activeProcessName || 'unknown'}. Analyze what the user is doing and propose a music vibe.`
              },
              {
                type: 'image_url',
                image_url: { url: capture.imageDataUrl }
              }
            ]
          }
        ], {
          historyWindow: 2,
          requestKind: manual ? 'manual-vision' : 'background-vision',
          queueKey: 'screen-analysis',
          preemptible: !manual
        })
      : await invokeStudioChat(visionConfig, [
          {
            role: 'system',
            content: `${buildScreenPromptBase()} The selected model has no native vision, so be explicit about uncertainty and rely only on the window/process text context.`
          },
          {
            role: 'user',
            content: `Active window: ${capture.activeWindowTitle || 'unknown'}. Foreground process: ${capture.activeProcessName || 'unknown'}. The screenshot pixels are unavailable to this model. Infer cautiously what the user is doing and still propose a music vibe.`
          }
        ], {
          historyWindow: 2,
          requestKind: manual ? 'manual-vision' : 'background-vision',
          queueKey: 'screen-analysis',
          preemptible: !manual
        });
    cacheModelProfile(response.profile);
    let payload = {};
    try {
      payload = parseJsonBlock(response.text);
    } catch {}
    runtimeState.screenInsight = {
      ...capture,
      summary: payload.summary || response.text || 'Screen captured.',
      mood: payload.mood || '',
      shouldComment: Boolean(payload.should_comment || manual),
      comment: deriveScreenComment(payload, response.text, manual),
      suggestedMusicVibe: payload.suggested_music_vibe || ''
    };
    const sceneProfile = updateSceneProfile(runtimeState.screenInsight);
    refreshSceneResidency(performance.now() / 1000);
    const sceneTransitionLine = describeSceneTransition(previousScene, runtimeState.currentScene);
    const familyChanged = Boolean(previousScene.family && runtimeState.currentScene.family && previousScene.family !== runtimeState.currentScene.family);
    const sceneChanged = Boolean(previousScene.key && runtimeState.currentScene.key && previousScene.key !== runtimeState.currentScene.key);
    if (sceneChanged || familyChanged) {
      scheduleDeferredMemoryRecall();
    }
    runtimeState.affect.lastContextShiftAt = performance.now() / 1000;
    applyAffectDelta({
      focus: 0.05,
      curiosity: 0.04,
      calm: -0.01
    });
    if (sceneTransitionLine) {
      const transitionAffect = getSceneFamilyDescriptor(runtimeState.currentScene.family).affect || {};
      applyAffectDelta({
        energy: Math.max(-0.04, Math.min(0.05, (transitionAffect.energy || 0) * 0.6)),
        affection: Math.max(-0.03, Math.min(0.04, (transitionAffect.affection || 0) * 0.7)),
        focus: Math.max(-0.03, Math.min(0.06, (transitionAffect.focus || 0) * 0.55)),
        curiosity: 0.03 + (familyChanged ? 0.04 : 0.015),
        sociability: Math.max(-0.03, Math.min(0.05, (transitionAffect.sociability || 0) * 0.55)),
        calm: Math.max(-0.03, Math.min(0.04, (transitionAffect.calm || 0) * 0.5))
      });
    }
    const freshScreenChange = hasFreshScreenPresence(runtimeState.screenInsight);
    runtimeState.settings.visionModel = elements.visionModelSelect.value || runtimeState.settings.visionModel;
    saveSettings();
    renderScreenInsight();
    rememberCompanionEvent({
      kind: 'screen_insight',
      source: 'screen-watch',
      summary: trimText(runtimeState.screenInsight.summary, 180),
      text: [
        runtimeState.screenInsight.summary,
        runtimeState.screenInsight.mood ? `Mood: ${runtimeState.screenInsight.mood}.` : '',
        runtimeState.screenInsight.suggestedMusicVibe ? `Suggested vibe: ${runtimeState.screenInsight.suggestedMusicVibe}.` : ''
      ].filter(Boolean).join(' '),
      mood: runtimeState.screenInsight.mood || '',
      tags: ['screen', runtimeState.screenInsight.activeProcessName || '', runtimeState.currentScene.key ? 'scene' : '', runtimeState.currentScene.family || ''],
      metadata: buildMemoryMetadata({
        displayLabel: runtimeState.screenInsight.displayLabel || '',
        suggestedMusicVibe: runtimeState.screenInsight.suggestedMusicVibe || '',
        visitCount: sceneProfile?.visits || runtimeState.currentScene.visitCount || 0,
        sceneFamily: runtimeState.currentScene.family || 'general'
      }, runtimeState.screenInsight)
    }).catch(() => {});
    if (sceneProfile?.wasFreshVisit) {
      rememberCompanionEvent({
        kind: 'scene_visit',
        source: 'screen-watch',
        summary: trimText(`Mai revisited ${sceneProfile.processName} and recognized the scene.`, 180),
        text: getCurrentSceneMemoryLine() || trimText(sceneProfile.label, 180),
        mood: runtimeState.screenInsight.mood || '',
        tags: ['scene', sceneProfile.processName || '', sceneProfile.family || 'general', sceneProfile.visits >= 6 ? 'familiar' : 'recent'],
        metadata: buildMemoryMetadata({
          visitCount: sceneProfile.visits,
          topMood: pickTopCountKey(sceneProfile.moods),
          topVibe: pickTopCountKey(sceneProfile.vibes),
          sceneFamily: sceneProfile.family || 'general'
        }, runtimeState.screenInsight)
      }).catch(() => {});
    }
    if (sceneTransitionLine && (familyChanged || sceneChanged)) {
      rememberCompanionEvent({
        kind: 'scene_transition',
        source: 'screen-watch',
        summary: trimText(sceneTransitionLine, 180),
        text: trimText([
          sceneTransitionLine,
          getCurrentSceneMemoryLine(),
          runtimeState.screenInsight.summary
        ].filter(Boolean).join(' '), 260),
        mood: runtimeState.screenInsight.mood || '',
        tags: ['scene', 'transition', previousScene.family || 'general', runtimeState.currentScene.family || 'general'],
        metadata: buildMemoryMetadata({
          previousSceneKey: previousScene.key || '',
          previousSceneLabel: previousScene.label || '',
          previousSceneFamily: previousScene.family || 'general',
          nextSceneKey: runtimeState.currentScene.key || '',
          nextSceneLabel: runtimeState.currentScene.label || '',
          nextSceneFamily: runtimeState.currentScene.family || 'general'
        }, runtimeState.screenInsight)
      }).catch(() => {});
    }
    updateSocialMaiContext({
      screenInsight: runtimeState.screenInsight
    }).catch(() => {});
    setStatus(
      elements.screenStatus,
      visionProfile.supportsVision
        ? t('screenCaptured', { displayLabel: capture.displayLabel })
        : t('screenCapturedTextOnly', {
            displayLabel: capture.displayLabel,
            model: visionConfig.model || 'the fallback model'
          })
    );
    if (
      runtimeState.settings.screenCommentsEnabled &&
      runtimeState.screenInsight.comment &&
      (manual || runtimeState.screenInsight.shouldComment)
    ) {
      markPerk(2.8);
      postAssistantLine(runtimeState.screenInsight.comment, true, {
        skipMemory: true
      });
      runtimeState.presence.nextSpeakAt = performance.now() / 1000 + 55;
    } else if (sceneTransitionLine && (familyChanged || sceneChanged)) {
      markPerk(familyChanged ? 3.1 : 2.6);
      queuePresenceCheck('scene-transition', {
        reason: sceneTransitionLine,
        userFacingHint: familyChanged
          ? 'Notice the change in room and adjust your tone gently.'
          : 'Notice the scene shift softly without sounding repetitive.'
      }, manual ? 1600 : 1100);
    } else if (freshScreenChange) {
      markPerk(2.4);
      queuePresenceCheck('screen', {
        reason: `${runtimeState.screenInsight.activeWindowTitle || 'A new window'} | ${runtimeState.screenInsight.summary || ''}`
      }, manual ? 2200 : 1500);
    }
    if (runtimeState.settings.autoDj && runtimeState.library.length && !runtimeState.currentTrack) {
      await playNextTrack('screen');
    }
  } catch (error) {
    setStatus(elements.screenStatus, getErrorMessage(error), true);
  } finally {
    runtimeState.screenBusy = false;
    elements.analyzeScreenBtn.disabled = false;
    renderQuickActions();
  }
}

async function chooseAvatar() {
  const filePath = await window.desktopCompanion.pickAvatarFile();
  if (filePath) {
    await loadAvatarFromPath(filePath);
  }
}

async function chooseBundledAvatar(filePath) {
  if (!filePath) {
    return;
  }
  await loadAvatarFromPath(filePath);
}

async function cycleBundledAvatar() {
  if (!runtimeState.bundledAvatars.length) {
    return;
  }
  const currentIndex = runtimeState.bundledAvatars.indexOf(runtimeState.settings.avatarPath);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % runtimeState.bundledAvatars.length
    : 0;
  await chooseBundledAvatar(runtimeState.bundledAvatars[nextIndex]);
}

function retuneCurrentAvatar() {
  runtimeState.settings.avatarZoomPct = elements.avatarZoomInput.value || defaultSettings.avatarZoomPct;
  runtimeState.settings.avatarLiftPct = elements.avatarLiftInput.value || defaultSettings.avatarLiftPct;
  saveSettings();
  if (currentVrm) {
    fitAvatarToStage(currentVrm);
  }
}

async function chooseMusicFolder() {
  const folder = await window.desktopCompanion.pickMusicFolder();
  if (!folder) {
    return;
  }
  runtimeState.settings.musicFolder = folder;
  saveSettings();
  renderMusicState();
  setStatus(elements.musicStatus, t('musicFolderSelected'));
}

async function scanLibrary(announce = true) {
  const folderPath = runtimeState.settings.musicFolder;
  if (!folderPath) {
    setStatus(elements.musicStatus, t('chooseMusicFolderFirst'), true);
    return;
  }
  runtimeState.musicBusy = true;
  renderQuickActions();
  elements.scanMusicBtn.disabled = true;
  setStatus(elements.musicStatus, t('scanningMusicLibrary'));
  try {
    const result = await window.desktopCompanion.scanMusicLibrary(folderPath);
    runtimeState.library = result.tracks || [];
    const extra = result.truncated ? t('showingFirst', { count: runtimeState.library.length }) : '';
    const trackWord = result.totalTracks === 1 ? t('track') : t('tracks');
    setStatus(elements.musicStatus, t('libraryReady', { count: result.totalTracks, trackWord, extra }));
    if (announce) {
      appendMessage('system', t('autoDjIndexed', { count: result.totalTracks, trackWord }));
    }
    if (runtimeState.settings.autoDj && runtimeState.library.length && !runtimeState.currentTrack) {
      await playNextTrack('scan');
    }
  } catch (error) {
    setStatus(elements.musicStatus, getErrorMessage(error), true);
  } finally {
    runtimeState.musicBusy = false;
    elements.scanMusicBtn.disabled = false;
    renderQuickActions();
  }
}

async function askModelToChooseTrack(candidates, trigger = 'manual') {
  if (!candidates.length) {
    return null;
  }
  if (runtimeState.loading || runtimeState.screenBusy || !getSelectedChatModelId()) {
    return null;
  }
  try {
    const config = getConfig();
    const chatProfile = getKnownModelProfile(getSelectedChatModelId());
    const shortlist = candidates.slice(0, Math.max(3, chatProfile.preferredDjCandidates || 6)).map(({ track, score }) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      folders: (track.folderSegments || []).slice(-3),
      keywords: track.keywords.slice(0, 10),
      score: Number(score.toFixed(2)),
      heuristic_reason: trimText(candidates.find((entry) => entry.track.id === track.id)?.reasonLine || '', 120)
    }));
    const sceneDescriptor = getSceneFamilyDescriptor(runtimeState.currentScene.family);
    const context = runtimeState.screenInsight
      ? `Summary: ${runtimeState.screenInsight.summary}. Mood: ${runtimeState.screenInsight.mood}. Vibe: ${runtimeState.screenInsight.suggestedMusicVibe}.`
      : 'No screen context yet.';
    const recentPlays = getRecentTrackRecords(4).map((track) => describeTrack(track)).join(' | ') || 'none yet';
    const artistHints = getTopArtistAffinityHints(3).join(' | ') || 'none yet';
    const response = await invokeStudioChat(
      { ...config, model: config.model },
      [
        { role: 'system', content: buildDjPromptBase() },
        {
          role: 'user',
          content: `${context}\nTrigger: ${trigger}.\nScene: ${sceneDescriptor.prompt}. In scenes like this, Mai tends to prefer tracks that feel ${sceneDescriptor.behavior}.\nRecent plays to avoid repeating too closely: ${recentPlays}.\nCurrent positive artist pull: ${artistHints}.\nPrefer variety across artist and album when scores are close.\nShortlist:\n${JSON.stringify(shortlist)}`
        }
      ],
      {
        historyWindow: 2,
        requestKind: /manual|user|quick|click/i.test(String(trigger || '')) ? 'manual-dj' : 'auto-dj',
        queueKey: 'dj-pick',
        preemptible: !/manual|user|quick|click/i.test(String(trigger || ''))
      }
    );
    cacheModelProfile(response.profile);
    try {
      const payload = parseJsonBlock(response.text);
      if (payload?.id) {
        return { id: payload.id, reason: payload.reason || '' };
      }
    } catch {}

    const inferred = inferTrackChoiceFromText(response.text, candidates);
    if (inferred) {
      return inferred;
    }
    return null;
  } catch {
    return null;
  }
}

async function playTrack(track, reason = '') {
  runtimeState.currentTrack = track;
  runtimeState.currentTrackReason = reason;
  runtimeState.settings.tasteProfile.playCounts[track.id] = (runtimeState.settings.tasteProfile.playCounts[track.id] || 0) + 1;
  saveSettings();
  applyDriveDelta({
    music: -0.12,
    play: 0.05,
    attention: 0.02,
    rest: -0.04
  }, true);
  noteInteraction({
    energy: 0.04,
    affection: 0.01,
    sleepiness: -0.05,
    calm: 0.01
  });
  markPerk(3.8);
  pushRecentTrack(track.id);
  try {
    elements.audioPlayer.pause();
  } catch {}
  elements.audioPlayer.currentTime = 0;
  elements.audioPlayer.src = track.fileUrl;
  elements.audioPlayer.load?.();
  ensureAudioMotion();
  runtimeState.audioMotion.context?.resume?.().catch(() => {});
  updateSocialMaiContext({
    currentTrack: {
      title: track.title,
      artist: track.artist,
      album: track.album,
      reason
    }
  }).catch(() => {});
  try {
    await elements.audioPlayer.play();
    triggerPreset('groove', 4.2);
    renderMusicState();
    setStatus(elements.musicStatus, `Playing ${describeTrack(track)}.`);
    rememberCompanionEvent({
      kind: 'music_moment',
      source: 'auto-dj',
      summary: trimText(`Playing ${describeTrack(track)}.`, 180),
      text: trimText(`${describeTrack(track)}${reason ? ` | ${reason}` : ''}`, 240),
      mood: runtimeState.feelingState.label,
      tags: ['music', track.artist || '', reason ? 'chosen' : '', runtimeState.currentScene.family || 'general'],
      metadata: buildMemoryMetadata({
        trackId: track.id,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackAlbum: track.album,
        reason,
        sceneFamily: runtimeState.currentScene.family || 'general'
      })
    }).catch(() => {});
    if (hasFreshTrackPresence(track)) {
      scheduleDeferredMemoryRecall();
      queuePresenceCheck('music', {
        reason: `${describeTrack(track)}${reason ? ` | ${reason}` : ''}`
      }, 1600);
    }
  } catch (error) {
    setStatus(elements.musicStatus, `Could not play ${describeTrack(track)}: ${getErrorMessage(error)}`, true);
  }
}

async function playNextTrack(trigger = 'manual') {
  if (!runtimeState.library.length) {
    setStatus(elements.musicStatus, 'Scan your music folder first.', true);
    return;
  }
  const currentTrackId = runtimeState.currentTrack?.id || '';
  let selectionPool = runtimeState.library.slice();

  if (currentTrackId && selectionPool.length > 1) {
    selectionPool = selectionPool.filter((track) => track.id !== currentTrackId);
  }

  let candidates = selectionPool
    .map((track) => evaluateTrackCandidate(track, trigger))
    .sort((left, right) => right.score - left.score);

  if (selectionPool.length > 3) {
    const freshCandidates = candidates.filter((entry) => !runtimeState.recentTrackIds.includes(entry.track.id));
    if (freshCandidates.length >= 2) {
      candidates = [...freshCandidates, ...candidates.filter((entry) => runtimeState.recentTrackIds.includes(entry.track.id))];
    }
  }

  candidates = candidates.slice(0, 12);
  let chosen = pickWeightedTrackCandidate(candidates) || candidates[0];
  const modelChoice = await askModelToChooseTrack(candidates, trigger);
  if (modelChoice?.id) {
    chosen = candidates.find((entry) => entry.track.id === modelChoice.id) || chosen;
  }
  if (!chosen) {
    setStatus(elements.musicStatus, 'No playable tracks found.', true);
    return;
  }
  const reason = trimText(
    modelChoice?.reason || chosen.reasonLine || getSceneMusicBias(runtimeState.currentScene.family).fallbackReason || 'picked from your local taste profile',
    140
  );
  await playTrack(chosen.track, reason);
}

function toggleAutoWatch() {
  runtimeState.settings.autoWatch = !runtimeState.settings.autoWatch;
  saveSettings();
  applyAutoWatchState(true);
  renderMusicState();
}

function toggleAutoDj() {
  runtimeState.settings.autoDj = !runtimeState.settings.autoDj;
  saveSettings();
  renderMusicState();
  if (runtimeState.settings.autoDj && runtimeState.library.length && !runtimeState.currentTrack) {
    playNextTrack('auto').catch(() => {});
  }
}

function bindEvents() {
  elements.refreshModelsBtn.addEventListener('click', refreshModels);
  elements.loadAvatarBtn.addEventListener('click', chooseAvatar);
  elements.toggleAvatarConsoleBtn.addEventListener('click', toggleAvatarConsole);
  elements.bundledAvatarSelect.addEventListener('change', (event) => chooseBundledAvatar(event.target.value));
  elements.cycleAvatarBtn.addEventListener('click', cycleBundledAvatar);
  elements.avatarZoomInput.addEventListener('input', retuneCurrentAvatar);
  elements.avatarLiftInput.addEventListener('input', retuneCurrentAvatar);
  elements.gameCamBtn.addEventListener('click', () => toggleGameCamMode().catch(() => {}));
  elements.presenceBtn.addEventListener('click', () => togglePresenceMode().catch(() => {}));
  elements.modeVoiceBtn.addEventListener('click', startVoiceCommandListening);
  elements.chatForm.addEventListener('submit', sendMessage);
  elements.listenBtn.addEventListener('click', startVoiceCommandListening);
  elements.messageInput.addEventListener('input', updateTypingState);
  elements.messageInput.addEventListener('keydown', handleComposerKeydown);
  elements.messageInput.addEventListener('focus', () => {
    runtimeState.typing.isFocused = true;
    renderAvatarStatus();
    renderConversationState();
  });
  elements.messageInput.addEventListener('blur', () => {
    runtimeState.typing.isFocused = false;
    clearTypingState();
  });
  elements.quickScreenBtn.addEventListener('click', () => analyzeScreen(true));
  elements.quickWatchBtn.addEventListener('click', toggleAutoWatch);
  elements.quickMusicBtn.addEventListener('click', () => handleQuickMusicAction().catch(() => {}));
  elements.quickSocialBtn.addEventListener('click', () => handleQuickSocialAction().catch(() => {}));
  elements.suggestionChips.forEach((button) => {
    button.addEventListener('click', () => sendSuggestedMessage(button.dataset.suggestion || ''));
  });
  elements.panelToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => togglePanelState(toggle.dataset.panelToggle));
  });
  elements.settingsBtn.addEventListener('click', () => setSettingsMenuOpen(!runtimeState.ui.settingsMenuOpen));
  elements.settingsScrim.addEventListener('click', () => setSettingsMenuOpen(false));
  elements.closeSettingsBtn.addEventListener('click', () => setSettingsMenuOpen(false));
  elements.languageInput.addEventListener('change', () => {
    runtimeState.settings.language = elements.languageInput.value || defaultSettings.language;
    saveSettings();
    applyLanguageToUi();
    renderConversationState();
    renderQuickActions();
    renderSocialState();
    renderMusicState();
    renderOverviewBar();
    renderPanelSummaries();
  });
  elements.minimizeBtn.addEventListener('click', () => window.desktopCompanion.minimizeWindow());
  elements.closeBtn.addEventListener('click', () => window.desktopCompanion.closeWindow());
  elements.avatarStage.addEventListener('pointermove', handleAvatarPointerMove);
  elements.avatarStage.addEventListener('pointerleave', clearAvatarPointer);
  elements.analyzeScreenBtn.addEventListener('click', () => analyzeScreen(true));
  elements.toggleAutoWatchBtn.addEventListener('click', toggleAutoWatch);
  elements.recentScreenshotsBtn.addEventListener('click', () => showRecentScreenshots().catch((error) => {
    setStatus(elements.screenStatus, getErrorMessage(error), true);
  }));
  elements.chooseMusicFolderBtn.addEventListener('click', chooseMusicFolder);
  elements.scanMusicBtn.addEventListener('click', () => scanLibrary(true));
  elements.toggleAutoDjBtn.addEventListener('click', toggleAutoDj);
  elements.nextTrackBtn.addEventListener('click', () => playNextTrack('manual'));
  elements.savePlaylistBtn.addEventListener('click', () => saveCurrentPlaylist().catch((error) => {
    setStatus(elements.musicStatus, getErrorMessage(error), true);
  }));
  elements.loadPlaylistBtn.addEventListener('click', async () => {
    try {
      const listing = await window.desktopCompanion.runLocalTool('playlist:list', {});
      const playlists = Array.isArray(listing.playlists) ? listing.playlists : [];
      if (!playlists.length) {
        postAssistantLine('No saved playlists yet.', true);
        return;
      }
      const latest = [...playlists]
        .sort((left, right) => Date.parse(right.updatedAt || right.createdAt || 0) - Date.parse(left.updatedAt || left.createdAt || 0))[0];
      await loadPlaylistByName(latest.name);
    } catch (error) {
      setStatus(elements.musicStatus, getErrorMessage(error), true);
    }
  });
  elements.likeTrackBtn.addEventListener('click', () => {
    if (runtimeState.currentTrack) {
      setTrackPreference(runtimeState.currentTrack, true);
      setStatus(elements.musicStatus, `Liked ${describeTrack(runtimeState.currentTrack)}.`);
      rememberTastePreference(runtimeState.currentTrack, true).catch(() => {});
    }
  });
  elements.dislikeTrackBtn.addEventListener('click', async () => {
    if (runtimeState.currentTrack) {
      setTrackPreference(runtimeState.currentTrack, false);
      await rememberTastePreference(runtimeState.currentTrack, false).catch(() => {});
      elements.audioPlayer.pause();
      await playNextTrack('skip');
    }
  });
  elements.baseUrlInput.addEventListener('change', getConfig);
  elements.modelSelect.addEventListener('change', getConfig);
  elements.visionModelSelect.addEventListener('change', getConfig);
  elements.temperatureInput.addEventListener('change', getConfig);
  elements.watchIntervalInput.addEventListener('change', () => {
    getConfig();
    if (runtimeState.settings.autoWatch) {
      applyAutoWatchState();
    }
  });
  elements.volumeInput.addEventListener('input', () => {
    runtimeState.settings.volumePct = elements.volumeInput.value || defaultSettings.volumePct;
    applyAudioSettings();
    saveSettings();
  });
  elements.autonomyEnabledInput.addEventListener('change', () => {
    runtimeState.settings.autonomyEnabled = elements.autonomyEnabledInput.checked;
    saveSettings();
    startAutonomyPulse();
    renderSettingsMenu();
    renderAvatarStatus();
  });
  elements.presenceEnabledInput.addEventListener('change', () => {
    runtimeState.settings.presenceEnabled = elements.presenceEnabledInput.checked;
    if (!runtimeState.settings.presenceEnabled && runtimeState.presence.queuedTimer) {
      clearTimeout(runtimeState.presence.queuedTimer);
      runtimeState.presence.queuedTimer = null;
    }
    saveSettings();
    renderSettingsMenu();
  });
  elements.contextMediaEnabledInput.addEventListener('change', () => {
    runtimeState.settings.contextMediaEnabled = elements.contextMediaEnabledInput.checked;
    saveSettings();
    renderSettingsMenu();
  });
  elements.screenCommentsEnabledInput.addEventListener('change', () => {
    runtimeState.settings.screenCommentsEnabled = elements.screenCommentsEnabledInput.checked;
    saveSettings();
    renderSettingsMenu();
  });
  elements.personalityToneInput.addEventListener('change', () => {
    runtimeState.settings.personalityTone = String(elements.personalityToneInput.value || '').trim();
    saveSettings();
    renderSettingsMenu();
  });
  elements.memoryFocusInput.addEventListener('change', () => {
    runtimeState.settings.memoryFocus = String(elements.memoryFocusInput.value || '').trim();
    saveSettings();
    renderSettingsMenu();
  });
  elements.localVoiceEnabledInput.addEventListener('change', () => {
    runtimeState.settings.localVoiceEnabled = elements.localVoiceEnabledInput.checked;
    runtimeState.settings.localVoiceOptIn = elements.localVoiceEnabledInput.checked;
    runtimeState.settings.localVoiceExplicitChoice = true;
    if (!runtimeState.settings.localVoiceEnabled) {
      cancelLocalVoice();
    } else {
      refreshLocalVoiceStatus(true).catch(() => {});
    }
    saveSettings();
    renderSettingsMenu();
  });
  elements.homeSceneEnabledInput.addEventListener('change', () => {
    runtimeState.settings.homeSceneEnabled = elements.homeSceneEnabledInput.checked;
    saveSettings();
    applyPreferenceSettings();
    if (runtimeState.settings.homeSceneEnabled) {
      initializeAvatarHomeScene().catch(() => {});
    } else {
      renderAvatarHome();
      if (currentVrm) {
        fitAvatarToStage(currentVrm);
      }
    }
    renderSettingsMenu();
  });
  elements.bubblesEnabledInput.addEventListener('change', () => {
    runtimeState.settings.bubblesEnabled = elements.bubblesEnabledInput.checked;
    if (!runtimeState.settings.bubblesEnabled) {
      runtimeState.bubbles.speechUntil = 0;
    }
    saveSettings();
    renderBubbles();
    renderSettingsMenu();
  });
  elements.compactUiEnabledInput.addEventListener('change', () => {
    runtimeState.settings.compactUiEnabled = elements.compactUiEnabledInput.checked;
    saveSettings();
    applyPreferenceSettings();
    renderSettingsMenu();
  });
  elements.audioPlayer.addEventListener('ended', () => {
    if (runtimeState.settings.autoDj) {
      playNextTrack('ended').catch(() => {});
    } else {
      runtimeState.currentTrack = null;
      runtimeState.currentTrackReason = '';
      renderMusicState();
      updateSocialMaiContext({
        currentTrack: null
      }).catch(() => {});
    }
  });
  window.addEventListener('blur', handleAppBackgrounded);
  window.addEventListener('focus', () => handleAppForeground('focus'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      handleAppBackgrounded();
    } else {
      handleAppForeground('visibility');
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && runtimeState.ui.settingsMenuOpen) {
      event.preventDefault();
      setSettingsMenuOpen(false);
    }
  });
  window.addEventListener('resize', () => {
    requestResizeRenderer();
    resizeComposerInput();
  });
  elements.titlebar.addEventListener('mousedown', beginWindowDrag);
  elements.dragHandle.addEventListener('mousedown', beginWindowDrag);
  window.addEventListener('mousemove', handleWindowDrag);
  window.addEventListener('mouseup', endWindowDrag);
  window.addEventListener('blur', endWindowDrag);
  new ResizeObserver(requestResizeRenderer).observe(elements.avatarStage);
}

async function bootAvatar() {
  runtimeState.bundledAvatars = await window.desktopCompanion.listBundledAvatars();
  populateBundledAvatarSelect();
  const preferred = runtimeState.settings.avatarPath;
  if (preferred && await loadAvatarFromPath(preferred)) {
    return;
  }
  const bundledChoice = runtimeState.bundledAvatars[0];
  const preferredBundled = runtimeState.bundledAvatars.find((filePath) => getFileName(filePath) === clientProfile.preferredAvatarFile);
  const initialChoice = preferredBundled || bundledChoice;
  if (initialChoice) {
    await loadAvatarFromPath(initialChoice);
  } else {
    setAvatarStatusInfo(`No client avatar found. Add ${clientProfile.preferredAvatarFile || 'the client VRM'} to the app folder.`);
  }
}

async function boot() {
  runtimeState.affect.lastInteractionAt = performance.now() / 1000;
  runtimeState.affect.lastContextShiftAt = runtimeState.affect.lastInteractionAt;
  runtimeState.affect.phase = getTimePhase();
  runtimeState.mannerisms.nextWanderAt = runtimeState.affect.lastInteractionAt + 4.5;
  runtimeState.rituals.isForeground = !document.hidden;
  migrateAvatarFitDefaults();
  migrateMaiStudioDefaults();
  syncFormWithSettings();
  applyPanelState();
  applyDisplayMode();
  renderAvatarConsole();
  renderGreeting();
  bindEvents();
  runtimeState.socialMai.unsubscribe?.();
  runtimeState.socialMai.unsubscribe = SOCIAL_SIDECAR_ENABLED
    ? window.desktopCompanion.onSocialMaiEvent(handleSocialMaiEvent)
    : null;
  applyAudioSettings();
  applyPreferenceSettings();
  renderSettingsMenu();
  renderScreenInsight();
  renderMusicState();
  renderOverviewBar();
  renderPanelSummaries();
  renderQuickActions();
  renderConversationState();
  resizeComposerInput(true);
  runtimeState.voice.audio = new Audio();
  runtimeState.voice.audio.preload = 'auto';
  await refreshLocalVoiceStatus(true);
  if (runtimeState.ui.gameCamMode) {
    await syncGameCamMode(true);
  } else if (runtimeState.ui.presenceMode) {
    await syncPresenceMode(true);
  }
  startPresencePulse();
  startAutonomyPulse();
  resizeRenderer();
  if (runtimeState.settings.homeSceneEnabled) {
    initializeAvatarHomeScene().catch(() => {});
  } else {
    renderAvatarHome();
  }
  requestAnimationFrame(loop);
  try {
    handleSystemSenseEvent(await window.desktopCompanion.getSystemSenseStatus());
  } catch {}
  driftAutonomyDrives(performance.now() / 1000);
  renderAvatarStatus();
  window.desktopCompanion.onSystemSense(handleSystemSenseEvent);
  await refreshMemoryStatus();
  await refreshSocialMaiStatus();
  try {
    const paths = await window.desktopCompanion.getDefaultPaths();
    if (!runtimeState.settings.musicFolder && paths.music) {
      runtimeState.settings.musicFolder = paths.music;
      saveSettings();
      renderMusicState();
    }
  } catch {}
  await bootAnimationLibrary();
  await bootAvatar();
  await refreshModels();
  if (runtimeState.settings.musicFolder) {
    await scanLibrary(false);
  }
  if (runtimeState.settings.autoWatch) {
    applyAutoWatchState(true);
  }
  if (runtimeState.settings.autoDj) {
    renderMusicState();
    if (runtimeState.library.length) {
      await playNextTrack('boot');
    }
  }

  window.setTimeout(() => {
    if (
      runtimeState.settings.presenceEnabled &&
      !runtimeState.loading &&
      (runtimeState.screenInsight || runtimeState.currentTrack)
    ) {
      queuePresenceCheck('settle', {
        reason: 'Mai has settled into the current scene and can offer one soft aside if it feels natural.'
      }, 900);
    }
  }, 5600);
}

boot();
