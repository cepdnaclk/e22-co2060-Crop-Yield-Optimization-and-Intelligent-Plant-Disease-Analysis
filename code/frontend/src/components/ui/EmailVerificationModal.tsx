/**
 * EmailVerificationModal
 *
 * Blocking, non-dismissible modal shown to farmers with unverified email.
 *
 * Design: Modern, government-grade, premium UI
 *  Panel A — Verify:      Send OTP → Enter 6-digit split boxes → Verify
 *  Panel B — Change:      Enter new email → Update & send code → back to Panel A
 *
 * Features:
 *  - 6-digit OTP with individual input boxes, auto-focus, paste support
 *  - 60s resend cooldown with live countdown
 *  - Edit email inline with pencil icon
 *  - Low-emphasis Log Out link
 *  - Clean white card, single brand color (#1a56db), no loud backgrounds
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from 'react';
import {
  Mail,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Pencil,
  LogOut,
} from 'lucide-react';
import { userAPI } from '../../services/api';
import { clearAuthData } from '../../utils/authUtils';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_COOLDOWN_S = 60;
const OTP_LENGTH         = 6;

// ── Types ─────────────────────────────────────────────────────────────────────
type SendStatus   = 'idle' | 'sending' | 'sent' | 'error';
type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';
type Panel        = 'verify' | 'change-email';
type MsgKind      = 'info' | 'success' | 'error';

interface Props {
  email:      string;
  firstName?: string;
  onVerified: () => void;
}

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout() {
  clearAuthData();
  window.location.href = '/';
}

// ── Inline styles (no Tailwind dynamic strings) ───────────────────────────────
const BRAND = '#16a34a';
const BRAND_LIGHT = '#f0fdf4';
const BRAND_BORDER = '#bbf7d0';

// ── Component ─────────────────────────────────────────────────────────────────
export function EmailVerificationModal({ email: initialEmail, firstName, onVerified }: Props) {
  const [activeEmail, setActiveEmail] = useState(initialEmail);
  const [panel, setPanel]             = useState<Panel>('verify');

  // Verify panel
  const [sendStatus,   setSendStatus]   = useState<SendStatus>('idle');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [otpDigits,    setOtpDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [cooldown,     setCooldown]     = useState(0);
  const [sendMsg,      setSendMsg]      = useState('');
  const [sendMsgKind,  setSendMsgKind]  = useState<MsgKind>('info');
  const [verifyMsg,    setVerifyMsg]    = useState('');
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-digit refs for OTP boxes
  const digitRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  // Change email panel
  const [newEmail,     setNewEmail]     = useState('');
  const [changeStatus, setChangeStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [changeMsg,    setChangeMsg]    = useState('');

  // Reset state when active email changes
  useEffect(() => {
    setSendStatus('idle');
    setSendMsg('');
    setSendMsgKind('info');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setVerifyStatus('idle');
    setVerifyMsg('');
    setCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, [activeEmail]);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Cooldown ───────────────────────────────────────────────────────────────
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

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (cooldown > 0 || sendStatus === 'sending') return;
    setSendStatus('sending');
    setSendMsg('');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setVerifyStatus('idle');
    setVerifyMsg('');
    try {
      const data = await userAPI.sendOtp(activeEmail, firstName);
      setSendStatus('sent');
      setSendMsg('A verification code has been sent to your email.');
      setSendMsgKind('info');
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN_S);
      // Focus first box
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      const d = err?.response?.data;
      if (err?.response?.status === 429 && d?.cooldownSeconds) {
        startCooldown(d.cooldownSeconds);
        setSendStatus('sent');
        setSendMsg(d.message || 'Please wait before requesting a new code.');
        setSendMsgKind('info');
      } else {
        setSendStatus('error');
        setSendMsg(d?.message || 'Failed to send code. Please try again.');
        setSendMsgKind('error');
      }
    }
  };

  // ── OTP box handlers ───────────────────────────────────────────────────────
  const handleDigitChange = useCallback((idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    setOtpDigits(prev => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < OTP_LENGTH - 1) {
      digitRefs.current[idx + 1]?.focus();
    }
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
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      digitRefs.current[idx + 1]?.focus();
    }
  }, [otpDigits]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const digits = pasted.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
    setOtpDigits(digits);
    const nextEmpty = digits.findIndex(d => !d);
    const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    digitRefs.current[focusIdx]?.focus();
  }, []);

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const otp = otpDigits.join('');
    if (otp.length < OTP_LENGTH || verifyStatus === 'verifying') return;
    setVerifyStatus('verifying');
    setVerifyMsg('');
    try {
      await userAPI.verifyOtp(activeEmail, otp);
      setVerifyStatus('success');
      setVerifyMsg('Email verified successfully.');
      setTimeout(onVerified, 1200);
    } catch (err: any) {
      const d = err?.response?.data;
      setVerifyStatus('error');
      setVerifyMsg(
        d?.expired ? 'Verification code has expired. Please request a new one.' :
        d?.invalid ? 'Invalid verification code. Please try again.' :
        d?.message ?? 'Verification failed. Please try again.'
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
      setSendMsg(`Email updated. A new code has been sent to ${updated}.`);
      setSendMsgKind('info');
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN_S);
      setSendStatus('sent');
    } catch (err: any) {
      setChangeStatus('error');
      setChangeMsg(err?.response?.data?.message || 'Failed to update email. Please try again.');
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const otp         = otpDigits.join('');
  const codeSent    = sendStatus === 'sent';
  const isVerified  = verifyStatus === 'success';
  const canSend     = cooldown === 0 && sendStatus !== 'sending' && !isVerified;
  const canVerify   = codeSent && otp.length === OTP_LENGTH && verifyStatus !== 'verifying' && !isVerified;

  const sendBtnLabel = sendStatus === 'sending' ? 'Sending…'
    : cooldown > 0 ? `Resend available in ${cooldown}s`
    : codeSent      ? 'Resend Verification Code'
    :                 'Send Verification Code';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* ── Card ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
      >

        {/* ── Header strip ── */}
        <div style={{
          borderBottom: '1px solid #f1f5f9',
          padding: '28px 32px 24px',
          textAlign: 'center',
        }}>
          {/* Icon badge */}
          <div style={{
            width: 56, height: 56,
            borderRadius: '14px',
            background: isVerified ? '#f0fdf4' : BRAND_LIGHT,
            border: `1.5px solid ${isVerified ? '#bbf7d0' : BRAND_BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            transition: 'all 0.3s ease',
          }}>
            {isVerified
              ? <CheckCircle2 style={{ width: 28, height: 28, color: '#16a34a' }} />
              : panel === 'change-email'
              ? <Mail         style={{ width: 28, height: 28, color: BRAND }} />
              : <ShieldCheck  style={{ width: 28, height: 28, color: BRAND }} />
            }
          </div>

          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {panel === 'change-email' ? 'Update Email Address' : 'Verify Your Email Address'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
            {panel === 'change-email'
              ? 'Enter the correct email address. A new verification code will be sent automatically.'
              : 'We need to verify your email address before you can continue using the system.'}
          </p>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 32px' }}>

          {/* ══════════ VERIFY PANEL ══════════ */}
          {panel === 'verify' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 16px',
              }}>
                <p style={{ margin: '0 0 2px', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Email Address
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>
                    {activeEmail}
                  </span>
                  {!isVerified && (
                    <button
                      type="button"
                      onClick={() => { setPanel('change-email'); setEditMode(true); }}
                      title="Edit email address"
                      style={{
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        color: BRAND,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = BRAND_LIGHT)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Pencil style={{ width: 12, height: 12 }} />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* ── Success state ── */}
              {isVerified && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '12px 0',
                  animation: 'fadeIn 0.3s ease',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle2 style={{ width: 32, height: 32, color: '#16a34a' }} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#15803d', fontSize: '1rem' }}>
                    Email verified successfully.
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>
                    Redirecting you now…
                  </p>
                </div>
              )}

              {/* ── Send/Resend button ── */}
              {!isVerified && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 16px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    background: canSend ? BRAND : '#e2e8f0',
                    color: canSend ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.2s',
                    boxShadow: canSend ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
                  }}
                  onMouseEnter={e => { if (canSend) e.currentTarget.style.background = '#15803d'; }}
                  onMouseLeave={e => { if (canSend) e.currentTarget.style.background = BRAND; }}
                >
                  {sendStatus === 'sending'
                    ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                    : <Mail    style={{ width: 18, height: 18 }} />
                  }
                  {sendBtnLabel}
                </button>
              )}

              {/* ── OTP Section ── */}
              {codeSent && !isVerified && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{
                      display: 'block', marginBottom: 10,
                      fontSize: '0.75rem', fontWeight: 600,
                      color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      Enter 6-Digit Verification Code
                    </label>
                    {/* OTP boxes */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
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
                            e.currentTarget.style.borderColor = verifyStatus === 'error' ? '#ef4444' : BRAND;
                            e.currentTarget.style.boxShadow = verifyStatus === 'error'
                              ? '0 0 0 3px rgba(239,68,68,0.12)'
                              : '0 0 0 3px rgba(22,163,74,0.15)';
                          }}
                          onBlur={e => {
                            e.currentTarget.style.borderColor = verifyStatus === 'error' ? '#fca5a5' : '#e2e8f0';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          style={{
                            width: 44, height: 52,
                            textAlign: 'center',
                            fontSize: '1.375rem',
                            fontWeight: 700,
                            fontFamily: "'Courier New', monospace",
                            color: '#0f172a',
                            border: `2px solid ${verifyStatus === 'error' ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: 8,
                            background: otpDigits[idx] ? '#f8fafc' : '#ffffff',
                            outline: 'none',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                            caretColor: BRAND,
                          }}
                        />
                      ))}
                    </div>
                    <p style={{
                      margin: '8px 0 0',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      textAlign: 'center',
                    }}>
                      Code valid for 15 minutes. Paste the full code or type digit by digit.
                    </p>
                  </div>

                  {/* Verify button */}
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={!canVerify}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '11px 16px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      cursor: canVerify ? 'pointer' : 'not-allowed',
                      background: canVerify ? '#0f172a' : '#e2e8f0',
                      color: canVerify ? '#ffffff' : '#94a3b8',
                      transition: 'all 0.2s',
                      boxShadow: canVerify ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
                    }}
                    onMouseEnter={e => { if (canVerify) e.currentTarget.style.background = '#1e293b'; }}
                    onMouseLeave={e => { if (canVerify) e.currentTarget.style.background = '#0f172a'; }}
                  >
                    {verifyStatus === 'verifying'
                      ? <Loader2     style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                      : <ShieldCheck style={{ width: 18, height: 18 }} />
                    }
                    {verifyStatus === 'verifying' ? 'Verifying…' : 'Verify Email'}
                  </button>
                </div>
              )}

              {/* ── Status messages ── */}
              {sendMsg && !isVerified && (
                <StatusMessage kind={sendMsgKind} text={sendMsg} />
              )}
              {verifyMsg && (
                <StatusMessage kind={verifyStatus === 'success' ? 'success' : 'error'} text={verifyMsg} />
              )}
            </div>
          )}

          {/* ══════════ CHANGE EMAIL PANEL ══════════ */}
          {panel === 'change-email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block', marginBottom: 6,
                  fontSize: '0.75rem', fontWeight: 600,
                  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => {
                    setNewEmail(e.target.value);
                    if (changeStatus === 'error') { setChangeStatus('idle'); setChangeMsg(''); }
                  }}
                  placeholder="your@email.com"
                  autoFocus
                  onFocus={e => {
                    e.currentTarget.style.borderColor = BRAND;
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = changeStatus === 'error' ? '#fca5a5' : '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `2px solid ${changeStatus === 'error' ? '#fca5a5' : '#e2e8f0'}`,
                    fontSize: '0.9375rem',
                    color: '#0f172a',
                    background: '#f8fafc',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {changeMsg && changeStatus === 'error' && (
                <StatusMessage kind="error" text={changeMsg} />
              )}

              {/* Update & send button */}
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={changeStatus === 'loading' || !newEmail.trim()}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: (newEmail.trim() && changeStatus !== 'loading') ? 'pointer' : 'not-allowed',
                  background: (newEmail.trim() && changeStatus !== 'loading') ? BRAND : '#e2e8f0',
                  color: (newEmail.trim() && changeStatus !== 'loading') ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s',
                  boxShadow: (newEmail.trim() && changeStatus !== 'loading') ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
                }}
                onMouseEnter={e => { if (newEmail.trim() && changeStatus !== 'loading') e.currentTarget.style.background = '#15803d'; }}
                onMouseLeave={e => { if (newEmail.trim() && changeStatus !== 'loading') e.currentTarget.style.background = BRAND; }}
              >
                {changeStatus === 'loading'
                  ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                  : <Mail    style={{ width: 18, height: 18 }} />
                }
                {changeStatus === 'loading' ? 'Updating…' : 'Save & Send Verification Code'}
              </button>

              {/* Back button */}
              <button
                type="button"
                onClick={() => { setPanel('verify'); setNewEmail(''); setChangeMsg(''); setChangeStatus('idle'); setEditMode(false); }}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <ArrowLeft style={{ width: 15, height: 15 }} />
                Back to Verification
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid #f1f5f9',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: panel === 'verify' ? 'space-between' : 'center',
        }}>
          {panel === 'verify' && !isVerified && (
            <button
              type="button"
              onClick={() => { setPanel('change-email'); setEditMode(true); }}
              style={{
                padding: 0, border: 'none', background: 'transparent',
                fontSize: '0.8125rem', color: '#64748b',
                cursor: 'pointer', textDecoration: 'underline',
                textUnderlineOffset: 2,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#1e293b')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              Change Email Address
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: 0, border: 'none', background: 'transparent',
              fontSize: '0.8125rem', color: '#94a3b8',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            <LogOut style={{ width: 13, height: 13 }} />
            Log Out
          </button>
        </div>

        {/* ── Branding ── */}
        <div style={{
          padding: '0 32px 14px',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#cbd5e1' }}>
            AgriConnect &bull; Department of Agriculture, Sri Lanka
          </p>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Status Message sub-component ──────────────────────────────────────────────
function StatusMessage({ kind, text }: { kind: MsgKind; text: string }) {
  const config = {
    info:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', Icon: Info },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', Icon: CheckCircle2 },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', Icon: AlertCircle },
  }[kind];

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '10px 12px',
      borderRadius: 8,
      background: config.bg,
      border: `1px solid ${config.border}`,
      fontSize: '0.8125rem',
      color: config.color,
      lineHeight: 1.5,
      animation: 'fadeIn 0.2s ease',
    }}>
      <config.Icon style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
      <span>{text}</span>
    </div>
  );
}
