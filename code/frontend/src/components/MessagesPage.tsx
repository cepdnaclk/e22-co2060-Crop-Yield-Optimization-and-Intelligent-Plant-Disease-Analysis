import { useState, useEffect } from 'react';
import { Send, Upload, FileText, Trash2, AlertCircle, CheckCircle2, Clock, Loader2, MessageSquare, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { inquiryAPI } from '../services/api';

export function MessagesPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submittedMessages, setSubmittedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { fetchInquiries(); }, []);

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
    } finally { setLoading(false); }
  };

  const categories = [
    { value: 'Natural Disaster', icon: '🌪️', color: '#F97316' },
    { value: 'Technical Issue', icon: '⚙️', color: '#3B82F6' },
    { value: 'Complaint', icon: '📋', color: '#8B5CF6' },
    { value: 'Subsidy Inquiry', icon: '💰', color: '#10B981' },
    { value: 'Equipment Damage', icon: '🔧', color: '#EF4444' },
    { value: 'Other', icon: '📝', color: '#6B7280' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setUploadedFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setUploadedFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (subject.trim() && category && message.trim()) {
      setSubmitting(true);
      try {
        const authDataStr = localStorage.getItem('agriconnect_auth');
        const authData = authDataStr ? JSON.parse(authDataStr) : null;
        const fullSubject = `[${category}] ${subject.trim()}`;
        let newInquiry = await inquiryAPI.createInquiry({
          subject: fullSubject, message: message.trim(), farmerId: authData?.userId,
        });
        if (uploadedFile) {
          try {
            const uploadResponse = await inquiryAPI.uploadDocuments(newInquiry._id, [uploadedFile]);
            newInquiry = uploadResponse.inquiry || newInquiry;
          } catch (uploadError) {
            console.error('Error uploading document:', uploadError);
            toast.error('Message submitted but document upload failed');
          }
        }
        setSubmittedMessages([newInquiry, ...submittedMessages]);
        setSubject(''); setCategory(''); setMessage(''); setUploadedFile(null);
        toast.success('Message submitted successfully!');
      } catch (error) {
        console.error("Failed to submit inquiry", error);
        toast.error("Failed to submit message. Please try again.");
      } finally { setSubmitting(false); }
    }
  };

  const pendingCount = submittedMessages.filter(m => m.status === 'Pending').length;
  const resolvedCount = submittedMessages.filter(m => m.status === 'Resolved').length;
  const totalCount = submittedMessages.length;
  const formComplete = subject.trim() && category && message.trim();

  const getCategoryStyle = (cat: string) => {
    const found = categories.find(c => c.value === cat);
    return found || { icon: '📝', color: '#6B7280' };
  };

  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
    Resolved: { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', icon: CheckCircle2, label: 'Resolved' },
    'Under Review': { bg: '#EFF6FF', text: '#1E40AF', border: '#93C5FD', icon: Clock, label: 'Under Review' },
    Pending: { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D', icon: AlertCircle, label: 'Pending' },
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #065F46 0%, #047857 40%, #10B981 100%)',
        borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px',
          background: 'rgba(255,255,255,0.06)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '80px', width: '120px', height: '120px',
          background: 'rgba(255,255,255,0.04)', borderRadius: '50%',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', position: 'relative' }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: '12px',
            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield style={{ width: '24px', height: '24px', color: 'white' }} />
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '700', margin: 0 }}>Contact Admin</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>
              Report issues, request support, or submit inquiries
            </p>
          </div>
        </div>
        {/* Mini Stats */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', position: 'relative' }}>
          {[
            { label: 'Total', value: totalCount, bg: 'rgba(255,255,255,0.12)' },
            { label: 'Pending', value: pendingCount, bg: 'rgba(251,191,36,0.2)' },
            { label: 'Resolved', value: resolvedCount, bg: 'rgba(52,211,153,0.2)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: '12px', padding: '10px 18px',
              backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
              minWidth: '80px', textAlign: 'center',
            }}>
              <p style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form Section */}
      <div style={{
        background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '28px 32px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Sparkles style={{ width: '20px', height: '20px', color: '#10B981' }} />
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>New Report</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            {[subject.trim(), category, message.trim()].map((v, i) => (
              <div key={i} style={{
                width: '28px', height: '4px', borderRadius: '99px',
                background: v ? '#10B981' : '#E5E7EB', transition: 'background 0.3s ease',
              }} />
            ))}
            <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '6px' }}>
              {[subject.trim(), category, message.trim()].filter(Boolean).length}/3
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Subject <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject of your message"
              style={{
                width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px',
                fontSize: '14px', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box',
                background: '#FAFAFA',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#10B981'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Category Pills */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
              Category <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map(cat => {
                const isActive = category === cat.value;
                return (
                  <button key={cat.value} onClick={() => setCategory(cat.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '99px', fontSize: '13px', fontWeight: '500',
                      border: isActive ? `2px solid ${cat.color}` : '2px solid #E5E7EB',
                      background: isActive ? `${cat.color}12` : '#FAFAFA',
                      color: isActive ? cat.color : '#6B7280',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.background = `${cat.color}08`; }}}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#FAFAFA'; }}}
                  >
                    <span>{cat.icon}</span> {cat.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                Message <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: message.length > 500 ? '#EF4444' : '#9CA3AF' }}>
                {message.length}/1000
              </span>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue, complaint, or inquiry in detail..."
              rows={5} maxLength={1000}
              style={{
                width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: '12px',
                fontSize: '14px', outline: 'none', resize: 'none', transition: 'all 0.2s ease',
                boxSizing: 'border-box', background: '#FAFAFA', lineHeight: '1.6',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#10B981'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#FAFAFA'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* File Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Supporting Documents <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(Optional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#10B981' : uploadedFile ? '#10B981' : '#D1D5DB'}`,
                borderRadius: '14px', padding: '24px', textAlign: 'center',
                background: dragOver ? '#ECFDF5' : uploadedFile ? '#F0FDF4' : '#FAFAFA',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }}
            >
              <input type="file" id="document-upload" onChange={handleFileChange} className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} />
              {uploadedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', background: '#D1FAE5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileText style={{ width: '20px', height: '20px', color: '#059669' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#065F46', margin: 0 }}>{uploadedFile.name}</p>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button onClick={() => setUploadedFile(null)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #FCA5A5',
                      background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', marginLeft: '8px',
                    }}>
                    <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                  </button>
                </div>
              ) : (
                <label htmlFor="document-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <Upload style={{ width: '32px', height: '32px', color: dragOver ? '#10B981' : '#9CA3AF', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 4px' }}>
                    Drag & drop or <span style={{ color: '#10B981', fontWeight: '600' }}>browse</span>
                  </p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>PDF, DOC, JPG, PNG (Max 10MB)</p>
                </label>
              )}
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!formComplete || submitting}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none', fontSize: '15px',
              fontWeight: '600', cursor: formComplete && !submitting ? 'pointer' : 'not-allowed',
              background: formComplete ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : '#E5E7EB',
              color: formComplete ? 'white' : '#9CA3AF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: formComplete ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
              transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => { if (formComplete && !submitting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.35)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = formComplete ? '0 4px 14px rgba(16,185,129,0.3)' : 'none'; }}
          >
            {submitting ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: '18px', height: '18px' }} />}
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>

      {/* Messages History */}
      <div style={{
        background: 'white', borderRadius: '20px', border: '1px solid #E5E7EB',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 32px', borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare style={{ width: '20px', height: '20px', color: '#10B981' }} />
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>Your Messages</h3>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>{totalCount} total submissions</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Loader2 style={{ width: '36px', height: '36px', color: '#10B981', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>Loading messages...</p>
            </div>
          ) : submittedMessages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {submittedMessages.map((msg) => {
                let displaySubject = msg.subject;
                let displayCategory = 'Other';
                const match = msg.subject.match(/^\[(.*?)\] (.*)$/);
                if (match) { displayCategory = match[1]; displaySubject = match[2]; }
                const catStyle = getCategoryStyle(displayCategory);
                const status = statusConfig[msg.status] || statusConfig.Pending;
                const StatusIcon = status.icon;

                return (
                  <div key={msg._id || msg.id} style={{
                    border: '1px solid #E5E7EB', borderLeft: `4px solid ${catStyle.color}`,
                    borderRadius: '14px', padding: '18px 20px',
                    transition: 'all 0.25s ease', cursor: 'default',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.07)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                          background: `${catStyle.color}15`, color: catStyle.color, whiteSpace: 'nowrap',
                        }}>
                          {catStyle.icon} {displayCategory}
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displaySubject}
                        </h4>
                      </div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px',
                        borderRadius: '99px', fontSize: '11px', fontWeight: '600', flexShrink: 0,
                        background: status.bg, color: status.text, border: `1px solid ${status.border}`,
                      }}>
                        <StatusIcon style={{ width: '12px', height: '12px' }} />
                        {status.label}
                      </div>
                    </div>
                    {/* Message */}
                    <p style={{
                      fontSize: '13px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {msg.message}
                    </p>
                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                        {new Date(msg.createdAt || msg.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '11px', color: '#D1D5DB' }}>•</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{timeAgo(msg.createdAt || msg.date)}</span>
                      {msg.hasDocument && (
                        <>
                          <span style={{ fontSize: '11px', color: '#D1D5DB' }}>•</span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11px', color: '#059669', fontWeight: '500',
                          }}>
                            <FileText style={{ width: '12px', height: '12px' }} /> Attachment
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: '#F0FDF4',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <MessageSquare style={{ width: '28px', height: '28px', color: '#10B981' }} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: '0 0 4px' }}>No messages yet</p>
              <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>Submit your first report using the form above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}