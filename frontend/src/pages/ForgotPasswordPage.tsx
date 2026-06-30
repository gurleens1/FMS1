/**
 * ForgotPasswordPage.tsx — OTP-based password reset
 * NEW: 3-step flow: Enter Email → Verify OTP → Set New Password
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import damcoLogo from "../images/logo.png";

type Step = 'email' | 'otp' | 'reset' | 'done';

export function ForgotPasswordPage() {
  const navigate    = useNavigate();
  const [step,      setStep]      = useState<Step>('email');
  const [email,     setEmail]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [resetToken,setResetToken]= useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confirmPwd,setConfirmPwd]= useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [message,   setMessage]   = useState('');

  // Step 1: Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await apiClient.post('/api/auth/forgot-password', { email });
      setMessage(data.message);
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await apiClient.post('/api/auth/verify-otp', { email, otp });
      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid or expired OTP.');
    } finally { setLoading(false); }
  }

  // Step 3: Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }
    if (newPwd.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.post('/api/auth/reset-password', { resetToken, newPassword: newPwd });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Password reset failed.');
    } finally { setLoading(false); }
  }

  const stepLabels = ['Enter Email', 'Verify OTP', 'New Password'];
  const stepIdx    = step === 'email' ? 0 : step === 'otp' ? 1 : step === 'reset' ? 2 : 3;

  return (
    <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={damcoLogo} alt="Damco logo" className="h-14 w-auto mx-auto" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1">Damco Feedback Management System</p>
        </div>

        {/* Progress Steps */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {stepLabels.map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < stepIdx ? 'bg-brand-600 text-white' :
                    i === stepIdx ? 'bg-brand-600 text-white ring-2 ring-brand-200' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {i < stepIdx ? <i className="fa-solid fa-check text-xs" /> : i + 1}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 hidden sm:block">{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${i < stepIdx ? 'bg-brand-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-border p-8">

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900 mb-1">Enter Your Email</h2>
                <p className="text-gray-500 text-sm mb-4">We'll send a one-time password to your registered email.</p>
              </div>
              <div>
                <label className="form-label"><i className="fa-solid fa-envelope mr-1.5 text-gray-400" />Email Address</label>
                <input type="email" className="form-input" placeholder="you@damcogroup.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              </div>
              {error && <ErrorAlert msg={error} />}
              <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5" style={{ background: '#E32200' }}>
                {loading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Sending…</> : <><i className="fa-solid fa-paper-plane" /> Send OTP</>}
              </button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900 mb-1">Enter OTP</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Check <strong>{email}</strong> for a 6-digit code. Valid for 15 minutes.
                </p>
              </div>
              {message && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  <i className="fa-solid fa-circle-check" />{message}
                </div>
              )}
              <div>
                <label className="form-label"><i className="fa-solid fa-shield-halved mr-1.5 text-gray-400" />One-Time Password</label>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  className="form-input text-center text-2xl tracking-widest font-bold"
                  placeholder="• • • • • •"
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required
                />
              </div>
              {error && <ErrorAlert msg={error} />}
              <button type="submit" disabled={loading || otp.length !== 6} className="w-full btn-primary justify-center py-2.5" style={{ background: '#E32200' }}>
                {loading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Verifying…</> : <><i className="fa-solid fa-shield-check" /> Verify OTP</>}
              </button>
              <button type="button" onClick={() => { setStep('email'); setError(''); setOtp(''); }}
                className="w-full btn-secondary justify-center py-2">
                <i className="fa-solid fa-arrow-left" /> Back
              </button>
            </form>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900 mb-1">Set New Password</h2>
                <p className="text-gray-500 text-sm mb-4">Choose a strong password (min 6 characters).</p>
              </div>
              <div>
                <label className="form-label"><i className="fa-solid fa-lock mr-1.5 text-gray-400" />New Password</label>
                <input type="password" className="form-input" placeholder="Min 6 characters"
                  value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />
              </div>
              <div>
                <label className="form-label"><i className="fa-solid fa-lock-open mr-1.5 text-gray-400" />Confirm Password</label>
                <input type="password" className="form-input" placeholder="Repeat password"
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
              </div>
              {error && <ErrorAlert msg={error} />}
              <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-2.5" style={{ background: '#E32200' }}>
                {loading ? <><i className="fa-solid fa-circle-notch fa-spin" /> Resetting…</> : <><i className="fa-solid fa-floppy-disk" /> Reset Password</>}
              </button>
            </form>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-circle-check text-green-600 text-3xl" />
              </div>
              <h2 className="font-display text-lg font-bold text-gray-900">Password Reset!</h2>
              <p className="text-gray-500 text-sm">Your password has been updated successfully. You can now sign in.</p>
              <button onClick={() => navigate('/login')} className="w-full btn-primary justify-center py-2.5" style={{ background: '#E32200' }}>
                <i className="fa-solid fa-right-to-bracket" /> Go to Login
              </button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <div className="text-center mt-4">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-gray-600">
              <i className="fa-solid fa-arrow-left mr-1" />Back to Login
            </button>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-4">
          © {new Date().getFullYear()} Damco Group · FMS v2.0
        </p>
      </div>
    </div>
  );
}

function ErrorAlert({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
      <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}
