/**
 * SCRIPT.JS - UI CONTROLLER & REAL MEDIA PLAYBACK ENGINE
 * 
 * College Data Structures Course - Music Playlist Simulator
 * Connects the Retro Cassette Mixtape frontend to the hand-written
 * Doubly Linked List in playlist.js without altering any DS logic.
 */

// Global State
const playlist = new Playlist();
let isPlaying = false;
let playbackSeconds = 0;
let simPlaybackInterval = null;
let currentMediaUrl = null;
let soundFXEnabled = true;

// Real HTML5 Audio Player Engine Instance
let realAudio = null;

// Web Audio API Synthesizer Context (subtle UI feedback chimes)
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSynthBeep(freq = 440, type = 'sine', duration = 0.12) {
  if (!soundFXEnabled) return;
  try {
    initAudioContext();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Graceful silence on restricted audio contexts
  }
}

function playTrackChangeSound(isNext = true) {
  if (!soundFXEnabled) return;
  const baseFreq = isNext ? 520 : 380;
  playSynthBeep(baseFreq, 'triangle', 0.1);
  setTimeout(() => playSynthBeep(baseFreq * 1.25, 'sine', 0.14), 50);
}

// Persistence Key & Default Sample Mixtape Tracks
const STORAGE_KEY = 'playlistr_dll_queue_v1';
const DEFAULT_TRACKS = [
  { title: 'Summer Breeze', artist: 'Neon Tape', duration: 194 },
  { title: 'Midnight Cassette', artist: 'Synth Wave 84', duration: 218 },
  { title: 'Neon Arcade', artist: 'Pixel Runner', duration: 175 },
  { title: 'Cyber Funk', artist: 'Analog Soul', duration: 206 },
  { title: 'Electric Sunset', artist: 'Chrome FM', duration: 230 }
];

// =========================================================================
// HTML & SVG HELPERS
// =========================================================================
function refreshIcons() {
  if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateText(str, maxLen = 18) {
  const s = String(str || '').trim();
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

/**
 * Pure Inline SVG Cassette Generator
 * Variants use retro pop-art colors (purple, red, green, charcoal) + bright labels.
 */
const CASSETTE_VARIANTS = [
  { body: '#A97CFF', label: '#FFF23A', stripe: '#00F58A', windowBg: '#1F1B2E' }, // Purple + Yellow
  { body: '#F0323C', label: '#FFF23A', stripe: '#3DF2D8', windowBg: '#231618' }, // Red + Yellow
  { body: '#00F58A', label: '#FFFFFF', stripe: '#5B2EFF', windowBg: '#11221B' }, // Neon Green + White
  { body: '#343438', label: '#FFF23A', stripe: '#F59BFF', windowBg: '#161618' }  // Charcoal + Yellow
];

function createCassetteSVG({
  title = 'MY MIXTAPE',
  variantIndex = 0,
  spinning = false,
  sideText = 'A',
  compact = false
} = {}) {
  const palette = CASSETTE_VARIANTS[variantIndex % CASSETTE_VARIANTS.length];
  const displayTitle = escapeHtml(truncateText(title, compact ? 14 : 20));
  const titleFontSize = compact ? '14' : '15.5';
  const playClass = spinning ? 'cassette is-playing' : 'cassette';

  return `
    <svg class="cassette-svg ${playClass}" viewBox="0 0 260 166" role="img" aria-label="Cassette tape: ${displayTitle}">
      <!-- Outer Cassette Shell -->
      <rect x="4" y="4" width="252" height="158" rx="14" fill="${palette.body}" stroke="#000000" stroke-width="4.5"/>

      <!-- Corner Screws -->
      <circle cx="17" cy="17" r="4" fill="#FFFFFF" stroke="#000" stroke-width="2"/>
      <circle cx="243" cy="17" r="4" fill="#FFFFFF" stroke="#000" stroke-width="2"/>
      <circle cx="17" cy="149" r="4" fill="#FFFFFF" stroke="#000" stroke-width="2"/>
      <circle cx="243" cy="149" r="4" fill="#FFFFFF" stroke="#000" stroke-width="2"/>

      <!-- Sticker Label -->
      <rect x="20" y="18" width="220" height="96" rx="8" fill="${palette.label}" stroke="#000000" stroke-width="3.5"/>
      <!-- Decorative Accent Stripe on Label -->
      <rect x="22" y="96" width="216" height="14" rx="2" fill="${palette.stripe}"/>
      <line x1="22" y1="96" x2="238" y2="96" stroke="#000" stroke-width="2"/>

      <!-- Side Badge + Handwriting Song Title -->
      <rect x="28" y="25" width="22" height="16" rx="3" fill="#000"/>
      <text x="39" y="37" fill="#FFF" font-family="Unbounded, sans-serif" font-size="9" font-weight="900" text-anchor="middle">${sideText}</text>
      <line x1="56" y1="45" x2="230" y2="45" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
      <text x="135" y="42" class="cassette-label-script" font-size="${titleFontSize}">${displayTitle}</text>

      <!-- Center Tape Cutout Window -->
      <rect x="52" y="53" width="156" height="36" rx="18" fill="${palette.windowBg}" stroke="#000" stroke-width="3.5"/>
      <!-- Tape Ribbon Window Center -->
      <rect x="104" y="61" width="52" height="20" rx="3" fill="#374151" stroke="#000" stroke-width="2"/>
      <line x1="112" y1="71" x2="148" y2="71" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4 3"/>

      <!-- Left Spinning Spool -->
      <g transform="translate(82, 71)">
        <g class="cassette-spool">
          <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#000" stroke-width="2.5"/>
          <circle cx="0" cy="0" r="5" fill="#000"/>
          <rect x="-2" y="-12" width="4" height="5" fill="#000"/>
          <rect x="-2" y="7" width="4" height="5" fill="#000"/>
          <rect x="-12" y="-2" width="5" height="4" fill="#000"/>
          <rect x="7" y="-2" width="5" height="4" fill="#000"/>
        </g>
      </g>

      <!-- Right Spinning Spool -->
      <g transform="translate(178, 71)">
        <g class="cassette-spool">
          <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#000" stroke-width="2.5"/>
          <circle cx="0" cy="0" r="5" fill="#000"/>
          <rect x="-2" y="-12" width="4" height="5" fill="#000"/>
          <rect x="-2" y="7" width="4" height="5" fill="#000"/>
          <rect x="-12" y="-2" width="5" height="4" fill="#000"/>
          <rect x="7" y="-2" width="5" height="4" fill="#000"/>
        </g>
      </g>

      <!-- Bottom Trapezoidal Tape Bridge -->
      <polygon points="58,162 72,126 188,126 202,162" fill="#E2E8F0" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="88" cy="146" r="5" fill="#000"/>
      <circle cx="172" cy="146" r="5" fill="#000"/>
      <rect x="115" y="140" width="10" height="10" rx="2" fill="#000"/>
      <rect x="135" y="140" width="10" height="10" rx="2" fill="#000"/>
    </svg>
  `;
}

// =========================================================================
// SAFE LOCALSTORAGE PERSISTENCE & DEFAULT SAMPLE TRACKS
// =========================================================================
function savePlaylistToStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const nodes = playlist.toArray();
    const payload = {
      tracks: nodes.map(n => ({
        title: n.title,
        artist: n.artist,
        duration: n.duration
      })),
      currentIndex: playlist.current ? playlist.indexOf(playlist.current) : 0,
      isCircular: Boolean(playlist.isCircular)
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Graceful no-op when storage is unavailable or quota exceeded
  }
}

function loadDefaultTracks() {
  playlist.clear();
  DEFAULT_TRACKS.forEach(track => playlist.addSong(track));
  playlist.current = playlist.head;
  savePlaylistToStorage();
}

function loadPlaylistFromStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      loadDefaultTracks();
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      loadDefaultTracks();
      return;
    }

    const parsed = JSON.parse(raw);
    const tracks = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.tracks) ? parsed.tracks : null);

    if (!tracks || tracks.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      loadDefaultTracks();
      return;
    }

    playlist.clear();
    let validCount = 0;
    tracks.forEach(item => {
      if (item && typeof item.title === 'string' && item.title.trim()) {
        playlist.addSong({
          title: item.title,
          artist: typeof item.artist === 'string' && item.artist.trim() ? item.artist : 'Mixtape Artist',
          duration: Number(item.duration) > 0 ? Number(item.duration) : 180,
          audioUrl: null
        });
        validCount++;
      }
    });

    if (validCount === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      loadDefaultTracks();
      return;
    }

    const targetIdx = (parsed && typeof parsed.currentIndex === 'number') ? parsed.currentIndex : 0;
    const targetNode = playlist.getNodeAt(Math.max(0, Math.min(playlist.size - 1, targetIdx)));
    playlist.current = targetNode || playlist.head;

    if (parsed && parsed.isCircular) {
      playlist.enableRepeatAll();
    }
  } catch (e) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (innerErr) {
      // Ignore storage clear errors
    }
    loadDefaultTracks();
  }
}

