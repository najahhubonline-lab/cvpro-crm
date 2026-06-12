import React, { useState } from 'react';
import { api } from '../services/api';

interface LoginProps {
  onLoginSuccess: () => void;
  error?: string | null;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      await api.login({ email, password });
      onLoginSuccess();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div>
          <div className="mx-auto w-12 h-12 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Sign in to Taskora
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {(error || loginError) && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
              {error || loginError}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
