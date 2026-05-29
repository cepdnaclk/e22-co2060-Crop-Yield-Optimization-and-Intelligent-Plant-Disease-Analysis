/**
 * EmailVerificationWidget
 * Reusable OTP verification widget used in:
 *  - Admin RegisterFarmer form (inline, below email field)
 *  - Farmer post-login blocking modal (compact mode)
 *
 * Features:
 *  - "Send Verification Code" button with 60-second resend cooldown
 *  - Cooldown seeded from backend response (tamper-proof)
 *  - Handles backend 429 cooldown rejection gracefully
 *  - Real-time countdown displayed on the button
 *  - OTP input field
 *  - Inline success / error feedback
 *  - All state is self-contained
 */

import { useState, useEffect, useRef } from 'react';
import { Mail, ShieldCheck, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { userAPI } from '../../services/api';

const DEFAULT_COOLDOWN = 60; // seconds — matches backend RESEND_COOLDOWN_MS / 1000

interface EmailVerificationWidgetProps {
  /** The email address to verify */
  email: string;
  /** Optional first name to personalise the email */
  firstName?: string;
  /** Called when email is successfully verified */
  onVerified: () => void;
  /** Compact layout for use inside modals */
  compact?: boolean;
}

type WidgetStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'success' | 'error';

export function EmailVerificationWidget({
  email,
  firstName,
  onVerified,
  compact = false,
}: EmailVerificationWidgetProps) {
  const [status, setStatus]     = useState<WidgetStatus>('idle');
  const [message, setMessage]   = useState('');
  const [code, setCode]         = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset widget state when email prop changes (e.g. after email change)
  useEffect(() => {
    setStatus('idle');
    setMessage('');
    setCode('');
    setCooldown(0);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, [email]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  /**
   * Starts the resend cooldown timer.
   * @param seconds - Seed from the backend response (default 60).
   */
  function startCooldown(seconds: number = DEFAULT_COOLDOWN) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const handleSend = async () => {
    if (!email || cooldown > 0 || status === 'sending') return;

    setStatus('sending');
    setMessage('');
    setCode('');

    try {
      const data = await userAPI.sendOtp(email, firstName);
      // Use cooldown seconds from backend response if provided
      startCooldown(data?.cooldownSeconds ?? DEFAULT_COOLDOWN);
      setStatus('sent');
      setMessage('Verification code sent! Please check your email inbox.');
    } catch (err: any) {
      const data = err?.response?.data;
      // 429 = backend cooldown — seed timer from server response
      if (err?.response?.status === 429 && data?.cooldownSeconds) {
        startCooldown(data.cooldownSeconds);
        setStatus(cooldown > 0 || status === 'sent' ? 'sent' : 'idle');
        setMessage(data.message || 'Please wait before requesting a new code.');
      } else {
        setStatus('error');
        setMessage(data?.message || 'Failed to send verification code. Please try again.');
      }
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed || status === 'verifying' || status === 'success') return;

    setStatus('verifying');
    setMessage('');

    try {
      await userAPI.verifyOtp(email, trimmed);
      setStatus('success');
      setMessage('Email verified successfully!');
      onVerified();
    } catch (err: any) {
      const data = err?.response?.data;
      setStatus('error');
      if (data?.expired) {
        setMessage('Verification code expired. Please request a new one.');
      } else if (data?.invalid) {
        setMessage('Invalid verification code. Please check and try again.');
      } else {
        setMessage(data?.message || 'Verification failed. Please try again.');
      }
    }
  };

  const formatCooldown = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const sendButtonLabel = () => {
    if (status === 'sending') return 'Sending…';
    if (cooldown > 0)         return `Resend Verification Code (${formatCooldown(cooldown)})`;
    if (status === 'sent' || status === 'error' || status === 'verifying')
      return 'Resend Verification Code';
    return 'Send Verification Code';
  };

  const canSend    = cooldown === 0 && status !== 'sending' && status !== 'success';
  const canVerify  = status === 'sent' || status === 'error';
  const isVerified = status === 'success';

  if (!compact) {
    // ── Full inline layout (Admin RegisterFarmer form) ─────────────────────
    return (
      <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm font-medium text-blue-800">Email Verification</p>
          {isVerified && (
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        {!isVerified && (
          <>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                rounded-lg border transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-blue-600 hover:bg-blue-700 text-white border-blue-600
                disabled:bg-blue-400 disabled:border-blue-400"
            >
              {status === 'sending' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {sendButtonLabel()}
            </button>

            {(status === 'sent' || status === 'error' || status === 'verifying') && (
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    if (status === 'error') setStatus('sent');
                  }}
                  placeholder="Enter 6-digit code"
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    tracking-widest font-mono text-center"
                />
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!canVerify || code.trim().length < 6}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-green-600
                    hover:bg-green-700 text-white transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'verifying' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {message && (
          <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
            isVerified
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700'
          }`}>
            {isVerified ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : status === 'error' ? (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            {message}
          </div>
        )}
      </div>
    );
  }

  // ── Compact layout (Farmer blocking modal) ─────────────────────────────
  return (
    <div className="space-y-4">
      {!isVerified ? (
        <>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
              rounded-xl border transition-all
              bg-green-600 hover:bg-green-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-400"
          >
            {status === 'sending' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {sendButtonLabel()}
          </button>

          {(status === 'sent' || status === 'error' || status === 'verifying') && (
            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''));
                  if (status === 'error') setStatus('sent');
                }}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                  tracking-[0.5em] font-mono text-center"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={!canVerify || code.trim().length < 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold
                  rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'verifying' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
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

      {message && !isVerified && (
        <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
          status === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {status === 'error' ? (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          {message}
        </div>
      )}
    </div>
  );
}