// =========================================================================
// CHAT-BUBBLE OPERATION LOG ENGINE (FOOTER LOG)
// =========================================================================
function logOperation(tag, message, category = 'op') {
  const consoleWindow = document.getElementById('consoleWindow');
  if (!consoleWindow) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  let catClass = '';
  let tagClass = 'log-tag-op';
  if (category === 'ptr') {
    catClass = 'cat-ptr';
  } else if (category === 'circ') {
    catClass = 'cat-circ';
    tagClass = 'log-tag-circ';
  } else if (category === 'del') {
    catClass = 'cat-del';
    tagClass = 'log-tag-del';
  }

  const row = document.createElement('div');
  row.className = `log-entry ${catClass}`;
  row.innerHTML = `
    <span class="log-tag ${tagClass}">${escapeHtml(tag)}</span>
    <span class="log-msg">${message}</span>
    <span class="log-time">${timeStr}</span>
  `;

  consoleWindow.appendChild(row);
  consoleWindow.scrollTop = consoleWindow.scrollHeight;
}

function setPlaybackStatusText(htmlMsg) {
  const el = document.getElementById('playbackLogText');
  if (el) {
    el.innerHTML = htmlMsg;
  }
}

// =========================================================================
// TIME FORMATTERS
// =========================================================================
function formatTime(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// =========================================================================
// UI RENDERERS
// =========================================================================

/** Update Hero + Footer Decorative Cassettes */
function updateHeroAndFooterCassettes() {
  const heroMount = document.getElementById('heroCassetteMount');
  const footerMount = document.getElementById('footerCassetteMount');
  const current = playlist.current;

  if (heroMount) {
    heroMount.innerHTML = createCassetteSVG({
      title: current ? current.title : 'MY MIXTAPE',
      variantIndex: 0, // Purple body + yellow label in Hero
      spinning: isPlaying && Boolean(current),
      sideText: 'A'
    });
  }

  if (footerMount) {
    footerMount.innerHTML = createCassetteSVG({
      title: current ? current.title : 'LIVE LOG',
      variantIndex: 2, // Neon green accent cassette
      spinning: isPlaying && Boolean(current),
      sideText: 'B',
      compact: true
    });
  }
}

/** Update Telemetry Pills */
function updateStatCards() {
  document.getElementById('statTotalTracks').textContent = playlist.size;

  const nowPlayingEl = document.getElementById('statNowPlaying');
  const currentAddressEl = document.getElementById('statCurrentAddress');
  if (playlist.current) {
    nowPlayingEl.textContent = playlist.current.title;
    currentAddressEl.textContent = playlist.current.memAddress;
  } else {
    nowPlayingEl.textContent = 'IDLE';
    currentAddressEl.textContent = 'Pointer: null';
  }

  const modeEl = document.getElementById('statMode');
  const modeSubEl = document.getElementById('statModeSub');
  if (playlist.isCircular) {
    modeEl.textContent = 'CIRCULAR';
    modeSubEl.textContent = 'tail.next -> head';
  } else {
    modeEl.textContent = 'LINEAR';
    modeSubEl.textContent = 'tail.next -> NULL';
  }

  const totalSeconds = playlist.getTotalDuration();
  document.getElementById('statTotalDuration').textContent = formatTime(totalSeconds);

  document.getElementById('queueCountBadge').textContent = `${playlist.size} Track${playlist.size === 1 ? '' : 's'}`;
  document.getElementById('maxIndexLabel').textContent = Math.max(0, playlist.size);
}

/** Update the Now Playing Card */
function updatePlayerCard() {
  const current = playlist.current;
  const playerArtwork = document.getElementById('playerArtwork');
  const nowPlayingMount = document.getElementById('nowPlayingCassetteMount');
  const playerTitle = document.getElementById('playerTitle');
  const playerArtist = document.getElementById('playerArtist');
  const playerPrevBadge = document.getElementById('playerPrevBadge');
  const playerNextBadge = document.getElementById('playerNextBadge');
  const timeElapsed = document.getElementById('timeElapsed');
  const timeTotal = document.getElementById('timeTotal');
  const playerStatusBadge = document.getElementById('playerStatusBadge');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const playPauseLabel = document.getElementById('playPauseLabel');
  const btnRepeat = document.getElementById('btnRepeat');

  if (playlist.isCircular) {
    btnRepeat.classList.add('btn-toggle-active');
  } else {
    btnRepeat.classList.remove('btn-toggle-active');
  }

  if (isPlaying) {
    playerArtwork.classList.add('playing');
    if (playPauseIcon) playPauseIcon.setAttribute('data-lucide', 'pause');
    if (playPauseLabel) playPauseLabel.textContent = 'Pause';
    playerStatusBadge.textContent = 'STATUS: PLAYING';
  } else {
    playerArtwork.classList.remove('playing');
    if (playPauseIcon) playPauseIcon.setAttribute('data-lucide', 'play');
    if (playPauseLabel) playPauseLabel.textContent = 'Play';
    playerStatusBadge.textContent = playlist.size > 0 ? 'STATUS: PAUSED' : 'STATUS: EMPTY';
  }

  const activeIdx = current ? Math.max(0, playlist.indexOf(current)) : 0;

  if (nowPlayingMount) {
    nowPlayingMount.innerHTML = createCassetteSVG({
      title: current ? current.title : 'DROP A TAPE',
      variantIndex: current ? activeIdx : 0,
      spinning: isPlaying && Boolean(current),
      sideText: 'A'
    });
  }

  if (current) {
    playerTitle.textContent = current.title;
    playerArtist.innerHTML = `${escapeHtml(current.artist)} &bull; ${formatTime(current.duration)}`;

    const prevText = current.prev ? current.prev.title : (playlist.isCircular && playlist.tail ? playlist.tail.title : 'null');
    const nextText = current.next ? current.next.title : (playlist.isCircular && playlist.head ? playlist.head.title : 'null');

    playerPrevBadge.innerHTML = `prev: <b>${escapeHtml(truncateText(prevText, 16))}</b>`;
    playerNextBadge.innerHTML = `next: <b>${escapeHtml(truncateText(nextText, 16))}</b>`;

    timeElapsed.textContent = formatTime(playbackSeconds);
    timeTotal.textContent = formatTime(current.duration);

    const percent = Math.min(100, (playbackSeconds / current.duration) * 100);
    document.getElementById('progressFill').style.width = `${percent}%`;
  } else {
    playerTitle.textContent = 'No Track Selected';
    playerArtist.textContent = 'Queue is empty — add a tape!';
    playerPrevBadge.innerHTML = 'prev: <b>null</b>';
    playerNextBadge.innerHTML = 'next: <b>null</b>';
    timeElapsed.textContent = '00:00';
    timeTotal.textContent = '00:00';
    document.getElementById('progressFill').style.width = '0%';
  }

  updateHeroAndFooterCassettes();
  refreshIcons();
}

/** Lightweight updater for real-time progress bar */
function updatePlayerProgressOnly() {
  if (!playlist.current) return;
  const currentDuration = (realAudio && playlist.current.audioUrl && realAudio.duration)
    ? realAudio.duration
    : playlist.current.duration;
  document.getElementById('timeElapsed').textContent = formatTime(playbackSeconds);
  document.getElementById('timeTotal').textContent = formatTime(currentDuration);

  const percent = Math.min(100, (playbackSeconds / currentDuration) * 100);
  document.getElementById('progressFill').style.width = `${percent}%`;
}

/** Render the Pastel Carousel Queue ("YOUR TAPES") via head -> tail traversal */
function renderQueue(highlightQuery = '') {
  const queueList = document.getElementById('queueList');
  queueList.innerHTML = '';

  if (playlist.size === 0) {
    queueList.innerHTML = `
      <div class="empty-tapes-banner">
        <strong>[EMPTY MIXTAPE CAROUSEL]</strong><br>
        Scroll up to Step 1 and add a track (upload an MP3/MP4 or enter title + duration) to generate your first tape card!
      </div>
    `;
    document.getElementById('searchMatchCount').textContent = 'Traverse: Head \u2192 Tail (0 nodes)';
    return;
  }

  const query = highlightQuery.trim().toLowerCase();
  let matchCount = 0;

  const tintClasses = ['tint-lime', 'tint-pink', 'tint-cyan'];

  // TRAVERSAL: Strictly traversing pointers from head to tail!
  let curr = playlist.head;
  let index = 0;

  while (curr && index < playlist.size) {
    const isCurrent = (curr === playlist.current);
    const isHead = (curr === playlist.head);
    const isTail = (curr === playlist.tail);
    const matchesSearch = query && curr.title.toLowerCase().includes(query);
    if (matchesSearch) matchCount++;

    const cardEl = document.createElement('article');
    cardEl.setAttribute('role', 'listitem');
    cardEl.className = `tape-card ${tintClasses[index % tintClasses.length]} ${isCurrent ? 'current-track' : ''}`;
    if (matchesSearch) {
      cardEl.style.outline = '4px solid var(--violet)';
    }

    const prevLabel = curr.prev ? curr.prev.title : (playlist.isCircular ? `${playlist.tail.title} (wrap)` : 'null');
    const nextLabel = curr.next ? curr.next.title : (playlist.isCircular ? `${playlist.head.title} (wrap)` : 'null');

    cardEl.innerHTML = `
      ${isCurrent ? '<div class="now-playing-sticker">NOW PLAYING</div>' : ''}
      <div class="tape-card-top-row">
        <span class="tape-step-num">TAPE #${String(index + 1).padStart(2, '0')} &bull; ${curr.memAddress}</span>
        <div class="tape-badges-mini">
          ${isHead ? '<span class="pin-sticker pin-head">HEAD</span>' : ''}
          ${isTail ? '<span class="pin-sticker pin-tail">TAIL</span>' : ''}
        </div>
      </div>

      <div class="tape-cassette-wrap">
        ${createCassetteSVG({
          title: curr.title,
          variantIndex: index,
          spinning: isPlaying && isCurrent,
          sideText: String.fromCharCode(65 + (index % 2)),
          compact: true
        })}
      </div>

      <div>
        <h3 class="tape-card-title" title="${escapeHtml(curr.title)}">${escapeHtml(curr.title)}</h3>
        <div class="tape-card-artist">${escapeHtml(curr.artist)} &bull; ${formatTime(curr.duration)}</div>
      </div>

      <div class="tape-card-ptrs" title="prev &amp; next memory pointers">
        &larr; ${escapeHtml(truncateText(prevLabel, 11))} | ${escapeHtml(truncateText(nextLabel, 11))} &rarr;
      </div>

      <div class="tape-card-actions">
        <button class="btn-icon-circle btn-icon-play" title="Play Tape" aria-label="Play ${escapeHtml(curr.title)}" onclick="handlePlayIndex(${index})">
          <i data-lucide="play" style="width:15px; height:15px;"></i>
        </button>
        <div style="display:flex; gap:6px;">
          <button class="btn-icon-circle" title="Move Up (Swap Links)" aria-label="Move up" ${index === 0 ? 'disabled' : ''} onclick="handleMoveUp(${index})">
            <i data-lucide="arrow-left" style="width:15px; height:15px;"></i>
          </button>
          <button class="btn-icon-circle" title="Move Down (Swap Links)" aria-label="Move down" ${index === playlist.size - 1 ? 'disabled' : ''} onclick="handleMoveDown(${index})">
            <i data-lucide="arrow-right" style="width:15px; height:15px;"></i>
          </button>
          <button class="btn-icon-circle btn-icon-del" title="Delete Tape (Unlink)" aria-label="Delete ${escapeHtml(curr.title)}" onclick="handleDelete(${index})">
            <i data-lucide="trash-2" style="width:15px; height:15px;"></i>
          </button>
        </div>
      </div>
    `;

    queueList.appendChild(cardEl);

    curr = curr.next;
    index++;
  }

  const matchLabel = document.getElementById('searchMatchCount');
  if (query) {
    matchLabel.textContent = `Found ${matchCount} match${matchCount === 1 ? '' : 'es'} via O(n) traversal`;
  } else {
    matchLabel.textContent = `Traverse: Head \u2192 Tail (${playlist.size} node${playlist.size === 1 ? '' : 's'})`;
  }

  refreshIcons();
}

/** Position/Animate Sliding CURRENT Sticker inside Visualizer */
let previousCurrentOffsetLeft = null;

function positionCurrentSticker(animate = true) {
  const nodesRail = document.getElementById('nodesRail');
  const sticker = document.getElementById('floatingCurrentSticker');
  if (!nodesRail || !sticker || !playlist.current) return;

  const activeIdx = playlist.indexOf(playlist.current);
  const targetNode = document.getElementById(`vnode-${activeIdx}`);
  if (!targetNode) {
    sticker.style.opacity = '0';
    return;
  }

  const targetCenter = targetNode.offsetLeft + targetNode.offsetWidth / 2;

  if (!animate || previousCurrentOffsetLeft === null) {
    sticker.style.transition = 'none';
    sticker.style.left = `${targetCenter}px`;
    sticker.style.opacity = '1';
    // Force layout flush then restore smooth transition
    void sticker.offsetWidth;
    sticker.style.transition = '';
  } else {
    sticker.style.left = `${previousCurrentOffsetLeft}px`;
    sticker.style.opacity = '1';
    void sticker.offsetWidth;
    sticker.classList.remove('pop-bounce');
    requestAnimationFrame(() => {
      sticker.style.left = `${targetCenter}px`;
      sticker.classList.add('pop-bounce');
    });
  }

  previousCurrentOffsetLeft = targetCenter;
}

/** Render the Doubly Linked List Cassette Visualizer ("VISUALIZE THE LIST") */
function renderVisualizer() {
  const nodesRail = document.getElementById('nodesRail');
  const stageWrap = document.getElementById('visualizerStageWrap');
  const topologyText = document.getElementById('visualizerTopologyText');

  nodesRail.innerHTML = '';

  if (playlist.isCircular) {
    stageWrap.classList.add('circular-mode-active');
    topologyText.textContent = 'CIRCULAR DOUBLY LINKED LIST (tail.next = head, head.prev = tail)';
  } else {
    stageWrap.classList.remove('circular-mode-active');
    topologyText.textContent = 'LINEAR DOUBLY LINKED LIST (head.prev = null, tail.next = null)';
  }

  if (playlist.size === 0) {
    previousCurrentOffsetLeft = null;
    nodesRail.innerHTML = `
      <div style="text-align:center; width:100%; padding:40px 16px; font-family:var(--font-mono); font-weight:700;">
        [NULL POINTER] List is empty. Head = NULL, Tail = NULL.
      </div>
    `;
    return;
  }

  // Sliding CURRENT sticker overlay
  const floatingSticker = document.createElement('div');
  floatingSticker.id = 'floatingCurrentSticker';
  floatingSticker.className = 'floating-current-sticker';
  floatingSticker.textContent = 'CURRENT ▼';
  nodesRail.appendChild(floatingSticker);

  // Left NULL terminal (if Linear)
  if (!playlist.isCircular) {
    const nullLeft = document.createElement('div');
    nullLeft.className = 'null-terminal';
    nullLeft.innerHTML = `<span>&larr; prev</span><b>NULL</b>`;
    nodesRail.appendChild(nullLeft);

    const connLeft = document.createElement('div');
    connLeft.className = 'viz-connector';
    connLeft.innerHTML = `<div class="viz-arrow-line prev-line">&larr; null</div>`;
    nodesRail.appendChild(connLeft);
  }

  const searchInputEl = document.getElementById('searchInput');
  const activeSearchQuery = searchInputEl ? searchInputEl.value.trim().toLowerCase() : '';

  let curr = playlist.head;
  let index = 0;

  while (curr && index < playlist.size) {
    const isHead = (curr === playlist.head);
    const isTail = (curr === playlist.tail);
    const isCurrent = (curr === playlist.current);
    const isMatch = activeSearchQuery && curr.title.toLowerCase().includes(activeSearchQuery);

    const nodeBox = document.createElement('div');
    nodeBox.className = `viz-cassette-node ${isCurrent ? 'current-node' : ''} ${isMatch ? 'search-match' : ''}`;
    nodeBox.id = `vnode-${index}`;
    nodeBox.setAttribute('data-index', index);
    nodeBox.title = 'Click to inspect node memory & pointers';
    nodeBox.onclick = () => openInspector(index);

    let stickersHtml = '';
    if (isHead) stickersHtml += `<span class="pin-sticker pin-head">HEAD</span>`;
    if (isTail) stickersHtml += `<span class="pin-sticker pin-tail">TAIL</span>`;

    const prevAddr = curr.prev ? curr.prev.memAddress : (playlist.isCircular ? playlist.tail.memAddress : 'NULL');
    const nextAddr = curr.next ? curr.next.memAddress : (playlist.isCircular ? playlist.head.memAddress : 'NULL');

    nodeBox.innerHTML = `
      <div class="viz-node-stickers">${stickersHtml}</div>
      <div class="viz-node-meta">
        <span>NODE #${index}</span>
        <span>${curr.memAddress}</span>
      </div>
      <div class="viz-cassette-graphic">
        ${createCassetteSVG({
          title: curr.title,
          variantIndex: index,
          spinning: isPlaying && isCurrent,
          sideText: String(index),
          compact: true
        })}
      </div>
      <div class="viz-ptr-row">
        <span>&larr; ${prevAddr}</span>
        <span>${nextAddr} &rarr;</span>
      </div>
    `;

    nodesRail.appendChild(nodeBox);

    // Bidirectional <-> arrow connector between tapes
    if (index < playlist.size - 1) {
      const connector = document.createElement('div');
      connector.className = 'viz-connector';
      connector.innerHTML = `
        <div class="viz-arrow-line" title="node.next pointer">next &rarr;</div>
        <div style="font-size:14px; font-weight:900;">&harr;</div>
        <div class="viz-arrow-line prev-line" title="node.prev pointer">&larr; prev</div>
      `;
      nodesRail.appendChild(connector);
    }

    curr = curr.next;
    index++;
  }

  // Right NULL terminal (if Linear)
  if (!playlist.isCircular) {
    const connRight = document.createElement('div');
    connRight.className = 'viz-connector';
    connRight.innerHTML = `<div class="viz-arrow-line">null &rarr;</div>`;
    nodesRail.appendChild(connRight);

    const nullRight = document.createElement('div');
    nullRight.className = 'null-terminal';
    nullRight.innerHTML = `<span>next &rarr;</span><b>NULL</b>`;
    nodesRail.appendChild(nullRight);
  }

  positionCurrentSticker(true);
  refreshIcons();
}

/** Full UI update helper */
function updateAllUI() {
  updateStatCards();
  updatePlayerCard();
  renderQueue(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '');
  renderVisualizer();
  savePlaylistToStorage();
}

// =========================================================================
// REAL HTML5 MEDIA PLAYBACK ENGINE (+ TIMER FALLBACK FOR TYPED TRACKS)
// =========================================================================
function clearSimTimer() {
  if (simPlaybackInterval) {
    clearInterval(simPlaybackInterval);
    simPlaybackInterval = null;
  }
}

function setupRealAudioEvents() {
  realAudio = document.getElementById('realAudioPlayer') || new Audio();

  realAudio.addEventListener('timeupdate', () => {
    if (playlist.current && playlist.current.audioUrl) {
      playbackSeconds = Math.floor(realAudio.currentTime);
      updatePlayerProgressOnly();
    }
  });

  realAudio.addEventListener('ended', () => {
    if (playlist.current) {
      logOperation('AUTOPLAY', `Finished track '<b>${escapeHtml(playlist.current.title)}</b>'. Advancing via nextTrack()...`);
      handleNextTrack(true);
    }
  });

  realAudio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayerCard();
    renderQueue(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '');
    renderVisualizer();
  });

  realAudio.addEventListener('pause', () => {
    if (playlist.current && playlist.current.audioUrl) {
      isPlaying = false;
      updatePlayerCard();
      renderQueue(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '');
      renderVisualizer();
    }
  });

  realAudio.addEventListener('error', () => {
    isPlaying = false;
    updatePlayerCard();
  });
}

