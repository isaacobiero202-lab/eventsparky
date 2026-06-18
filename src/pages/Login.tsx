import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, Mail, Lock, LogIn, Loader, AlertCircle } from 'lucide-react';

export function Login() {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Grab the redirect location if passed
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password fields.');
      return;
    }

    setError(null);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Sign in failure:', err);
      setError(err.message || 'Invalid login details. Please verify your email and password.');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center items-center w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 mb-3">
            <Sparkles className="w-6 h-6 fill-indigo-100" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Access your Event Spark planning workspace
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-5 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="you@example.com"
                required
                className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition text-slate-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Password
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

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition shadow-xs cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Entering Workspace...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-5 border-t border-slate-50">
          <p className="text-xs text-slate-500 font-medium">
            Don't have an Event Spark account?{' '}
            <Link to="/register" className="text-indigo-600 font-bold hover:underline">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
