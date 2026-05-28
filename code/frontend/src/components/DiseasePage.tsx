import { useState } from 'react';
import { Upload, MapPin, Loader2, CheckCircle, AlertCircle, Send, Microscope, FileText, Shield, Leaf } from 'lucide-react';
import uploadfile from '../utils/mediaUpload';
import { DiseaseLocationPicker } from './DiseaseLocationPicker';

type PredictionResult = {
  class_id: number;
  disease: string;
  confidence: number;
  all_probabilities: Record<string, number>;
  imageUrl?: string;
};

const DISEASE_DETAILS: Record<string, { label: string; description: string; treatment: string; prevention: string }> = {
  bacterial_leaf_blight: {
    label: 'Bacterial Leaf Blight',
    description: 'A bacterial disease that causes wilting, yellowing, and leaf drying.',
    treatment: 'Remove infected plants, avoid excess nitrogen, and use recommended bactericide guidance from local agronomy services.',
    prevention: 'Use resistant varieties, keep field drainage good, and avoid unnecessary leaf damage during field work.',
  },
  brown_spot: {
    label: 'Brown Spot',
    description: 'A fungal disease that creates brown lesions on leaves and can reduce grain quality.',
    treatment: 'Apply recommended fungicide practices and correct nutrient imbalance, especially potassium and silicon where needed.',
    prevention: 'Maintain balanced fertilization, avoid water stress, and monitor fields regularly during humid periods.',
  },
  healthy: {
    label: 'Healthy',
    description: 'The uploaded leaf does not show a strong sign of disease from the model output.',
    treatment: 'No treatment is needed. Keep monitoring the crop and maintain normal agronomic practices.',
    prevention: 'Continue routine scouting, proper irrigation, and balanced fertilization to preserve crop health.',
  },
  leaf_blast: {
    label: 'Leaf Blast',
    description: 'A common fungal rice disease that creates diamond-shaped lesions and rapid leaf damage.',
    treatment: 'Use a recommended fungicide program and remove heavily infected debris when possible.',
    prevention: 'Choose resistant varieties, avoid excess nitrogen, and maintain proper spacing for airflow.',
  },
  leaf_scald: {
    label: 'Leaf Scald',
    description: 'A fungal disease that appears as elongated lesions with pale centers and darker edges.',
    treatment: 'Apply an approved fungicide if recommended and reduce plant stress with balanced crop care.',
    prevention: 'Improve field sanitation, avoid over-fertilization, and inspect crops after wet weather.',
  },
  narrow_brown_spot: {
    label: 'Narrow Brown Spot',
    description: 'A fungal disease that produces narrow brown lines on leaves and can reduce photosynthesis.',
    treatment: 'Use fungicide guidance from local extension services and correct nutrient deficiencies.',
    prevention: 'Maintain healthy spacing, balanced fertilization, and regular disease scouting.',
  },
};

function formatDiseaseName(disease: string) {
  return DISEASE_DETAILS[disease]?.label ?? disease.replace(/_/g, ' ');
}

function getSeverity(confidence: number) {
  if (confidence >= 0.9) return 'High';
  if (confidence >= 0.7) return 'Medium';
  return 'Low';
}

const PREDICT_URL_ENDPOINTS = [
  'http://localhost:8000/api/predict_url',
  'https://ai-plant-disease-scanner.onrender.com/api/predict_url',
];

