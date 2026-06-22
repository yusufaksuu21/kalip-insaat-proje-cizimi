'use strict';

const PlanCanvas = (() => {
  let cv, ctx, viewState = { zoom: 1, panX: 0, panY: 0 };
  let transform = null, lastData = null, hovered = null;
  let isDragging = false, dragStart = { x: 0, y: 0 };

  function init() {
    cv = document.getElementById('planCanvas');
    if (!cv) return;
    ctx = cv.getContext('2d');
    cv.width = CONFIG.CANVAS_W;
    cv.height = CONFIG.CANVAS_H;

    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('mousedown', onMouseDown);
    cv.addEventListener('mousemove', onMouseMove);
    cv.addEventListener('mouseup', onMouseUp);
    cv.addEventListener('mouseleave', onMouseUp);

    document.getElementById('zoomInBtn')?.addEventListener('click', () => setZoom(viewState.zoom * 1.2));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => setZoom(viewState.zoom / 1.2));
    document.getElementById('zoomResetBtn')?.addEventListener('click', resetView);
    document.getElementById('zoomFitBtn')?.addEventListener('click', fitView);
    document.getElementById('gridToggleBtn')?.addEventListener('click', toggleGrid);
  }

  let showGrid = true;

  function toggleGrid() {
    showGrid = !showGrid;
    document.getElementById('gridToggleBtn')?.classList.toggle('active', showGrid);
    if (lastData) redraw();
  }

  function getTransform(columns, walls) {
    const pts = [];
    columns.forEach(c => { pts.push(c.x, c.y); });
    walls.forEach(w => { pts.push(w.x1, w.y1, w.x2, w.y2); });
    const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs) - 1, maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1, maxY = Math.max(...ys) + 1;
    const margin = { t: 55, r: 30, b: 70, l: 55 };
    const W = cv.width, H = cv.height;
    const dW = W - margin.l - margin.r, dH = H - margin.t - margin.b;
    const baseScale = Math.min(dW / (maxX - minX || 1), dH / (maxY - minY || 1));
    const scale = baseScale * viewState.zoom;
    const toC = (mx, my) => ({
      x: margin.l + (mx - minX) * scale + viewState.panX,
      y: margin.t + (maxY - my) * scale + viewState.panY
    });
    return { toC, margin, W, H, minX, maxX, minY, maxY, scale, baseScale };
  }

  function setZoom(z) {
    viewState.zoom = Math.max(0.3, Math.min(4, z));
    updateZoomLabel();
    if (lastData) redraw();
  }

  function resetView() {
    viewState = { zoom: 1, panX: 0, panY: 0 };
    updateZoomLabel();
    if (lastData) redraw();
  }

  function fitView() {
    if (!lastData) return;
    viewState.zoom = 1;
    viewState.panX = 0;
    viewState.panY = 0;
    updateZoomLabel();
    redraw();
  }

  function updateZoomLabel() {
    const el = document.getElementById('zoomLabel');
    if (el) el.textContent = Math.round(viewState.zoom * 100) + '%';
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(viewState.zoom * delta);
  }

  function onMouseDown(e) {
    isDragging = true;
    dragStart = { x: e.clientX - viewState.panX, y: e.clientY - viewState.panY };
    cv.classList.add('dragging');
  }

  function onMouseUp() {
    isDragging = false;
    cv?.classList.remove('dragging');
  }

  function onMouseMove(e) {
    if (isDragging) {
      viewState.panX = e.clientX - dragStart.x;
      viewState.panY = e.clientY - dragStart.y;
      redraw();
      return;
    }
    if (!lastData) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitTest(mx, my);
    if (hit?.id !== hovered?.id || hit?.type !== hovered?.type) {
      hovered = hit;
      redraw();
      updateInfoPanel(hit);
    }
  }

  function hitTest(mx, my) {
    const { project, columns, beams, walls, columnResults, wallResults } = lastData;
    transform = getTransform(columns, walls);
    const { toC, scale } = transform;

    for (const col of columns) {
      const cr = columnResults.find(c => c.id === col.id);
      const bM = cr.sb / 100, hM = cr.sh / 100;
      const p = toC(col.x, col.y);
      const pW = bM * scale, pH = hM * scale;
      const x = p.x - pW / 2, y = p.y - pH / 2;
      if (mx >= x && mx <= x + pW && my >= y && my <= y + pH) {
        return { type: 'column', data: cr };
      }
    }

    for (const b of beams) {
      const p1 = toC(b.x1, b.y1), p2 = toC(b.x2, b.y2);
      const dist = pointToSegmentDist(mx, my, p1.x, p1.y, p2.x, p2.y);
      if (dist < 8) return { type: 'beam', data: b };
    }

    for (const w of walls) {
      const wr = wallResults.find(wr => wr.id === w.id);
      const p1 = toC(w.x1, w.y1), p2 = toC(w.x2, w.y2);
      const dist = pointToSegmentDist(mx, my, p1.x, p1.y, p2.x, p2.y);
      if (dist < 12) return { type: 'wall', data: wr || w };
    }

    return null;
  }

  function pointToSegmentDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function updateInfoPanel(hit) {
    const panel = document.getElementById('infoPanelContent');
    if (!panel) return;
    if (!hit) {
      panel.innerHTML = '<div class="info-empty">Planda bir elemana tıklayın veya üzerine gelin</div>';
      return;
    }
    const d = hit.data;
    if (hit.type === 'column') {
      panel.innerHTML = `
        <div class="info-row"><span class="label">Eleman</span><span class="value">Kolon ${d.label}</span></div>
        <div class="info-row"><span class="label">Konum</span><span class="value">(${d.x}, ${d.y}) m</span></div>
        <div class="info-row"><span class="label">Kesit</span><span class="value">${d.sb}×${d.sh} cm</span></div>
        <div class="info-row"><span class="label">Etki Alanı</span><span class="value">${d.area.toFixed(1)} m²</span></div>
        <div class="info-row"><span class="label">G + E</span><span class="value">${d.Ntotal.toFixed(1)} kN</span></div>
        <div class="info-row"><span class="label">Donatı</span><span class="value">${d.As} mm²</span></div>
        <div class="info-row"><span class="label">Burkulma λ</span><span class="value">${d.slenderness}</span></div>
        <div class="info-row"><span class="label">Durum</span><span class="value ${d.status === 'Uygun' ? 'status-ok' : 'status-warn'}">${d.status}</span></div>`;
    } else if (hit.type === 'beam') {
      panel.innerHTML = `
        <div class="info-row"><span class="label">Eleman</span><span class="value">Kiriş ${d.label}</span></div>
        <div class="info-row"><span class="label">Bağlantı</span><span class="value">${d.connection}</span></div>
        <div class="info-row"><span class="label">Açıklık</span><span class="value">${d.span.toFixed(2)} m</span></div>
        <div class="info-row"><span class="label">Kesit</span><span class="value">${d.bw}×${d.h} cm</span></div>
        <div class="info-row"><span class="label">M<sub>max</sub></span><span class="value">${d.Mmax.toFixed(1)} kNm</span></div>
        <div class="info-row"><span class="label">Donatı</span><span class="value">${d.As} mm²</span></div>`;
    } else {
      panel.innerHTML = `
        <div class="info-row"><span class="label">Eleman</span><span class="value">Perde ${d.label}</span></div>
        <div class="info-row"><span class="label">Uzunluk</span><span class="value">${d.len.toFixed(2)} m</span></div>
        <div class="info-row"><span class="label">Kalınlık</span><span class="value">${d.tw} cm</span></div>
        <div class="info-row"><span class="label">Kesme</span><span class="value">${d.Vw} kN</span></div>
        <div class="info-row"><span class="label">H/L</span><span class="value">${d.hwRatio}</span></div>
        <div class="info-row"><span class="label">Durum</span><span class="value ${d.status === 'Uygun' ? 'status-ok' : 'status-warn'}">${d.status}</span></div>`;
    }
  }

  function draw(project, columns, beams, walls, columnResults, wallResults) {
    lastData = { project, columns, beams, walls, columnResults, wallResults };
    resetView();
    redraw();
  }

  function redraw() {
    if (!lastData || !ctx) return;
    const { project, columns, beams, walls, columnResults, wallResults } = lastData;
    transform = getTransform(columns, walls);
    const { toC, margin, W, H, minX, maxX, minY, maxY, scale } = transform;
    const crMap = {};
    columnResults.forEach(c => { crMap[c.id] = c; });

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, W, H);

    if (showGrid) {
      const step = (maxX - minX) > 15 ? 2 : 1;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      ctx.font = '10px Inter,sans-serif';
      ctx.fillStyle = '#94a3b8';
      for (let g = Math.ceil(minX); g <= Math.floor(maxX); g += step) {
        const p = toC(g, minY);
        ctx.beginPath(); ctx.moveTo(p.x, margin.t); ctx.lineTo(p.x, H - margin.b); ctx.stroke();
        ctx.fillText(g + 'm', p.x - 8, H - margin.b + 14);
      }
      for (let g = Math.ceil(minY); g <= Math.floor(maxY); g += step) {
        ctx.beginPath(); ctx.moveTo(margin.l, toC(minX, g).y); ctx.lineTo(W - margin.r, toC(maxX, g).y); ctx.stroke();
        ctx.fillText(g + 'm', 4, toC(minX, g).y + 4);
      }
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Inter,sans-serif';
    ctx.fillText(project.name + ' — Kalıp Planı', margin.l, 28);
    ctx.font = '11px Inter,sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(project.slabName + ' | TBDY Bölge ' + project.eqZone + ' | C' + project.fck, margin.l, 44);

    for (const w of walls) {
      const wr = wallResults.find(wr => wr.id === w.id);
      const tw = wr ? wr.tw : w.t;
      const p1 = toC(w.x1, w.y1), p2 = toC(w.x2, w.y2);
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x), perp = ang + Math.PI / 2;
      const hw = (tw / 100) * scale / 2;
      const isHovered = hovered?.type === 'wall' && hovered.data.id === w.id;
      ctx.fillStyle = isHovered ? 'rgba(22,163,74,.55)' : 'rgba(22,163,74,.35)';
      ctx.strokeStyle = isHovered ? '#15803d' : '#16a34a';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(p1.x + Math.cos(perp) * hw, p1.y + Math.sin(perp) * hw);
      ctx.lineTo(p2.x + Math.cos(perp) * hw, p2.y + Math.sin(perp) * hw);
      ctx.lineTo(p2.x - Math.cos(perp) * hw, p2.y - Math.sin(perp) * hw);
      ctx.lineTo(p1.x - Math.cos(perp) * hw, p1.y - Math.sin(perp) * hw);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 10px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(w.label, mx, my - 4);
    }

    ctx.strokeStyle = '#dc2626';
    ctx.lineCap = 'round';
    for (const b of beams) {
      const isHovered = hovered?.type === 'beam' && hovered.data.id === b.id;
      ctx.lineWidth = isHovered ? 6 : 4;
      const p1 = toC(b.x1, b.y1), p2 = toC(b.x2, b.y2);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      if (isHovered) {
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 10px Inter,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.span.toFixed(1) + 'm', midX, midY - 8);
      }
    }

    for (const col of columns) {
      const cr = crMap[col.id];
      const isHovered = hovered?.type === 'column' && hovered.data.id === col.id;
      const bM = cr.sb / 100, hM = cr.sh / 100;
      const center = toC(col.x, col.y);
      const pW = bM * scale, pH = hM * scale;
      const x = center.x - pW / 2, y = center.y - pH / 2;
      ctx.fillStyle = isHovered ? '#1d4ed8' : '#2563eb';
      ctx.fillRect(x, y, pW, pH);
      ctx.strokeStyle = isHovered ? '#1e3a8a' : '#1e40af';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.strokeRect(x, y, pW, pH);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, center.x, y - 6);
    }
    ctx.textAlign = 'left';

    const ly = H - 32;
    const items = [['#2563eb', 'Kolon'], ['#dc2626', 'Kiriş', 'line'], ['#16a34a', 'Perde']];
    let lx = margin.l;
    items.forEach(it => {
      if (it[2] === 'line') { ctx.strokeStyle = it[0]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly + 7); ctx.lineTo(lx + 24, ly + 7); ctx.stroke(); }
      else { ctx.fillStyle = it[0]; ctx.fillRect(lx, ly, 14, 14); }
      ctx.fillStyle = '#475569';
      ctx.font = '11px Inter,sans-serif';
      ctx.fillText(it[1], lx + 20, ly + 11);
      lx += 90;
    });

    const scaleBarM = Math.round(2 / scale * 10) / 10 || 1;
    const barPx = scaleBarM * scale;
    const sbY = H - margin.b + 30;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.l, sbY);
    ctx.lineTo(margin.l + barPx, sbY);
    ctx.moveTo(margin.l, sbY - 4); ctx.lineTo(margin.l, sbY + 4);
    ctx.moveTo(margin.l + barPx, sbY - 4); ctx.lineTo(margin.l + barPx, sbY + 4);
    ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(scaleBarM + ' m', margin.l + barPx / 2, sbY + 14);
    ctx.textAlign = 'left';

    const scaleEl = document.getElementById('scaleBarLabel');
    if (scaleEl) scaleEl.textContent = 'Ölçek: 1 birim = 1 m';
  }

  return { init, draw, resetView, fitView };
})();
