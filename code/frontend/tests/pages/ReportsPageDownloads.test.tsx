import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { farmAPI } from '../../src/services/api';
import { downloadFarmerReport } from '../../src/utils/farmerReportPdf';
import { ReportsPage } from '../../src/components/ReportsPage';
import { toast } from 'sonner';

vi.mock('../../src/services/api', () => ({ farmAPI: { getFarmerReport: vi.fn() } }));
vi.mock('../../src/utils/farmerReportPdf', () => ({ downloadFarmerReport: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('recharts', () => ({
  ResponsiveContainer: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null, LineChart: () => null,
  Line: () => null, PieChart: () => null, Pie: () => null, Cell: () => null,
}));

const records = { generatedAt: '2026-10-14', farmer: { farmerId: 'FARMER1' }, farms: [], diseaseRecords: [] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(farmAPI.getFarmerReport).mockResolvedValue(records); });
afterEach(cleanup);

it('connects each download to the matching report and preserves selected filters', async () => {
  render(<ReportsPage />);
  await screen.findByRole('button', { name: 'Crop Data Report' });
  const selectors = screen.getAllByRole('combobox');
  fireEvent.change(selectors[0], { target: { value: '2025' } });
  fireEvent.change(selectors[1], { target: { value: 'Maha' } });
  fireEvent.change(selectors[2], { target: { value: 'Paddy' } });
  for (const [button, kind] of [['Crop Data Report', 'crop'], ['Harvest Summary', 'harvest'], ['Disease Reports', 'disease']]) {
    fireEvent.click(screen.getByRole('button', { name: button, exact: true }));
    await waitFor(() => expect(downloadFarmerReport).toHaveBeenLastCalledWith(kind, records, { year: '2025', season: 'Maha', crop: 'Paddy' }));
    await waitFor(() => expect(screen.getByRole('button', { name: button, exact: true })).toBeEnabled());
  }
});

it('blocks downloads when loading fails and allows retry', async () => {
  vi.mocked(farmAPI.getFarmerReport).mockRejectedValueOnce(new Error('Network unavailable'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<ReportsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
  expect(screen.queryByRole('button', { name: 'Crop Data Report' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('button', { name: 'Crop Data Report' })).toBeEnabled();
  vi.mocked(console.error).mockRestore();
});

it('reports generation failures and re-enables download controls', async () => {
  vi.mocked(downloadFarmerReport).mockImplementationOnce(() => { throw new Error('PDF failed'); });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<ReportsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Crop Data Report' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Crop Data Report' })).toBeEnabled();
  vi.mocked(console.error).mockRestore();
});
