import { useState, useEffect, useRef } from 'react';
import { User, MapPin, Phone, IdCard, Save, Plus, Trash2, AlertCircle, CheckCircle, Upload, Camera } from 'lucide-react';
import { userAPI, farmAPI } from '../../services/api';
import uploadfile from '../../utils/mediaUpload';
import { toast } from 'sonner';
import { AddressLocationPicker } from './AddressLocationPicker';
import { EmailVerificationWidget } from '../ui/EmailVerificationWidget';

interface FarmData {
  farmName: string;
  crop: string;
  sizeInAcres: number | string;
  location: string;
  district?: string;
  division?: string;
}

interface FarmerFormData {
  firstName: string;
  lastName: string;
  nic: string;
  address: string;
  district: string;
  division: string;
  phone: string;
  email: string;
  password: string;
  latitude: number | null;
  longitude: number | null;
}

interface ExistingFarmer {
  _id: string;
  firstName?: string;
  lastName?: string;
  nic?: string;
  email?: string;
  district?: string;
  division?: string;
}

export function RegisterFarmer() {
  const [mode, setMode] = useState<'new' | 'existing'>('new'); // new: Register new farmer, existing: Add farms to existing
  const [step, setStep] = useState(1); // 1: Farmer info, 2: Farm details
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null as string | null);
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null as string | null);
  const [profileImage, setProfileImage] = useState(null as File | null);
  const [profileImagePreview, setProfileImagePreview] = useState(null as string | null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // For existing farmer mode
  const [existingFarmers, setExistingFarmers] = useState<ExistingFarmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<ExistingFarmer | null>(null);
  const [farmerSearchTerm, setFarmerSearchTerm] = useState('');
  const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [createdFarmIds, setCreatedFarmIds] = useState<string[]>([]);

  // Ref for click-outside handling
  const farmerInputRef = useRef<HTMLDivElement>(null);
  const nicInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [farmerData, setFarmerData] = useState({
    firstName: '',
    lastName: '',
    nic: '',
    address: '',
    district: '',
    division: '',
    phone: '',
    email: '',
    password: '',
    latitude: null,
    longitude: null,
  } as FarmerFormData);

  const [farms, setFarms] = useState([
    { farmName: '', crop: '', sizeInAcres: '', location: '', district: '', division: '' }
  ] as FarmData[]);

  const [registeredFarmerId, setRegisteredFarmerId] = useState(null as string | null);

  const districts = [
    'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota',
    'Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale',
    'Matara','Monaragala','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'
  ];

  const isValidNIC = (nic: string) => {
    const normalizedNic = nic.trim();
    return /^(?:\d{12}|\d{9}V)$/.test(normalizedNic);
  };

  const dsDivisions = {
    'Ampara': ['Ampara', 'Kalmunai', 'Samanturai'],
    'Anuradhapura': ['Anuradhapura City', 'Anuradhapura South', 'Embbekke', 'Galnewa', 'Habarana', 'Ipalogama', 'Kekirawa', 'Madawachchiya', 'Mihintale', 'Nuwara Wewa', 'Rajarata', 'Tambuttegama', 'Thalwella', 'Wilgamuwa'],
    'Badulla': ['Badulla', 'Bandarawela', 'Haputale', 'Kandaketiya', 'Passara', 'Welimada'],
    'Batticaloa': ['Batticaloa', 'Chavakachcheri', 'Eravur', 'Kaluwanchikudi', 'Kattankudy', 'Manmunai North', 'Manmunai South', 'Porativu'],
    'Colombo': ['Colombo', 'Borella', 'Colombo South', 'Dehiwala', 'Kaduwela', 'Kelaniya', 'Kolonnawa', 'Maharagama', 'Minuwangoda', 'Moratuwa', 'Nugegoda', 'Padukka', 'Piliyandala', 'Kelaniya'],
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
  } as Record<string, string[]>;
  const crops = ['Paddy', 'Corn', 'Wheat', 'Tomatoes', 'Onions', 'Carrots', 'Cabbage', 'Potatoes'];

  // Fetch existing farmers when mode changes to 'existing'
  const fetchExistingFarmers = async () => {
    try {
      setLoadingFarmers(true);
      const response = await userAPI.getRecentFarmers(100); // Get up to 100 recent farmers
      setExistingFarmers(response.farmers || []);
    } catch (err) {
      console.error('Error fetching farmers:', err);
      setError('Failed to load farmers list');
    } finally {
      setLoadingFarmers(false);
    }
  };

  // Handle mode change
  const handleModeChange = (newMode: 'new' | 'existing') => {
    setMode(newMode);
    setError(null);
    setSuccess(false);

    if (newMode === 'existing') {
      fetchExistingFarmers();
      setStep(2); // Skip to farm details step
    } else {
      setStep(1); // Start from farmer registration
      setSelectedFarmer(null);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (farmerInputRef.current && !farmerInputRef.current.contains(event.target as Node)) {
        setShowFarmerDropdown(false);
      }
    };

    if (showFarmerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFarmerDropdown]);

  // Filter farmers based on search term
  const filteredFarmers = existingFarmers.filter(farmer => {
    const searchLower = farmerSearchTerm.toLowerCase();
    return (
      farmer.firstName?.toLowerCase().includes(searchLower) ||
      farmer.lastName?.toLowerCase().includes(searchLower) ||
      farmer.nic?.toLowerCase().includes(searchLower) ||
      farmer.email?.toLowerCase().includes(searchLower)
    );
  });

  // Select existing farmer
  const handleSelectFarmer = (farmer: ExistingFarmer) => {
    setSelectedFarmer(farmer);
    setFarmerSearchTerm(`${farmer.firstName || ''} ${farmer.lastName || ''} (${farmer.nic || 'N/A'})`);
    setShowFarmerDropdown(false);
    setRegisteredFarmerId(farmer.nic || '');
    // Set district and division from selected farmer
    setFarmerData({ ...farmerData, district: farmer.district || '', division: farmer.division || '' });
  };

  // Step 1: Register Farmer
  const handleRegisterFarmer = async (e: any) => {
    e.preventDefault();

    if (!farmerData.firstName || !farmerData.lastName || !farmerData.email) {
      setError('Please fill in all required farmer information');
      toast.error('Please fill in all required farmer information');
      return;
    }

    if (!farmerData.nic) {
      setError('Please enter NIC number');
      toast.error('Please enter NIC number');
      nicInputRef.current?.setCustomValidity('Please enter NIC number');
      nicInputRef.current?.reportValidity();
      return;
    }

    if (nicInputRef.current) {
      if (!nicInputRef.current.checkValidity()) {
        nicInputRef.current.reportValidity();
        setError('Wrong NIC number entered');
        toast.error('Wrong NIC number entered');
        return;
      }
    }

    if (!isValidNIC(farmerData.nic)) {
      setError('Wrong NIC number entered');
      toast.error('Wrong NIC number entered');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload profile image if provided
      let imageUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
      if (profileImage) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadfile(profileImage);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          setError('Failed to upload profile picture. Please try again.');
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      // Generate a temporary password if not provided
      const password = farmerData.password || `${farmerData.nic.slice(-4)}@2026`;

      // Store generated password if it was auto-generated
      if (!farmerData.password) {
        setGeneratedPassword(password);
      }

      const userData = {
        firstName: farmerData.firstName,
        lastName: farmerData.lastName,
        email: farmerData.email,
        password: password,
        phone: farmerData.phone,
        nic: farmerData.nic,
        address: farmerData.address,
        division: farmerData.division,
        district: farmerData.district,
        role: 'farmer' as const,
        isBlocked: false,
        image: imageUrl,
        latitude: farmerData.latitude,
        longitude: farmerData.longitude,
      };

      const response = await userAPI.register(userData);

      if (response.message === 'User Created Successfully') {
        toast.success('Farmer personal details registered successfully!');
        setRegisteredFarmerId(farmerData.nic);
        setStep(2);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 20000);
      } else {
        toast.error('Failed to register farmer. Please try again.');
        setError('Failed to register farmer. Please try again.');
      }
    } catch (err: any) {
      console.error('Error registering farmer:', err);
      const errMessage = err.response?.data?.message || 'Failed to register farmer. Please try again.';
      setError(errMessage);
      toast.error(errMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update farm data in array
  const handleFarmChange = (index: number, field: keyof FarmData, value: string | number) => {
    const updatedFarms = [...farms];
    updatedFarms[index] = { ...updatedFarms[index], [field]: value };
    setFarms(updatedFarms);
  };

  // Add another farm
  const addFarm = () => {
    setFarms([...farms, { farmName: '', crop: '', sizeInAcres: '', location: '', district: '', division: '' }]);
  };

  // Remove farm
  const removeFarm = (index: number) => {
    if (farms.length > 1) {
      setFarms(farms.filter((farm: FarmData, i: number) => i !== index));
    }
  };

  // Submit all farms
  const handleSubmitFarms = async (e: any) => {
    e.preventDefault();

    // Check if a farmer is selected in existing mode
    if (mode === 'existing' && !selectedFarmer) {
      setError('Please select a farmer first');
      return;
    }

    const validFarms = farms.filter((farm: FarmData) =>
      farm.farmName && farm.crop && farm.sizeInAcres && farm.location
    );

    if (validFarms.length === 0) {
      setError('Please fill in at least one complete farm entry');
      toast.error('Please fill in at least one complete farm entry');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const farmerNIC = mode === 'existing'
        ? (selectedFarmer?.nic || '')
        : (registeredFarmerId || farmerData.nic);

      const district = mode === 'existing'
        ? (selectedFarmer?.district || '')
        : farmerData.district;

      const farmIds: string[] = [];

      for (const farm of validFarms) {
        const response = await farmAPI.createFarm({
          farmName: farm.farmName,
          crop: farm.crop,
          sizeInAcres: Number(farm.sizeInAcres),
          location: farm.location,
          farmerNIC: farmerNIC,
          district: farm.district || district,
          division: farm.division || farmerData.division || '',
          status: 'active',
        });

        // Capture farm ID from response - prioritize custom farmId over MongoDB _id
        if (response?.farm?.farmId || response?.farm?._id) {
          farmIds.push(response.farm.farmId || response.farm._id);
        }
      }

      toast.success('Farmer and farms registered successfully!');
      setCreatedFarmIds(farmIds);
      setSuccess(true);
      setTimeout(() => {
        // Reset form based on mode
        setFarms([{ farmName: '', crop: '', sizeInAcres: '', location: '', district: '', division: '' }]);
        setSuccess(false);
        setError(null);
        setCreatedFarmIds([]);

        if (mode === 'new') {
          setFarmerData({
            firstName: '', lastName: '', nic: '', address: '',
            district: '', division: '', phone: '', email: '', password: '',
            latitude: null, longitude: null,
          });
          setStep(1);
          setRegisteredFarmerId(null);
          setGeneratedPassword(null);
          setProfileImage(null);
          setProfileImagePreview(null);
        } else {
          // In existing mode, reset selection to allow adding more farms
          setSelectedFarmer(null);
          setFarmerSearchTerm('');
        }
      }, 10000); // Display for 10 seconds to allow time to copy Farm IDs
    } catch (err: any) {
      console.error('Error creating farms:', err);
      const errMessage = err.response?.data?.message || 'Failed to create farms. Please try again.';
      setError(errMessage);
      toast.error(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {mode === 'new' ? 'Register Farmer' : 'Add Farm to Existing Farmer'}
        </h2>
        <p className="text-gray-600">
          {mode === 'new' ? 'Register a new farmer and add their farm details' : 'Add new farms to an existing farmer'}
        </p>
      </div>

      {/* Mode Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-md font-semibold text-gray-800 mb-4">Select Action</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleModeChange('new')}
            className={`p-4 rounded-lg border-2 transition-all ${mode === 'new'
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Register New Farmer</div>
                <div className="text-sm opacity-75">Create new farmer account with farms</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('existing')}
            className={`p-4 rounded-lg border-2 transition-all ${mode === 'existing'
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Add Farm to Existing Farmer</div>
                <div className="text-sm opacity-75">Add new farms for registered farmers</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Existing Farmer Selector */}
      {mode === 'existing' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-md font-semibold text-gray-800 mb-4">Select Farmer</h3>

          {loadingFarmers ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="text-gray-600 mt-2">Loading farmers...</p>
            </div>
          ) : (
            <>
              <div className="relative mb-4" ref={farmerInputRef}>
                <input
                  type="text"
                  placeholder="Search farmer by name, NIC, or email..."
                  value={farmerSearchTerm}
                  onChange={(e) => {
                    setFarmerSearchTerm(e.target.value);
                    setShowFarmerDropdown(true);
                  }}
                  onFocus={() => setShowFarmerDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />

                {showFarmerDropdown && filteredFarmers.length > 0 && farmerInputRef.current && (
                  <div
                    style={{
                      position: 'fixed',
                      top: farmerInputRef.current.offsetHeight + (farmerInputRef.current.getBoundingClientRect().top + farmerInputRef.current.offsetHeight) + 8,
                      left: farmerInputRef.current.getBoundingClientRect().left,
                      width: farmerInputRef.current.offsetWidth,
                      zIndex: 9999,
                    }}
                    className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
                  >
                    {filteredFarmers.map((farmer) => (
                      <button
                        key={farmer._id}
                        type="button"
                        onClick={() => handleSelectFarmer(farmer)}
                        className="w-full px-4 py-3 text-left hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900">
                          {farmer.firstName || ''} {farmer.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-600">
                          NIC: {farmer.nic || 'N/A'} | {farmer.email || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {farmer.division || 'N/A'}, {farmer.district || 'N/A'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedFarmer && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">
                        Selected: {selectedFarmer.firstName || ''} {selectedFarmer.lastName || ''}
                      </p>
                      <p className="text-sm text-green-700">
                        NIC: {selectedFarmer.nic || 'N/A'} | {selectedFarmer.division || 'N/A'}, {selectedFarmer.district || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-700 font-medium">
              {mode === 'new' && step === 2
                ? 'Farmer registered successfully! Now add their farm details.'
                : 'Farm(s) registered successfully!'}
            </p>

            {/* Display Farm IDs */}
            {createdFarmIds.length > 0 && (
              <div className="mt-3 bg-white border border-green-300 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium mb-2">Farm ID(s):</p>
                <div className="space-y-1">
                  {createdFarmIds.map((farmId, index) => (
                    <p key={farmId} className="text-xs text-gray-600">
                      Farm {index + 1}: <span className="font-mono font-semibold text-green-900">{farmId}</span>
                    </p>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">💾 Farm IDs saved successfully</p>
              </div>
            )}

            {mode === 'new' && step === 2 && generatedPassword && (
              <div className="mt-3 bg-white border border-green-300 rounded-lg p-3">
                <p className="text-sm text-gray-700 font-medium mb-1">Auto-generated Login Credentials:</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Email: <span className="font-mono font-semibold text-gray-900">{farmerData.email}</span></p>
                  <p className="text-xs text-gray-600">Password: <span className="font-mono font-semibold text-gray-900">{generatedPassword}</span></p>
                </div>
                <p className="text-xs text-amber-600 mt-2">⚠️ Please save these credentials and share with the farmer</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Step Indicators - Only show for new farmer registration */}
      {mode === 'new' && (
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
            1
          </div>
          <div className={`flex-1 h-1 ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
            2
          </div>
        </div>
      )}

      {/* Step 1: Farmer Registration */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Step 1: Farmer Information</h3>
          </div>

          <form onSubmit={handleRegisterFarmer} className="p-6 space-y-6">
            {/* Profile Picture Upload */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4">Profile Picture</h4>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-green-100 bg-gray-100 flex items-center justify-center">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  {profileImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileImage(null);
                        setProfileImagePreview(null);
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Remove image"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 rounded-lg cursor-pointer transition-colors w-fit">
                    <Camera className="w-5 h-5" />
                    <span className="text-sm font-medium">Choose Profile Picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProfileImage(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-600 mt-2">Recommended: Square image, at least 200x200px</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4">Personal Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={farmerData.firstName}
                      onChange={(e) => setFarmerData({ ...farmerData, firstName: e.target.value })}
                      placeholder="Enter first name"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={farmerData.lastName}
                    onChange={(e) => setFarmerData({ ...farmerData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIC Number *
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={nicInputRef}
                      type="text"
                      value={farmerData.nic}
                      onChange={(e) => {
                        const raw = e.target.value.toUpperCase().trim();
                        setFarmerData({ ...farmerData, nic: raw });
                        setError(null);
                        (e.target as HTMLInputElement).setCustomValidity('');
                      }}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) {
                          target.setCustomValidity('Please enter NIC number');
                        } else {
                          target.setCustomValidity('Wrong NIC number entered');
                        }
                      }}
                      onInput={(e) => {
                        (e.target as HTMLInputElement).setCustomValidity('');
                      }}
                      placeholder="199512345678 or 951234678V"
                      pattern="^([0-9]{12}|[0-9]{9}V)$"
                      title="NIC number should be 12 digits or 9 digits followed by uppercase V"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={farmerData.phone}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setFarmerData({ ...farmerData, phone: val });
                        setError(null);
                        (e.target as HTMLInputElement).setCustomValidity('');
                      }}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) {
                          target.setCustomValidity('Please enter Phone Number');
                        } else {
                          target.setCustomValidity('Invalid Phone Number');
                        }
                      }}
                      onInput={(e) => {
                        (e.target as HTMLInputElement).setCustomValidity('');
                      }}
                      placeholder="0712345678"
                      pattern="^0[0-9]{9}$"
                      title="Phone number should be 10 digits and start with 0"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={farmerData.email}
                    onChange={(e) => setFarmerData({ ...farmerData, email: e.target.value })}
                    placeholder="farmer@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={farmerData.password}
                    onChange={(e) => setFarmerData({ ...farmerData, password: e.target.value })}
                    placeholder="Leave empty for auto-generated"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Email Verification Widget — shown when email field has a value */}
            {farmerData.email && farmerData.email.includes('@') && (
              <EmailVerificationWidget
                email={farmerData.email}
                firstName={farmerData.firstName || undefined}
                onVerified={() => setEmailVerified(true)}
                compact={false}
              />
            )}

            {/* Location Information */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4">Location Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District *
                  </label>
                  <select
                    value={farmerData.district}
                    onChange={(e) => setFarmerData({ ...farmerData, district: e.target.value, division: '' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select District</option>
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
                    value={farmerData.division}
                    onChange={(e) => setFarmerData({ ...farmerData, division: e.target.value })}
                    disabled={!farmerData.district}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">
                      {farmerData.district ? 'Select DS Division' : 'Select a district first'}
                    </option>
                    {farmerData.district && dsDivisions[farmerData.district]?.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>

                <AddressLocationPicker
                  address={farmerData.address}
                  onAddressChange={(addr) => setFarmerData(prev => ({ ...prev, address: addr }))}
                  onLocationConfirm={(data) => setFarmerData(prev => ({
                    ...prev,
                    address: data.address,
                    latitude: data.latitude,
                    longitude: data.longitude,
                  }))}
                  latitude={farmerData.latitude}
                  longitude={farmerData.longitude}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="flex-1 py-3 bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-5 h-5" />
                {uploadingImage ? 'Uploading Image...' : loading ? 'Registering...' : 'Next: Add Farms'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFarmerData({
                    firstName: '', lastName: '', nic: '', address: '',
                    district: '', division: '', phone: '', email: '', password: '',
                    latitude: null, longitude: null,
                  });
                  setProfileImage(null);
                  setProfileImagePreview(null);
                }}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Farm Details */}
      {step === 2 && (mode === 'new' || (mode === 'existing' && selectedFarmer)) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              {mode === 'new'
                ? `Step 2: Farm Details for ${farmerData.firstName} ${farmerData.lastName}`
                : `Farm Details for ${selectedFarmer ? `${selectedFarmer.firstName || ''} ${selectedFarmer.lastName || ''}` : 'Selected Farmer'}`
              }
            </h3>
            <p className="text-sm text-gray-600 mt-1">Add one or more farms for this farmer</p>
          </div>

          <form onSubmit={handleSubmitFarms} className="p-6 space-y-6">
            {/* Farm entries */}
            {farms.map((farm, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-800">Farm {index + 1}</h4>
                  {farms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFarm(index)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove farm"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Farm Name *
                    </label>
                    <input
                      type="text"
                      value={farm.farmName}
                      onChange={(e) => handleFarmChange(index, 'farmName', e.target.value)}
                      placeholder="e.g., Main Field"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Crop *
                    </label>
                    <select
                      value={farm.crop}
                      onChange={(e) => handleFarmChange(index, 'crop', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select Crop</option>
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
                      value={farm.sizeInAcres}
                      onChange={(e) => handleFarmChange(index, 'sizeInAcres', e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="e.g., 5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location/Area *
                    </label>
                    <input
                      type="text"
                      value={farm.location}
                      onChange={(e) => handleFarmChange(index, 'location', e.target.value)}
                      placeholder="e.g., North field"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                    <select
                      value={farm.district || farmerData.district}
                      onChange={(e) => handleFarmChange(index, 'district', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select District</option>
                      {districts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DS Division *</label>
                    <select
                      value={farm.division || ''}
                      onChange={(e) => handleFarmChange(index, 'division', e.target.value)}
                      disabled={!((farm.district || farmerData.district) && dsDivisions[farm.district || farmerData.district])}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">{(farm.district || farmerData.district) ? 'Select DS Division' : 'Select a district first'}</option>
                      {(dsDivisions[farm.district || farmerData.district] || []).map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Farm Button */}
            <button
              type="button"
              onClick={addFarm}
              className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-600 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Another Farm
            </button>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Registering Farms...' : 'Complete Registration'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}