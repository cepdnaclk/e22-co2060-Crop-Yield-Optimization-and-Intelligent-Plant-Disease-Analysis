import { X, Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { farmAPI } from '../../services/api';

interface Farm {
  farmId: string;
  farmName: string;
  location: string;
  crop: string;
  farmSize: number;
  district: string;
  division?: string;
  status: string;
}

interface EditFarmModalProps {
  farm: Farm;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditFarmModal({ farm, onClose, onSuccess }: EditFarmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    farmName: farm.farmName,
    location: farm.location,
    crop: farm.crop,
    sizeInAcres: farm.farmSize,
    district: farm.district,
    division: (farm as any).division || '',
    status: farm.status,
  });

  const crops = ['Paddy', 'Corn', 'Wheat', 'Tomatoes', 'Onions', 'Carrots', 'Cabbage', 'Potatoes'];
  const districts = [
    'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota',
    'Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale',
    'Matara','Monaragala','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
  ];
  const statuses = ['active', 'inactive', 'abandoned'];

  const dsDivisions: Record<string, string[]> = {
    'Ampara': ['Ampara', 'Kalmunai', 'Samanturai'],
    'Anuradhapura': ['Anuradhapura City', 'Anuradhapura South', 'Embbekke', 'Galnewa', 'Habarana', 'Ipalogama', 'Kekirawa', 'Madawachchiya', 'Mihintale', 'Nuwara Wewa', 'Rajarata', 'Tambuttegama', 'Thalwella', 'Wilgamuwa'],
    'Badulla': ['Badulla', 'Bandarawela', 'Haputale', 'Kandaketiya', 'Passara', 'Welimada'],
    'Batticaloa': ['Batticaloa', 'Chavakachcheri', 'Eravur', 'Kaluwanchikudi', 'Kattankudy', 'Manmunai North', 'Manmunai South', 'Porativu'],
    'Colombo': ['Colombo', 'Borella', 'Colombo South', 'Dehiwala', 'Kaduwela', 'Kelaniya', 'Kolonnawa', 'Maharagama', 'Minuwangoda', 'Moratuwa', 'Nugegoda', 'Padukka', 'Piliyandala'],
    'Galle': ['Galle', 'Ambalangoda', 'Benthota', 'Buwanekande', 'Habaraduwa', 'Imaduwa', 'Koggala', 'Mirissa', 'Unawatuna', 'Weligama'],
    'Gampaha': ['Gampaha', 'Attanagalla', 'Biyagama', 'Ganemulla', 'Heiyanthuduwa', 'Katunayake', 'Kelaniya', 'Minuwangoda', 'Negombo', 'Seeduwa', 'Wattala', 'Yakmulla'],
    'Hambantota': ['Hambantota', 'Mirissa', 'Tangalla', 'Tissamaharama', 'Walasmulla', 'Wellawaththu', 'Yakkalamulla'],
    'Jaffna': ['Jaffna', 'Chavakacheri', 'Chulipuram', 'Delft', 'Jaffna North', 'Jaffna West', 'Kayts', 'Kopay', 'Nallur', 'Nanthottam', 'Point Pedro', 'Sandilipay', 'Valigamam'],
    'Kalutara': ['Kalutara', 'Bandaragama', 'Beruwala', 'Matugama', 'Millaniya', 'Panadura', 'Wadduwa'],
    'Kandy': ['Kandy', 'Akurana', 'Asgiriya', 'Dambulla', 'Gampola', 'Getambe', 'Harispattuwa', 'Katugastota', 'Kundasale', 'Nawalapitiya', 'Poojapitiya', 'Wattegama', 'Yatinuwara'],
    'Kegalle': ['Kegalle', 'Dedigama', 'Deraniyagala', 'Galigamuwa', 'Hewessa', 'Kitulgala', 'Ruwanwella', 'Warakapola', 'Yatiyanthota'],
    'Kilinochchi': ['Akkaraipattu', 'Chavakachcheri', 'Jaffna', 'Kilinochchi', 'Pulmoddai', 'Vembadi'],
    'Kurunegala': ['Kurunegala', 'Attanagalla', 'Bingiriya', 'Dambadeniya', 'Galgamuwa', 'Hakgala', 'Ibbagamuwa', 'Kurunegala North', 'Kurunegala South', 'Madampe', 'Mawathagama', 'Narammala', 'Nikaweratota', 'Polgahawela', 'Wariyapola', 'Yapahuwa'],
    'Mannar': ['Mannar', 'Arippu', 'Balapitiya', 'Medawachchiya', 'Talaimannar'],
    'Matale': ['Matale', 'Dambulla', 'Galewela', 'Hilakotte', 'Matale North', 'Matale South', 'Naula', 'Rattota', 'Thalawa'],
    'Matara': ['Matara', 'Attalbage', 'Devinuwara', 'Kamburupitiya', 'Morawaka', 'Nilwala', 'Pasgoda', 'Weligama'],
    'Monaragala': ['Monaragala', 'Badalla', 'Bibile', 'Buttala', 'Hakmana', 'Kataragama', 'Medagama', 'Ruwanwella', 'Wellawaya'],
    'Mullaitivu': ['Mullaitivu', 'Akkaraipattu', 'Batticaloa East', 'Kantale', 'Kirati', 'Kuchchaveli', 'Oddusuddan', 'Sampur', 'Valaichenai'],
    'Nuwara Eliya': ['Nuwara Eliya', 'Ambewela', 'Bogawantalawa', 'Ginigathena', 'Hanguranketha', 'Kundasale', 'Madulsima', 'Talawakelle', 'Walapane', 'Welimada'],
    'Polonnaruwa': ['Polonnaruwa', 'Habarana', 'Hingurakgoda', 'Kaduruwela', 'Minipe', 'Seruwavila', 'Thalawa'],
    'Puttalam': ['Puttalam', 'Alutnuwara', 'Anamaduwa', 'Chilaw', 'Habaraduwa', 'Nattandiya', 'Puttalam North', 'Puttalam South', 'Wacchasbadda', 'Wilwatta'],
    'Ratnapura': ['Ratnapura', 'Balangoda', 'Bulathkohupelella', 'Eheliyagoda', 'Kalawana', 'Opanayaka', 'Pelmadulla', 'Weligallela'],
    'Trincomalee': ['Trincomalee', 'Habarana', 'Kantale', 'Kuchchaveli', 'Muttur', 'Nilaveli', 'Seruwavila', 'Trincomalee North', 'Trincomalee South', 'Verugal'],
    'Vavuniya': ['Vavuniya', 'Cheddikulam', 'Eluthumadduval', 'Vengalacheddikulam']
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await farmAPI.updateFarm(farm.farmId, {
        farmName: formData.farmName,
        location: formData.location,
        crop: formData.crop,
        sizeInAcres: Number(formData.sizeInAcres),
          district: formData.district,
          division: (formData as any).division || '',
        status: formData.status,
      });

      toast.success('Farm details updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating farm:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update farm. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Farm</h2>
            <p className="text-sm text-gray-600 mt-1">{farm.farmId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 m-6 mb-0 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Farm Name *
              </label>
              <input
                type="text"
                value={formData.farmName}
                onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop *
              </label>
              <select
                value={formData.crop}
                onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {crops.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size (Acres) *
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sizeInAcres}
                onChange={(e) => setFormData({ ...formData, sizeInAcres: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District *
              </label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DS Division *
              </label>
              <select
                value={(formData as any).division || ''}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                disabled={!formData.district}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">{formData.district ? 'Select DS Division' : 'Select a district first'}</option>
                {formData.district && (dsDivisions as any)[formData.district]?.map((div: string) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
