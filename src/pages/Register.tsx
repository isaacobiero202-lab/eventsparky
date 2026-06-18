import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { Sparkles, Mail, Lock, User, UserCheck, Shield, Loader, AlertCircle } from 'lucide-react';

export function Register() {
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('attendee');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all layout fields to register.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    try {
      await signUp(email, password, fullName, role);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please make sure the email is valid.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center items-center w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 mb-3">
            <Sparkles className="w-6 h-6 fill-indigo-100" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Create Account</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Sign up to browse, host, or register for events
          </p>
        </div>

        {success ? (
          <div className="p-6 text-center bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 font-medium">
            <UserCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-bold text-lg">Registration Successful!</h4>
            <p className="text-xs text-emerald-600 mt-1">
              Your profile is ready. Relocating to your dashboard...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3.5 mb-5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 font-medium flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    required
                    className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-800"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    required
                    className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-800"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Password (6+ chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-800"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Role Picker controls */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Your Platform Role
                </label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setRole('attendee')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition cursor-pointer ${
                      role === 'attendee'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold ring-2 ring-indigo-500/10'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Attendee</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-normal">Browse & Register</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('organizer')}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition cursor-pointer ${
                      role === 'organizer'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold ring-2 ring-indigo-500/10'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Shield className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Host</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-normal">Create & Manage</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition shadow-xs cursor-pointer mt-4"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing account...</span>
                  </>
                ) : (
                  <span>Register Account</span>
                )}
              </button>
            </form>
          </>
        )}

        <div className="text-center mt-6 pt-5 border-t border-slate-50">
          <p className="text-xs text-slate-500 font-medium">
            Already have an Event Spark account?{' '}
            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
              Login Instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