export function DiseasePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PredictionResult | null>(null);
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysisResult(null);
        setAnalysisError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !selectedFile) return;

    setIsAnalyzing(true);

    try {
      setAnalysisError('');

      const imageUrl = await uploadfile(selectedFile);
      let prediction: any = null;
      let lastError = 'Disease prediction failed';

      for (const endpoint of PREDICT_URL_ENDPOINTS) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: imageUrl,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            lastError = data.error || `Prediction failed at ${endpoint}`;
            continue;
          }

          prediction = data.prediction;
          break;
        } catch (endpointError: any) {
          lastError = endpointError?.message || `Unable to reach ${endpoint}`;
        }
      }

      if (!prediction) {
        throw new Error(lastError);
      }

      setAnalysisResult({
        class_id: prediction.class_id,
        disease: prediction.disease,
        confidence: prediction.confidence,
        all_probabilities: prediction.all_probabilities,
        imageUrl,
      });
      setIsAnalyzing(false);
    } catch (error: any) {
      setAnalysisError(error?.message || 'Failed to analyze the image');
      setIsAnalyzing(false);
    }
  };

  const handleSendReport = () => {
    if (!analysisResult) return;
    // Simulate sending report
    setTimeout(() => {
      setReportSent(true);
    }, 1500);
  };



  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(135deg, #065F46 0%, #047857 50%, #059669 100%)', borderRadius: '16px', padding: '28px 32px', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-30px', right: '80px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <Microscope style={{ width: '26px', height: '26px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>Disease Detection & Analysis</h2>
            <p style={{ fontSize: '13px', opacity: 0.85, margin: '2px 0 0' }}>Upload a leaf image for AI-powered disease identification</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-5">
        {/* Image Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          {!selectedImage ? (
            <label className="flex flex-col items-center justify-center w-full h-64 md:h-80 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mb-4" />
                <p className="mb-2 text-xs md:text-sm text-gray-600 font-medium text-center px-4">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected crop"
                  className="w-full h-64 md:h-80 object-cover rounded-xl"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedFile(null);
                    setAnalysisResult(null);
                    setAnalysisError('');
                  }}
                  className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Location Picker with Map */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <DiseaseLocationPicker
            location={location}
            onLocationChange={setLocation}
            onLocationSelect={(data) => {
              setLocation(data.address);
              setLocationLat(data.latitude);
              setLocationLng(data.longitude);
            }}
            latitude={locationLat}
            longitude={locationLng}
          />
        </div>



      </div>

      {/* Right Column */}
      <div className="space-y-5">
        {/* Additional Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <label className="block">
            <span className="text-gray-700 font-medium mb-2 block text-sm md:text-base flex items-center gap-2"><FileText className="w-4 h-4 text-green-600" />Additional Notes (Optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe symptoms, when noticed, affected area size, etc."
              rows={4}
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm md:text-base"
            />
          </label>
        </div>

        {/* Advisory Tips */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm md:text-base flex items-center gap-2"><Shield className="w-4 h-4 text-green-600" />Quick Tips</h3>
          <ul className="space-y-2.5 text-xs md:text-sm text-gray-700">
            <li className="flex items-start gap-2"><Leaf className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /><span>Take clear, well-lit photos of affected leaves</span></li>
            <li className="flex items-start gap-2"><Leaf className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Include both close-up and wide shots</span></li>
            <li className="flex items-start gap-2"><Leaf className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" /><span>Mark exact location for field officer visits</span></li>
            <li className="flex items-start gap-2"><Leaf className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /><span>Note when symptoms first appeared</span></li>
          </ul>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!selectedImage || !selectedFile || isAnalyzing}
          style={{ background: (!selectedImage || !selectedFile || isAnalyzing) ? '#D1D5DB' : 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)', boxShadow: (!selectedImage || !selectedFile || isAnalyzing) ? 'none' : '0 4px 14px rgba(217,119,6,0.35)' }}
          className="w-full py-3 md:py-4 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all text-sm md:text-base"
        >
          {isAnalyzing ? (
            <><Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />Uploading and Analyzing...</>
          ) : (
            <><Microscope className="w-4 h-4 md:w-5 md:h-5" />Analyze Disease</>
          )}
        </button>

        {analysisError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {analysisError}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
            <div className="flex items-start gap-3 md:gap-4 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-1">Analysis Complete</h3>
                <p className="text-xs md:text-sm text-gray-600">AI model has identified the disease</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs md:text-sm text-gray-600 mb-1">Detected Disease</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{formatDiseaseName(analysisResult.disease)}</p>
              </div>

              <div className="flex gap-4 md:gap-6">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Confidence</p>
                  <p className="text-base md:text-lg font-semibold text-green-600">{(analysisResult.confidence * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Severity</p>
                  <span className={`inline-flex px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-medium ${getSeverity(analysisResult.confidence) === 'High'
                      ? 'bg-red-100 text-red-700'
                      : getSeverity(analysisResult.confidence) === 'Medium'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {getSeverity(analysisResult.confidence)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm">Description</h4>
                <p className="text-xs md:text-sm text-gray-700">{DISEASE_DETAILS[analysisResult.disease]?.description ?? 'No description available for this prediction.'}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm">Recommended Treatment</h4>
                <p className="text-xs md:text-sm text-gray-700">{DISEASE_DETAILS[analysisResult.disease]?.treatment ?? 'Follow agricultural guidance for treatment.'}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
                <h4 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm">Prevention</h4>
                <p className="text-xs md:text-sm text-gray-700">{DISEASE_DETAILS[analysisResult.disease]?.prevention ?? 'Continue monitoring and follow local crop protection practices.'}</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4">
                <h4 className="font-semibold text-gray-800 mb-3 text-xs md:text-sm">Backend Probabilities</h4>
                <div className="space-y-2">
                  {Object.entries(analysisResult.all_probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-xs md:text-sm">
                        <span className="text-gray-700">{formatDiseaseName(label)}</span>
                        <span className="font-medium text-gray-900">{(value * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Send Report Button */}
            <button
              onClick={handleSendReport}
              disabled={reportSent}
              className="w-full py-3 md:py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all text-sm md:text-base"
            >
              {reportSent ? (
                <>
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                  Report Sent to Agricultural Officer
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                  Send Report to Agricultural Officer
                </>
              )}
            </button>

            {reportSent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
                <p className="text-xs md:text-sm text-green-800">
                  ✓ Your disease report has been successfully sent to your assigned agricultural officer. They will review it and contact you soon.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}