function startPlayback() {
  if (playlist.size === 0 || !playlist.current) return;
  playSynthBeep(660, 'sine', 0.1);
  clearSimTimer();

  if (playlist.current.audioUrl) {
    if (realAudio.src !== playlist.current.audioUrl) {
      realAudio.src = playlist.current.audioUrl;
      realAudio.currentTime = playbackSeconds || 0;
    }

    const playPromise = realAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying = true;
        updateAllUI();
      }).catch(() => {
        isPlaying = false;
        updateAllUI();
      });
    }
  } else {
    // Smooth simulated timer when track was typed manually without an audio file
    if (realAudio && !realAudio.paused) {
      realAudio.pause();
    }
    isPlaying = true;
    updateAllUI();
    simPlaybackInterval = setInterval(() => {
      if (!isPlaying || !playlist.current) {
        clearSimTimer();
        return;
      }
      playbackSeconds++;
      if (playbackSeconds >= playlist.current.duration) {
        clearSimTimer();
        logOperation('AUTOPLAY', `Finished simulated track '<b>${escapeHtml(playlist.current.title)}</b>'. Advancing via nextTrack()...`);
        handleNextTrack(true);
      } else {
        updatePlayerProgressOnly();
      }
    }, 1000);
  }
}

function pausePlayback() {
  clearSimTimer();
  if (realAudio && !realAudio.paused) {
    realAudio.pause();
  }
  isPlaying = false;
  playSynthBeep(330, 'triangle', 0.1);
  updateAllUI();
}

