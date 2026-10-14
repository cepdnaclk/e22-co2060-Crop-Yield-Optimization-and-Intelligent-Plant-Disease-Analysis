import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FarmerReportData, FarmerReportKind, ReportFilters, normalizeSeason,
  confidencePercent, recordedNumber, selectFarmerRecords, summarizeCrops, summarizeDiseases,
} from './farmerReportData';

const titles = { crop: 'Crop Data Report', harvest: 'Harvest Summary Report', disease: 'Disease Reports' };
const green: [number, number, number] = [24, 83, 57];
const muted: [number, number, number] = [93, 107, 101];
const missing = 'Not recorded';
const text = (value: unknown) => value && !['NOT GIVEN', 'N/A'].includes(String(value)) ? String(value) : missing;
const number = (value: unknown) => {
  const parsed = recordedNumber(value);
  return parsed === null ? missing : parsed.toLocaleString('en-GB', { maximumFractionDigits: 2 });
};
const date = (value?: string | null) => value && !Number.isNaN(new Date(value).getTime())
  ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', day: '2-digit', month: 'short', year: 'numeric' }) : missing;

/** Reuses the admin harvest export's jsPDF + AutoTable stack, with a shared
 * farmer document layout and paginated, selectable-text tables. */
export function createFarmerReportPdf(kind: FarmerReportKind, data: FarmerReportData, filters: ReportFilters, generated = new Date()) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const { farms, harvests, diseases } = selectFarmerRecords(data, filters);
  const crops = summarizeCrops(farms);
  const m = 18, width = 174;
  let y = 48;
  const stamp = generated.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  const reference = `AC-${kind.toUpperCase()}-${data.farmer.farmerId.slice(-8)}-${generated.getTime().toString(36)}`.toUpperCase();
  doc.setProperties({ title: titles[kind], subject: 'Farmer records for supporting documents', author: 'AgriConnect', creator: 'AgriConnect Farmer Portal' });

  const ensureSpace = (height: number) => { if (y + height > 270) { doc.addPage(); y = 28; } };
  const paragraph = (value: string, size = 9) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...muted);
    const lines: string[] = doc.splitTextToSize(value, width);
    for (const line of lines) { ensureSpace(5); doc.text(line, m, y); y += 4.5; }
    y += 3;
  };
  const section = (title: string) => {
    ensureSpace(23); y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...green);
    doc.text(title, m, y); y += 5;
  };
  const table = (head: string[], body: string[][], widths: number[]) => {
    // Native browser text shaping preserves Sinhala/Tamil names and notes.
    // Only these cells are rasterized; English text remains selectable.
    const images = new WeakMap<object, { url: string; height: number }>();
    autoTable(doc, {
      startY: y, head: head.length ? [head] : undefined, body,
      margin: { left: m, right: m, top: 28, bottom: 23 }, tableWidth: width,
      theme: 'plain', rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', textColor: [40, 53, 47], lineColor: [224, 232, 227], lineWidth: 0.15 },
      headStyles: { fillColor: green, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 249, 246] },
      columnStyles: Object.fromEntries(widths.map((cellWidth, i) => [i, { cellWidth }])),
      didParseCell: hook => {
        const raw = hook.cell.text.join(' ');
        if (!/[^\x00-\xFF]/.test(raw) || typeof document === 'undefined') return;
        const scale = 5, innerWidth = widths[hook.column.index] - 6;
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(innerWidth * scale);
        let ctx = canvas.getContext('2d')!;
        const font = `${8.5 * 25.4 / 72 * scale}px "Nirmala UI", sans-serif`;
        ctx.font = font;
        const lines: string[] = []; let line = '';
        // Segment at grapheme boundaries so Sinhala combining marks stay intact.
        const segments = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(raw), s => s.segment);
        segments.forEach(char => {
          if (ctx.measureText(line + char).width > canvas.width && line) { lines.push(line); line = ''; }
          line += char;
        });
        if (line) lines.push(line);
        const height = Math.max(4.5, lines.length * 4.5);
        canvas.height = Math.ceil(height * scale);
        ctx = canvas.getContext('2d')!; ctx.font = font; ctx.fillStyle = '#28352f'; ctx.textBaseline = 'top';
        lines.forEach((value, i) => ctx.fillText(value, 0, i * 4.5 * scale));
        images.set(hook.cell, { url: canvas.toDataURL('image/png'), height });
        hook.cell.text = ['']; hook.cell.styles.minCellHeight = height + 6;
      },
      didDrawCell: hook => {
        const img = images.get(hook.cell);
        if (img) doc.addImage(img.url, 'PNG', hook.cell.x + 3, hook.cell.y + 3, hook.cell.width - 6, img.height);
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  };

  paragraph('Prepared from AgriConnect records to support an agricultural finance application.');
  section('01  Farmer and report details');
  const farmer = data.farmer;
  table([], [
    ['Farmer name', text([farmer.firstName, farmer.lastName].filter(Boolean).join(' '))],
    ['NIC / Farmer ID', `${text(farmer.nic)} / ${farmer.farmerId}`],
    ['Contact', `${text(farmer.phone)} | ${text(farmer.email)}`],
    ['Address', text(farmer.address)],
    ['District / Division', `${text(farmer.district)} / ${text(farmer.division)}`],
    ['Report scope', `Year: ${filters.year || 'All recorded years'} | Crop: ${filters.crop || 'All crops'}\nSeason: ${kind === 'disease' ? 'Not recorded for disease entries' : filters.season || 'All seasons'}`],
    ['Data retrieved', `${date(data.generatedAt)} | Generated: ${date(generated.toISOString())} (Sri Lanka)`],
    ['Report reference', reference],
  ], [38, 136]);

  section('02  Summary');
  if (kind === 'crop') {
    table(['Farms in scope', 'Recorded area (acres)', 'Crop types'], [[number(farms.length), number(crops.reduce((sum, crop) => sum + crop.acres, 0)), number(crops.length)]], [58, 58, 58]);
    paragraph('Current registered farm details. With a year or season selected, only farms with matching harvest records are included. Area is counted once per farm; it is not proof of land ownership.');
    if (crops.some(crop => crop.missingArea)) paragraph('Some farm areas are not recorded and are excluded from the area total.');
    section('03  Crop allocation');
    table(['Crop', 'Farms', 'Recorded area (acres)'], crops.length ? crops.map(crop => [crop.name, number(crop.farms), `${number(crop.acres)}${crop.missingArea ? ' (incomplete)' : ''}`]) : [['No farms match the selected scope.', '-', '-']], [76, 36, 62]);
    section('04  Farm register');
    table(['Farm / ID', 'Location / District / Division', 'Crop', 'Acres', 'Status'], farms.length ? farms.map(farm => [
      `${text(farm.farmName)}\n${farm.farmId}`, `${text(farm.location)}\n${text(farm.district)} / ${text(farm.division)}`,
      text(farm.crop), number(farm.sizeInAcres), text(farm.status),
    ]) : [['No farms match the selected scope.', '-', '-', '-', '-']], [42, 56, 30, 20, 26]);
  } else if (kind === 'harvest') {
    const totalKg = harvests.reduce((sum, record) => sum + (recordedNumber(record.harvestQty) ?? 0), 0);
    table(['Harvest records', 'Recorded harvest (kg)', 'Farms with harvests'], [[number(harvests.length), number(totalKg), number(new Set(harvests.map(h => h.farm.farmId)).size)]], [58, 58, 58]);
    paragraph('Quantities are recorded production, not sales or income. Yield per acre uses the current registered farm area for each record. Entry dates are recording dates; actual harvest dates are not stored.');
    if (harvests.some(h => recordedNumber(h.harvestQty) === null)) paragraph('Some quantities are not recorded and are excluded from totals.');
    const periods = new Map<string, number>();
    harvests.forEach(h => { const key = `${h.year} | ${normalizeSeason(h.season)} | ${h.farm.crop}`; periods.set(key, (periods.get(key) || 0) + (recordedNumber(h.harvestQty) ?? 0)); });
    section('03  Seasonal production');
    table(['Year / Season / Crop', 'Recorded harvest (kg)'], periods.size ? Array.from(periods, ([key, qty]) => [key, number(qty)]) : [['No harvests match the selected scope.', '-']], [124, 50]);
    section('04  Harvest record detail');
    table(['Farm / Crop', 'Year / Season', 'Entry date', 'Harvest (kg)', 'kg / acre'], harvests.length ? harvests.map(h => {
      const area = recordedNumber(h.farm.sizeInAcres), qty = recordedNumber(h.harvestQty);
      return [`${text(h.farm.farmName)} (${h.farm.farmId})\n${text(h.farm.crop)}`, `${h.year}\n${normalizeSeason(h.season)}`, date(h.createdDate), number(qty), area && qty !== null ? number(qty / area) : missing];
    }) : [['No harvests match the selected scope.', '-', '-', '-', '-']], [58, 30, 30, 28, 28]);
  } else {
    table(['Saved observations', 'Farms linked', 'Detection labels'], [[number(diseases.length), number(new Set(diseases.map(d => d.farmId).filter(Boolean)).size), number(summarizeDiseases(diseases).length)]], [58, 58, 58]);
    paragraph('Includes saved analysis observations, including healthy labels where present. The year filter uses the observation date in Sri Lanka. Season is not stored and does not filter this report. Crop reflects the current linked farm.');
    section('03  Observation summary');
    table(['Recorded detection', 'Observations', 'Share (%)'], diseases.length ? summarizeDiseases(diseases).map(d => [d.name, number(d.count), number(d.value)]) : [['No saved observations match the selected scope.', '0', '-']], [104, 35, 35]);
    section('04  Observation register');
    table(['Date / Record ID', 'Farm / Crop', 'Detection', 'Model confidence (%)'], diseases.length ? diseases.map(d => [
      `${date(d.createdDate)}\n${d.recordId}`, `${d.farmName}\n${d.farmId || 'Unlinked'} / ${text(d.crop)}`, d.disease,
      number(confidencePercent(d.confidence)),
    ]) : [['No saved observations.', '-', '-', '-']], [48, 50, 45, 31]);
    const withNotes = diseases.filter(d => d.notes || d.location);
    if (withNotes.length) {
      section('05  Recorded locations and notes');
      // Bounded rows also keep long Sinhala/Tamil notes within a printable page.
      table(['Record ID', 'Location / Farmer notes'], withNotes.flatMap(d => {
        const content = `Location: ${text(d.location)}\nNotes: ${text(d.notes)}`;
        const chunks: string[] = [];
        let chunk = '';
        for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(content)) {
          if (chunk.length + segment.length > 450) { chunks.push(chunk); chunk = ''; }
          chunk += segment;
        }
        if (chunk) chunks.push(chunk);
        return chunks.map((chunk, i) => [i ? `${d.recordId} (continued)` : d.recordId, chunk]);
      }), [48, 126]);
    }
    paragraph('Model confidence is not disease severity, crop loss, or a verified diagnosis. Treatment, recovery and resolution status are not recorded. No saved observations does not establish that a farm is disease-free.');
  }

  section('Record basis and supporting documents');
  paragraph('Source: the signed-in farmer\'s AgriConnect profile, current farm register and saved records. This system-generated report has not been independently certified. It does not establish land title, revenue, profit, collateral value or loan eligibility.');
  paragraph('For the application, attach supporting evidence requested by the bank, such as land or lease documents, sales receipts and cultivation costs. Any officer verification must be completed separately.');
  ensureSpace(42);
  section('Declaration and review');
  paragraph('Farmer: I have reviewed this report and will provide supporting documents and corrections where needed.');
  y += 8; doc.setDrawColor(155, 170, 160); doc.line(m, y, 96, y); doc.line(112, y, 192, y);
  y += 5; doc.setFontSize(8); doc.text('Farmer signature / Date', m, y); doc.text('Reviewing officer / Date / Stamp (if verified)', 112, y);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFillColor(...green); doc.rect(0, 0, 210, page === 1 ? 36 : 20, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(page === 1 ? 13 : 10);
    doc.text('AGRI CONNECT', m, page === 1 ? 12 : 12);
    if (page === 1) { doc.setFontSize(22); doc.text(titles[kind], m, 26); }
    else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(titles[kind], 192, 12, { align: 'right' }); }
    doc.setDrawColor(214, 225, 218); doc.line(m, 278, 192, 278);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted);
    doc.text(reference, m, 283); doc.text(`Page ${page} of ${pages}`, 192, 283, { align: 'right' });
    doc.text('Personal farmer records | For applicant and reviewing institution', m, 288);
  }
  return { doc, filename: `AgriConnect_${kind}_report_${stamp}.pdf` };
}

export function downloadFarmerReport(kind: FarmerReportKind, data: FarmerReportData, filters: ReportFilters) {
  const { doc, filename } = createFarmerReportPdf(kind, data, filters);
  doc.save(filename);
}
