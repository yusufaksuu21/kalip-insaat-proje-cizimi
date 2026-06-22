'use strict';

const Calc = (() => {
  const { TOL, MAX_SPAN, TRIB } = CONFIG;

  function ceil5(v) { return Math.ceil(v / 5) * 5; }

  function detectBeams(columns) {
    const beams = [], seen = new Set();
    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const a = columns[i], b = columns[j];
        const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
        let axis = null, span = 0;
        if (dy < TOL && dx > TOL) { axis = 'x'; span = dx; }
        else if (dx < TOL && dy > TOL) { axis = 'y'; span = dy; }
        if (axis && span <= MAX_SPAN) {
          const key = [Math.min(a.id, b.id), Math.max(a.id, b.id)].join('-');
          if (!seen.has(key)) {
            seen.add(key);
            beams.push({ col1: a.id, col2: b.id, col1Label: a.label, col2Label: b.label, axis, span, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
          }
        }
      }
    }
    beams.forEach((b, i) => { b.label = 'K' + (i + 1); b.id = i + 1; });
    return beams;
  }

  function neighborDist(col, columns, dir) {
    let best = null;
    for (const c of columns) {
      if (c.id === col.id) continue;
      let d = 0;
      if (dir === 'L' && Math.abs(c.y - col.y) < TOL && c.x < col.x - TOL) d = col.x - c.x;
      if (dir === 'R' && Math.abs(c.y - col.y) < TOL && c.x > col.x + TOL) d = c.x - col.x;
      if (dir === 'D' && Math.abs(c.x - col.x) < TOL && c.y < col.y - TOL) d = col.y - c.y;
      if (dir === 'U' && Math.abs(c.x - col.x) < TOL && c.y > col.y + TOL) d = c.y - col.y;
      if (d > 0 && d <= MAX_SPAN && (!best || d < best)) best = d;
    }
    return best;
  }

  function tributaryArea(col, columns) {
    const tx = ((neighborDist(col, columns, 'L') ?? TRIB) + (neighborDist(col, columns, 'R') ?? TRIB)) / 2;
    const ty = ((neighborDist(col, columns, 'D') ?? TRIB) + (neighborDist(col, columns, 'U') ?? TRIB)) / 2;
    return tx * ty;
  }

  function buildingFootprint(columns) {
    const xs = columns.map(c => c.x), ys = columns.map(c => c.y);
    return (Math.max(...xs) - Math.min(...xs) + TRIB) * (Math.max(...ys) - Math.min(...ys) + TRIB);
  }

  function calcSeismic(project, columns, walls) {
    const SDS = SDS_ZONE[project.eqZone] * SOIL_FA[project.soilClass];
    const Ie = Ie_MAP[project.buildingClass];
    const R = R_MAP[project.structSystem];
    const T1 = 0.08 * project.floors * project.floorHeight;
    const Sa = Math.min(SDS * 1.2, SDS * (1 + 1.5 * T1));
    const footprint = buildingFootprint(columns);
    const Ws = (project.slabWeight + project.deadLoad + 0.3 * project.liveLoad) * footprint * project.floors;
    const Vbase = (Sa * Ie / R) * Ws;
    const Htot = project.floors * project.floorHeight;
    const totalWallLen = walls.reduce((s, w) => s + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0) || 1;
    const riskLevel = SDS >= 0.85 ? 'yüksek' : SDS >= 0.6 ? 'orta' : 'düşük';
    return { SDS: SDS.toFixed(3), Ie, R, T1: T1.toFixed(3), Sa: Sa.toFixed(3), Ws: Ws.toFixed(0), Vbase: Vbase.toFixed(0), Htot, footprint, totalWallLen, riskLevel };
  }

  function calculate(project, columns, walls) {
    const wu = 1.4 * (project.slabWeight + project.deadLoad) + 1.6 * project.liveLoad;
    const beams = detectBeams(columns);
    const seismic = calcSeismic(project, columns, walls);
    const Vbase = +seismic.Vbase;
    const totalArea = columns.reduce((s, c) => s + tributaryArea(c, columns), 0);
    const colHeight = project.floors * project.floorHeight;

    const columnResults = columns.map(col => {
      const area = tributaryArea(col, columns);
      const Ng = wu * area * project.floors;
      const share = area / totalArea;
      const Ne = Vbase * share * (seismic.Htot / (seismic.footprint || 10)) * 0.5;
      const Ntotal = Ng + Ne;
      const Ac = (Ntotal * 1000) / (0.45 * project.fck * 1000);
      const minSide = Math.max(25, ceil5(Math.sqrt(Ac) * 100));
      const sb = Math.max(col.b, minSide), sh = Math.max(col.h, minSide);
      const As = Math.max(0.01 * sb * sh, (Ntotal * 1000) / (0.8 * project.fyk));
      const minDim = Math.min(sb, sh);
      const slenderness = (colHeight * 100) / minDim;
      const status = (sb > col.b || sh > col.h) ? 'Büyütüldü' : 'Uygun';
      return { ...col, area, Ng, Ne, Ntotal, N: Ng, sb, sh, As: Math.round(As), status, slenderness: slenderness.toFixed(1) };
    });

    const beamResults = beams.map(beam => {
      const w = wu * TRIB;
      const Mmax = w * beam.span ** 2 / 8;
      const d = (beam.span / 12) * 100;
      const As = (Mmax * 1e6) / (0.8 * d * 10 * project.fyk);
      const depthRules = BEAM_DEPTH_RULES.map(r => ({
        label: r.label,
        depth: ceil5((beam.span / r.ratio) * 100)
      }));
      return { ...beam, connection: beam.col1Label + ' – ' + beam.col2Label, w, Mmax, d, bw: 25, h: ceil5(d / 5 + 2), As: Math.round(As), depthRules };
    });

    const wallResults = walls.map(w => {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const Vw = Vbase * (len / seismic.totalWallLen);
      const tw = Math.max(w.t, ceil5(Math.sqrt(Vw * 1000 / (0.35 * project.fck * len * 1000)) * 100), 20);
      const Asmin = Math.round(0.0025 * tw * 100 * len);
      const hwRatio = (project.floors * project.floorHeight) / len;
      const status = tw > w.t ? 'Kalınlık artırıldı' : 'Uygun';
      return { ...w, len, tw, Vw: Math.round(Vw), Asmin, status, hwRatio: hwRatio.toFixed(2) };
    });

    const loadCombos = calcLoadCombinations(project, wu, seismic);
    const materials = calcMaterialQuantities(project, columns, beamResults, wallResults, columnResults);
    const checks = runEngineeringChecks(project, columns, beamResults, columnResults, wallResults, materials);
    const designSummary = buildDesignSummary(project, columns, beamResults, columnResults, wallResults, seismic, materials);

    return { wu, beams, columnResults, beamResults, wallResults, seismic, loadCombos, checks, materials, designSummary };
  }

  function calcLoadCombinations(project, wu, seismic) {
    const G = project.slabWeight + project.deadLoad;
    const Q = project.liveLoad;
    const E = (+seismic.Vbase) / (seismic.footprint || 1);
    return [
      { name: 'Temel (G+Q)', formula: '1.4G + 1.6Q', value: wu.toFixed(2), unit: 'kN/m²' },
      { name: 'Sadece Ölü Yük', formula: 'G', value: G.toFixed(2), unit: 'kN/m²' },
      { name: 'Canlı Yük', formula: 'Q', value: Q.toFixed(2), unit: 'kN/m²' },
      { name: 'Deprem Taban Kesme', formula: 'V = Sa·Ie/R·W', value: seismic.Vbase, unit: 'kN' },
      { name: 'Deprem Birim Yük', formula: 'V/A', value: E.toFixed(2), unit: 'kN/m²' }
    ];
  }

  function runEngineeringChecks(project, columns, beamResults, columnResults, wallResults, materials = {}) {
    const checks = [];
    const longSpans = beamResults.filter(b => b.span > 6.5);
    checks.push({
      id: 'span',
      title: 'Kiriş Açıklık Kontrolü',
      status: longSpans.length === 0 ? 'pass' : longSpans.some(b => b.span > MAX_SPAN) ? 'fail' : 'warn',
      message: longSpans.length === 0
        ? 'Tüm açıklıklar 6,5 m altında — uygun.'
        : longSpans.map(b => b.label + ': ' + b.span.toFixed(2) + ' m').join(', ') + ' — detaylı analiz önerilir.'
    });

    const slender = columnResults.filter(c => +c.slenderness > 30);
    checks.push({
      id: 'slenderness',
      title: 'Kolon Burkulma (λ = L/i)',
      status: slender.length === 0 ? 'pass' : slender.some(c => +c.slenderness > 50) ? 'fail' : 'warn',
      message: slender.length === 0
        ? 'Tüm kolonlar λ ≤ 30 — burkulma riski düşük.'
        : slender.map(c => c.label + ': λ=' + c.slenderness).join(', ')
    });

    const minRebar = columnResults.filter(c => c.As < 0.008 * c.sb * c.sh);
    checks.push({
      id: 'rebar',
      title: 'Minimum Donatı Oranı (ρ ≥ %0,8)',
      status: minRebar.length === 0 ? 'pass' : 'warn',
      message: minRebar.length === 0
        ? 'Minimum donatı oranı sağlanıyor.'
        : minRebar.map(c => c.label).join(', ') + ' — donatı kontrol edilmeli.'
    });

    const thinWalls = wallResults.filter(w => +w.hwRatio > 3);
    checks.push({
      id: 'wall',
      title: 'Perde H/L Oranı',
      status: wallResults.length === 0 ? 'pass' : thinWalls.length === 0 ? 'pass' : 'warn',
      message: wallResults.length === 0
        ? 'Perde tanımlanmadı.'
        : thinWalls.length === 0
          ? 'Perde H/L oranları uygun (≤ 3,0).'
          : thinWalls.map(w => w.label + ': H/L=' + w.hwRatio).join(', ') + ' — perde etkisi zayıf.'
    });

    checks.push({
      id: 'seismic',
      title: 'Deprem Tehlike Düzeyi',
      status: project.eqZone >= 4 ? 'warn' : 'pass',
        message: project.eqZone + '. bölge, SDS=' + (SDS_ZONE[project.eqZone] * SOIL_FA[project.soilClass]).toFixed(3) + ' — ' + (project.eqZone >= 4 ? 'yüksek deprem bölgesi, detaylı analiz şart.' : 'kabul edilebilir parametreler.')
    });

    if (materials.foundationUtilization) {
      checks.push({
        id: 'foundation',
        title: 'Ön Temel Alanı Kontrolü',
        status: +materials.foundationUtilization <= 0.85 ? 'pass' : +materials.foundationUtilization <= 1 ? 'warn' : 'fail',
        message: 'Gerekli alan / plan alanı = %' + (+materials.foundationUtilization * 100).toFixed(0) + '. ' +
          (+materials.foundationUtilization <= 1 ? 'Taban alanı ön tahmin için yeterli görünüyor.' : 'Radye/tekil temel boyutları artırılmalı veya zemin verisi kontrol edilmeli.')
      });
    }

    return checks;
  }

  function buildDesignSummary(project, columns, beamResults, columnResults, wallResults, seismic, materials) {
    const resizedCols = columnResults.filter(c => c.status !== 'Uygun');
    const resizedWalls = wallResults.filter(w => w.status !== 'Uygun');
    const maxSpan = beamResults.length ? Math.max(...beamResults.map(b => b.span)) : 0;
    const maxColumnLoad = columnResults.length ? Math.max(...columnResults.map(c => c.Ntotal)) : 0;
    const foundationUtilization = +materials.foundationUtilization || 0;

    return [
      {
        label: 'Taşıyıcı düzen',
        value: columns.length + ' kolon / ' + beamResults.length + ' kiriş',
        note: maxSpan ? 'En büyük açıklık ' + maxSpan.toFixed(2) + ' m' : 'Kiriş bağlantısı algılanmadı',
        status: maxSpan > MAX_SPAN ? 'fail' : maxSpan > 6.5 ? 'warn' : 'pass'
      },
      {
        label: 'Kesit ihtiyacı',
        value: resizedCols.length ? resizedCols.length + ' kolon büyütüldü' : 'Kolonlar uygun',
        note: 'Maks. kolon yükü ' + maxColumnLoad.toFixed(0) + ' kN',
        status: resizedCols.length ? 'warn' : 'pass'
      },
      {
        label: 'Perde davranışı',
        value: wallResults.length ? wallResults.length + ' perde' : 'Perde yok',
        note: resizedWalls.length ? resizedWalls.length + ' perdede kalınlık artışı önerildi' : 'Ön kesitlerde kritik artış yok',
        status: wallResults.length ? (resizedWalls.length ? 'warn' : 'pass') : 'warn'
      },
      {
        label: 'Temel ön kontrolü',
        value: '%' + (foundationUtilization * 100).toFixed(0),
        note: 'Gerekli alan ' + materials.requiredFoundationArea + ' m² / plan alanı ' + materials.footprint + ' m²',
        status: foundationUtilization <= 0.85 ? 'pass' : foundationUtilization <= 1 ? 'warn' : 'fail'
      },
      {
        label: 'Deprem etkisi',
        value: 'SDS ' + seismic.SDS,
        note: 'Taban kesme ' + seismic.Vbase + ' kN, risk ' + seismic.riskLevel,
        status: +seismic.SDS >= 0.85 ? 'warn' : 'pass'
      }
    ];
  }

  function calcMaterialQuantities(project, columns, beamResults, wallResults, columnResults) {
    const crMap = {};
    columnResults.forEach(c => { crMap[c.id] = c; });

    let colConc = 0;
    columns.forEach(c => {
      const cr = crMap[c.id];
      colConc += (cr.sb / 100) * (cr.sh / 100) * project.floors * project.floorHeight;
    });

    let beamConc = 0, beamRebar = 0;
    beamResults.forEach(b => {
      beamConc += (b.bw / 100) * (b.h / 100) * b.span * project.floors;
      beamRebar += b.As * b.span * project.floors * 7.85 / 1e6;
    });

    let wallConc = 0;
    wallResults.forEach(w => {
      wallConc += (w.tw / 100) * w.len * project.floors * project.floorHeight;
    });

    const footprint = buildingFootprint(columns);
    const slabConc = footprint * project.slabThick * project.floors;
    const totalConc = colConc + beamConc + wallConc + slabConc;

    let colRebar = 0;
    columnResults.forEach(c => {
      colRebar += c.As * project.floors * project.floorHeight * 4 * 7.85 / 1e6;
    });

    let wallRebar = 0;
    wallResults.forEach(w => {
      wallRebar += w.Asmin * w.len * project.floors * 7.85 / 1e6;
    });

    const totalRebar = colRebar + beamRebar + wallRebar;
    const totalN = columnResults.reduce((s, c) => s + c.Ntotal, 0);
    const requiredFoundationArea = totalN / project.bearingCapacity;
    const foundationUtilization = requiredFoundationArea / footprint;

    return {
      colConc: colConc.toFixed(1),
      beamConc: beamConc.toFixed(1),
      wallConc: wallConc.toFixed(1),
      slabConc: slabConc.toFixed(1),
      totalConc: totalConc.toFixed(1),
      colRebar: colRebar.toFixed(0),
      beamRebar: beamRebar.toFixed(0),
      wallRebar: wallRebar.toFixed(0),
      totalRebar: totalRebar.toFixed(0),
      footprint: footprint.toFixed(1),
      requiredFoundationArea: requiredFoundationArea.toFixed(2),
      foundationUtilization: foundationUtilization.toFixed(2)
    };
  }

  function validate(p, cols, walls) {
    if (!p.name) return 'Proje adı boş bırakılamaz.';
    if (p.floors < 1 || p.floors > 20) return 'Kat sayısı 1–20 arasında olmalıdır.';
    if (p.floorHeight < 2.5 || p.floorHeight > 6) return 'Kat yüksekliği 2,5–6,0 m olmalıdır.';
    if (!p.bearingCapacity || p.bearingCapacity < 50 || p.bearingCapacity > 1000) return 'Zemin taşıma gücü 50–1000 kN/m² arasında olmalıdır.';
    if (cols.length < 1) return 'En az bir kolon tanımlanmalıdır.';
    const pos = new Set();
    for (const c of cols) {
      if ([c.x, c.y, c.b, c.h].some(isNaN)) return c.label + ': Geçersiz değer.';
      if (c.b < 25 || c.h < 25) return c.label + ': Min 25 cm.';
      const k = c.x.toFixed(2) + ',' + c.y.toFixed(2);
      if (pos.has(k)) return 'Aynı koordinatta çift kolon: ' + c.label;
      pos.add(k);
    }
    for (const w of walls) {
      if ([w.x1, w.y1, w.x2, w.y2, w.t].some(isNaN)) return w.label + ': Geçersiz perde değeri.';
      if (w.t < 20) return w.label + ': Perde kalınlığı min 20 cm.';
      if (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) < 0.5) return w.label + ': Perde uzunluğu çok kısa.';
    }
    return null;
  }

  return { calculate, validate, tributaryArea, detectBeams, ceil5, calcLoadCombinations, calcMaterialQuantities };
})();
