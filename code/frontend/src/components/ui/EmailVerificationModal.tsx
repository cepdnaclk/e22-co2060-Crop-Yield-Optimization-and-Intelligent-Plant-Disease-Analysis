import { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Pencil,
  AlertCircle
} from 'lucide-react';
import { userAPI } from '../../services/api';

// ── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_COOLDOWN_S = 60;
const OTP_LENGTH         = 6;

// ── Types ──────────────────────────────────────────────────────────────────────
type SendStatus   = 'idle' | 'sending' | 'sent' | 'cooldown-error';
type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';
type Panel        = 'verify' | 'change-email';

interface Props {
  email:      string;
  firstName?: string;
  onVerified: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function EmailVerificationModal({ email: initialEmail, firstName, onVerified }: Props) {
  // Active email (updated after successful change)
  const [activeEmail, setActiveEmail] = useState(initialEmail);
  const [panel, setPanel] = useState<Panel>('verify');

  // ── Verify panel state ─────────────────────────────────────────────────────
  const [sendStatus,    setSendStatus]   = useState<SendStatus>('idle');
  const [sendMsg,       setSendMsg]      = useState('');
  const [otp,           setOtp]          = useState('');
  const [verifyStatus,  setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyMsg,     setVerifyMsg]    = useState('');
  const [cooldown,      setCooldown]     = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Change-email panel state ───────────────────────────────────────────────
  const [newEmail,      setNewEmail]     = useState('');
  const [changeStatus,  setChangeStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [changeMsg,     setChangeMsg]    = useState('');

  // Reset verify state when active email changes (after a successful change)
  useEffect(() => {
    setSendStatus('idle');
    setSendMsg('');
    setOtp('');
    setVerifyStatus('idle');
    setVerifyMsg('');
    setCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, [activeEmail]);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Cooldown timer ─────────────────────────────────────────────────────────
  function startCooldown(seconds = DEFAULT_COOLDOWN_S) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function fmtCooldown(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (cooldown > 0 || sendStatus === 'sending') return;
    setSendStatus('sending');
    setSendMsg('');
    setOtp('');
    setVerifyStatus('idle');
    setVerifyMsg('');
    try {
      const data = await userAPI.sendOtp(activeEmail, firstName);
      setSendStatus('sent');
      setSendMsg('Verification code sent. Please check your email.');
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN_S);
    } catch (err: any) {
      const d = err?.response?.data;
      if (err?.response?.status === 429 && d?.cooldownSeconds) {
        startCooldown(d.cooldownSeconds);
        setSendStatus('sent');
        setSendMsg(d.message || 'Please wait before requesting a new code.');
      } else {
        setSendStatus('idle');
        setSendMsg(d?.message || 'Failed to send code. Please try again.');
      }
    }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (otp.trim().length < OTP_LENGTH || verifyStatus === 'verifying') return;
    setVerifyStatus('verifying');
    setVerifyMsg('');
    try {
      await userAPI.verifyOtp(activeEmail, otp.trim());
      setVerifyStatus('success');
      setVerifyMsg('Email verified successfully!');
      setTimeout(onVerified, 1200);
    } catch (err: any) {
      const d = err?.response?.data;
      setVerifyStatus('error');
      setVerifyMsg(
        d?.expired ? 'Verification code expired. Please request a new one.' :
        d?.invalid ? 'Invalid verification code. Please try again.' :
        d?.message ?? 'Verification failed. Try again.'
      );
    }
  };

  // ── Change email ───────────────────────────────────────────────────────────
  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || changeStatus === 'loading') return;
    setChangeStatus('loading');
    setChangeMsg('');
    try {
      const data = await userAPI.changeEmail(trimmed);
      const updated = data.newEmail || trimmed;
      setActiveEmail(updated);
      setNewEmail('');
      setChangeStatus('idle');
      setChangeMsg('');
      setPanel('verify');
      setSendMsg(`Email updated to ${updated}. A new code has been sent.`);
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN_S);
      setSendStatus('sent');
    } catch (err: any) {
      setChangeStatus('error');
      setChangeMsg(err?.response?.data?.message || 'Failed to update email. Please try again.');
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const codeSent       = sendStatus === 'sent';
  const isVerified     = verifyStatus === 'success';
  const sendBtnLabel   = sendStatus === 'sending' ? 'Sending...'
                       : cooldown > 0             ? `Resend Code (${fmtCooldown(cooldown)})`
                       : codeSent                 ? 'Resend Verification Code'
                       :                           'Send Verification Code';
  const canSend        = cooldown === 0 && sendStatus !== 'sending' && !isVerified;
  const canVerify      = codeSent && otp.trim().length === OTP_LENGTH && verifyStatus !== 'verifying' && !isVerified;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
            {isVerified
              ? <CheckCircle2 className="w-7 h-7 text-green-600" />
              : panel === 'change-email'
                ? <Mail className="w-7 h-7 text-green-600" />
                : <ShieldCheck className="w-7 h-7 text-green-600" />
            }
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {isVerified ? 'Email Verified' : panel === 'change-email' ? 'Change Email Address' : 'Verify Your Email'}
          </h2>
          <p className="text-sm text-gray-500">
            {isVerified
              ? 'Thank you! You now have full access to AgriConnect.'
              : panel === 'change-email'
                ? 'Enter your correct email address below.'
                : 'Please verify your email address to access the platform.'}
          </p>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-6 bg-gray-50/50">

          {/* ════════════════════════ VERIFY PANEL ════════════════════════ */}
          {panel === 'verify' && (
            <div className="space-y-5">
              
              {/* Target Email Indicator */}
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs text-gray-500">Sending code to</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{activeEmail}</p>
                  </div>
                </div>
                {!isVerified && (
                  <button 
                    type="button" 
                    onClick={() => setPanel('change-email')}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
                    title="Edit email address"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* ── Success Animation State ── */}
              {isVerified && (
                <div className="py-6 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-3" />
                  <p className="text-sm font-medium text-green-700">Redirecting to dashboard...</p>
                </div>
              )}

              {/* ── Action Area ── */}
              {!isVerified && (
                <div className="space-y-4">
                  {/* Send Button */}
                  {!codeSent && (
                    <button 
                      type="button" 
                      onClick={handleSend} 
                      disabled={!canSend}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                    >
                      {sendStatus === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                      {sendBtnLabel}
                    </button>
                  )}
                  
                  {/* OTP Input Section */}
                  {codeSent && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={OTP_LENGTH}
                        value={otp}
                        onChange={e => {
                          setOtp(e.target.value.replace(/\D/g, ''));
                          if (verifyStatus === 'error') { setVerifyStatus('idle'); setVerifyMsg(''); }
                        }}
                        placeholder="Enter 6-digit code"
                        className="w-full py-4 text-center text-2xl font-bold tracking-[0.3em] text-gray-900 bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-normal"
                      />

                      <button 
                        type="button" 
                        onClick={handleVerify} 
                        disabled={!canVerify}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                      >
                        {verifyStatus === 'verifying' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        {verifyStatus === 'verifying' ? 'Verifying...' : 'Verify Code'}
                      </button>

                      <div className="text-center pt-2">
                        <button 
                          type="button" 
                          onClick={handleSend}
                          disabled={!canSend}
                          className="text-sm font-medium text-gray-500 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sendStatus === 'sending' ? 'Sending...' : cooldown > 0 ? `Resend code in ${fmtCooldown(cooldown)}` : 'Resend Code'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Status Messages ── */}
              {verifyMsg && (
                <div className={`flex items-start gap-3 p-3 rounded-xl text-sm font-medium border ${
                  verifyStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {verifyStatus === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />}
                  <span>{verifyMsg}</span>
                </div>
              )}
              
              {!verifyMsg && sendMsg && (
                <div className="flex items-start gap-3 p-3 rounded-xl text-sm font-medium border bg-blue-50 text-blue-700 border-blue-200">
                  <RefreshCw className="w-5 h-5 flex-shrink-0 text-blue-600" />
                  <span>{sendMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════ CHANGE EMAIL PANEL ════════════════════════ */}
          {panel === 'change-email' && (
            <div className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => {
                    setNewEmail(e.target.value);
                    if (changeStatus === 'error') { setChangeStatus('idle'); setChangeMsg(''); }
                  }}
                  placeholder="Enter your new email"
                  autoFocus
                  className="w-full px-4 py-3 text-base text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-sm"
                />
              </div>

              {changeMsg && changeStatus === 'error' && (
                <div className="flex items-start gap-3 p-3 rounded-xl text-sm font-medium border bg-red-50 text-red-600 border-red-200">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                  <span>{changeMsg}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button 
                  type="button" 
                  onClick={handleChangeEmail}
                  disabled={changeStatus === 'loading' || !newEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
                >
                  {changeStatus === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  {changeStatus === 'loading' ? 'Updating...' : 'Update & Send Code'}
                </button>

                <button 
                  type="button" 
                  onClick={() => { setPanel('verify'); setNewEmail(''); setChangeMsg(''); }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
