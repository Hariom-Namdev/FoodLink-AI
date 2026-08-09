import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Building2, Phone, MapPin, Mail, Shield, Save, LogOut, ChefHat, HeartHandshake, Bike } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function ProfilePage() {
  const { user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    organization: user?.organization || '',
    phone: user?.phone || '',
    city: user?.city || '',
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  const roleIcon = user.role === 'restaurant' ? ChefHat : user.role === 'ngo' ? HeartHandshake : user.role === 'volunteer' ? Bike : Shield;
  const RoleIcon = roleIcon;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          organization: form.organization,
          phone: form.phone,
          city: form.city,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink px-5 pb-20 pt-28 sm:px-8 lg:px-16">
      <div className="absolute inset-0 aurora opacity-40" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header card */}
          <div className="rounded-3xl glass p-8 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
                <RoleIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">{user.full_name || 'Your Profile'}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary ring-1 ring-primary/30">
                    {user.role}
                  </span>
                  {user.organization && <span className="text-sm text-slate-400">{user.organization}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Details card */}
          <div className="mt-6 rounded-3xl glass p-8 shadow-card">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Account Details</h2>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="btn-ghost !py-2 !px-4 text-xs">
                  Edit Profile
                </button>
              ) : (
                <button onClick={handleSave} disabled={loading} className="btn-primary !py-2 !px-4 text-xs disabled:opacity-60">
                  <Save className="h-3.5 w-3.5" /> {loading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">{error}</div>
            )}
            {success && (
              <div className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30">{success}</div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <ProfileField icon={User} label="Full Name" value={form.full_name} editing={editing} onChange={(v) => setForm((p) => ({ ...p, full_name: v }))} />
              <ProfileField icon={Building2} label="Organization" value={form.organization} editing={editing} onChange={(v) => setForm((p) => ({ ...p, organization: v }))} />
              <ProfileField icon={Phone} label="Phone" value={form.phone} editing={editing} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
              <ProfileField icon={MapPin} label="City" value={form.city} editing={editing} onChange={(v) => setForm((p) => ({ ...p, city: v }))} />
              <div className="sm:col-span-2">
                <ProfileField icon={Mail} label="Email" value={user.id} editing={false} onChange={() => {}} hidden />
              </div>
            </div>

            {/* Role info */}
            <div className="mt-6 rounded-2xl glass-soft p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Shield className="h-3.5 w-3.5" /> Role & Permissions
              </div>
              <p className="mt-2 text-sm text-slate-300">
                You are registered as a <span className="font-semibold capitalize text-primary">{user.role}</span>.
                {user.role === 'restaurant' && ' You can create food donations, track their status, and view your impact analytics.'}
                {user.role === 'ngo' && ' You can browse available donations, claim food, and track pickups.'}
                {user.role === 'volunteer' && ' You can accept delivery assignments, optimize routes, and earn reward points.'}
                {user.role === 'admin' && ' You have full platform oversight including user management and fraud detection.'}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate('/dashboard')} className="btn-ghost !py-2.5 !px-5 text-sm">
                Go to Dashboard
              </button>
              <button onClick={handleSignOut} className="flex items-center gap-2 rounded-full glass-soft px-5 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, editing, onChange, hidden }: {
  icon: any; label: string; value: string; editing: boolean; onChange: (v: string) => void; hidden?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {editing && !hidden ? (
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl glass-soft py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl glass-soft px-4 py-2.5 text-sm text-white">
          <Icon className="h-4 w-4 text-slate-500" />
          {hidden ? '••••••••' : (value || '—')}
        </div>
      )}
    </div>
  );
}
