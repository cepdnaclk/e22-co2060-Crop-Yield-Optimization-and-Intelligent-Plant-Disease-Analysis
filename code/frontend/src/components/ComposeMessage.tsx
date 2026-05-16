import React, { useState } from 'react';

type Props = {
  onSubmit: (payload: { subject: string; category: string; message: string; files: File[] }) => Promise<void>;
};

export default function ComposeMessage({ onSubmit }: Props) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => subject.trim() && category && message.trim();

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setFiles(Array.from(fileList));
  };

  const clearForm = () => {
    setSubject('');
    setCategory('');
    setMessage('');
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({ subject, category, message, files });
      clearForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-card" style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #ddd' }}>
      <style>{`/* Scoped minimal styles from provided template */
        .compose-wrap * { box-sizing: border-box }
        .upload-chip { font-size:12px; padding:4px 10px; background:#eaf3de; color:#3b6d11; border-radius:20px; display:inline-flex; gap:6px; align-items:center; }
      `}</style>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>New Message</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Subject <span style={{ color: '#e24b4a' }}>*</span></label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Flood damage to paddy fields" style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Category <span style={{ color: '#e24b4a' }}>*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid #ccc' }}>
            <option value="">Select a category</option>
            <option>Natural Disaster</option>
            <option>Technical Issue</option>
            <option>Complaint</option>
            <option>Subsidy Inquiry</option>
            <option>Equipment Damage</option>
            <option>Other</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Message <span style={{ color: '#e24b4a' }}>*</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Describe your issue, complaint, or inquiry in detail..." style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid #ccc', resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Attachments (optional)</label>
          <div style={{ border: '1px dashed #ccc', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('compose-file-input')?.click()}>
            <div style={{ fontSize: 14, color: '#666' }}>{files.length ? files.map((f) => (<span key={f.name} className="upload-chip">{f.name}</span>)) : 'Click to upload document or photo'}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>PDF, DOC, JPG, PNG — max 10MB</div>
          </div>
          <input id="compose-file-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={clearForm} style={{ padding: '9px 18px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent' }}>Clear</button>
          <button type="button" onClick={handleSubmit} disabled={!validate() || submitting} style={{ padding: '9px 18px', borderRadius: 8, background: submitting ? '#ccc' : '#1a6b3a', color: '#fff', border: 'none' }}>{submitting ? 'Sending...' : 'Send Message'}</button>
        </div>
      </div>
    </div>
  );
}
