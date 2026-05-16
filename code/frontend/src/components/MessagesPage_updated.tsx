import { useState, useEffect } from 'react';
import { Send, Upload, FileText, Trash2, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { inquiryAPI } from '../services/api';
import ComposeMessage from './ComposeMessage';

export function MessagesPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submittedMessages, setSubmittedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const data = await inquiryAPI.getAllInquiries();
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
    'Natural Disaster',
    'Technical Issue',
    'Complaint',
    'Subsidy Inquiry',
    'Equipment Damage',
    'Other',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (subject.trim() && category && message.trim()) {
      setSubmitting(true);
      try {
        const authDataStr = localStorage.getItem('agriconnect_auth');
        const authData = authDataStr ? JSON.parse(authDataStr) : null;

        const fullSubject = `[${category}] ${subject.trim()}`;
        const newInquiry = await inquiryAPI.createInquiry({
          subject: fullSubject,
          message: message.trim(),
          farmerId: authData?.userId,
        });

        // Upload supporting document if provided
        if (uploadedFile) {
          try {
            await inquiryAPI.uploadDocuments(newInquiry._id, [uploadedFile]);
            console.log('Document uploaded successfully');
          } catch (uploadError: any) {
            console.error('Error uploading document:', uploadError);
            toast.error(uploadError.response?.data?.message || 'Message submitted but document upload failed');
          }
        }

        // Clear form
        setSubject('');
        setCategory('');
        setMessage('');
        setUploadedFile(null);
        toast.success('Message submitted successfully!');

        // Refresh inquiries list to get the latest data including documents
        setTimeout(() => {
          fetchInquiries();
        }, 500);
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
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Contact Admin</h1>
          <p className="text-sm md:text-base text-gray-600">
            Report damages, technical issues, complaints, or inquiries to the admin team
          </p>
        </div>

        {/* Submit New Message (uses supplied HTML-like compose component) */}
        <ComposeMessage
          onSubmit={async ({ subject: s, category: c, message: m, files }) => {
            setSubmitting(true);
            try {
              const authDataStr = localStorage.getItem('agriconnect_auth');
              const authData = authDataStr ? JSON.parse(authDataStr) : null;

              const fullSubject = `[${c}] ${s.trim()}`;
              const newInquiry = await inquiryAPI.createInquiry({
                subject: fullSubject,
                message: m.trim(),
                farmerId: authData?.userId,
              });

              if (files && files.length > 0) {
                try {
                  await inquiryAPI.uploadDocuments(newInquiry._id, files);
                  console.log('Document(s) uploaded successfully');
                } catch (uploadError: any) {
                  console.error('Error uploading document:', uploadError);
                  toast.error(uploadError.response?.data?.message || 'Message submitted but document upload failed');
                }
              }

              toast.success('Message submitted successfully!');
              setTimeout(() => fetchInquiries(), 500);
            } catch (error) {
              console.error('Failed to submit inquiry', error);
              toast.error('Failed to submit message. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }}
        />

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
                          {msg.documents && msg.documents.length > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {msg.documents.length} file(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(msg.status || 'Pending')}`}>
                        {getStatusIcon(msg.status || 'Pending')}
                        <span>{msg.status || 'Pending'}</span>
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
    </div>
  );
}
