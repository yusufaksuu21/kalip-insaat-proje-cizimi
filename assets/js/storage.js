'use strict';

const Storage = (() => {
  const KEY = 'kalip_plani_proje';
  const THEME_KEY = 'kalip_plani_theme';

  function saveDraft() {
    try {
      localStorage.setItem(KEY, JSON.stringify(Export.readInputsFromDOM()));
    } catch (_) { /* quota exceeded */ }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function applyDraft(data, callbacks) {
    if (!data) return false;
    document.getElementById('projectName').value = data.projectName || '';
    document.getElementById('concreteClass').value = data.concreteClass || '30';
    document.getElementById('steelClass').value = data.steelClass || '420';
    document.getElementById('floors').value = data.floors || 5;
    document.getElementById('floorHeight').value = data.floorHeight || 3;
    document.getElementById('slabType').value = data.slabType || 'solid';
    document.getElementById('deadLoad').value = data.deadLoad || 1.5;
    document.getElementById('liveLoad').value = data.liveLoad || 2;
    document.getElementById('slabThickness').value = data.slabThickness || 0.14;
    document.getElementById('eqZone').value = data.eqZone || 3;
    document.getElementById('soilClass').value = data.soilClass || 'ZC';
    document.getElementById('buildingClass').value = data.buildingClass || 2;
    document.getElementById('structSystem').value = data.structSystem || 'mixed';
    if (document.getElementById('bearingCapacity')) {
      document.getElementById('bearingCapacity').value = data.bearingCapacity || 200;
    }
    callbacks.updateSlabHint();

    const columnBody = document.getElementById('columnBody');
    columnBody.innerHTML = '';
    (data.columns || []).forEach(c => callbacks.addColumnRow(c));
    if (!columnBody.children.length) callbacks.addColumnRow();

    const wallBody = document.getElementById('wallBody');
    wallBody.innerHTML = '';
    (data.walls || []).forEach(w => callbacks.addWallRow(w));
    return true;
  }

  function loadFromFile(file, callbacks) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          applyDraft(data.inputs || data, callbacks);
          resolve(data);
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    return next;
  }

  return { saveDraft, loadDraft, applyDraft, loadFromFile, saveTheme, loadTheme, toggleTheme };
})();
