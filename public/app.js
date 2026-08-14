// ==========================================================================
// ComicCraft AI Studio & Live AI Roaster – Frontend Engine
// ==========================================================================

let currentComic = null;
let currentRoast = null;
let currentAudio = null;
let isPlayingStory = false;
let cinemaCurrentIndex = 0;
let currentMode = "comic"; // "comic" | "roast"

// Web Audio Synthesizer
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

// Zero-Dependency Comedy & Comic Sound Synthesizer
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
    } else if (type === "kaboom" || type === "vine-boom") {
      // Deep heavy bass drop boom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === "sad-trombone") {
      // Classic Wah-Wah-Wah-Waaaaah
      const notes = [293.66, 277.18, 261.63, 246.94]; // D4, C#4, C4, B3
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + i * 0.3);
        if (i === 3) {
          // Slide down on last note
          osc.frequency.linearRampToValueAtTime(200, now + i * 0.3 + 0.6);
        }
        gain.gain.setValueAtTime(0.2, now + i * 0.3);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.3 + (i === 3 ? 0.6 : 0.25));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.3);
        osc.stop(now + i * 0.3 + (i === 3 ? 0.6 : 0.25));
      });
    } else if (type === "airhorn") {
      // Reggae Airhorn sound
      [587.33, 587.33, 587.33, 587.33].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, now + i * 0.12);
        gain.gain.setValueAtTime(0.25, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.12 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.1);
      });
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
    } else if (type === "boing" || type === "laugh-track") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(500, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
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
    console.warn("SFX Error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();

  initTabs();
  initComicSparks();
  initRoastSparks();
  initComicForm();
  initRoastForm();
  initSoundboard();
  initStickers();
  initAudioControls();
  initCinemaMode();
  initExport();
  initModal();
});

// 1. Mode Switcher Tabs
function initTabs() {
  const tabComic = document.getElementById("tabComicMode");
  const tabRoast = document.getElementById("tabRoastMode");
  const viewComic = document.getElementById("comicStudioView");
  const viewRoast = document.getElementById("roastArenaView");

  tabComic.addEventListener("click", () => {
    playSfx("woosh");
    currentMode = "comic";
    tabComic.classList.add("active");
    tabRoast.classList.remove("active");
    viewComic.classList.remove("hidden");
    viewRoast.classList.add("hidden");
  });

  tabRoast.addEventListener("click", () => {
    playSfx("vine-boom");
    currentMode = "roast";
    tabRoast.classList.add("active");
    tabComic.classList.remove("active");
    viewRoast.classList.remove("hidden");
    viewComic.classList.add("hidden");
  });
}

// 2. Sparks
function initComicSparks() {
  const sparks = document.querySelectorAll("#sparksContainer .spark-btn");
  const promptInput = document.getElementById("promptInput");
  sparks.forEach(btn => {
    btn.addEventListener("click", () => {
      playSfx("woosh");
      promptInput.value = btn.dataset.prompt;
      promptInput.focus();
    });
  });
}

function initRoastSparks() {
  const sparks = document.querySelectorAll("#roastSparksContainer .spark-btn");
  const roastInput = document.getElementById("roastInput");
  sparks.forEach(btn => {
    btn.addEventListener("click", () => {
      playSfx("woosh");
      roastInput.value = btn.dataset.roast;
      roastInput.focus();
    });
  });
}

// 3. Comic Form
function initComicForm() {
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
        renderComicGrid(data.comic, "comicGrid");
        playSfx("sparkle");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating comic");
    } finally {
      generateBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
    }
  });
}

// 4. Live Roast Form
function initRoastForm() {
  const form = document.getElementById("roastForm");
  const roastBtn = document.getElementById("roastBtn");
  const btnText = roastBtn.querySelector(".btn-text");
  const btnLoader = roastBtn.querySelector(".btn-loader");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const description = document.getElementById("roastInput").value.trim();
    if (!description) return;

    playSfx("vine-boom");
    roastBtn.disabled = true;
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");

    try {
      const response = await fetch("/api/roast-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description })
      });

      const data = await response.json();
      if (data.success && data.roast) {
        currentRoast = data.roast;
        renderRoastResults(data.roast);
      }
    } catch (err) {
      console.error(err);
      alert("Error generating roast");
    } finally {
      roastBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
    }
  });
}

