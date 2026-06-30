import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

// 1. Import the logo from your assets folder here:
import damcoLogo from "../../Assets/damco-logo.png.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithMicrosoft, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed', err);
      setError(err?.response?.data?.error || 'Invalid email or password.');
    }
  };

  const handleResetPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F9FA] font-sans p-4 sm:p-8">
      
      {/* ── Main Container (Centered White Login Card) ── */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-gray-100">
        <div className="p-7 lg:p-10 flex flex-col justify-center">
          
          {/* Centered Damco Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <img
              src={damcoLogo} // 2. Use the imported logo variable here
              alt="Damco logo"
              className="h-16 sm:h-20 w-auto object-contain mb-4"
            />
          </div>

          <div className="mb-8 text-center">
            {/* Reduced Main Heading */}
            <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1a1a1a] leading-tight">
              Feedback Management System
            </h1>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your Work Email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B31917]/20 focus:border-[#B31917] transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B31917]/20 focus:border-[#B31917] transition-all placeholder:text-gray-400"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M12 5c-7 0-11 6.333-11 7s4 7 11 7 11-6.333 11-7-4-7-11-7zm0 12c-3.867 0-7-2.9-7-5s3.133-5 7-5 7 2.9 7 5-3.133 5-7 5z" fill="currentColor" />
                    <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M12 5c-7 0-11 6.333-11 7s4 7 11 7 11-6.333 11-7-4-7-11-7z" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className={clsx(
                "w-full bg-black border border-black text-white flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-md",
                "hover:bg-[#1a1a1a] active:scale-[0.98] disabled:opacity-70"
              )}
            >
              <span>{isLoggingIn ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>

          <div className="text-center text-sm text-gray-500 font-medium py-2">
            COMING SOON
          </div>

          <div>
            <button
              type="button"
              onClick={loginWithMicrosoft}
              disabled={isLoggingIn}
              className={clsx(
                "w-full bg-black border border-black text-white flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-md",
                "hover:bg-[#1a1a1a] active:scale-[0.98] disabled:opacity-70"
              )}
            >
              <div className="grid grid-cols-2 gap-[2px] shrink-0">
                <div className="w-[8px] h-[8px] bg-[#F25022]" />
                <div className="w-[8px] h-[8px] bg-[#7FBA00]" />
                <div className="w-[8px] h-[8px] bg-[#00A4EF]" />
                <div className="w-[8px] h-[8px] bg-[#FFB900]" />
              </div>
              <span>{isLoggingIn ? 'Authenticating...' : 'Sign in with Microsoft'}</span>
            </button>
          </div>

          <div className="mt-3 text-center">
            <button type="button" onClick={handleResetPassword} className="text-damco-black/70 hover:text-damco-black text-sm font-medium transition-colors">
              Reset Password
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
}