function togglePlayPause() {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

// =========================================================================
// HANDLERS FOR PLAYLIST ACTIONS
// =========================================================================

function handleNextTrack(auto = false) {
  if (playlist.size === 0) return;

  const res = playlist.nextTrack();
  if (res.status === 'SUCCESS') {
    playbackSeconds = 0;
    playTrackChangeSound(true);
    const wrapNote = res.wrapped ? ' [CIRCULAR WRAP TO HEAD]' : '';
    logOperation('NAV:NEXT', `current moved: '${escapeHtml(res.from ? res.from.title : '')}' &rarr; <b>'${escapeHtml(res.node.title)}'</b>${wrapNote}`, res.wrapped ? 'circ' : 'ptr');
    setPlaybackStatusText(`nextTrack(): Advanced to '<b>${escapeHtml(res.node.title)}</b>'${wrapNote}`);

    if (playlist.current.audioUrl) {
      clearSimTimer();
      realAudio.src = playlist.current.audioUrl;
      realAudio.currentTime = 0;
      if (isPlaying || auto) {
        realAudio.play().catch(() => {});
      }
    } else if (isPlaying || auto) {
      startPlayback();
    }

    updateAllUI();
    scrollActiveNodeIntoView();
  } else if (res.status === 'END_OF_PLAYLIST') {
    pausePlayback();
    playSynthBeep(220, 'sawtooth', 0.3);
    logOperation('NAV:END', `nextTrack(): Reached end of linear playlist. Queue complete.`);
    setPlaybackStatusText('Reached End of Queue (tail.next = NULL).');
    updateAllUI();
  }
}

function handlePrevTrack() {
  if (playlist.size === 0) return;

  const res = playlist.previousTrack();
  if (res.status === 'SUCCESS') {
    playbackSeconds = 0;
    playTrackChangeSound(false);
    const wrapNote = res.wrapped ? ' [CIRCULAR WRAP TO TAIL]' : '';
    logOperation('NAV:PREV', `current moved: '${escapeHtml(res.from ? res.from.title : '')}' &larr; <b>'${escapeHtml(res.node.title)}'</b>${wrapNote}`, res.wrapped ? 'circ' : 'ptr');
    setPlaybackStatusText(`previousTrack(): Back to '<b>${escapeHtml(res.node.title)}</b>'${wrapNote}`);

    if (playlist.current.audioUrl) {
      clearSimTimer();
      realAudio.src = playlist.current.audioUrl;
      realAudio.currentTime = 0;
      if (isPlaying) {
        realAudio.play().catch(() => {});
      }
    } else if (isPlaying) {
      startPlayback();
    }

    updateAllUI();
    scrollActiveNodeIntoView();
  } else if (res.status === 'START_OF_PLAYLIST') {
    playSynthBeep(220, 'sawtooth', 0.2);
    logOperation('NAV:START', `previousTrack(): Already at head in linear mode (head.prev = NULL).`);
    setPlaybackStatusText('Already at Beginning of Queue (head.prev = NULL).');
  }
}

function handlePlayIndex(index) {
  const node = playlist.playSong(index);
  if (node) {
    playbackSeconds = 0;
    playTrackChangeSound(true);
    logOperation('PLAY', `Jumped current pointer directly to node index #${index} (<b>'${escapeHtml(node.title)}'</b>)`);
    setPlaybackStatusText(`Playing index #${index}: '<b>${escapeHtml(node.title)}</b>'`);

    if (node.audioUrl) {
      realAudio.src = node.audioUrl;
      realAudio.currentTime = 0;
    }
    startPlayback();

    updateAllUI();
    scrollActiveNodeIntoView();
  }
}

function handleToggleRepeat() {
  const isCircular = playlist.toggleRepeatAll();
  playSynthBeep(isCircular ? 880 : 440, 'sine', 0.2);

  if (isCircular) {
    logOperation('REPEAT:ON', `CIRCULAR MODE ACTIVATED: tail.next = head (${playlist.head ? playlist.head.memAddress : 'NULL'}), head.prev = tail (${playlist.tail ? playlist.tail.memAddress : 'NULL'})`, 'circ');
    setPlaybackStatusText('Repeat All ON: Circular Doubly Linked List activated.');
  } else {
    logOperation('REPEAT:OFF', `LINEAR MODE RESTORED: tail.next = null, head.prev = null`, 'circ');
    setPlaybackStatusText('Repeat All OFF: Linear queue boundaries restored.');
  }

  updateAllUI();
}

function handleMoveUp(index) {
  const node = playlist.getNodeAt(index);
  const title = node ? node.title : `node ${index}`;
  const success = playlist.moveUp(index);

  if (success) {
    playSynthBeep(580, 'sine', 0.1);
    logOperation('REORDER', `moveUp(${index}): Swapped node links of '<b>${escapeHtml(title)}</b>' with predecessor.`, 'ptr');
    updateAllUI();
  }
}

function handleMoveDown(index) {
  const node = playlist.getNodeAt(index);
  const title = node ? node.title : `node ${index}`;
  const success = playlist.moveDown(index);

  if (success) {
    playSynthBeep(480, 'sine', 0.1);
    logOperation('REORDER', `moveDown(${index}): Swapped node links of '<b>${escapeHtml(title)}</b>' with successor.`, 'ptr');
    updateAllUI();
  }
}

function handleDelete(index) {
  const node = playlist.getNodeAt(index);
  if (!node) return;

  const title = node.title;
  const isDeletedCurrent = (node === playlist.current);
  const removed = playlist.removeSong(index);

  if (removed) {
    playSynthBeep(260, 'sawtooth', 0.2);
    logOperation('DELETE', `removeSong(${index}): Unlinked '<b>${escapeHtml(title)}</b>'. Fixed prev/next pointers.`, 'del');

    if (playlist.size === 0) {
      pausePlayback();
      realAudio.removeAttribute('src');
      realAudio.load();
      playbackSeconds = 0;
    } else if (isDeletedCurrent) {
      playbackSeconds = 0;
      if (playlist.current && playlist.current.audioUrl) {
        realAudio.src = playlist.current.audioUrl;
        realAudio.currentTime = 0;
        if (isPlaying) {
          realAudio.play().catch(() => {});
        }
      }
    }

    updateAllUI();
  }
}

function handleShuffle() {
  if (playlist.size <= 1) return;
  playlist.shuffle();
  playSynthBeep(700, 'sine', 0.2);
  logOperation('SHUFFLE', `Fisher-Yates shuffled node references and rebuilt all prev/next pointers in O(n).`);
  setPlaybackStatusText('Queue shuffled: Doubly linked list completely relinked.');
  updateAllUI();
}

function handleReverse() {
  if (playlist.size <= 1) return;
  playlist.reverse();
  playSynthBeep(600, 'triangle', 0.2);
  logOperation('REVERSE', `In-place reversal: Swapped prev/next for all ${playlist.size} nodes. Swapped head and tail.`, 'ptr');
  setPlaybackStatusText('In-place reversal complete: Head and Tail exchanged.');
  updateAllUI();
}

function handleClearQueue() {
  if (playlist.size === 0) return;
  if (!confirm('Are you sure you want to clear the entire playlist queue?')) return;

  playlist.clear();
  pausePlayback();
  realAudio.removeAttribute('src');
  realAudio.load();
  playbackSeconds = 0;
  playSynthBeep(200, 'sawtooth', 0.3);
  logOperation('CLEAR', `clear(): Deallocated all node pointers. Size = 0.`, 'del');
  setPlaybackStatusText('Queue cleared: All node pointers set to NULL.');
  updateAllUI();
}

function scrollActiveNodeIntoView() {
  if (!playlist.current) return;
  const activeIdx = playlist.indexOf(playlist.current);
  if (activeIdx < 0) return;

  const vnode = document.getElementById(`vnode-${activeIdx}`);
  if (vnode) {
    vnode.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

// =========================================================================
// NODE INSPECTOR MODAL (FOR VIVA CODE EXPLANATION)
// =========================================================================
function openInspector(index) {
  const node = playlist.getNodeAt(index);
  if (!node) return;

  const modal = document.getElementById('inspectorModal');
  const modalTitle = document.getElementById('inspectModalTitle');
  const inspectGrid = document.getElementById('inspectGrid');

  const isHead = (node === playlist.head);
  const isTail = (node === playlist.tail);
  const isCurrent = (node === playlist.current);

  modalTitle.textContent = `Node #${index} Memory & Pointer Inspection`;

  inspectGrid.innerHTML = `
    <div class="inspect-card">
      <h5>Simulated Memory Address</h5>
      <p style="color:#5B2EFF;">${node.memAddress}</p>
    </div>

    <div class="inspect-card">
      <h5>Track Title</h5>
      <p>${escapeHtml(node.title)}</p>
    </div>

    <div class="inspect-card">
      <h5>Artist / Producer</h5>
      <p>${escapeHtml(node.artist)}</p>
    </div>

    <div class="inspect-card">
      <h5>Duration</h5>
      <p>${formatTime(node.duration)} (${node.duration}s)</p>
    </div>

    <div class="inspect-card">
      <h5>Previous Pointer (node.prev)</h5>
      <p style="color:#B45309;">
        ${node.prev ? `${escapeHtml(node.prev.title)} [${node.prev.memAddress}]` : (playlist.isCircular ? `${escapeHtml(playlist.tail ? playlist.tail.title : '')} (Circular tail)` : 'NULL')}
      </p>
    </div>

    <div class="inspect-card">
      <h5>Next Pointer (node.next)</h5>
      <p style="color:#5B2EFF;">
        ${node.next ? `${escapeHtml(node.next.title)} [${node.next.memAddress}]` : (playlist.isCircular ? `${escapeHtml(playlist.head ? playlist.head.title : '')} (Circular head)` : 'NULL')}
      </p>
    </div>

    <div class="inspect-card">
      <h5>Role in Topology</h5>
      <p>
        ${isHead ? '<span style="color:#047857">[HEAD POINTER] </span>' : ''}
        ${isTail ? '<span style="color:#B45309">[TAIL POINTER] </span>' : ''}
        ${isCurrent ? '<span style="color:#5B2EFF">[CURRENT PLAYING] </span>' : ''}
        ${(!isHead && !isTail) ? 'Internal Node' : ''}
      </p>
    </div>

    <div class="inspect-card">
      <h5>Time Complexity</h5>
      <p style="font-size:11px;">
        Access by index: <b>O(n)</b><br>
        Direct pointer navigation: <b>O(1)</b>
      </p>
    </div>
  `;

  modal.classList.add('active');
  playSynthBeep(520, 'sine', 0.1);
}

function closeInspector() {
  document.getElementById('inspectorModal').classList.remove('active');
}

function handleRunDiagnostics() {
  playSynthBeep(880, 'sine', 0.2);
  logOperation('DIAGNOSTICS', '>>> INITIATING ACADEMIC VIVA UNIT TEST SUITE <<<');

  if (typeof window.runAllPlaylistTests === 'function') {
    const outcome = window.runAllPlaylistTests();
    outcome.results.forEach(res => {
      const tag = res.passed ? 'TEST:PASS' : 'TEST:FAIL';
      const cat = res.passed ? 'ptr' : 'del';
      logOperation(tag, `${escapeHtml(res.name)}: ${escapeHtml(res.details)}`, cat);
    });

    logOperation('SUMMARY', `Completed <b>${outcome.total}</b> tests: <b>${outcome.passed} PASSED</b>, <b>${outcome.failed} FAILED</b>.`);
  }
}

// Scroll Reveal Observer for Smooth Card Entrance (with visible-by-default fallback)
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal-on-scroll');
  if (!targets || targets.length === 0) return;

  const revealAll = () => {
    targets.forEach(el => el.classList.add('is-visible'));
  };

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.add('js-enabled');
  }

  if (typeof IntersectionObserver !== 'function') {
    revealAll();
    return;
  }

  // Reveal any element already in or above the current viewport immediately
  const vh = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 900;
  targets.forEach(el => {
    if (typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh + 120) {
        el.classList.add('is-visible');
      }
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });

  targets.forEach(el => {
    if (!el.classList.contains('is-visible')) {
      observer.observe(el);
    }
  });

  // Safety fallback: guarantee all sections reveal within 1.2s regardless of observer quirks
  setTimeout(revealAll, 1200);
}

// Expose handlers globally for inline HTML event attributes
window.handlePlayIndex = handlePlayIndex;
window.handleMoveUp = handleMoveUp;
window.handleMoveDown = handleMoveDown;
window.handleDelete = handleDelete;
window.openInspector = openInspector;
window.closeInspector = closeInspector;
window.handleRunDiagnostics = handleRunDiagnostics;

// =========================================================================
// EVENT LISTENERS & APP BOOTSTRAP
// =========================================================================
let appInitialized = false;

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  // 1. Setup scroll reveal animations
  initScrollReveal();

  // 2. Setup real HTML5 audio engine events
  setupRealAudioEvents();

  // 3. Load persisted queue or default sample mixtape tracks
  loadPlaylistFromStorage();

  // 4. Player Transport Controls
  const bindClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  bindClick('btnPlayPause', togglePlayPause);
  bindClick('btnNext', () => handleNextTrack(false));
  bindClick('btnPrev', handlePrevTrack);
  bindClick('btnRepeat', handleToggleRepeat);
  bindClick('btnShuffle', handleShuffle);
  bindClick('btnReverse', handleReverse);
  bindClick('btnClearQueue', handleClearQueue);

  // Focus active node in visualizer
  bindClick('btnFocusActive', () => {
    scrollActiveNodeIntoView();
    playSynthBeep(450, 'sine', 0.1);
  });

  // Footer CTA smooth scroll + focus input
  bindClick('btnFooterAddSong', () => {
    setTimeout(() => {
      const titleEl = document.getElementById('inputTitle');
      if (titleEl) titleEl.focus();
    }, 450);
  });

  // Clear Operation Log
  bindClick('btnClearLog', () => {
    const consoleWin = document.getElementById('consoleWindow');
    if (consoleWin) consoleWin.innerHTML = '';
    logOperation('CLEARED', 'Log history wiped.');
  });

  // Run Diagnostics button
  bindClick('btnRunTests', handleRunDiagnostics);

  // Interactive Progress Scrubber
  const progressBarWrap = document.getElementById('progressBarWrap');
  if (progressBarWrap) {
    progressBarWrap.addEventListener('click', (e) => {
      if (!playlist.current) return;
      const currentDuration = (realAudio && playlist.current.audioUrl && realAudio.duration)
        ? realAudio.duration
        : playlist.current.duration;
      if (!currentDuration) return;

      const rect = progressBarWrap.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetSec = ratio * currentDuration;

      if (playlist.current.audioUrl && realAudio) {
        realAudio.currentTime = targetSec;
      }
      playbackSeconds = Math.floor(targetSec);
      updatePlayerProgressOnly();
      playSynthBeep(440, 'triangle', 0.08);
    });
  }

  // Position Selector toggle
  const selectPosition = document.getElementById('selectPosition');
  const indexGroup = document.getElementById('indexGroup');
  if (selectPosition && indexGroup) {
    selectPosition.addEventListener('change', () => {
      indexGroup.style.display = (selectPosition.value === 'index') ? 'flex' : 'none';
    });
  }

  // Local File Upload input listener: auto-detect duration and title
  const inputFile = document.getElementById('inputFile');
  const inputTitle = document.getElementById('inputTitle');
  const inputDuration = document.getElementById('inputDuration');
  const fileNamePreview = document.getElementById('fileNamePreview');

  if (inputFile && inputTitle && inputDuration && fileNamePreview) {
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      currentMediaUrl = URL.createObjectURL(file);

      if (!inputTitle.value.trim()) {
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        inputTitle.value = cleanTitle;
      }

      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      fileNamePreview.textContent = `${file.name} (${sizeMb} MB)`;

      const isVideo = file.type.startsWith('video') || file.name.match(/\.(mp4|webm|ogg|mov)$/i);
      const mediaProbe = document.createElement(isVideo ? 'video' : 'audio');
      mediaProbe.preload = 'metadata';
      mediaProbe.src = currentMediaUrl;

      mediaProbe.onloadedmetadata = () => {
        const durSec = Math.max(1, Math.round(mediaProbe.duration));
        inputDuration.value = durSec;
        logOperation('FILE:METADATA', `Loaded '${escapeHtml(file.name)}' [Duration: ${formatTime(durSec)} / ${durSec}s]`);
      };

      mediaProbe.onerror = () => {
        if (!inputDuration.value) inputDuration.value = 180;
      };
    });
  }

  // Add Song Form Submit (works with local file OR manual entry!)
  const addSongForm = document.getElementById('addSongForm');
  if (addSongForm && inputTitle && inputDuration && selectPosition) {
    addSongForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = inputTitle.value.trim();
      const artistInput = document.getElementById('inputArtist');
      const artist = (artistInput ? artistInput.value.trim() : '') || 'Mixtape Artist';
      const duration = parseInt(inputDuration.value, 10) || 180;
      const pos = selectPosition.value;
      const indexInput = document.getElementById('inputIndex');
      const idx = indexInput ? parseInt(indexInput.value, 10) : 0;

      if (!title) {
        alert('Please enter a track title.');
        return;
      }

      const songData = {
        title,
        artist,
        duration,
        audioUrl: currentMediaUrl || null
      };

      let insertedNode = null;

      if (pos === 'head') {
        insertedNode = playlist.addAtHead(songData);
        logOperation('INSERT:HEAD', `addAtHead(): Prepended '<b>${escapeHtml(title)}</b>' [${insertedNode.memAddress}] as new HEAD in O(1).`, 'ptr');
      } else if (pos === 'index') {
        insertedNode = playlist.addAtPosition(songData, idx);
        if (!insertedNode) {
          alert(`Invalid index! Must be between 0 and ${playlist.size}.`);
          return;
        }
        logOperation('INSERT:POS', `addAtPosition(song, ${idx}): Spliced '<b>${escapeHtml(title)}</b>' [${insertedNode.memAddress}] in O(n).`, 'ptr');
      } else {
        insertedNode = playlist.addSong(songData);
        logOperation('INSERT:TAIL', `addSong(): Appended '<b>${escapeHtml(title)}</b>' [${insertedNode.memAddress}] to TAIL in O(1).`, 'ptr');
      }

      if (playlist.size === 1) {
        playlist.current = insertedNode;
        if (insertedNode.audioUrl) {
          realAudio.src = insertedNode.audioUrl;
          realAudio.currentTime = 0;
        }
      }

      // Reset Form for next track
      inputTitle.value = '';
      if (artistInput) artistInput.value = '';
      inputDuration.value = '180';
      if (inputFile) inputFile.value = '';
      if (fileNamePreview) fileNamePreview.textContent = 'Or type title, artist & duration below';
      currentMediaUrl = null;

      playSynthBeep(600, 'sine', 0.15);
      updateAllUI();
      scrollActiveNodeIntoView();
    });
  }

  // Real-time Search Input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value;
      renderQueue(query);
      renderVisualizer();
    });
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight' || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      handleNextTrack(false);
    } else if (e.code === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      handlePrevTrack();
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handleToggleRepeat();
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleShuffle();
    }
  });

  // Modal Close
  bindClick('btnModalClose', closeInspector);
  const inspectorModal = document.getElementById('inspectorModal');
  if (inspectorModal) {
    inspectorModal.addEventListener('click', (e) => {
      if (e.target.id === 'inspectorModal') {
        closeInspector();
      }
    });
  }

  // Log Ready
  logOperation('INIT', `playlistr ready with <b>${playlist.size}</b> tracks loaded into Doubly Linked List.`);

  // Initial full render (Hero cassette, stats, Now Playing, Queue carousel, Visualizer)
  updateAllUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
