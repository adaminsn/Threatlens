/**
 * ThreatLens — Centralized Theme Toggle
 * Muat ini di <head> SEBELUM konten halaman dirender
 * agar tidak ada flash of unstyled content (FOUC).
 *
 * Fitur:
 *  - Simpan preferensi di localStorage
 *  - Deteksi otomatis preferensi sistem (prefers-color-scheme)
 *  - Inject floating toggle button ke semua halaman
 *  - Sinkronisasi icon/label toggle button
 *  - Dispatch event 'themechange' untuk komponen lain
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'threatlens-theme';
  var DARK  = 'dark';
  var LIGHT = 'light';

  /* ──────────────────────────────────────────────────
     1. HELPERS
  ────────────────────────────────────────────────── */
  function systemPrefers() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function getSaved() {
    var v = localStorage.getItem(STORAGE_KEY);
    return (v === DARK || v === LIGHT) ? v : null;
  }

  function getCurrent() {
    return getSaved() || DARK; /* default = dark */
  }

  /* ──────────────────────────────────────────────────
     2. APPLY THEME (muat cepat — sebelum DOM siap)
  ────────────────────────────────────────────────── */
  function applyTheme(theme) {
    var html = document.documentElement;
    if (theme === LIGHT) {
      html.classList.add('light');
      html.classList.remove('dark');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
    /* Update Chart.js warna jika ada (dipanggil ulang saat DOMContentLoaded) */
    _currentTheme = theme;
  }

  /* Terapkan SEGERA agar tidak ada flash */
  var _currentTheme = getCurrent();
  applyTheme(_currentTheme);

  /* ──────────────────────────────────────────────────
     3. UPDATE UI BUTTONS
  ────────────────────────────────────────────────── */
  function updateToggleUI(theme) {
    var icon  = theme === LIGHT ? '☀️' : '🌙';
    var label = theme === LIGHT ? 'Light' : 'Dark';

    /* Semua elemen dengan data-theme-icon / data-theme-label */
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
      el.textContent = icon;
    });
    document.querySelectorAll('[data-theme-label]').forEach(function (el) {
      el.textContent = label;
    });

    /* Legacy: id="theme-icon" / id="theme-label" (login, register, forgot) */
    var legacyIcon  = document.getElementById('theme-icon');
    var legacyLabel = document.getElementById('theme-label');
    if (legacyIcon)  legacyIcon.textContent  = icon;
    if (legacyLabel) legacyLabel.textContent = label;

    /* Floating button */
    var floatBtn = document.getElementById('tl-theme-float');
    if (floatBtn) floatBtn.querySelector('[data-theme-icon]').textContent = icon;
  }

  /* ──────────────────────────────────────────────────
     4. TOGGLE THEME (public API)
  ────────────────────────────────────────────────── */
  function toggleTheme() {
    var next = getCurrent() === DARK ? LIGHT : DARK;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    updateToggleUI(next);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  }

  /* ──────────────────────────────────────────────────
     5. INJECT FLOATING BUTTON
     Disisipkan di <body> saat DOM siap.
     Halaman yang sudah punya toggle (.has-theme-toggle) akan
     menyembunyikannya via CSS.
  ────────────────────────────────────────────────── */
  function injectFloatingButton() {
    if (document.getElementById('tl-theme-float')) return; /* sudah ada */

    var btn = document.createElement('button');
    btn.id = 'tl-theme-float';
    btn.setAttribute('aria-label', 'Toggle dark/light mode');
    btn.setAttribute('title', 'Toggle theme');
    btn.innerHTML = '<span data-theme-icon>' + (getCurrent() === LIGHT ? '☀️' : '🌙') + '</span>';
    btn.addEventListener('click', toggleTheme);
    document.body.appendChild(btn);
  }

  /* ──────────────────────────────────────────────────
     6. DOM READY
  ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    updateToggleUI(getCurrent());
    injectFloatingButton();
  });

  /* ──────────────────────────────────────────────────
     7. SYSTEM PREFERENCE WATCHER
  ────────────────────────────────────────────────── */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    /* Hanya ikut sistem jika user belum pilih manual */
    if (!getSaved()) {
      var next = e.matches ? DARK : LIGHT;
      applyTheme(next);
      updateToggleUI(next);
    }
  });

  /* ──────────────────────────────────────────────────
     8. PUBLIC API
  ────────────────────────────────────────────────── */
  window.toggleTheme    = toggleTheme;      /* backward compat */
  window.ThreatLensTheme = {
    toggle:     toggleTheme,
    getCurrent: getCurrent,
    apply:      applyTheme
  };

})();
