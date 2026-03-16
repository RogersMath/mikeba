// app.js — Deftere Golle PWA
// Architecture: fetch lang/xx.json on demand, cache in LANG_CACHE.
// To add a new language: (1) create lang/xx.json, (2) add a button in index.html. Done.

'use strict';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Keys whose values are arrays in the JSON. The array items become
// data-k values of the form  prefix + index  (e.g. ch1_needs → ch1_n0, ch1_n1…)
const ARRAY_KEYS = [
  { json: 'ch1_needs',   prefix: 'ch1_n',    html: false },
  { json: 'ch1_remember',prefix: 'ch1_r',    html: false },
  { json: 'ch2_needs',   prefix: 'ch2_n',    html: false },
  { json: 'ch2_remember',prefix: 'ch2_r',    html: false },
  { json: 'ch3_remember',prefix: 'ch3_r',    html: false },
  { json: 'ch4_signs',   prefix: 'ch4_sign', html: false },
  { json: 'ch4_needs',   prefix: 'ch4_n',    html: false },
  { json: 'ch4_remember',prefix: 'ch4_r',    html: false },
  { json: 'hc1_list',    prefix: 'hc1_l',    html: false },
  { json: 'hc2_prevent', prefix: 'hc2_p',    html: false },
  { json: 'hc2_signs',   prefix: 'hc2_s',    html: false },
  { json: 'hc3_list',    prefix: 'hc3_l',    html: false },
  { json: 'hc4_list',    prefix: 'hc4_l',    html: false },
  { json: 'hc4_go',      prefix: 'hc4_g',    html: false },
  { json: 'hc5_colors',  prefix: 'hc5_c',    html: true  },
];

// ─── DOM CACHE ────────────────────────────────────────────────────────────────
// Built once on load. Maps every data-k value → array of DOM elements.
const ELEMS = {};
document.querySelectorAll('[data-k]').forEach(el => {
  const k = el.dataset.k;
  if (!ELEMS[k]) ELEMS[k] = [];
  ELEMS[k].push(el);
});

// ─── LANGUAGE CACHE ───────────────────────────────────────────────────────────
// Loaded JSON packs live here. Flat maps are built once per language then reused.
const LANG_CACHE = {};   // { 'en': { flat: {...}, raw: {...} } }
let currentLang = 'en';

// Build the flat key→{text,html} map from a raw JSON object.
function buildFlat(raw) {
  const flat = {};

  // Scalar strings: every top-level string key maps directly.
  Object.entries(raw).forEach(([k, v]) => {
    if (typeof v === 'string') flat[k] = { text: v, html: false };
  });

  // Array keys: expand to indexed flat keys.
  ARRAY_KEYS.forEach(({ json, prefix, html }) => {
    const arr = raw[json];
    if (!Array.isArray(arr)) return;
    arr.forEach((v, i) => { flat[prefix + i] = { text: v, html }; });
  });

  return flat;
}

// Fetch a language pack (or return from cache).
async function loadLang(lang) {
  if (LANG_CACHE[lang]) return LANG_CACHE[lang];
  try {
    const res = await fetch(`lang/${lang}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    LANG_CACHE[lang] = { raw, flat: buildFlat(raw) };
    return LANG_CACHE[lang];
  } catch (e) {
    console.warn(`[dg] Could not load lang/${lang}.json`, e);
    return null;
  }
}

// Apply a loaded language pack to the DOM.
function applyPack(pack, lang) {
  if (!pack) return;
  currentLang = lang;
  document.documentElement.lang = pack.raw.lang_attr || lang;
  document.documentElement.dir  = pack.raw.dir || 'ltr';

  Object.entries(pack.flat).forEach(([k, { text, html }]) => {
    const els = ELEMS[k];
    if (!els) return;
    els.forEach(el => { html ? (el.innerHTML = text) : (el.textContent = text); });
  });

  try { localStorage.setItem('dg-lang', lang); } catch (_) {}
}

// Public entry point: load then apply.
async function switchLang(lang) {
  const pack = await loadLang(lang);
  applyPack(pack, lang);
}

// ─── LANGUAGE BUTTONS ─────────────────────────────────────────────────────────
const langBtns = document.querySelectorAll('.lang-btn[data-lang]');
langBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    langBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    await switchLang(btn.dataset.lang);
  });
});

// ─── CHAPTER TABS ─────────────────────────────────────────────────────────────
const tabs     = document.querySelectorAll('.tab-btn[data-ch]');
const chapters = document.querySelectorAll('.chapter');

function showChapter(chId) {
  chapters.forEach(ch => ch.classList.toggle('active', ch.id === 'ch-' + chId));
  tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.ch === chId ? 'true' : 'false'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => showChapter(tab.dataset.ch));
  tab.addEventListener('keydown', e => {
    const arr = Array.from(tabs);
    const i   = arr.indexOf(tab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = arr[(i + 1) % arr.length];
      next.focus(); next.click();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = arr[(i - 1 + arr.length) % arr.length];
      prev.focus(); prev.click();
    }
  });
});

// ─── LARGE TEXT TOGGLE ────────────────────────────────────────────────────────
const a11yBtn = document.getElementById('a11y-btn');
a11yBtn.addEventListener('click', () => {
  const on = document.body.classList.toggle('big');
  a11yBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  try { localStorage.setItem('dg-big', on ? '1' : '0'); } catch (_) {}
});

// ─── PWA — SERVICE WORKER ─────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ─── PWA — INSTALL PROMPT ─────────────────────────────────────────────────────
let deferredInstallPrompt = null;
const installBar  = document.getElementById('install-bar');
const installDo   = document.getElementById('install-do');
const installDismiss = document.getElementById('install-x');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  try { if (localStorage.getItem('dg-no-install') === '1') return; } catch (_) {}
  installBar.classList.add('show');
});

installDo.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  installBar.classList.remove('show');
  await deferredInstallPrompt.prompt();
  deferredInstallPrompt = null;
});

installDismiss.addEventListener('click', () => {
  installBar.classList.remove('show');
  try { localStorage.setItem('dg-no-install', '1'); } catch (_) {}
});

window.addEventListener('appinstalled', () => installBar.classList.remove('show'));

// ─── OFFLINE INDICATOR ────────────────────────────────────────────────────────
function syncOnline() { document.body.classList.toggle('offline', !navigator.onLine); }
window.addEventListener('online',  syncOnline);
window.addEventListener('offline', syncOnline);
syncOnline();

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async function init() {
  // Restore large-text pref immediately (no async needed).
  try {
    if (localStorage.getItem('dg-big') === '1') {
      document.body.classList.add('big');
      a11yBtn.setAttribute('aria-pressed', 'true');
    }
  } catch (_) {}

  // Detect starting language: saved pref → browser locale → 'en'.
  let lang = 'en';
  try {
    const saved = localStorage.getItem('dg-lang');
    if (saved) {
      lang = saved;
    } else {
      const nav = (navigator.language || '').toLowerCase();
      if (nav.startsWith('fr')) lang = 'fr';
      else if (nav.startsWith('wo')) lang = 'wo';
      else if (nav.startsWith('ff') || nav.startsWith('pu')) lang = 'pu';
    }
  } catch (_) {}

  // Sync button state before first paint.
  langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));

  // Load and apply. English is almost certainly first — load it now.
  // Other languages are fetched only if actually selected.
  await switchLang(lang);
})();
