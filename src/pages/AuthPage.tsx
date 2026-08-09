import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Mail, Lock, User, Building2, Phone, MapPin, ArrowRight, ArrowLeft, ShieldCheck, ChefHat, HeartHandshake, Bike } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/supabase';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'forgot' | 'otp';

const roles: { id: Role; label: string; icon: any; desc: string }[] = [
  { id: 'restaurant', label: 'Restaurant', icon: ChefHat, desc: 'Donate surplus food' },
  { id: 'ngo', label: 'NGO', icon: HeartHandshake, desc: 'Claim & distribute food' },
  { id: 'volunteer', label: 'Volunteer', icon: Bike, desc: 'Deliver food to NGOs' },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('restaurant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState('');
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', organization: '', phone: '', city: '', otp: '',
  });

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password);
        if (error) setError(error);
        else navigate('/dashboard');
      } else if (mode === 'signup') {
        const { error } = await signUp(form.email, form.password, {
          full_name: form.fullName,
          role,
          organization: form.organization,
          phone: form.phone,
          city: form.city,
        });
        if (error) setError(error);
        else {
          setSuccess('Account created! Redirecting to your dashboard...');
          setTimeout(() => navigate('/dashboard'), 1200);
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email);
        if (error) setError(error.message);
        else {
          setOtpEmail(form.email);
          setMode('otp');
          setSuccess('Password reset link sent to your email. Enter the 6-digit code below to verify.');
        }
      } else if (mode === 'otp') {
        const { error } = await supabase.auth.verifyOtp({
          email: otpEmail,
          token: form.otp,
          type: 'recovery',
        });
        if (error) setError(error.message);
        else {
          setSuccess('Verified! Check your email for the password reset link.');
          setTimeout(() => setMode('login'), 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5 py-20">
      <div className="absolute inset-0 aurora" />
      <div className="absolute inset-0 bg-grid opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-3xl glass p-8 shadow-card">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-white">FoodLink<span className="text-primary"> AI</span></span>
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-2xl font-bold text-white">
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot' && 'Reset password'}
                {mode === 'otp' && 'Verify code'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                {mode === 'login' && 'Sign in to your FoodLink AI account'}
                {mode === 'signup' && 'Join the food rescue movement across India'}
                {mode === 'forgot' && 'Enter your email to receive a reset code'}
                {mode === 'otp' && `Enter the 6-digit code sent to ${otpEmail}`}
              </p>

              {error && (
                <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === 'signup' && (
                  <>
                    {/* Role selector */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">I am a...</label>
                      <div className="grid grid-cols-3 gap-2">
                        {roles.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRole(r.id)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                              role === r.id
                                ? 'border-primary bg-primary/15 shadow-glow'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <r.icon className={`h-5 w-5 ${role === r.id ? 'text-primary' : 'text-slate-400'}`} />
                            <span className={`text-xs font-semibold ${role === r.id ? 'text-white' : 'text-slate-400'}`}>{r.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Input icon={User} placeholder="Full name" value={form.fullName} onChange={(v) => update('fullName', v)} required />
                    <Input icon={Building2} placeholder={role === 'restaurant' ? 'Restaurant name' : role === 'ngo' ? 'NGO name' : 'Organization (optional)'} value={form.organization} onChange={(v) => update('organization', v)} required={role !== 'volunteer'} />
                    <Input icon={Phone} placeholder="Phone number" value={form.phone} onChange={(v) => update('phone', v)} />
                    <Input icon={MapPin} placeholder="City (e.g. Mumbai)" value={form.city} onChange={(v) => update('city', v)} required />
                  </>
                )}

                {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
                  <Input icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={(v) => update('email', v)} required />
                )}

                {(mode === 'login' || mode === 'signup') && (
                  <Input icon={Lock} type="password" placeholder="Password" value={form.password} onChange={(v) => update('password', v)} required />
                )}

                {mode === 'otp' && (
                  <Input icon={ShieldCheck} placeholder="6-digit code" value={form.otp} onChange={(v) => update('otp', v)} required maxLength={6} />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary group w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : (
                    <>
                      {mode === 'login' && 'Sign In'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'forgot' && 'Send Reset Code'}
                      {mode === 'otp' && 'Verify Code'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode switcher */}
              <div className="mt-6 space-y-2 text-center text-sm">
                {mode === 'login' && (
                  <>
                    <button onClick={() => setMode('forgot')} className="text-slate-400 hover:text-primary">
                      Forgot password?
                    </button>
                    <div className="text-slate-400">
                      Don't have an account?{' '}
                      <button onClick={() => setMode('signup')} className="font-semibold text-primary hover:underline">Sign up</button>
                    </div>
                  </>
                )}
                {mode === 'signup' && (
                  <div className="text-slate-400">
                    Already have an account?{' '}
                    <button onClick={() => setMode('login')} className="font-semibold text-primary hover:underline">Sign in</button>
                  </div>
                )}
                {mode === 'forgot' && (
                  <button onClick={() => setMode('login')} className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-primary">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                  </button>
                )}
                {mode === 'otp' && (
                  <button onClick={() => setMode('login')} className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-primary">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          By continuing, you agree to FoodLink AI's Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}

function Input({ icon: Icon, type = 'text', placeholder, value, onChange, required, maxLength }: {
  icon: any; type?: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean; maxLength?: number;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-xl glass-soft py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
