/**
 * EmailVerificationWidget
 *
 * Reusable OTP verification widget used in:
 *  - Admin RegisterFarmer form  (inline, compact=false  ← redesigned)
 *  - Farmer post-login modal    (compact=true           ← preserved)
 *
 * Non-compact design goals:
 *  - Integrates naturally below the email field in the registration form
 *  - Status badge (Not Verified / Verified) immediately visible
 *  - 6-digit OTP boxes with auto-advance, backspace, arrow-key, paste support
 *  - "Send Verification Code" primary action with helper text
 *  - Compact secondary resend button + live countdown; NOT a full-width bar
 *  - Green success state replaces all controls
 *  - Inline error messages, no colored notification banners
 *  - All state is self-contained; resets automatically when email prop changes
 */

import {
  useState, useEffect, useRef, useCallback,
  KeyboardEvent, ClipboardEvent,
} from 'react';
import {
  Mail, ShieldCheck, ShieldX, Loader2,
  CheckCircle2, XCircle, RefreshCw, AlertCircle,
} from 'lucide-react';
import { userAPI } from '../../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_COOLDOWN = 60;
const OTP_LENGTH       = 6;

// ── Brand (matches rest of admin form — green) ────────────────────────────────
const G600 = '#16a34a';
const G700 = '#15803d';
const G50  = '#f0fdf4';
const G200 = '#bbf7d0';

// ── Types ─────────────────────────────────────────────────────────────────────
type SendStatus   = 'idle' | 'sending' | 'sent' | 'error';
type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';