// Render Roast Results
function renderRoastResults(roast) {
  document.getElementById("burnBadge").textContent = roast.burnLevel || "🔥 EMOTIONAL DAMAGE 💀";
  document.getElementById("roastHeadline").textContent = roast.roastTitle || "The Catastrophe";
  document.getElementById("roastOneLiner").textContent = `"${roast.punchlineOneLiner || ''}"`;
  document.getElementById("roastMonologue").textContent = roast.savageRoast || "";

  document.getElementById("playRoastVoiceBtn").disabled = false;
  document.getElementById("exportRoastCardBtn").disabled = false;

  // Trigger recommended comedy sound stinger
  if (roast.recommendedSfx === "sad-trombone") playSfx("sad-trombone");
  else if (roast.recommendedSfx === "airhorn") playSfx("airhorn");
  else playSfx("vine-boom");

  // Render accompanying 4-panel roast comic strip
  if (roast.comic && roast.comic.panels) {
    currentComic = roast.comic;
    renderComicGrid(roast.comic, "roastComicGrid");
  }
}

// Render Comic Grid into Target Container
function renderComicGrid(comic, targetContainerId) {
  if (targetContainerId === "comicGrid") {
    document.getElementById("comicTitleDisplay").textContent = comic.title || "The Story";
    document.getElementById("comicGenreDisplay").textContent = comic.genre || "Comic Strip";
    document.getElementById("comicLoglineDisplay").textContent = `"${comic.logline || ''}"`;
    document.getElementById("playFullStoryBtn").disabled = false;
    document.getElementById("cinemaModeBtn").disabled = false;
    document.getElementById("exportPngBtn").disabled = false;
  }

  const grid = document.getElementById(targetContainerId);
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

  const graphicContainer = document.createElement("div");
  graphicContainer.className = "visual-graphic";
  graphicContainer.innerHTML = generatePanelSvgGraphic(panel, index, accentColor);
  visualArea.appendChild(graphicContainer);

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

// 5. Soundboard
function initSoundboard() {
  const sfxButtons = document.querySelectorAll(".sfx-btn");
  sfxButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      playSfx(btn.dataset.sfx);
    });
  });
}

// 6. Voice Synthesis
async function playPanelVoice(panel, panelElement) {
  const narratorVoice = document.getElementById("voiceSelect")?.value || "Ruth";
  const char1Voice = panel.character1?.voiceGender === "male" ? "Matthew" : "Ruth";
  const char2Voice = panel.character2?.voiceGender === "female" ? "Joanna" : "Stephen";

  document.querySelectorAll(".comic-panel").forEach(p => p.classList.remove("active-voice"));
  panelElement.classList.add("active-voice");
  setEqualizerState(true);

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
}

// Audio Controls & Roast Voice
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

  // Play Spoken Roast
  const playRoastBtn = document.getElementById("playRoastVoiceBtn");
  playRoastBtn.addEventListener("click", async () => {
    if (!currentRoast?.savageRoast) return;
    const voiceId = document.getElementById("roastVoiceSelect")?.value || "Matthew";

    playSfx("airhorn");
    setEqualizerState(true);
    playRoastBtn.disabled = true;

    try {
      const res = await fetch("/api/synthesize-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${currentRoast.punchlineOneLiner}. ${currentRoast.savageRoast}`,
          voiceId
        })
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        if (currentAudio) currentAudio.pause();
        currentAudio = new Audio(data.audioBase64);
        currentAudio.play();
        currentAudio.onended = () => {
          setEqualizerState(false);
          playRoastBtn.disabled = false;
        };
      }
    } catch (err) {
      setEqualizerState(false);
      playRoastBtn.disabled = false;
    }
  });
}

function setEqualizerState(active) {
  const eq = document.getElementById("audioVisualizer");
  if (eq) {
    if (active) eq.classList.remove("hidden");
    else eq.classList.add("hidden");
  }
}

// 7. Panel Reroll
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

// 8. Action Stickers
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
        newSticker.addEventListener("click", () => {
          playSfx("woosh");
          newSticker.remove();
        });
        targetPanel.appendChild(newSticker);
      }
    });
  });
}

// 9. Cinema Mode
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

// 10. Exporter
function initExport() {
  const exportBtn = document.getElementById("exportPngBtn");
  const exportRoastBtn = document.getElementById("exportRoastCardBtn");

  exportBtn.addEventListener("click", () => {
    exportElementToPng("comicStripExportArea", `comic-${Date.now()}`);
  });

  exportRoastBtn.addEventListener("click", () => {
    exportElementToPng("roastBannerArea", `roast-${Date.now()}`);
  });
}

function exportElementToPng(elementId, filename) {
  const area = document.getElementById(elementId);
  if (!area) return;
  playSfx("sparkle");

  html2canvas(area, { backgroundColor: "#090a10", scale: 2, useCORS: true }).then(canvas => {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }).catch(err => console.error(err));
}

// 11. Modal
function initModal() {
  const modal = document.getElementById("aboutModal");
  const openBtn = document.getElementById("openAboutBtn");
  const closeBtn = document.getElementById("closeAboutBtn");

  if (openBtn) openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    playSfx("woosh");
    modal.classList.remove("hidden");
  });

  if (closeBtn) closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
}
