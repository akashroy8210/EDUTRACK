import { useState } from 'react';
import { UserProfile } from '@/data/types';
import { authApi } from '@/api/client';
import { toast } from 'sonner';
import { CircleNotch } from '@phosphor-icons/react';

interface LoginProps {
  onLogin: (userData?: Partial<UserProfile>, isNewRegistration?: boolean) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const res = await authApi.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
        toast.success('Registration successful! Welcome to MyDashboard.');
        onLogin(res.user, true);
      } else {
        const res = await authApi.login({
          email: email.trim().toLowerCase(),
          password,
        });
        toast.success(`Welcome back, ${res.user?.name || 'Student'}!`);
        onLogin(res.user, false);
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please verify your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0d1117' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: '#6366f1', fontFamily: 'Outfit, sans-serif' }}>
            EduTrack
          </div>
          <div className="text-xs tracking-widest uppercase" style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
            Student Dashboard Portal
          </div>
        </div>

        <div className="rounded-2xl p-5 sm:p-8" style={{ background: '#161b22', border: '1px solid #2d3748' }}>
          {/* Tab Switcher: Sign In vs Create Account */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: '#0d1117', border: '1px solid #2d3748' }}>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: mode === 'login' ? '#6366f1' : 'transparent',
                color: mode === 'login' ? '#fff' : '#94a3b8',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: mode === 'register' ? '#6366f1' : 'transparent',
                color: mode === 'register' ? '#fff' : '#94a3b8',
              }}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-base font-semibold mb-4" style={{ color: '#e2e8f0' }}>
            {mode === 'login' ? 'Sign in with your email' : 'Register with Name, Email & Password'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="w-full rounded-lg px-3.5 py-2 text-xs outline-none transition-all"
                  style={{
                    background: '#0d1117',
                    border: '1px solid #2d3748',
                    color: '#e2e8f0',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#2d3748')}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. student@university.edu"
                className="w-full rounded-lg px-3.5 py-2 text-xs outline-none transition-all font-mono"
                style={{
                  background: '#0d1117',
                  border: '1px solid #2d3748',
                  color: '#e2e8f0',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#2d3748')}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2 text-xs outline-none transition-all"
                style={{
                  background: '#0d1117',
                  border: '1px solid #2d3748',
                  color: '#e2e8f0',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#2d3748')}
              />
            </div>

            {error && (
              <div
                className="text-xs rounded-lg px-3 py-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg font-semibold text-xs transition-all mt-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{ background: '#6366f1', color: '#fff' }}
              onMouseEnter={e => !isSubmitting && ((e.target as HTMLElement).style.background = '#4f46e5')}
              onMouseLeave={e => !isSubmitting && ((e.target as HTMLElement).style.background = '#6366f1')}
            >
              {isSubmitting && <CircleNotch size={14} weight="bold" className="animate-spin" />}
              <span>{isSubmitting ? 'Authenticating...' : (mode === 'login' ? 'Sign In' : 'Create Account & Continue')}</span>
            </button>
          </form>

          <p className="text-xs mt-4 text-center" style={{ color: '#475569' }}>
            {mode === 'login'
              ? 'Sign in with your registered email and password.'
              : 'Only Name, Email & Password required to register. Complete your academic details anytime in Profile.'}
          </p>
        </div>
      </div>
    </div>
  );
}

