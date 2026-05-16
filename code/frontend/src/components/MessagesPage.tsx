import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Upload,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Info,
  Type,
  LayoutGrid,
  Flag,
  MessageSquare,
  Paperclip,
  CloudRain,
  AlertTriangle,
  HelpCircle,
  Sprout,
  Bug,
  Ellipsis,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { inquiryAPI } from '../services/api';

export function MessagesPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [submittedMessages, setSubmittedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const data = await inquiryAPI.getAllInquiries();
      // Assume the backend returns all inquiries, we need to filter if it doesn't filter by user, 
      // but since farmer fetching all vs admin fetching all hasn't been separated in backend, 
      // let's just get the current user ID and filter locally for now to be safe, 
      // or assume the backend sends all and we show all (for demo purposes if farmer sees all).
      // Wait, let's filter by the logged in user ID if available in local storage.
      const authDataStr = localStorage.getItem('agriconnect_auth');
      if (authDataStr) {
        const authData = JSON.parse(authDataStr);
        const myInquiries = data.inquiries?.filter((inq: any) =>
          inq.farmer?._id === authData.userId || inq.farmer === authData.userId
        ) || [];
        setSubmittedMessages(myInquiries);
      }
    } catch (error) {
      console.error("Failed to fetch inquiries", error);
      toast.error("Failed to load your previous messages");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Natural Disaster', icon: CloudRain },
    { name: 'Complaint', icon: AlertTriangle },
    { name: 'Inquiry', icon: HelpCircle },
    { name: 'Crop Issue', icon: Sprout },
    { name: 'Pest & Disease', icon: Bug },
    { name: 'Other', icon: Ellipsis },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    const validFiles = selectedFiles.filter((file) => {
      const typeAllowed = allowedTypes.includes(file.type);
      const sizeAllowed = file.size <= 10 * 1024 * 1024;

      if (!typeAllowed) {
        toast.error(`${file.name}: unsupported file type`);
      }

      if (!sizeAllowed) {
        toast.error(`${file.name}: file exceeds 10MB`);
      }

      return typeAllowed && sizeAllowed;
    });

    const mergedFiles = [...uploadedFiles, ...validFiles].slice(0, 5);
    if (uploadedFiles.length + validFiles.length > 5) {
      toast.error('Maximum 5 attachments allowed');
    }

    setUploadedFiles(mergedFiles);

    // Allow selecting the same file again later
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setSubject('');
    setCategory('');
    setMessage('');
    setPriority('low');
    setUploadedFiles([]);
    setShowSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (subject.trim() && category && message.trim()) {
      setSubmitting(true);
      try {
        const authDataStr = localStorage.getItem('agriconnect_auth');
        const authData = authDataStr ? JSON.parse(authDataStr) : null;
        console.log("Auth data:", authData);

        const fullSubject = `[${category}] ${subject.trim()} (${priority.toUpperCase()} PRIORITY)`;
        let newInquiry = await inquiryAPI.createInquiry({
          subject: fullSubject,
          message: message.trim(),
          farmerId: authData?.userId,
        });
        console.log("Inquiry created:", newInquiry);

        // Upload supporting documents if provided
        if (uploadedFiles.length > 0) {
          try {
            console.log("Uploading files:", uploadedFiles.map((f) => f.name));
            const uploadResponse = await inquiryAPI.uploadDocuments(newInquiry._id, uploadedFiles);
            console.log("Upload response:", uploadResponse);
            // Use the updated inquiry from the upload response which includes documents
            newInquiry = uploadResponse.inquiry || newInquiry;
            console.log("Updated inquiry with documents:", newInquiry);
          } catch (uploadError) {
            console.error('Error uploading document:', uploadError);
            console.error('Upload error details:', uploadError.response?.data);
            toast.error('Message submitted but document upload failed');
          }
        }

        setSubmittedMessages([newInquiry, ...submittedMessages]);
        clearForm();
        setShowSuccess(true);
        toast.success('Message submitted successfully!');
      } catch (error) {
        console.error("Failed to submit inquiry", error);
        toast.error("Failed to submit message. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-green-100 text-green-700';
      case 'Under Review':
        return 'bg-blue-100 text-blue-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Under Review':
        return <Clock className="w-4 h-4" />;
      case 'Pending':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const canSubmit = subject.trim() && category && message.trim() && !submitting;

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm md:text-base text-gray-600">
          Report damages, technical issues, complaints, or inquiries to the admin team
        </p>
      </div>

      {/* Submit New Message */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Message sent successfully!</h3>
            <p className="text-sm text-gray-600 mt-1">The admin team will review your message and respond shortly.</p>
            <button
              type="button"
              onClick={() => {
                clearForm();
                setShowSuccess(false);
              }}
              className="mt-4 px-5 py-2.5 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Send Another
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 pb-0">
              <div className="bg-emerald-50 rounded-lg px-3.5 py-2.5 flex items-start gap-2 mb-4">
                <Info className="w-4 h-4 text-emerald-800 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed text-emerald-900">
                  Be specific in your subject and message - detailed reports help admins respond faster.
                </p>
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  Subject <span className="text-red-500 text-sm">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Flood damage to paddy fields in sector 4"
                  maxLength={100}
                  className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-green-700"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Category <span className="text-red-500 text-sm">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(({ name, icon: Icon }) => {
                    const isSelected = category === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setCategory(name)}
                        className={`rounded-lg px-3 py-3 border text-center transition-colors flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-green-700 bg-emerald-50'
                            : 'border-gray-200 bg-gray-50 hover:border-green-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-800' : 'text-gray-500'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-600'}`}>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 mx-5 my-1" />

            <div className="p-5 pt-4 pb-0">
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" />
                  Priority
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('low')}
                    className={`flex-1 text-xs font-medium rounded-lg py-2 px-2 border transition-colors ${
                      priority === 'low'
                        ? 'border-lime-700 bg-lime-100 text-lime-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('medium')}
                    className={`flex-1 text-xs font-medium rounded-lg py-2 px-2 border transition-colors ${
                      priority === 'medium'
                        ? 'border-amber-700 bg-amber-100 text-amber-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`flex-1 text-xs font-medium rounded-lg py-2 px-2 border transition-colors ${
                      priority === 'high'
                        ? 'border-rose-700 bg-rose-100 text-rose-900'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    High
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message <span className="text-red-500 text-sm">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue, complaint, or inquiry in detail. Include location, date of occurrence, and any other relevant information..."
                  maxLength={1000}
                  rows={6}
                  className="w-full text-sm px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-green-700 resize-y min-h-[120px] leading-relaxed"
                />
              </div>

              <div className="mb-5">
                <label className="text-xs font-medium text-gray-600 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Attachments
                  <span className="text-[11px] text-gray-400 font-normal normal-case">(optional)</span>
                </label>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-gray-300 rounded-lg p-5 bg-gray-50 hover:border-green-700 transition-colors flex flex-col items-center gap-1.5"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload document or photo</span>
                  <span className="text-xs text-gray-400">PDF, DOC, JPG, PNG - max 10MB</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple
                />

                {uploadedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {uploadedFiles.map((file, index) => (
                      <span
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="text-xs px-2.5 py-1 rounded-full bg-lime-100 text-lime-900 inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="max-w-[180px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-lime-900 hover:text-red-700"
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-400">
                Message: <span className="text-gray-700 font-medium">{message.length}</span> / 1000
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white text-sm"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="px-4 py-2 rounded-lg border border-transparent bg-green-700 text-white hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed text-sm font-medium inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Send Message'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Previous Messages */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">Your Messages</h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">{submittedMessages.length} messages submitted</p>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-green-600 animate-spin" />
            </div>
          ) : submittedMessages.length > 0 ? (
            submittedMessages.map((msg) => {
              // Extract category from subject if it exists "[Category] Subject"
              let displaySubject = msg.subject;
              let displayCategory = "Other";
              const match = msg.subject.match(/^\[(.*?)\] (.*)$/);
              if (match) {
                displayCategory = match[1];
                displaySubject = match[2];
              }

              return (
                <div
                  key={msg._id || msg.id}
                  className="border border-gray-200 rounded-lg p-3 md:p-4 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 text-sm md:text-base mb-1">{displaySubject}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600">{new Date(msg.createdAt || msg.date).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {displayCategory}
                        </span>
                        {msg.hasDocument && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Attachment
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(msg.status)}`}>
                      {getStatusIcon(msg.status)}
                      <span>{msg.status}</span>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-700 leading-relaxed break-words">{msg.message}</p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm md:text-base text-gray-600">No messages submitted yet</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Contact admin when you need assistance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}