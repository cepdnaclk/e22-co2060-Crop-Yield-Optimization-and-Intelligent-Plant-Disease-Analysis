import { describe, expect, it } from 'vitest';
import { FarmerReportData, confidencePercent, recordedNumber, selectFarmerRecords, summarizeCrops } from '../../src/utils/farmerReportData';
import { createFarmerReportPdf } from '../../src/utils/farmerReportPdf';

const data: FarmerReportData = {
  generatedAt: '2026-10-14T08:00:00Z',
  farmer: { farmerId: 'farmer-test-1', firstName: 'Test', lastName: 'Farmer' },
  farms: [
    { farmId: 'F1', farmName: 'North Farm', crop: 'Paddy', sizeInAcres: 2, harvests: [
      { year: 2026, season: 'Maha Season', harvestQty: 200, pointsEarned: 10, createdDate: '2026-02-01' },
      { year: 2025, season: 'Yala', harvestQty: 100, pointsEarned: 5, createdDate: '2025-08-01' },
    ] },
    { farmId: 'F2', farmName: 'New Farm', crop: 'Corn', sizeInAcres: 3, harvests: [] },
  ],
  diseaseRecords: [
    { recordId: 'D1', farmId: 'F2', farmName: 'New Farm', crop: 'Corn', disease: 'Leaf Spot', confidence: 91, createdDate: '2025-12-31T20:00:00Z' },
    { recordId: 'D2', farmId: null, farmName: 'Deleted Farm', crop: null, disease: 'Brown Spot', confidence: 84, createdDate: null },
  ],
};
const all = { year: '', season: '', crop: null };

describe('farmer report records and PDF export', () => {
  it('includes farms without harvests in the unfiltered current register, counting area once', () => {
    const selected = selectFarmerRecords(data, all);
    expect(selected.farms).toHaveLength(2);
    expect(summarizeCrops(selected.farms).reduce((sum, crop) => sum + crop.acres, 0)).toBe(5);
  });

  it('combines harvest filters and normalizes season labels', () => {
    const selected = selectFarmerRecords(data, { year: '2026', season: 'Maha', crop: 'paddy' });
    expect(selected.harvests).toHaveLength(1);
    expect(selected.harvests[0].harvestQty).toBe(200);
    expect(selected.farms.map(farm => farm.farmId)).toEqual(['F1']);
  });

  it('filters disease dates in Sri Lanka and never applies harvest-season filters', () => {
    expect(selectFarmerRecords(data, { year: '2026', season: 'Maha', crop: 'Corn' }).diseases.map(d => d.recordId)).toEqual(['D1']);
    expect(selectFarmerRecords(data, all).diseases).toHaveLength(2);
    expect(selectFarmerRecords(data, { ...all, year: '2025' }).diseases).toHaveLength(0);
  });

  it('keeps unknown numerical data distinct from zero', () => {
    expect(recordedNumber(null)).toBeNull();
    expect(recordedNumber('')).toBeNull();
    expect(recordedNumber(NaN)).toBeNull();
    expect(recordedNumber(-1)).toBeNull();
    expect(recordedNumber(0)).toBe(0);
  });

  it('converts model probability to percent and handles legacy percent records', () => {
    expect(confidencePercent(0.987)).toBeCloseTo(98.7);
    expect(confidencePercent(1)).toBe(100);
    expect(confidencePercent(0)).toBe(0);
    expect(confidencePercent(92)).toBe(92);
    expect(confidencePercent(null)).toBeNull();
    expect(confidencePercent(101)).toBeNull();
  });

  it.each(['crop', 'harvest', 'disease'] as const)('creates a valid %s PDF with explicit empty results and page numbers', kind => {
    const { doc, filename } = createFarmerReportPdf(kind, data, { ...all, year: '2099' }, new Date(data.generatedAt));
    expect(filename).toMatch(/2026-10-14.pdf$/);
    const output = doc.output();
    expect(output.startsWith('%PDF-')).toBe(true);
    expect(output).toContain('No ');
    expect(output).toContain('Page 1 of');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('Infinity');
  });

  it('paginates every harvest record, repeating headers without losing the last entry', () => {
    const many = { ...data, farms: [{ ...data.farms[0], harvests: Array.from({ length: 90 }, (_, index) => ({ ...data.farms[0].harvests[0], year: 2000 + index })) }] };
    const { doc } = createFarmerReportPdf('harvest', many, all);
    expect(doc.getNumberOfPages()).toBeGreaterThan(4);
    expect(doc.output()).toContain('2089');
    expect(doc.output()).toContain('2000');
  });
});
