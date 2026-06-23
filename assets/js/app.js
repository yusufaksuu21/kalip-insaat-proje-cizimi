'use strict';

const App = (() => {
  let state = {
    calculated: false, project: {}, columns: [], walls: [], beams: [],
    columnResults: [], beamResults: [], wallResults: [], seismic: {},
    wu: 0, loadCombos: [], checks: [], materials: {}, designSummary: []
  };

  const columnBody = document.getElementById('columnBody');
  const wallBody = document.getElementById('wallBody');

  function addColumnRow(d = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td></td><td><input class="col-x" type="number" step=".1" value="${d.x ?? 0}"></td><td><input class="col-y" type="number" step=".1" value="${d.y ?? 0}"></td><td><input class="col-b" type="number" step="5" min="25" value="${d.b ?? 30}"></td><td><input class="col-h" type="number" step="5" min="25" value="${d.h ?? 30}"></td><td><button class="btn btn-danger del-col">✕</button></td>`;
    columnBody.appendChild(tr);
    renumber(columnBody, 'K');
    Storage.saveDraft();
  }

  function addWallRow(d = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td></td><td><input class="w-x1" type="number" step=".1" value="${d.x1 ?? 0}"></td><td><input class="w-y1" type="number" step=".1" value="${d.y1 ?? 0}"></td><td><input class="w-x2" type="number" step=".1" value="${d.x2 ?? 0}"></td><td><input class="w-y2" type="number" step=".1" value="${d.y2 ?? 5}"></td><td><input class="w-t" type="number" step="5" min="20" value="${d.t ?? 25}"></td><td><button class="btn btn-danger del-wall">✕</button></td>`;
    wallBody.appendChild(tr);
    renumber(wallBody, 'P');
    Storage.saveDraft();
  }

  function renumber(body, prefix) {
    [...body.children].forEach((tr, i) => { tr.cells[0].textContent = prefix + (i + 1); });
  }

  function updateSlabHint() {
    const k = document.getElementById('slabType').value;
    const s = SLAB_TYPES[k];
    document.getElementById('slabHint').textContent = s.hint;
    document.getElementById('slabThickness').value = s.thick.toFixed(2);
  }

  function showError(m) {
    const e = document.getElementById('validationError');
    e.textContent = m;
    e.classList.add('show');
  }

  function hideError() {
    document.getElementById('validationError').classList.remove('show');
  }

  function toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast' + (type !== 'info' ? ' ' + type : '');
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200);
  }

  function readInputs() {
    const slabKey = document.getElementById('slabType').value;
    const slab = SLAB_TYPES[slabKey];
    const thick = parseFloat(document.getElementById('slabThickness').value);
    const project = {
      name: document.getElementById('projectName').value.trim(),
      fck: +document.getElementById('concreteClass').value,
      fyk: +document.getElementById('steelClass').value,
      floors: +document.getElementById('floors').value,
      floorHeight: +document.getElementById('floorHeight').value,
      deadLoad: +document.getElementById('deadLoad').value,
      liveLoad: +document.getElementById('liveLoad').value,
      slabType: slabKey, slabName: slab.name, slabThick: thick,
      slabWeight: thick * 25 * slab.weightMult + slab.extraDead,
      eqZone: +document.getElementById('eqZone').value,
      soilClass: document.getElementById('soilClass').value,
      buildingClass: +document.getElementById('buildingClass').value,
      structSystem: document.getElementById('structSystem').value,
      bearingCapacity: +(document.getElementById('bearingCapacity')?.value || 200)
    };
    const columns = [...columnBody.children].map((tr, i) => ({
      id: i + 1, label: 'K' + (i + 1),
      x: +tr.querySelector('.col-x').value, y: +tr.querySelector('.col-y').value,
      b: +tr.querySelector('.col-b').value, h: +tr.querySelector('.col-h').value
    }));
    const walls = [...wallBody.children].map((tr, i) => ({
      id: i + 1, label: 'P' + (i + 1),
      x1: +tr.querySelector('.w-x1').value, y1: +tr.querySelector('.w-y1').value,
      x2: +tr.querySelector('.w-x2').value, y2: +tr.querySelector('.w-y2').value,
      t: +tr.querySelector('.w-t').value
    }));
    return { project, columns, walls };
  }

  function renderReport(project, res) {
    const { wu, seismic, beamResults, columnResults, wallResults, loadCombos, checks, materials, designSummary } = res;

    document.getElementById('metricsRow').innerHTML = `
      <div class="metric-card accent"><div class="label">Kolon</div><div class="value">${columnResults.length}</div></div>
      <div class="metric-card accent"><div class="label">Kiriş</div><div class="value">${beamResults.length}</div></div>
      <div class="metric-card accent"><div class="label">Perde</div><div class="value">${wallResults.length}</div></div>
      <div class="metric-card"><div class="label">wu (G+Q)</div><div class="value">${wu.toFixed(2)}<span class="unit"> kN/m²</span></div></div>
      <div class="metric-card warning"><div class="label">Taban Kesme V</div><div class="value">${seismic.Vbase}<span class="unit"> kN</span></div></div>
      <div class="metric-card"><div class="label">SDS</div><div class="value">${seismic.SDS}</div></div>
      <div class="metric-card"><div class="label">Plan Alanı</div><div class="value">${materials.footprint}<span class="unit"> m²</span></div></div>
      <div class="metric-card success"><div class="label">Beton (tahmini)</div><div class="value">${materials.totalConc}<span class="unit"> m³</span></div></div>
      <div class="metric-card success"><div class="label">Donatı (tahmini)</div><div class="value">${materials.totalRebar}<span class="unit"> kg</span></div></div>`;

    document.getElementById('designSummary').innerHTML = (designSummary || []).map(item => `
      <div class="summary-item ${item.status}">
        <div class="summary-head">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
        <p>${item.note}</p>
      </div>`).join('');

    document.querySelector('#seismicTable tbody').innerHTML = `
      <tr><td>Spektral ivme SDS</td><td><strong>${seismic.SDS}</strong></td></tr>
      <tr><td>Önem katsayısı Ie</td><td><strong>${seismic.Ie}</strong></td></tr>
      <tr><td>Taşıyıcı sistem R</td><td><strong>${seismic.R}</strong></td></tr>
      <tr><td>Temel periyot T₁ (sn)</td><td><strong>${seismic.T1}</strong></td></tr>
      <tr><td>Tasarım spektral ivme Sa(T₁)</td><td><strong>${seismic.Sa}</strong></td></tr>
      <tr><td>Toplam sismik ağırlık W</td><td><strong>${seismic.Ws} kN</strong></td></tr>
      <tr><td>Taban kesme kuvveti V</td><td><strong>${seismic.Vbase} kN</strong></td></tr>
      <tr><td>Tehlike düzeyi</td><td><strong class="${seismic.riskLevel === 'yüksek' ? 'status-warn' : 'status-ok'}">${seismic.riskLevel}</strong></td></tr>`;

    document.querySelector('#columnResultsTable tbody').innerHTML = columnResults.map(c => `
      <tr><td><strong>${c.label}</strong></td><td>${c.Ng.toFixed(1)}</td><td>${c.Ne.toFixed(1)}</td>
      <td>${c.Ntotal.toFixed(1)}</td><td>${c.sb}×${c.sh}</td><td>${c.slenderness}</td><td>${c.As} mm²</td>
      <td class="${c.status === 'Uygun' ? 'status-ok' : 'status-warn'}">${c.status}</td></tr>`).join('');

    document.querySelector('#beamResultsTable tbody').innerHTML = beamResults.length ? beamResults.map(b => `
      <tr><td><strong>${b.label}</strong></td><td>${b.connection}</td><td>${b.span.toFixed(2)} m</td>
      <td>${b.bw} cm</td><td>${b.h} cm</td><td>${b.As} mm²</td>
      <td class="${b.span > 6.5 ? 'status-warn' : 'status-ok'}">${b.span > 6.5 ? 'Uzun' : 'OK'}</td></tr>`).join('')
      : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Kiriş bağlantısı yok</td></tr>';

    document.getElementById('wallSection').style.display = wallResults.length ? 'block' : 'none';
    document.querySelector('#wallResultsTable tbody').innerHTML = wallResults.length ? wallResults.map(w => `
      <tr><td><strong>${w.label}</strong></td><td>${w.len.toFixed(2)} m</td><td>${w.tw} cm</td>
      <td>${w.Vw}</td><td>${w.hwRatio}</td><td>${w.Asmin} mm²/m</td>
      <td class="${w.status === 'Uygun' ? 'status-ok' : 'status-warn'}">${w.status}</td></tr>`).join('')
      : '';

    document.getElementById('checksGrid').innerHTML = checks.map(ch => `
      <div class="check-card ${ch.status}">
        <div class="check-icon">${ch.status === 'pass' ? '✓' : ch.status === 'warn' ? '!' : '✕'}</div>
        <div class="check-body"><h4>${ch.title}</h4><p>${ch.message}</p></div>
      </div>`).join('');

    document.getElementById('loadComboGrid').innerHTML = loadCombos.map(lc => `
      <div class="load-combo-item">
        <div class="combo-name">${lc.name}</div>
        <div class="combo-formula">${lc.formula}</div>
        <div class="combo-value">${lc.value} <span class="unit">${lc.unit}</span></div>
      </div>`).join('');

    renderTools(project, res);
    updateTopbar(project);
  }

  function renderTools(project, res) {
    const { materials, columnResults, beamResults } = res;
    const totalN = columnResults.reduce((s, c) => s + c.Ntotal, 0);
    const bearing = project.bearingCapacity;
    const reqArea = +(materials.requiredFoundationArea || (totalN / bearing).toFixed(2));
    const footprint = +materials.footprint;
    const utilization = +(materials.foundationUtilization || (reqArea / footprint).toFixed(2));
    const foundationStatus = utilization <= 0.85 ? 'Güvenli pay var' : utilization <= 1 ? 'Sınırda' : 'Yetersiz';
    const foundationClass = utilization <= 0.85 ? 'status-ok' : utilization <= 1 ? 'status-warn' : 'status-fail';

    document.getElementById('toolConcreteResult').innerHTML = `
      <div class="tool-result"><div class="result-value">${materials.totalConc} m³</div><div class="result-label">Toplam beton hacmi</div></div>
      <div style="margin-top:10px;font-size:.76rem;color:var(--text-muted)">
        Kolon: ${materials.colConc} | Kiriş: ${materials.beamConc} | Perde: ${materials.wallConc} | Döşeme: ${materials.slabConc} m³
      </div>`;

    document.getElementById('toolRebarResult').innerHTML = `
      <div class="tool-result"><div class="result-value">${materials.totalRebar} kg</div><div class="result-label">Toplam donatı ağırlığı (~)</div></div>
      <div style="margin-top:10px;font-size:.76rem;color:var(--text-muted)">
        Kolon: ${materials.colRebar} | Kiriş: ${materials.beamRebar} | Perde: ${materials.wallRebar} kg
      </div>`;

    document.getElementById('toolFoundationResult').innerHTML = `
      <div class="tool-result"><div class="result-value">${reqArea} m²</div><div class="result-label">Gerekli temel alanı (σ=${bearing} kN/m²)</div></div>
      <div style="margin-top:10px;font-size:.76rem;color:var(--text-muted)">
        Taban alanı: ${footprint.toFixed(1)} m² | Kullanım: %${(utilization * 100).toFixed(0)} | <span class="${foundationClass}">${foundationStatus}</span>
      </div>`;

    if (beamResults.length) {
      const maxSpan = Math.max(...beamResults.map(b => b.span));
      const rules = BEAM_DEPTH_RULES.map(r => {
        const d = Calc.ceil5((maxSpan / r.ratio) * 100);
        return `<div class="info-row"><span class="label">${r.label}</span><span class="value">h ≥ ${d} cm</span></div>`;
      }).join('');
      document.getElementById('toolBeamResult').innerHTML = `
        <div class="tool-result"><div class="result-value">${maxSpan.toFixed(2)} m</div><div class="result-label">En büyük açıklık</div></div>
        <div style="margin-top:12px">${rules}</div>`;
    } else {
      document.getElementById('toolBeamResult').innerHTML = '<div class="info-empty">Kiriş tanımlanmadı</div>';
    }
  }

  function updateTopbar(project) {
    document.getElementById('topbarTitle').textContent = project.name;
    document.getElementById('topbarSub').textContent = 'C' + project.fck + ' / S' + project.fyk + ' · ' + project.floors + ' kat · Bölge ' + project.eqZone;
  }

  function setCalculatedUI(on) {
    state.calculated = on;
    document.getElementById('planPlaceholder').style.display = on ? 'none' : 'flex';
    document.getElementById('planLayout').style.display = on ? 'grid' : 'none';
    document.getElementById('reportPlaceholder').style.display = on ? 'none' : 'flex';
    document.getElementById('reportContent').style.display = on ? 'block' : 'none';
    document.getElementById('toolsPlaceholder').style.display = on ? 'none' : 'flex';
    document.getElementById('toolsContent').style.display = on ? 'block' : 'none';
    ['exportDxfBtn', 'exportPdfBtn', 'exportDocxBtn', 'exportJsonBtn'].forEach(id => {
      document.getElementById(id).disabled = !on;
    });
  }

  async function calculate() {
    const { project, columns, walls } = readInputs();
    const err = Calc.validate(project, columns, walls);
    if (err) { showError(err); return; }
    hideError();

    document.getElementById('loadingOverlay').classList.add('show');
    await new Promise(r => setTimeout(r, 350));

    const res = Calc.calculate(project, columns, walls);
    Object.assign(state, { project, columns, walls, beams: res.beams, columnResults: res.columnResults, beamResults: res.beamResults, wallResults: res.wallResults, seismic: res.seismic, wu: res.wu, loadCombos: res.loadCombos, checks: res.checks, materials: res.materials, designSummary: res.designSummary, calculated: true });

    PlanCanvas.draw(project, columns, res.beams, walls, res.columnResults, res.wallResults);
    renderReport(project, res);
    setCalculatedUI(true);
    Storage.saveDraft();

    document.getElementById('loadingOverlay').classList.remove('show');
    toast('Hesaplama tamamlandı', 'success');

    switchTab('plan');
  }

  function switchTab(name) {
    document.querySelectorAll('.tab,.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelector('.tab[data-tab="' + name + '"]')?.classList.add('active');
    document.getElementById('tab-' + name)?.classList.add('active');
  }

  function loadExample() {
    columnBody.innerHTML = '';
    wallBody.innerHTML = '';
    [0, 5, 10].forEach(x => [0, 5, 10].forEach(y => addColumnRow({ x, y, b: 30, h: 30 })));
    addWallRow({ x1: 0, y1: 0, x2: 0, y2: 10, t: 25 });
    addWallRow({ x1: 10, y1: 0, x2: 10, y2: 10, t: 25 });
    addWallRow({ x1: 0, y1: 0, x2: 10, y2: 0, t: 20 });
    hideError();
    toast('Örnek proje yüklendi');
  }

  function initCollapsibles() {
    document.querySelectorAll('.collapsible-header').forEach(h => {
      h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
    });
    document.querySelectorAll('.collapsible').forEach(c => c.classList.add('open'));
  }

  function init() {
    Storage.loadTheme();
    PlanCanvas.init();
    initCollapsibles();

    const callbacks = { addColumnRow, addWallRow, updateSlabHint };
    const draft = Storage.loadDraft();
    if (draft) {
      Storage.applyDraft(draft, callbacks);
    } else {
      addColumnRow();
      updateSlabHint();
    }

    columnBody.addEventListener('click', e => {
      if (e.target.classList.contains('del-col')) {
        if (columnBody.children.length < 2) { showError('En az bir kolon bulunmalıdır.'); return; }
        e.target.closest('tr').remove();
        renumber(columnBody, 'K');
        Storage.saveDraft();
      }
    });

    wallBody.addEventListener('click', e => {
      if (e.target.classList.contains('del-wall')) {
        e.target.closest('tr').remove();
        renumber(wallBody, 'P');
        Storage.saveDraft();
      }
    });

    document.getElementById('addColumnBtn').onclick = () => addColumnRow();
    document.getElementById('addWallBtn').onclick = () => addWallRow();
    document.getElementById('loadExampleBtn').onclick = loadExample;
    document.getElementById('slabType').onchange = () => { updateSlabHint(); Storage.saveDraft(); };
    document.getElementById('calculateBtn').onclick = calculate;

    document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));

    document.getElementById('saveProjectBtn').onclick = () => { Export.exportJSON(state); toast('Proje kaydedildi', 'success'); };
    document.getElementById('loadProjectBtn').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await Storage.loadFromFile(file, callbacks);
        toast('Proje yüklendi', 'success');
      } catch (_) { toast('Dosya okunamadı', 'error'); }
      e.target.value = '';
    };

    document.getElementById('themeToggleBtn').onclick = () => {
      const theme = Storage.toggleTheme();
      toast(theme === 'dark' ? 'Karanlık mod' : 'Aydınlık mod');
    };

    document.getElementById('printBtn').onclick = () => {
      if (!state.calculated) { toast('Önce hesaplama yapın', 'error'); return; }
      switchTab('report');
      setTimeout(() => window.print(), 300);
    };

    document.getElementById('exportDxfBtn').onclick = () => {
      if (!state.calculated) { toast('Önce hesaplama yapın', 'error'); return; }
      try { Export.exportDXF(state); toast('DXF indirildi', 'success'); }
      catch(e) { console.error('DXF hatası:', e); toast('DXF oluşturulurken hata: ' + e.message, 'error'); }
    };
    document.getElementById('exportPdfBtn').onclick = () => {
      if (!state.calculated) { toast('Önce hesaplama yapın', 'error'); return; }
      if (!window.jspdf) { toast('jsPDF kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edin.', 'error'); return; }
      try { Export.exportPDF(state); toast('PDF indirildi', 'success'); }
      catch(e) { console.error('PDF hatası:', e); toast('PDF oluşturulurken hata: ' + e.message, 'error'); }
    };
    document.getElementById('exportDocxBtn').onclick = async () => {
      if (!state.calculated) { toast('Önce hesaplama yapın', 'error'); return; }
      if (!window.JSZip) { toast('JSZip kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edin.', 'error'); return; }
      try { await Export.exportDOCX(state); toast('DOCX indirildi', 'success'); }
      catch(e) { console.error('DOCX hatası:', e); toast('DOCX oluşturulurken hata: ' + e.message, 'error'); }
    };
    document.getElementById('exportJsonBtn').onclick = () => Export.exportJSON(state);

    document.getElementById('bearingCapacity').addEventListener('input', () => {
      if (state.calculated) renderTools(state.project, state);
      Storage.saveDraft();
    });

    document.querySelector('.sidebar-body').addEventListener('input', () => Storage.saveDraft());
    document.querySelector('.sidebar-body').addEventListener('change', () => Storage.saveDraft());

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); calculate(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); Export.exportJSON(state); toast('Proje kaydedildi', 'success'); }
    });

    updateTopbar({ name: document.getElementById('projectName').value, fck: 30, fyk: 420, floors: 5, eqZone: 3 });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);