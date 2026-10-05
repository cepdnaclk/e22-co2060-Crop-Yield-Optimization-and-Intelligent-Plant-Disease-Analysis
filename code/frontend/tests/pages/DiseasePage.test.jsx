import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import i18n from '../../src/i18n/i18n';
import { toast } from 'sonner';
import { farmAPI } from '../../src/services/api';
import { DiseasePage } from '../../src/components/DiseasePage';

vi.mock('../../src/utils/mediaUpload', () => ({
  default: vi.fn().mockResolvedValue('https://example.com/leaf.jpg'),
}));
vi.mock('../../src/components/DiseaseLocationPicker', () => ({
  DiseaseLocationPicker: () => null,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('../../src/services/api', () => ({
  userAPI: { fetchProfile: vi.fn().mockResolvedValue({ user: { nic: 'test-farmer' } }) },
  farmAPI: {
    getAllFarms: vi.fn().mockResolvedValue({ farms: [{
      _id: 'farm-1', farmId: 'FAM001', farmName: 'Test Farm', farmerNIC: 'test-farmer',
    }] }),
    reportDisease: vi.fn().mockResolvedValue({ report: { diseases: [{}] } }),
  },
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function analyze(language, disease, confidence = 0.8791) {
  await i18n.changeLanguage(language);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, prediction: {
      class_id: 0, disease, confidence,
      all_probabilities: {
        'Leaf smut': 0.0499, 'Brown spot': 0.0416, Healthy: 0.0293, [disease]: confidence,
      },
    } }),
  }));
  const view = render(<DiseasePage />);
  await screen.findByRole('option', { name: /Test Farm/ });
  fireEvent.change(view.container.querySelector('input[type="file"]'), {
    target: { files: [new File(['leaf'], 'leaf.png', { type: 'image/png' })] },
  });
  await screen.findByAltText(i18n.t('diseasePage.selectedCropImage'));
  fireEvent.click(screen.getByRole('button', { name: i18n.t('diseasePage.analyzeDisease') }));
  await screen.findByRole('heading', { name: i18n.t('diseasePage.analysisComplete') });
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  return view;
}

const labels = [
  ['Bacterial leaf blight', 'bacterialLeafBlight'],
  ['bacterial_leaf_blight', 'bacterialLeafBlight'],
  ['  BACTERIAL-LEAF  BLIGHT  ', 'bacterialLeafBlight'],
  ['Brown spot', 'brownSpot'],
  ['Leaf smut', 'leafSmut'],
];

test.each(['en', 'si'].flatMap(language => labels.map(([label, key]) => [language, label, key])))(
  'renders translated results for %s / %s', async (language, label, key) => {
    const { container } = await analyze(language, label);
    for (const suffix of ['', 'Desc', 'Treatment', 'Prevention']) {
      const translationKey = `diseasePage.diseasesList.${key}${suffix}`;
      expect(i18n.exists(translationKey)).toBe(true);
      expect(screen.getAllByText(i18n.t(translationKey)).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(i18n.t('diseasePage.severityLevels.medium'))).toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('diseasePage.diseasesList.leafSmut')).length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('diseasePage.');
    expect(farmAPI.reportDisease).toHaveBeenCalledWith(expect.objectContaining({
      farmId: 'farm-1', all_probabilities: expect.objectContaining({ [label]: 0.8791 }),
    }));
    expect(toast.success).toHaveBeenCalledWith(i18n.t('diseasePage.diseaseReportSavedWithCount', { count: 1 }));
  },
);

test.each([['en', 0.95, 'high'], ['si', 0.4, 'low']])(
  'uses readable fallback text for unknown results in %s', async (language, confidence, severity) => {
    const { container } = await analyze(language, 'Unknown condition', confidence);
    for (const field of ['description', 'treatment', 'prevention']) {
      expect(screen.getByText(i18n.t(`diseasePage.fallback.${field}`))).toBeInTheDocument();
    }
    expect(screen.getByText(i18n.t(`diseasePage.severityLevels.${severity}`))).toBeInTheDocument();
    expect(container.textContent).not.toContain('diseasePage.');
  },
);

test('updates an existing result when switching from English to Sinhala', async () => {
  const { container } = await analyze('en', 'Bacterial leaf blight');
  await act(async () => { await i18n.changeLanguage('si'); });
  expect(screen.getAllByText(i18n.t('diseasePage.diseasesList.bacterialLeafBlight'))).toHaveLength(2);
  expect(screen.getByText(i18n.t('diseasePage.diseasesList.bacterialLeafBlightDesc'))).toBeInTheDocument();
  expect(container.textContent).not.toContain('Bacterial leaf blight');
  expect(container.textContent).not.toContain('diseasePage.');
});