interface EmailVerificationWidgetProps {
  /** The email address to verify */
  email: string;
  /** Optional first name to personalise the OTP email */
  firstName?: string;
  /** Called when email is successfully verified */
  onVerified: () => void;
  /** Compact layout for use inside modals (farmer blocking modal) */
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
export function EmailVerificationWidget({
  email,
  firstName,
  onVerified,
  compact = false,
}: EmailVerificationWidgetProps) {

  // ── Shared state ────────────────────────────────────────────────────────────
  const [sendStatus,   setSendStatus]   = useState<SendStatus>('idle');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [otpDigits,    setOtpDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [cooldown,     setCooldown]     = useState(0);
  const [sendMsg,      setSendMsg]      = useState('');
  const [verifyMsg,    setVerifyMsg]    = useState('');

  // Compact mode uses a single merged code string
  const [code,         setCode]         = useState('');
  const [message,      setMessage]      = useState('');
  const [legacyStatus, setLegacyStatus] = useState<
    'idle' | 'sending' | 'sent' | 'verifying' | 'success' | 'error'
  >('idle');

  const cooldownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const digitRefs    = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  // ── Reset on email change ───────────────────────────────────────────────────
  useEffect(() => {
    // Non-compact reset
    setSendStatus('idle');
    setVerifyStatus('idle');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setCooldown(0);
    setSendMsg('');
    setVerifyMsg('');
    // Compact reset
    setLegacyStatus('idle');
    setMessage('');
    setCode('');
    if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
  }, [email]);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Cooldown timer ──────────────────────────────────────────────────────────
  function startCooldown(seconds: number = DEFAULT_COOLDOWN) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Send OTP (non-compact) ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!email || cooldown > 0 || sendStatus === 'sending') return;
    setSendStatus('sending');
    setSendMsg('');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setVerifyStatus('idle');
    setVerifyMsg('');
    try {
      const data = await userAPI.sendOtp(email, firstName);
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN);
      setSendStatus('sent');
      setSendMsg('Verification code sent successfully.');
      setTimeout(() => digitRefs.current[0]?.focus(), 60);
    } catch (err: any) {
      const d = err?.response?.data;
      if (err?.response?.status === 429 && d?.cooldownSeconds) {
        startCooldown(d.cooldownSeconds);
        setSendStatus('sent');
        setSendMsg(d.message || 'Please wait before requesting a new code.');
      } else {
        setSendStatus('error');
        setSendMsg(d?.message || 'Failed to send verification code. Please try again.');
      }
    }
  };

  // ── OTP box handlers (non-compact) ──────────────────────────────────────────
  const handleDigitChange = useCallback((idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    setOtpDigits(prev => { const n = [...prev]; n[idx] = digit; return n; });
    if (digit && idx < OTP_LENGTH - 1) digitRefs.current[idx + 1]?.focus();
    if (verifyStatus === 'error') { setVerifyStatus('idle'); setVerifyMsg(''); }
  }, [verifyStatus]);

  const handleDigitKeyDown = useCallback((idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otpDigits[idx]) {
        setOtpDigits(prev => { const n = [...prev]; n[idx] = ''; return n; });
      } else if (idx > 0) {
        digitRefs.current[idx - 1]?.focus();
        setOtpDigits(prev => { const n = [...prev]; n[idx - 1] = ''; return n; });
      }
    } else if (e.key === 'ArrowLeft'  && idx > 0)             digitRefs.current[idx - 1]?.focus();
    else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1)  digitRefs.current[idx + 1]?.focus();
  }, [otpDigits]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const digits = pasted.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
    setOtpDigits(digits);
    const nextEmpty = digits.findIndex(d => !d);
    digitRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
  }, []);

  // ── Verify OTP (non-compact) ────────────────────────────────────────────────
  const handleVerify = async () => {
    const otp = otpDigits.join('');
    if (otp.length < OTP_LENGTH || verifyStatus === 'verifying') return;
    setVerifyStatus('verifying');
    setVerifyMsg('');
    try {
      await userAPI.verifyOtp(email, otp);
      setVerifyStatus('success');
      setVerifyMsg('Email address successfully verified.');
      onVerified();
    } catch (err: any) {
      const d = err?.response?.data;
      setVerifyStatus('error');
      setVerifyMsg(
        d?.expired ? 'Verification code expired. Please request a new code.' :
        d?.invalid  ? 'Invalid verification code. Please try again.' :
        d?.message  ?? 'Verification failed. Please try again.'
      );
    }
  };

  // ── Compact send (legacy, used by farmer blocking modal) ────────────────────
  const handleSendLegacy = async () => {
    if (!email || cooldown > 0 || legacyStatus === 'sending') return;
    setLegacyStatus('sending');
    setMessage('');
    setCode('');
    try {
      const data = await userAPI.sendOtp(email, firstName);
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN);
      setLegacyStatus('sent');
      setMessage('Verification code sent! Please check your email inbox.');
    } catch (err: any) {
      const data = err?.response?.data;
      if (err?.response?.status === 429 && data?.cooldownSeconds) {
        startCooldown(data.cooldownSeconds);
        setLegacyStatus(cooldown > 0 || legacyStatus === 'sent' ? 'sent' : 'idle');
        setMessage(data.message || 'Please wait before requesting a new code.');
      } else {
        setLegacyStatus('error');
        setMessage(data?.message || 'Failed to send verification code. Please try again.');
      }
    }
  };

  const handleVerifyLegacy = async () => {
    const trimmed = code.trim();
    if (!trimmed || legacyStatus === 'verifying' || legacyStatus === 'success') return;
    setLegacyStatus('verifying');
    setMessage('');
    try {
      await userAPI.verifyOtp(email, trimmed);
      setLegacyStatus('success');
      setMessage('Email verified successfully!');
      onVerified();
    } catch (err: any) {
      const data = err?.response?.data;
      setLegacyStatus('error');
      if (data?.expired)       setMessage('Verification code expired. Please request a new one.');
      else if (data?.invalid)  setMessage('Invalid verification code. Please check and try again.');
      else                     setMessage(data?.message || 'Verification failed. Please try again.');
    }
  };

  const formatCooldown = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const legacySendLabel = () => {
    if (legacyStatus === 'sending') return 'Sending…';
    if (cooldown > 0)               return `Resend Verification Code (${formatCooldown(cooldown)})`;
    if (legacyStatus === 'sent' || legacyStatus === 'error' || legacyStatus === 'verifying')
      return 'Resend Verification Code';
    return 'Send Verification Code';
  };

  // ── Derived state (non-compact) ─────────────────────────────────────────────
  const otp        = otpDigits.join('');
  const codeSent   = sendStatus === 'sent';
  const isVerified = verifyStatus === 'success';
  const canSend    = cooldown === 0 && sendStatus !== 'sending' && !isVerified;
  const canVerify  = codeSent && otp.length === OTP_LENGTH && verifyStatus !== 'verifying' && !isVerified;
  const canLegacySend   = cooldown === 0 && legacyStatus !== 'sending' && legacyStatus !== 'success';
  const canLegacyVerify = legacyStatus === 'sent' || legacyStatus === 'error';

  // ══════════════════════════════════════════════════════════════════════════
  //  COMPACT LAYOUT  (Farmer blocking modal — unchanged behaviour)
  // ══════════════════════════════════════════════════════════════════════════
  if (compact) {
    return (
      <div className="space-y-4">
        {legacyStatus !== 'success' ? (
          <>
            <button
              type="button"
              onClick={handleSendLegacy}
              disabled={!canLegacySend}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                rounded-xl border transition-all
                bg-green-600 hover:bg-green-700 text-white
                disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {legacyStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {legacySendLabel()}
            </button>

            {(legacyStatus === 'sent' || legacyStatus === 'error' || legacyStatus === 'verifying') && (
              <div className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '')); if (legacyStatus === 'error') setLegacyStatus('sent'); }}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                    tracking-[0.5em] font-mono text-center"
                />
                <button
                  type="button"
                  onClick={handleVerifyLegacy}
                  disabled={!canLegacyVerify || code.trim().length < 6}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                    rounded-xl bg-green-600 hover:bg-green-700 text-white transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {legacyStatus === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify Code
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-green-700 font-semibold text-center">Email verified successfully!</p>
          </div>
        )}

        {message && legacyStatus !== 'success' && (
          <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
            legacyStatus === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {legacyStatus === 'error'
              ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              : <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {message}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  NON-COMPACT LAYOUT  (Admin RegisterFarmer form — fully redesigned)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        marginTop: 12,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* ── Card header: title + status badge ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fafafa',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck style={{ width: 16, height: 16, color: isVerified ? G600 : '#94a3b8' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            Email Verification
          </span>
        </div>

        {/* Status badge */}
        {isVerified ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px',
            borderRadius: 20,
            background: G50,
            border: `1px solid ${G200}`,
            fontSize: '0.75rem', fontWeight: 600, color: G700,
          }}>
            <CheckCircle2 style={{ width: 12, height: 12 }} />
            Verified
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px',
            borderRadius: 20,
            background: '#fafafa',
            border: '1px solid #e2e8f0',
            fontSize: '0.75rem', fontWeight: 600, color: '#6b7280',
          }}>
            <ShieldX style={{ width: 12, height: 12 }} />
            Not Verified
          </span>
        )}
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: '16px' }}>

        {/* ══ SUCCESS STATE ══ */}
        {isVerified && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            borderRadius: 8,
            background: G50,
            border: `1px solid ${G200}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: G600 }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: G700, fontSize: '0.875rem' }}>
                Email Verified
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#4ade80' }}>
                Email address successfully verified.
              </p>
            </div>
          </div>
        )}

        {/* ══ UNVERIFIED STATE ══ */}
        {!isVerified && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Step A: Initial send — primary button + helper text */}
            {!codeSent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    background: canSend ? G600 : '#e2e8f0',
                    color: canSend ? '#fff' : '#9ca3af',
                    transition: 'background 0.15s',
                    alignSelf: 'flex-start',
                    boxShadow: canSend ? `0 1px 6px rgba(22,163,74,0.3)` : 'none',
                  }}
                  onMouseEnter={e => { if (canSend) e.currentTarget.style.background = G700; }}
                  onMouseLeave={e => { if (canSend) e.currentTarget.style.background = G600; }}
                >
                  {sendStatus === 'sending'
                    ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                    : <Mail    style={{ width: 15, height: 15 }} />}
                  {sendStatus === 'sending' ? 'Sending…' : 'Send Verification Code'}
                </button>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                  A 6-digit verification code will be sent to this email address.
                </p>
              </div>
            )}

            {/* Step B: Code sent — OTP boxes + Verify + compact resend */}
            {codeSent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Sent confirmation + resend row */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 style={{ width: 14, height: 14, color: G600, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', color: '#374151' }}>
                      Verification code sent successfully.
                    </span>
                  </div>

                  {/* Compact resend button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!canSend}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: `1px solid ${canSend ? '#d1d5db' : '#e5e7eb'}`,
                        background: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: canSend ? '#374151' : '#9ca3af',
                        cursor: canSend ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (canSend) { e.currentTarget.style.borderColor = G600; e.currentTarget.style.color = G600; } }}
                      onMouseLeave={e => { if (canSend) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; } }}
                    >
                      {sendStatus === 'sending'
                        ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                        : <RefreshCw style={{ width: 12, height: 12 }} />}
                      Resend Code
                    </button>
                    {cooldown > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                        ({cooldown}s)
                      </span>
                    )}
                  </div>
                </div>

                {/* OTP label */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: 10,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    Enter 6-Digit Verification Code
                  </label>

                  {/* OTP boxes */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
                      <input
                        key={idx}
                        ref={el => { digitRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={otpDigits[idx]}
                        onChange={e => handleDigitChange(idx, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(idx, e)}
                        onPaste={handlePaste}
                        onFocus={e => {
                          e.currentTarget.select();
                          e.currentTarget.style.borderColor = verifyStatus === 'error' ? '#ef4444' : G600;
                          e.currentTarget.style.boxShadow  = verifyStatus === 'error'
                            ? '0 0 0 2px rgba(239,68,68,0.12)'
                            : '0 0 0 2px rgba(22,163,74,0.14)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = verifyStatus === 'error' ? '#fca5a5' : '#d1d5db';
                          e.currentTarget.style.boxShadow  = 'none';
                        }}
                        style={{
                          width: 40,
                          height: 48,
                          textAlign: 'center',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          fontFamily: "'Courier New', monospace",
                          color: '#111827',
                          border: `1.5px solid ${verifyStatus === 'error' ? '#fca5a5' : '#d1d5db'}`,
                          borderRadius: 7,
                          background: otpDigits[idx] ? '#f0fdf4' : '#f9fafb',
                          outline: 'none',
                          transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                          caretColor: G600,
                        }}
                      />
                    ))}
                  </div>

                  {/* Verify error */}
                  {verifyStatus === 'error' && verifyMsg && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginTop: 8,
                      fontSize: '0.8125rem',
                      color: '#dc2626',
                    }}>
                      <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                      {verifyMsg}
                    </div>
                  )}
                </div>

                {/* Verify button */}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!canVerify}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 20px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: canVerify ? 'pointer' : 'not-allowed',
                    background: canVerify ? G600 : '#e2e8f0',
                    color: canVerify ? '#fff' : '#9ca3af',
                    transition: 'background 0.15s',
                    alignSelf: 'flex-start',
                    boxShadow: canVerify ? '0 1px 6px rgba(22,163,74,0.3)' : 'none',
                  }}
                  onMouseEnter={e => { if (canVerify) e.currentTarget.style.background = G700; }}
                  onMouseLeave={e => { if (canVerify) e.currentTarget.style.background = G600; }}
                >
                  {verifyStatus === 'verifying'
                    ? <Loader2     style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                    : <ShieldCheck style={{ width: 15, height: 15 }} />}
                  {verifyStatus === 'verifying' ? 'Verifying…' : 'Verify Email'}
                </button>
              </div>
            )}

            {/* Send error banner (only shown on send failure) */}
            {sendStatus === 'error' && sendMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px',
                borderRadius: 7,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                fontSize: '0.8125rem',
                color: '#dc2626',
              }}>
                <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {sendMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
