// ==========================================================================
// ComicCraft AI Studio – Frontend Engine
// ==========================================================================

let currentComic = null;
let currentAudio = null;
let isPlayingStory = false;
let cinemaCurrentIndex = 0;

// Web Audio API Synthesizer
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Zero-Dependency Comic SFX Synthesizer
function playSfx(type = "pow") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === "pow") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "kaboom") {
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.linearRampToValueAtTime(50, now + 0.4);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === "sparkle") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.2);
      });
    } else if (type === "boing") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(480, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "woosh") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.warn("SFX warning:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();

  initSparks();
  initForm();
  initStickers();
  initAudioControls();
  initCinemaMode();
  initExport();
});

// 1. Sparks
function initSparks() {
  const sparks = document.querySelectorAll(".spark-btn");
  const promptInput = document.getElementById("promptInput");
  sparks.forEach(btn => {
    btn.addEventListener("click", () => {
      playSfx("woosh");
      promptInput.value = btn.dataset.prompt;
      promptInput.focus();
    });
  });
}

// 2. Comic Form
function initForm() {
  const form = document.getElementById("comicForm");
  const generateBtn = document.getElementById("generateBtn");
  const btnText = generateBtn.querySelector(".btn-text");
  const btnLoader = generateBtn.querySelector(".btn-loader");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = document.getElementById("promptInput").value.trim();
    const style = document.getElementById("styleSelect").value;
    if (!prompt) return;

    playSfx("sparkle");
    generateBtn.disabled = true;
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");

    try {
      const response = await fetch("/api/generate-comic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style })
      });

      const data = await response.json();
      if (data.success && data.comic) {
        currentComic = data.comic;
        renderComic(data.comic);
        playSfx("sparkle");
      } else {
        alert(`Notice: ${data.error || "Please try again"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to AWS backend.");
    } finally {
      generateBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
    }
  });
}

// 3. Render 4-Panel Comic Strip
function renderComic(comic) {
  document.getElementById("comicTitleDisplay").textContent = comic.title || "The Story";
  document.getElementById("comicGenreDisplay").textContent = comic.genre || "Comic Strip";
  document.getElementById("comicLoglineDisplay").textContent = `"${comic.logline || ''}"`;

  document.getElementById("playFullStoryBtn").disabled = false;
  document.getElementById("cinemaModeBtn").disabled = false;
  document.getElementById("exportPngBtn").disabled = false;

  const grid = document.getElementById("comicGrid");
  grid.innerHTML = "";

  comic.panels.forEach((panel, idx) => {
    const panelEl = createPanelElement(panel, idx);
    grid.appendChild(panelEl);
  });

  if (window.lucide) window.lucide.createIcons();
}

// Helper: Create Panel Element
function createPanelElement(panel, index) {
  const panelDiv = document.createElement("div");
  panelDiv.className = "comic-panel";
  panelDiv.id = `comic-panel-${panel.panelNumber || index + 1}`;

  const bgStyle = panel.colorScheme?.bgGradient || "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)";
  const accentColor = panel.colorScheme?.accent || "#fbbf24";

  const header = document.createElement("div");
  header.className = "panel-caption-badge";
  header.innerHTML = `
    <span>${panel.caption || `PANEL ${index + 1}`}</span>
    <span class="panel-num-tag">#${index + 1}</span>
  `;
  panelDiv.appendChild(header);

  const visualArea = document.createElement("div");
  visualArea.className = "panel-visual-area";
  visualArea.style.background = bgStyle;

  if (panel.soundEffect) {
    const soundBadge = document.createElement("div");
    soundBadge.className = "sound-badge";
    soundBadge.textContent = panel.soundEffect;
    soundBadge.addEventListener("click", () => playSfx("pow"));
    visualArea.appendChild(soundBadge);
  }

  // Character Center Stage with Visual Actors
  const stageContainer = document.createElement("div");
  stageContainer.className = "character-stage-container";

  let stageHtml = `<div class="stage-actors-wrapper">`;
  if (panel.character1 && panel.character1.name) {
    const avatar1 = panel.character1.avatar || (panel.character1.voiceGender === "female" ? "👩" : "👨");
    stageHtml += `
      <div class="stage-actor actor-left">
        <div class="actor-glow-ring">
          <span class="actor-emoji">${avatar1}</span>
        </div>
        <span class="actor-name">${panel.character1.name}</span>
        <span class="actor-mood">${panel.character1.emotion || 'ready'}</span>
      </div>
    `;
  }

  if (panel.character2 && panel.character2.name && panel.character2.dialogue) {
    const avatar2 = panel.character2.avatar || (panel.character2.voiceGender === "female" ? "👩" : "🤖");
    stageHtml += `
      <div class="stage-vs-badge">VS</div>
      <div class="stage-actor actor-right">
        <div class="actor-glow-ring">
          <span class="actor-emoji">${avatar2}</span>
        </div>
        <span class="actor-name">${panel.character2.name}</span>
        <span class="actor-mood">${panel.character2.emotion || 'reacting'}</span>
      </div>
    `;
  }
  stageHtml += `</div>`;
  stageContainer.innerHTML = stageHtml;
  visualArea.appendChild(stageContainer);

  const dialoguesDiv = document.createElement("div");
  dialoguesDiv.className = "panel-dialogues";

  if (panel.character1 && panel.character1.dialogue) {
    const bubble1 = document.createElement("div");
    bubble1.className = "speech-bubble char-left";
    bubble1.innerHTML = `
      <span class="bubble-speaker">${panel.character1.avatar || '👤'} ${panel.character1.name}</span>
      <div class="bubble-text-editable" contenteditable="true">${panel.character1.dialogue}</div>
    `;
    dialoguesDiv.appendChild(bubble1);
  }

  if (panel.character2 && panel.character2.dialogue) {
    const bubble2 = document.createElement("div");
    bubble2.className = "speech-bubble char-right";
    bubble2.innerHTML = `
      <span class="bubble-speaker">${panel.character2.avatar || '👤'} ${panel.character2.name}</span>
      <div class="bubble-text-editable" contenteditable="true">${panel.character2.dialogue}</div>
    `;
    dialoguesDiv.appendChild(bubble2);
  }

  visualArea.appendChild(dialoguesDiv);
  panelDiv.appendChild(visualArea);

  const footer = document.createElement("div");
  footer.className = "panel-footer-bar";
  footer.innerHTML = `
    <span>${panel.character1?.emotion ? `Mood: ${panel.character1.emotion}` : 'Scene ' + (index + 1)}</span>
    <div class="panel-footer-actions">
      <button class="panel-btn-small panel-reroll-btn" data-panel-num="${panel.panelNumber || index + 1}" title="Regenerate with Bedrock">
        <i data-lucide="refresh-cw"></i> Reroll
      </button>
      <button class="panel-btn-small panel-voice-btn" data-panel-index="${index}">
        <i data-lucide="volume-2"></i> Voice
      </button>
    </div>
  `;
  panelDiv.appendChild(footer);

  footer.querySelector(".panel-voice-btn").addEventListener("click", () => {
    playPanelVoice(panel, panelDiv);
  });

  footer.querySelector(".panel-reroll-btn").addEventListener("click", () => {
    rerollPanel(panel.panelNumber || index + 1, panelDiv);
  });

  return panelDiv;
}

// Generative SVG Art
function generatePanelSvgGraphic(panel, index, accent) {
  const seeds = [
    `<svg class="scene-art-svg" viewBox="0 0 400 300" opacity="0.25"><circle cx="200" cy="150" r="120" fill="none" stroke="${accent}" stroke-width="8" stroke-dasharray="15 10"/><path d="M0,0 L400,300 M400,0 L0,300" stroke="${accent}" stroke-width="2"/></svg>`,
    `<svg class="scene-art-svg" viewBox="0 0 400 300" opacity="0.3"><polygon points="200,20 160,140 230,140 180,280 250,110 190,110" fill="${accent}"/></svg>`,
    `<svg class="scene-art-svg" viewBox="0 0 400 300" opacity="0.35"><polygon points="200,40 230,110 300,80 260,150 330,190 250,210 240,280 180,220 110,250" fill="${accent}"/></svg>`,
    `<svg class="scene-art-svg" viewBox="0 0 400 300" opacity="0.3"><circle cx="200" cy="150" r="90" fill="none" stroke="${accent}" stroke-width="6"/></svg>`
  ];
  return seeds[index % seeds.length];
}

// 4. Multi-Voice Duet Playback
async function playPanelVoice(panel, panelElement) {
  const isDuet = document.getElementById("duetToggle").checked;
  const narratorVoice = document.getElementById("voiceSelect").value || "Ruth";
  const char1Voice = panel.character1?.voiceGender === "male" ? "Matthew" : "Ruth";
  const char2Voice = panel.character2?.voiceGender === "female" ? "Joanna" : "Stephen";

  document.querySelectorAll(".comic-panel").forEach(p => p.classList.remove("active-voice"));
  panelElement.classList.add("active-voice");
  setEqualizerState(true);

  if (isDuet) {
    const parts = [];
    if (panel.caption) parts.push({ text: panel.caption, voiceId: narratorVoice, speaker: "Narrator" });
    if (panel.character1?.dialogue) parts.push({ text: panel.character1.dialogue, voiceId: char1Voice, speaker: panel.character1.name });
    if (panel.character2?.dialogue) parts.push({ text: panel.character2.dialogue, voiceId: char2Voice, speaker: panel.character2.name });

    try {
      const res = await fetch("/api/synthesize-duet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts })
      });
      const data = await res.json();
      if (data.success && data.clips) {
        for (const clip of data.clips) {
          await new Promise((resolve) => {
            currentAudio = new Audio(clip.audioBase64);
            currentAudio.play();
            currentAudio.onended = () => resolve();
            currentAudio.onerror = () => resolve();
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      panelElement.classList.remove("active-voice");
      setEqualizerState(false);
    }
  } else {
    let spokenScript = `${panel.caption || ''}. `;
    if (panel.character1?.dialogue) spokenScript += `${panel.character1.dialogue}. `;
    if (panel.character2?.dialogue) spokenScript += `${panel.character2.dialogue}. `;

    try {
      const res = await fetch("/api/synthesize-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spokenScript, voiceId: narratorVoice })
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(data.audioBase64);
        currentAudio.play();
        currentAudio.onended = () => {
          panelElement.classList.remove("active-voice");
          setEqualizerState(false);
        };
      }
    } catch (err) {
      panelElement.classList.remove("active-voice");
      setEqualizerState(false);
    }
  }
}

// 5. Audio Controls
function initAudioControls() {
  const playStoryBtn = document.getElementById("playFullStoryBtn");
  const playStoryText = document.getElementById("playStoryBtnText");

  playStoryBtn.addEventListener("click", async () => {
    if (!currentComic?.panels) return;
    if (isPlayingStory) {
      if (currentAudio) currentAudio.pause();
      isPlayingStory = false;
      playStoryText.textContent = "Play Voiced Story";
      setEqualizerState(false);
      document.querySelectorAll(".comic-panel").forEach(p => p.classList.remove("active-voice"));
      return;
    }

    isPlayingStory = true;
    playStoryText.textContent = "⏹️ Stop Audio";
    setEqualizerState(true);

    for (let i = 0; i < currentComic.panels.length; i++) {
      if (!isPlayingStory) break;
      const panel = currentComic.panels[i];
      const panelEl = document.getElementById(`comic-panel-${panel.panelNumber || i + 1}`);
      if (panelEl) await playPanelVoice(panel, panelEl);
    }

    isPlayingStory = false;
    playStoryText.textContent = "Play Voiced Story";
    setEqualizerState(false);
  });
}

function setEqualizerState(active) {
  const eq = document.getElementById("audioVisualizer");
  if (eq) {
    if (active) eq.classList.remove("hidden");
    else eq.classList.add("hidden");
  }
}

// 6. Panel Reroll
async function rerollPanel(panelNumber, panelElement) {
  if (!currentComic) return;
  playSfx("woosh");
  const rerollBtn = panelElement.querySelector(".panel-reroll-btn");
  rerollBtn.innerHTML = `<div class="spinner" style="width:12px;height:12px"></div>`;
  rerollBtn.disabled = true;

  try {
    const res = await fetch("/api/reroll-panel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comic: currentComic, panelNumber })
    });
    const data = await res.json();
    if (data.success && data.panel) {
      const idx = currentComic.panels.findIndex(p => p.panelNumber === panelNumber);
      if (idx !== -1) currentComic.panels[idx] = data.panel;
      const newPanelEl = createPanelElement(data.panel, idx !== -1 ? idx : panelNumber - 1);
      panelElement.replaceWith(newPanelEl);
      playSfx("sparkle");
      if (window.lucide) window.lucide.createIcons();
    }
  } catch (err) {
    console.error(err);
  } finally {
    rerollBtn.disabled = false;
  }
}

// 7. Action Stickers
function initStickers() {
  const stickers = document.querySelectorAll(".sticker-item");
  stickers.forEach(sticker => {
    sticker.addEventListener("click", () => {
      playSfx(sticker.dataset.sfx || "pow");
      const activePanels = document.querySelectorAll(".comic-panel");
      if (activePanels.length === 0) {
        alert("Generate a comic first, then stamp stickers!");
        return;
      }
      const targetPanel = activePanels[activePanels.length - 1].querySelector(".panel-visual-area");
      if (targetPanel) {
        const newSticker = document.createElement("div");
        newSticker.className = "sound-badge";
        newSticker.textContent = sticker.dataset.text;
        newSticker.style.top = `${Math.floor(Math.random() * 40) + 10}%`;
        newSticker.style.left = `${Math.floor(Math.random() * 50) + 10}%`;
        newSticker.style.transform = `rotate(${Math.floor(Math.random() * 30) - 15}deg)`;
        newSticker.style.cursor = "pointer";
        newSticker.title = "Click to remove sticker";
        newSticker.addEventListener("click", () => {
          playSfx("woosh");
          newSticker.remove();
        });
        targetPanel.appendChild(newSticker);
      }
    });
  });
}

// 8. Cinema Mode
function initCinemaMode() {
  const cinemaBtn = document.getElementById("cinemaModeBtn");
  const cinemaModal = document.getElementById("cinemaModal");
  const closeCinemaBtn = document.getElementById("closeCinemaBtn");
  const prevBtn = document.getElementById("cinemaPrevBtn");
  const nextBtn = document.getElementById("cinemaNextBtn");

  cinemaBtn.addEventListener("click", () => {
    if (!currentComic?.panels) return;
    playSfx("woosh");
    cinemaCurrentIndex = 0;
    renderCinemaPanel();
    cinemaModal.classList.remove("hidden");
  });

  closeCinemaBtn.addEventListener("click", () => {
    cinemaModal.classList.add("hidden");
    if (currentAudio) currentAudio.pause();
  });

  prevBtn.addEventListener("click", () => {
    if (cinemaCurrentIndex > 0) {
      playSfx("woosh");
      cinemaCurrentIndex--;
      renderCinemaPanel();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (cinemaCurrentIndex < currentComic.panels.length - 1) {
      playSfx("woosh");
      cinemaCurrentIndex++;
      renderCinemaPanel();
    }
  });
}

function renderCinemaPanel() {
  if (!currentComic) return;
  const panel = currentComic.panels[cinemaCurrentIndex];
  document.getElementById("cinemaTitle").textContent = `${currentComic.title} (${cinemaCurrentIndex + 1}/4)`;
  const stage = document.getElementById("cinemaStage");
  stage.innerHTML = "";
  const panelEl = createPanelElement(panel, cinemaCurrentIndex);
  panelEl.style.width = "100%";
  panelEl.style.height = "100%";
  stage.appendChild(panelEl);

  const dots = document.querySelectorAll("#cinemaIndicators .dot");
  dots.forEach((dot, idx) => {
    if (idx === cinemaCurrentIndex) dot.classList.add("active");
    else dot.classList.remove("active");
  });

  playPanelVoice(panel, panelEl);
}

// 9. Exporter
function initExport() {
  const exportBtn = document.getElementById("exportPngBtn");
  exportBtn.addEventListener("click", () => {
    const comicArea = document.getElementById("comicStripExportArea");
    if (!comicArea) return;
    playSfx("sparkle");

    html2canvas(comicArea, { backgroundColor: "#090a10", scale: 2, useCORS: true }).then(canvas => {
      const link = document.createElement("a");
      const titleSlug = (currentComic?.title || "comic").toLowerCase().replace(/[^a-z0-9]/g, "-");
      link.download = `comiccraft-${titleSlug}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }).catch(err => console.error(err));
  });
}
