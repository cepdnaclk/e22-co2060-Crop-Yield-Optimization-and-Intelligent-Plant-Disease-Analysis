import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  onSubmit: (payload: { subject: string; category: string; message: string; files: File[] }) => Promise<void>;
};

export default function ComposeMessage({ onSubmit }: Props) {
  const { t } = useTranslation();
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
          <div style={{ fontSize: 18, fontWeight: 500 }}>{t('composeMessage.newMessage')}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>{t('composeMessage.subject')} <span style={{ color: '#e24b4a' }}>*</span></label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('composeMessage.subjectPlaceholder')} style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid #ccc' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>{t('composeMessage.category')} <span style={{ color: '#e24b4a' }}>*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid #ccc' }}>
            <option value="">{t('composeMessage.selectCategory')}</option>
            <option value="Natural Disaster">{t('composeMessage.naturalDisaster')}</option>
            <option value="Technical Issue">{t('composeMessage.technicalIssue')}</option>
            <option value="Complaint">{t('composeMessage.complaint')}</option>
            <option value="Subsidy Inquiry">{t('composeMessage.subsidyInquiry')}</option>
            <option value="Equipment Damage">{t('composeMessage.equipmentDamage')}</option>
            <option value="Other">{t('composeMessage.other')}</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>{t('composeMessage.message')} <span style={{ color: '#e24b4a' }}>*</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder={t('composeMessage.messagePlaceholder')} style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid #ccc', resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>{t('composeMessage.attachmentsOptional')}</label>
          <div style={{ border: '1px dashed #ccc', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('compose-file-input')?.click()}>
            <div style={{ fontSize: 14, color: '#666' }}>{files.length ? files.map((f) => (<span key={f.name} className="upload-chip">{f.name}</span>)) : t('composeMessage.clickToUpload')}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{t('composeMessage.fileHelp')}</div>
          </div>
          <input id="compose-file-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={clearForm} style={{ padding: '9px 18px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent' }}>{t('composeMessage.clear')}</button>
          <button type="button" onClick={handleSubmit} disabled={!validate() || submitting} style={{ padding: '9px 18px', borderRadius: 8, background: submitting ? '#ccc' : '#1a6b3a', color: '#fff', border: 'none' }}>{submitting ? t('composeMessage.sending') : t('composeMessage.sendMessage')}</button>
        </div>
      </div>
    </div>
  );
}
