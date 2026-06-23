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

    // --- Bounds hesabı (tüm koordinatlar cm cinsinden) ---
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const upd = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };

    columns.forEach(col => {
      const x = col.x * 100, y = col.y * 100;
      const cr = crMap[col.id];
      if (cr) { upd(x - cr.sb/2, y - cr.sh/2); upd(x + cr.sb/2, y + cr.sh/2); } else { upd(x, y); }
    });

    walls.forEach(w => {
      const x1 = w.x1*100, y1 = w.y1*100, x2 = w.x2*100, y2 = w.y2*100;
      const wr = wrMap[w.id];
      if (wr) {
        const len = Math.hypot(x2-x1, y2-y1);
        if (len > 0) {
          const nx = -(y2-y1)/len*(wr.tw/2), ny = (x2-x1)/len*(wr.tw/2);
          upd(x1+nx,y1+ny); upd(x2+nx,y2+ny); upd(x2-nx,y2-ny); upd(x1-nx,y1-ny);
        }
      } else { upd(x1,y1); upd(x2,y2); }
    });

    if (minX === Infinity) { minX = 0; minY = 0; maxX = 1000; maxY = 1000; }

    const pad = Math.max(200, (maxX-minX)*0.1, (maxY-minY)*0.1);
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const cx = (minX+maxX)/2, cy = (minY+maxY)/2;

    const L = [], a = s => L.push(String(s));
    let hc = 1;
    const nh = () => (hc++).toString(16).toUpperCase();

    // HEADER
    a('0'); a('SECTION'); a('2'); a('HEADER');
    a('9'); a('$ACADVER'); a('1'); a('AC1015');
    a('9'); a('$DWGCODEPAGE'); a('3'); a('ANSI_1252');
    a('9'); a('$EXTMIN'); a('10'); a(minX.toFixed(4)); a('20'); a(minY.toFixed(4)); a('30'); a('0.0000');
    a('9'); a('$EXTMAX'); a('10'); a(maxX.toFixed(4)); a('20'); a(maxY.toFixed(4)); a('30'); a('0.0000');
    a('9'); a('$LIMMIN'); a('10'); a(minX.toFixed(4)); a('20'); a(minY.toFixed(4));
    a('9'); a('$LIMMAX'); a('10'); a(maxX.toFixed(4)); a('20'); a(maxY.toFixed(4));
    a('9'); a('$INSUNITS'); a('70'); a('4');
    a('9'); a('$MEASUREMENT'); a('70'); a('1');
    a('0'); a('ENDSEC');

    // TABLES
    a('0'); a('SECTION'); a('2'); a('TABLES');

    // VPORT — her group code için doğru subclass marker sırası
    a('0'); a('TABLE'); a('2'); a('VPORT'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('1');
    a('0'); a('VPORT'); a('5'); a(nh()); a('330'); a('0');
    a('100'); a('AcDbSymbolTableRecord');
    a('100'); a('AcDbViewportTableRecord');
    a('2'); a('*ACTIVE'); a('70'); a('0');
    a('10'); a('0.0000'); a('20'); a('0.0000');
    a('11'); a('1.0000'); a('21'); a('1.0000');
    a('12'); a(cx.toFixed(4)); a('22'); a(cy.toFixed(4));
    a('13'); a('0.0000'); a('23'); a('0.0000');
    a('14'); a('10.0000'); a('24'); a('10.0000');
    a('15'); a('10.0000'); a('25'); a('10.0000');
    a('16'); a('0.0000'); a('26'); a('0.0000'); a('36'); a('1.0000');
    a('17'); a('0.0000'); a('27'); a('0.0000'); a('37'); a('0.0000');
    a('40'); a(((maxY-minY)*1.5).toFixed(4));
    a('41'); a('1.0000'); a('42'); a('50.0000'); a('43'); a('0.0000'); a('44'); a('4.0000');
    a('50'); a('0.0000'); a('51'); a('0.0000');
    a('71'); a('0'); a('72'); a('1000'); a('73'); a('1'); a('74'); a('3');
    a('75'); a('0'); a('76'); a('0'); a('77'); a('0'); a('78'); a('0');
    a('0'); a('ENDTAB');

    // LTYPE
    a('0'); a('TABLE'); a('2'); a('LTYPE'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('1');
    a('0'); a('LTYPE'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTableRecord'); a('100'); a('AcDbLinetypeTableRecord');
    a('2'); a('CONTINUOUS'); a('70'); a('0'); a('3'); a('Solid line'); a('72'); a('65'); a('73'); a('0'); a('40'); a('0.0');
    a('0'); a('ENDTAB');

    // LAYER
    const layers = [['0',7],['KOLONLAR',5],['KIRISLER',1],['PERDELER',3],['KOLON_NO',7],['PERDE_NO',3]];
    a('0'); a('TABLE'); a('2'); a('LAYER'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a(String(layers.length));
    layers.forEach(([lname, lcolor]) => {
      a('0'); a('LAYER'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTableRecord'); a('100'); a('AcDbLayerTableRecord');
      a('2'); a(lname); a('70'); a('0'); a('62'); a(String(lcolor)); a('6'); a('CONTINUOUS');
    });
    a('0'); a('ENDTAB');

    // STYLE
    a('0'); a('TABLE'); a('2'); a('STYLE'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('1');
    a('0'); a('STYLE'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTableRecord'); a('100'); a('AcDbTextStyleTableRecord');
    a('2'); a('STANDARD'); a('70'); a('0'); a('40'); a('0.0'); a('41'); a('1.0'); a('50'); a('0.0'); a('71'); a('0'); a('42'); a('2.5'); a('3'); a('txt'); a('4'); a('');
    a('0'); a('ENDTAB');

    // VIEW
    a('0'); a('TABLE'); a('2'); a('VIEW'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('0');
    a('0'); a('ENDTAB');

    // UCS
    a('0'); a('TABLE'); a('2'); a('UCS'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('0');
    a('0'); a('ENDTAB');

    // APPID
    a('0'); a('TABLE'); a('2'); a('APPID'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('1');
    a('0'); a('APPID'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTableRecord'); a('100'); a('AcDbRegAppTableRecord');
    a('2'); a('ACAD'); a('70'); a('0');
    a('0'); a('ENDTAB');

    // DIMSTYLE
    a('0'); a('TABLE'); a('2'); a('DIMSTYLE'); a('5'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTable'); a('70'); a('1');
    a('0'); a('DIMSTYLE'); a('105'); a(nh()); a('330'); a('0'); a('100'); a('AcDbSymbolTableRecord'); a('100'); a('AcDbDimStyleTableRecord');
    a('2'); a('STANDARD'); a('70'); a('0');
    a('0'); a('ENDTAB');

    a('0'); a('ENDSEC');

    // BLOCKS SECTION
    a('0'); a('SECTION'); a('2'); a('BLOCKS');
    a('0'); a('BLOCK'); a('5'); a(nh()); a('330'); a('1F'); a('100'); a('AcDbEntity'); a('8'); a('0'); a('100'); a('AcDbBlockBegin');
    a('2'); a('*MODEL_SPACE'); a('70'); a('0'); a('10'); a('0.0'); a('20'); a('0.0'); a('30'); a('0.0'); a('3'); a('*MODEL_SPACE'); a('1'); a('');
    a('0'); a('ENDBLK'); a('5'); a(nh()); a('330'); a('1F'); a('100'); a('AcDbEntity'); a('8'); a('0'); a('100'); a('AcDbBlockEnd');
    a('0'); a('ENDSEC');

    // ENTITIES SECTION
    a('0'); a('SECTION'); a('2'); a('ENTITIES');

    for (const col of columns) {
      const cr = crMap[col.id];
      const ccx = col.x * 100, ccy = col.y * 100, hw = cr.sb / 2, hh = cr.sh / 2;
      const pts = [[ccx-hw,ccy-hh],[ccx+hw,ccy-hh],[ccx+hw,ccy+hh],[ccx-hw,ccy+hh]];

      a('0'); a('LWPOLYLINE'); a('5'); a(nh()); a('330'); a('0');
      a('100'); a('AcDbEntity'); a('8'); a('KOLONLAR');
      a('100'); a('AcDbLwPolyline'); a('90'); a('4'); a('70'); a('1');
      pts.forEach(([px,py]) => { a('10'); a(px.toFixed(2)); a('20'); a(py.toFixed(2)); });

      a('0'); a('TEXT'); a('5'); a(nh()); a('330'); a('0');
      a('100'); a('AcDbEntity'); a('8'); a('KOLON_NO');
      a('100'); a('AcDbText');
      a('10'); a(ccx.toFixed(2)); a('20'); a((ccy+hh+30).toFixed(2)); a('30'); a('0.0');
      a('40'); a('25'); a('1'); a(col.label); a('50'); a('0.0');
      a('100'); a('AcDbText');
    }

    for (const b of beams) {
      a('0'); a('LINE'); a('5'); a(nh()); a('330'); a('0');
      a('100'); a('AcDbEntity'); a('8'); a('KIRISLER');
      a('100'); a('AcDbLine');
      a('10'); a((b.x1*100).toFixed(2)); a('20'); a((b.y1*100).toFixed(2)); a('30'); a('0.0');
      a('11'); a((b.x2*100).toFixed(2)); a('21'); a((b.y2*100).toFixed(2)); a('31'); a('0.0');
    }

    for (const w of walls) {
      const wr = wrMap[w.id];
      const x1=w.x1*100, y1=w.y1*100, x2=w.x2*100, y2=w.y2*100;
      const len = Math.hypot(x2-x1, y2-y1);
      const nx = -(y2-y1)/len*(wr.tw/2), ny = (x2-x1)/len*(wr.tw/2);
      const pts = [[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]];

      a('0'); a('LWPOLYLINE'); a('5'); a(nh()); a('330'); a('0');
      a('100'); a('AcDbEntity'); a('8'); a('PERDELER');
      a('100'); a('AcDbLwPolyline'); a('90'); a('4'); a('70'); a('1');
      pts.forEach(([px,py]) => { a('10'); a(px.toFixed(2)); a('20'); a(py.toFixed(2)); });

      a('0'); a('TEXT'); a('5'); a(nh()); a('330'); a('0');
      a('100'); a('AcDbEntity'); a('8'); a('PERDE_NO');
      a('100'); a('AcDbText');
      a('10'); a(((x1+x2)/2).toFixed(2)); a('20'); a(((y1+y2)/2+wr.tw/2+20).toFixed(2)); a('30'); a('0.0');
      a('40'); a('20'); a('1'); a(w.label); a('50'); a('0.0');
      a('100'); a('AcDbText');
    }

    a('0'); a('ENDSEC');

    // OBJECTS SECTION
    a('0'); a('SECTION'); a('2'); a('OBJECTS');
    a('0'); a('DICTIONARY'); a('5'); a('C'); a('330'); a('0'); a('100'); a('AcDbDictionary');
    a('3'); a('ACAD_GROUP'); a('350'); a('D');
    a('0'); a('DICTIONARY'); a('5'); a('D'); a('330'); a('C'); a('100'); a('AcDbDictionary');
    a('0'); a('ENDSEC');

    // EOF
    a('0'); a('EOF');

    return L.join('\r\n');
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