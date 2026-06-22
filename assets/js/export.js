'use strict';

const Export = (() => {
  function downloadBlob(c, f, m) {
    const b = new Blob([c], { type: m });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = f;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function generateDXF(columns, beams, walls, columnResults, wallResults) {
    const crMap = {};
    columnResults.forEach(c => { crMap[c.id] = c; });
    const wrMap = {};
    wallResults.forEach(w => { wrMap[w.id] = w; });
    const L = [], a = s => L.push(s);
    
    // HEADER SECTION
    a('0'); a('SECTION'); a('2'); a('HEADER');
    // Gerekli sistem değişkenleri
    [
      ['$ACADVER', '1', 'AC1027'],  // AutoCAD 2013
      ['$EXTMIN', '10', '0', '20', '0', '30', '0'],
      ['$EXTMAX', '10', '10000', '20', '10000', '30', '0'],
      ['$LIMMIN', '10', '0', '20', '0'],
      ['$LIMMAX', '10', '420', '20', '297'],
      ['$UNITS', '70', '4'],  // Metric
      ['$MEASUREMENT', '70', '1'],  // Metric
      ['$LUNITS', '70', '2'],  // Decimal
      ['$LUPREC', '70', '4'],  // 4 decimal places
      ['$DIMUNIT', '70', '1'],  // Metric
      ['$DIMSCALE', '40', '1'],
      ['$DIMASZ', '40', '2.5']
    ].forEach(vars => {
      a('9'); a(vars[0]);
      for(let i = 1; i < vars.length; i += 2) {
        a(vars[i]); a(vars[i + 1]);
      }
    });
    a('0'); a('ENDSEC');
    
    // TABLES SECTION
    a('0'); a('SECTION'); a('2'); a('TABLES');
    
    // Layer Table
    a('0'); a('TABLE'); a('2'); a('LAYER'); a('70'); a('5');
    const layers = [
      { name: '0', color: 7, linetype: 'CONTINUOUS' },
      { name: 'KOLONLAR', color: 5, linetype: 'CONTINUOUS' },
      { name: 'KIRISLER', color: 1, linetype: 'CONTINUOUS' },
      { name: 'PERDELER', color: 3, linetype: 'CONTINUOUS' },
      { name: 'KOLON_NO', color: 7, linetype: 'CONTINUOUS' },
      { name: 'PERDE_NO', color: 3, linetype: 'CONTINUOUS' }
    ];
    layers.forEach(l => {
      a('0'); a('LAYER'); a('2'); a(l.name); a('70'); a('0'); a('62'); a(String(l.color)); a('6'); a(l.linetype);
    });
    a('0'); a('ENDTAB');
    
    // Style Table
    a('0'); a('TABLE'); a('2'); a('STYLE'); a('70'); a('1');
    a('0'); a('STYLE'); a('2'); a('STANDARD'); a('70'); a('0'); a('40'); a('0'); a('41'); a('1'); a('50'); a('0'); a('71'); a('0');
    a('0'); a('ENDTAB');
    
    // View Table
    a('0'); a('TABLE'); a('2'); a('VIEW'); a('70'); a('0');
    a('0'); a('ENDTAB');
    
    // UCS Table
    a('0'); a('TABLE'); a('2'); a('UCS'); a('70'); a('0');
    a('0'); a('ENDTAB');
    
    a('0'); a('ENDSEC');
    
    // BLOCKS SECTION
    a('0'); a('SECTION'); a('2'); a('BLOCKS');
    
    // Model Space Block
    a('0'); a('BLOCK'); a('8'); a('0'); a('2'); a('*MODEL_SPACE'); a('70'); a('0');
    a('10'); a('0'); a('20'); a('0'); a('30'); a('0');
    a('3'); a('*MODEL_SPACE');
    a('1'); a('');
    a('0'); a('ENDBLK'); a('8'); a('0');
    
    // Paper Space Block
    a('0'); a('BLOCK'); a('8'); a('0'); a('2'); a('*PAPER_SPACE0'); a('70'); a('0');
    a('10'); a('0'); a('20'); a('0'); a('30'); a('0');
    a('3'); a('*PAPER_SPACE0');
    a('1'); a('');
    a('0'); a('ENDBLK'); a('8'); a('0');
    
    a('0'); a('ENDSEC');
    
    // ENTITIES SECTION
    a('0'); a('SECTION'); a('2'); a('ENTITIES');

    for (const col of columns) {
      const cr = crMap[col.id], cx = col.x * 100, cy = col.y * 100, hw = cr.sb / 2, hh = cr.sh / 2;
      const pts = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]];
      
      // LWPOLYLINE for column rectangle
      a('0'); a('LWPOLYLINE');
      a('5'); a(Math.random().toString(36).substr(2, 8)); // Handle
      a('100'); a('AcDbEntity');
      a('8'); a('KOLONLAR'); // Layer
      a('100'); a('AcDbLwpolyline');
      a('90'); a('4'); // Number of vertices
      a('70'); a('1'); // Closed polyline
      pts.forEach(([px, py]) => { 
        a('10'); a(px.toFixed(2)); 
        a('20'); a(py.toFixed(2)); 
      });
      
      // TEXT for column label
      a('0'); a('TEXT');
      a('5'); a(Math.random().toString(36).substr(2, 8)); // Handle
      a('100'); a('AcDbEntity');
      a('8'); a('KOLON_NO'); // Layer
      a('100'); a('AcDbText');
      a('10'); a(cx.toFixed(2)); // X
      a('20'); a((cy + hh + 30).toFixed(2)); // Y
      a('30'); a('0'); // Z
      a('40'); a('25'); // Height
      a('1'); a(col.label); // Text
      a('50'); a('0'); // Rotation
    }

    for (const b of beams) {
      a('0'); a('LINE');
      a('5'); a(Math.random().toString(36).substr(2, 8)); // Handle
      a('100'); a('AcDbEntity');
      a('8'); a('KIRISLER'); // Layer
      a('100'); a('AcDbLine');
      a('10'); a((b.x1 * 100).toFixed(2)); // X1
      a('20'); a((b.y1 * 100).toFixed(2)); // Y1
      a('30'); a('0'); // Z1
      a('11'); a((b.x2 * 100).toFixed(2)); // X2
      a('21'); a((b.y2 * 100).toFixed(2)); // Y2
      a('31'); a('0'); // Z2
    }

    for (const w of walls) {
      const wr = wrMap[w.id], len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const nx = -(w.y2 - w.y1) / len * (wr.tw / 2), ny = (w.x2 - w.x1) / len * (wr.tw / 2);
      const x1 = w.x1 * 100, y1 = w.y1 * 100, x2 = w.x2 * 100, y2 = w.y2 * 100;
      const pts = [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
      
      // LWPOLYLINE for wall rectangle
      a('0'); a('LWPOLYLINE');
      a('5'); a(Math.random().toString(36).substr(2, 8)); // Handle
      a('100'); a('AcDbEntity');
      a('8'); a('PERDELER'); // Layer
      a('100'); a('AcDbLwpolyline');
      a('90'); a('4'); // Number of vertices
      a('70'); a('1'); // Closed polyline
      pts.forEach(([px, py]) => { 
        a('10'); a(px.toFixed(2)); 
        a('20'); a(py.toFixed(2)); 
      });
      
      // TEXT for wall label
      a('0'); a('TEXT');
      a('5'); a(Math.random().toString(36).substr(2, 8)); // Handle
      a('100'); a('AcDbEntity');
      a('8'); a('PERDE_NO'); // Layer
      a('100'); a('AcDbText');
      a('10'); a(((x1 + x2) / 2).toFixed(2)); // X
      a('20'); a(((y1 + y2) / 2 + wr.tw / 2 + 20).toFixed(2)); // Y
      a('30'); a('0'); // Z
      a('40'); a('20'); // Height
      a('1'); a(w.label); // Text
      a('50'); a('0'); // Rotation
    }

    a('0'); a('ENDSEC');
    
    // OBJECTS SECTION
    a('0'); a('SECTION'); a('2'); a('OBJECTS');
    a('0'); a('DICTIONARY'); a('5'); a('C'); a('330'); a('0');
    a('3'); a('ACAD_GROUP'); a('350'); a('D');
    a('0'); a('DICTIONARY'); a('5'); a('D'); a('330'); a('C');
    a('0'); a('ENDSEC');
    
    // EOF
    a('0'); a('EOF');
    
    return L.join('\n');
  }

  function projectParamsRows(p, wu) {
    return [
      ['Proje', p.name], ['Döşeme', p.slabName], ['Beton', 'C' + p.fck], ['Çelik', 'S' + p.fyk],
      ['Kat', p.floors], ['Kat yük. (m)', p.floorHeight], ['Ölü yük', p.deadLoad + ' kN/m²'],
      ['Canlı yük', p.liveLoad + ' kN/m²'], ['Kalınlık', p.slabThick + ' m'], ['wu', wu.toFixed(2) + ' kN/m²'],
      ['Deprem bölgesi', p.eqZone], ['Zemin', p.soilClass], ['BKS', p.buildingClass],
      ['Sistem', STRUCT_SYSTEM_LABELS[p.structSystem] || p.structSystem]
    ];
  }

  function exportDXF(state) {
    downloadBlob(
      generateDXF(state.columns, state.beams, state.walls, state.columnResults, state.wallResults),
      'kalip_plani.dxf', 'application/dxf'
    );
  }

  function exportPDF(state) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(), p = state.project, d = new Date().toLocaleDateString('tr-TR');
    doc.setFontSize(15); doc.text(p.name, 14, 18);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text('Ön Boyutlandırma Raporu — ' + d, 14, 25);
    doc.autoTable({ startY: 30, head: [['Parametre', 'Değer']], body: projectParamsRows(p, state.wu), theme: 'grid', headStyles: { fillColor: [26, 35, 50] }, styles: { fontSize: 8 } });
    let y = doc.lastAutoTable.finalY + 8;
    if (state.designSummary?.length) {
      doc.setFontSize(10); doc.setTextColor(0); doc.text('Tasarım Karar Özeti', 14, y);
      doc.autoTable({
        startY: y + 3,
        head: [['Başlık', 'Sonuç', 'Not']],
        body: state.designSummary.map(s => [s.label, s.value, s.note]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 }
      });
      y = doc.lastAutoTable.finalY + 8;
    }
    doc.setFontSize(10); doc.setTextColor(0); doc.text('TBDY 2018 Deprem Özeti', 14, y);
    doc.autoTable({ startY: y + 3, body: [['SDS', state.seismic.SDS], ['Ie', state.seismic.Ie], ['R', state.seismic.R], ['T1 (sn)', state.seismic.T1], ['Sa(T1)', state.seismic.Sa], ['W (kN)', state.seismic.Ws], ['V (kN)', state.seismic.Vbase]], theme: 'striped', styles: { fontSize: 8 } });
    y = doc.lastAutoTable.finalY + 8; doc.text('Kolon Sonuçları', 14, y);
    doc.autoTable({ startY: y + 3, head: [['Kolon', 'G', 'E', 'Toplam', 'b×h', 'λ', 'Donatı', 'Durum']],
      body: state.columnResults.map(c => [c.label, c.Ng.toFixed(1), c.Ne.toFixed(1), c.Ntotal.toFixed(1), c.sb + '×' + c.sh, c.slenderness, c.As, c.status]),
      theme: 'striped', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 } });
    if (state.beamResults.length) {
      y = doc.lastAutoTable.finalY + 8; doc.text('Kiriş Sonuçları', 14, y);
      doc.autoTable({ startY: y + 3, head: [['Kiriş', 'Bağlantı', 'L', 'bw', 'h', 'Donatı']],
        body: state.beamResults.map(b => [b.label, b.connection, b.span.toFixed(2), b.bw, b.h, b.As]),
        theme: 'striped', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 8 } });
    }
    if (state.wallResults.length) {
      y = doc.lastAutoTable.finalY + 8; doc.text('Perde Sonuçları', 14, y);
      doc.autoTable({ startY: y + 3, head: [['Perde', 'L', 't', 'V', 'H/L', 'Donatı/m', 'Durum']],
        body: state.wallResults.map(w => [w.label, w.len.toFixed(2), w.tw, w.Vw, w.hwRatio, w.Asmin, w.status]),
        theme: 'striped', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 8 } });
    }
    if (state.materials) {
      y = doc.lastAutoTable.finalY + 8; doc.text('Malzeme Miktarları (Tahmini)', 14, y);
      doc.autoTable({ startY: y + 3, body: [['Beton', state.materials.totalConc + ' m³'], ['Donatı', state.materials.totalRebar + ' kg']], theme: 'striped', styles: { fontSize: 8 } });
    }
    doc.setFontSize(7); doc.setTextColor(146, 64, 14);
    doc.text('Bu hesaplar ön boyutlandırma amaçlıdır. TS 500 ve TBDY 2018 kapsamında yetkili mühendis tarafından doğrulanmalıdır.', 14, doc.internal.pageSize.getHeight() - 8, { maxWidth: 180 });
    doc.save('hesap_raporu.pdf');
  }

  function escXml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function docxP(t, o = {}) {
    return `<w:p><w:pPr>${o.b ? '' : '<w:spacing w:after="120"/>'}${o.c ? '<w:jc w:val="center"/>' : ''}</w:pPr><w:r><w:rPr>${o.b ? '<w:b/>' : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}</w:rPr><w:t>${escXml(t)}</w:t></w:r></w:p>`;
  }
  function docxTbl(h, rows) {
    let x = '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr><w:tr>';
    h.forEach(c => x += `<w:tc><w:tcPr><w:shd w:fill="1A2332"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>${escXml(c)}</w:t></w:r></w:p></w:tc>`);
    x += '</w:tr>';
    rows.forEach(r => { x += '<w:tr>'; r.forEach(c => x += `<w:tc><w:p><w:r><w:t>${escXml(c)}</w:t></w:r></w:p></w:tc>`); x += '</w:tr>'; });
    return x + '</w:tbl>';
  }

  async function exportDOCX(state) {
    const p = state.project, d = new Date().toLocaleDateString('tr-TR');
    let body = docxP(p.name, { b: 1, sz: 32, c: 1 }) + docxP('Ön Boyutlandırma Raporu — ' + d, { c: 1 }) + docxP('');
    body += docxP('Proje Parametreleri', { b: 1, sz: 24 }) + docxTbl(['Parametre', 'Değer'], projectParamsRows(p, state.wu)) + docxP('');
    if (state.designSummary?.length) body += docxP('Tasarım Karar Özeti', { b: 1, sz: 24 }) + docxTbl(['Başlık', 'Sonuç', 'Not'], state.designSummary.map(s => [s.label, s.value, s.note])) + docxP('');
    body += docxP('TBDY 2018 Deprem Özeti', { b: 1, sz: 24 }) + docxTbl(['Parametre', 'Değer'], [['SDS', state.seismic.SDS], ['Ie', String(state.seismic.Ie)], ['R', String(state.seismic.R)], ['T1', state.seismic.T1 + ' sn'], ['Sa(T1)', state.seismic.Sa], ['W', state.seismic.Ws + ' kN'], ['V', state.seismic.Vbase + ' kN']]) + docxP('');
    body += docxP('Kolon Sonuçları', { b: 1, sz: 24 }) + docxTbl(['Kolon', 'G', 'E', 'Toplam', 'b×h', 'λ', 'Donatı', 'Durum'], state.columnResults.map(c => [c.label, c.Ng.toFixed(1), c.Ne.toFixed(1), c.Ntotal.toFixed(1), c.sb + '×' + c.sh, c.slenderness, String(c.As), c.status])) + docxP('');
    if (state.beamResults.length) body += docxP('Kiriş Sonuçları', { b: 1, sz: 24 }) + docxTbl(['Kiriş', 'Bağlantı', 'L', 'bw', 'h', 'Donatı'], state.beamResults.map(b => [b.label, b.connection, b.span.toFixed(2) + ' m', String(b.bw), String(b.h), String(b.As)])) + docxP('');
    if (state.wallResults.length) body += docxP('Perde Sonuçları', { b: 1, sz: 24 }) + docxTbl(['Perde', 'Uzunluk', 't', 'V', 'H/L', 'Donatı/m', 'Durum'], state.wallResults.map(w => [w.label, w.len.toFixed(2) + ' m', String(w.tw) + ' cm', String(w.Vw), w.hwRatio, String(w.Asmin), w.status])) + docxP('');
    body += docxP('Bu hesaplar ön boyutlandırma amaçlıdır. TS 500 ve TBDY 2018 kapsamında yetkili mühendis tarafından doğrulanmalıdır.');
    const docXml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.folder('_rels').file('.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.folder('word').file('document.xml', docXml);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hesap_raporu.docx';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportJSON(state) {
    const data = {
      version: 1,
      savedAt: new Date().toISOString(),
      inputs: readInputsFromDOM(),
      calculated: state.calculated
    };
    downloadBlob(JSON.stringify(data, null, 2), (state.project.name || 'proje').replace(/[^\w\-]/g, '_') + '.json', 'application/json');
  }

  function readInputsFromDOM() {
    return {
      projectName: document.getElementById('projectName').value,
      concreteClass: document.getElementById('concreteClass').value,
      steelClass: document.getElementById('steelClass').value,
      floors: document.getElementById('floors').value,
      floorHeight: document.getElementById('floorHeight').value,
      slabType: document.getElementById('slabType').value,
      deadLoad: document.getElementById('deadLoad').value,
      liveLoad: document.getElementById('liveLoad').value,
      slabThickness: document.getElementById('slabThickness').value,
      eqZone: document.getElementById('eqZone').value,
      soilClass: document.getElementById('soilClass').value,
      buildingClass: document.getElementById('buildingClass').value,
      structSystem: document.getElementById('structSystem').value,
      bearingCapacity: document.getElementById('bearingCapacity')?.value,
      columns: [...document.getElementById('columnBody').children].map(tr => ({
        x: tr.querySelector('.col-x').value, y: tr.querySelector('.col-y').value,
        b: tr.querySelector('.col-b').value, h: tr.querySelector('.col-h').value
      })),
      walls: [...document.getElementById('wallBody').children].map(tr => ({
        x1: tr.querySelector('.w-x1').value, y1: tr.querySelector('.w-y1').value,
        x2: tr.querySelector('.w-x2').value, y2: tr.querySelector('.w-y2').value,
        t: tr.querySelector('.w-t').value
      }))
    };
  }

  return { exportDXF, exportPDF, exportDOCX, exportJSON, readInputsFromDOM };
})();
