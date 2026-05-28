import { useState } from 'react';
import { X, Upload, Camera, CheckCircle, Loader2, File, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { inquiryAPI } from '../services/api';
import { getAuthData } from '../utils/authUtils';

interface DiseaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiseaseReportModal({ isOpen, onClose }: DiseaseReportModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisResult({
        disease: 'Leaf Blast',
        confidence: 92.5,
        severity: 'High',
        description: 'Leaf blast is a fungal disease caused by Pyricularia oryzae. It affects leaves, nodes, and panicles.',
        treatment: 'Apply Tricyclazole 75% WP at 0.6g/L. Spray every 7-10 days until symptoms reduce.',
        prevention: 'Use resistant varieties, maintain proper spacing, avoid excessive nitrogen fertilization.',
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSupportingDocuments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeDocument = (index: number) => {
    setSupportingDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const authData = getAuthData();

      if (!authData?.user?._id) {
        toast.error('User not authenticated');
        return;
      }

      // Create inquiry
      const inquiryData = {
        subject: `[Disease Report] ${analysisResult?.disease || 'Crop Disease'}`,
        message: `Disease: ${analysisResult?.disease || 'Unknown'}\nConfidence: ${analysisResult?.confidence || 'N/A'}%\nSeverity: ${analysisResult?.severity || 'N/A'}\n\nAdditional Notes:\n${notes}`,
        farmerId: authData.user._id,
      };

      const inquiry = await inquiryAPI.createInquiry(inquiryData);

      // Upload supporting documents if any
      if (supportingDocuments.length > 0) {
        const uploadResponse = await inquiryAPI.uploadDocuments(inquiry._id, supportingDocuments);
        // Use the updated inquiry from response which includes documents
      }

      toast.success('Disease report submitted successfully! Your district officer will review it shortly.');
      onClose();
      setSelectedImage(null);
      setAnalysisResult(null);
      setNotes('');
      setSupportingDocuments([]);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-gray-800 text-xl">Report Disease</h2>
            <p className="text-gray-600 text-sm mt-1">Upload crop images for AI-powered disease detection</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image Upload Area */}
          <div>
            <label className="block text-gray-700 font-medium mb-3">Upload Disease Image</label>
            {!selectedImage ? (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50/50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
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
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected crop"
                  className="w-full h-64 object-cover rounded-xl"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysisResult(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          {selectedImage && !analysisResult && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all transform hover:scale-105 disabled:scale-100 shadow-lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyzing with AI Model...
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  Analyze Disease with AI
                </>
              )}
            </button>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-800 font-semibold text-lg mb-2">Analysis Complete</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Detected Disease:</p>
                        <p className="text-gray-900 font-semibold text-xl">{analysisResult.disease}</p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Confidence:</p>
                          <p className="text-green-600 font-semibold">{analysisResult.confidence}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Severity:</p>
                          <span className="inline-flex px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            {analysisResult.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                <p className="text-gray-700 text-sm">{analysisResult.description}</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Recommended Treatment</h4>
                <p className="text-gray-700 text-sm">{analysisResult.treatment}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Prevention Tips</h4>
                <p className="text-gray-700 text-sm">{analysisResult.prevention}</p>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information about the disease symptoms, when you first noticed it, etc."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Supporting Documents */}
          <div>
            <label className="block text-gray-700 font-medium mb-3">Supporting Documents (Optional)</label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF, PNG, JPG (MAX 10MB each, up to 5 files)</p>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleDocumentUpload}
              />
            </label>

            {/* Uploaded Documents List */}
            {supportingDocuments.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
                {supportingDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <File className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> AI analysis results will be reviewed by your district officer.
              They may contact you for additional information or site visit if needed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedImage || !analysisResult || isSubmitting}
              className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}