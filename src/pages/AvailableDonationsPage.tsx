import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, MapPin, Leaf, HeartHandshake, Loader2,
  CheckCircle2, AlertCircle, Filter, Search, PackageCheck, Truck, Bike,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase, type Donation } from '../lib/supabase';
import { Reveal, SectionHeading } from '../components/ui';

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  claimed: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  picked: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  removed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
};

function freshnessColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPickup(iso: string): string {
  if (!iso) return 'Flexible';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type Toast = { type: 'success' | 'error'; msg: string } | null;

export default function AvailableDonationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [availableDonations, setAvailableDonations] = useState<Donation[]>([]);
  const [myClaims, setMyClaims] = useState<Donation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'my-claims'>('available');
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [confirmRemove, setConfirmRemove] = useState<Donation | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  const isNGO = user?.role === 'ngo';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const loadAvailable = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      if (!error && data) setAvailableDonations(data as Donation[]);
    } catch { /* silent */ }
  }, []);

  const loadMyClaims = useCallback(async () => {
    if (!user || user.role !== 'ngo') return;
    try {
      const { data: claims } = await supabase
        .from('claims')
        .select('donation_id')
        .eq('ngo_id', user.id)
        .in('status', ['claimed', 'picked']);
      if (!claims || claims.length === 0) {
        setMyClaims([]);
        return;
      }
      const ids = claims.map((c) => c.donation_id);
      const { data: dons } = await supabase
        .from('donations')
        .select('*')
        .in('id', ids)
        .in('status', ['claimed', 'picked'])
        .order('created_at', { ascending: false });
      if (dons) setMyClaims(dons as Donation[]);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    Promise.all([loadAvailable(), loadMyClaims()]).finally(() => setLoadingData(false));
  }, [loadAvailable, loadMyClaims]);

  // Realtime: auto-update when donations or claims change
  useEffect(() => {
    const channel = supabase
      .channel('available-donations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        loadAvailable();
        loadMyClaims();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => {
        loadAvailable();
        loadMyClaims();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAvailable, loadMyClaims]);

  // Poll the AI Agent to process pending tasks
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        await fetch(`${url}/functions/v1/smart-donation-agent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({}),
        });
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const handleClaim = async (donationId: string) => {
    if (!user) return;
    setActionId(donationId);
    setToast(null);
    try {
      const { error } = await supabase.rpc('claim_donation_as_ngo', { p_donation_id: donationId });
      if (error) throw error;
      showToast({ type: 'success', msg: 'Donation claimed successfully! The donor has been notified.' });
      loadAvailable();
      loadMyClaims();
    } catch (err: any) {
      showToast({ type: 'error', msg: err.message || 'Failed to claim donation. It may have already been claimed.' });
    } finally {
      setActionId(null);
    }
  };

  const handleAdvance = async (donationId: string, newStatus: 'picked' | 'delivered') => {
    if (!user) return;
    setActionId(donationId);
    setToast(null);
    try {
      const { error } = await supabase.rpc('advance_donation_status', {
        p_donation_id: donationId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      showToast({
        type: 'success',
        msg: newStatus === 'picked'
          ? 'Donation marked as picked up! The donor has been notified.'
          : 'Donation marked as delivered! Both parties have been notified.',
      });
      loadAvailable();
      loadMyClaims();
    } catch (err: any) {
      showToast({ type: 'error', msg: err.message || 'Failed to update donation status.' });
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove || !user) return;
    setRemoving(true);
    setToast(null);
    try {
      const { error } = await supabase.rpc('admin_remove_donation', {
        p_donation_id: confirmRemove.id,
        p_reason: removeReason || 'Removed by admin',
      });
      if (error) throw error;
      showToast({ type: 'success', msg: 'Donation removed. The donor has been notified.' });
      setConfirmRemove(null);
      setRemoveReason('');
      loadAvailable();
      loadMyClaims();
    } catch (err: any) {
      showToast({ type: 'error', msg: err.message || 'Failed to remove donation.' });
    } finally {
      setRemoving(false);
    }
  };

  const donations = activeTab === 'available' ? availableDonations : myClaims;
  const cities = ['all', ...Array.from(new Set(donations.map((d) => d.city).filter(Boolean)))];
  const filtered = donations.filter((d) => {
    const matchesSearch = !search ||
      d.food_item.toLowerCase().includes(search.toLowerCase()) ||
      d.restaurant_name.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === 'all' || d.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <section className="section-pad relative min-h-screen pt-28">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Live Donations"
          title={<>Available <span className="gradient-text">Food Donations</span></>}
          subtitle="Every new donation appears here instantly. The AI Agent monitors and notifies the nearest NGO in real time."
        />

        {/* Stats bar */}
        <Reveal className="mt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl glass p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
                  <Package className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-white">{availableDonations.length}</div>
                  <div className="text-xs text-slate-400">Available Now</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl glass p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Leaf className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-white">
                    {availableDonations.reduce((s, d) => s + d.meals, 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-400">Total Meals</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl glass p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                  <MapPin className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-display text-2xl font-bold text-white">{cities.length - 1}</div>
                  <div className="text-xs text-slate-400">Cities</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Tabs (NGO only sees My Claims) */}
        {isNGO && (
          <Reveal className="mt-6">
            <div className="flex gap-2 rounded-2xl glass p-2 sm:max-w-xs">
              {([
                { id: 'available' as const, label: 'Available', icon: Package },
                { id: 'my-claims' as const, label: 'My Claims', icon: PackageCheck },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === t.id ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {activeTab === t.id && (
                    <motion.div
                      layoutId="donationsTab"
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                  <t.icon className="relative h-4 w-4" />
                  <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>
          </Reveal>
        )}

        {/* Filters */}
        <Reveal className="mt-6">
          <div className="flex flex-col gap-3 rounded-2xl glass p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by food name or restaurant..."
                className="w-full rounded-xl glass-soft py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-xl glass-soft px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
              >
                {cities.map((c) => (
                  <option key={c} value={c} className="bg-ink-soft">
                    {c === 'all' ? 'All Cities' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Reveal>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`fixed left-1/2 top-24 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-card ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Donations table */}
        <Reveal className="mt-6">
          <div className="overflow-hidden rounded-2xl glass">
            {loadingData ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <Package className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-white">
                  {activeTab === 'my-claims' ? 'No Active Claims' : 'No Available Donations'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {activeTab === 'my-claims'
                    ? 'Donations you claim will appear here so you can track pickup and delivery.'
                    : donations.length === 0
                      ? 'New donations will appear here automatically as soon as restaurants list them.'
                      : 'No donations match your filters. Try adjusting your search.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-white/5 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Food Name</th>
                      <th className="px-5 py-3 font-semibold">Restaurant</th>
                      <th className="px-5 py-3 font-semibold">City</th>
                      <th className="px-5 py-3 font-semibold">Quantity</th>
                      <th className="px-5 py-3 font-semibold">Freshness</th>
                      <th className="px-5 py-3 font-semibold">Pickup Time</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      {isNGO && <th className="px-5 py-3 font-semibold text-right">Action</th>}
                      {isAdmin && activeTab === 'available' && <th className="px-5 py-3 font-semibold text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr key={d.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{d.food_item}</div>
                          <div className="text-xs text-slate-500">{d.category}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{d.restaurant_name}</td>
                        <td className="px-5 py-4 text-slate-300">{d.city}</td>
                        <td className="px-5 py-4">
                          <div className="text-slate-200">{d.quantity} servings</div>
                          <div className="text-xs text-slate-500">{d.meals} meals</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`font-semibold ${freshnessColor(d.freshness_score)}`}>
                            {d.freshness_score}%
                          </span>
                          <div className="text-xs text-slate-500">{d.expiry_hours}h left</div>
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {formatPickup(d.prep_time)}
                          <div className="text-xs text-slate-500">{timeAgo(d.created_at)}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${STATUS_STYLES[d.status] || STATUS_STYLES.available}`}>
                            {d.status}
                          </span>
                        </td>
                        {isNGO && activeTab === 'available' && (
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleClaim(d.id)}
                              disabled={actionId === d.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HeartHandshake className="h-3.5 w-3.5" />}
                              {actionId === d.id ? 'Claiming...' : 'Claim'}
                            </button>
                          </td>
                        )}
                        {isNGO && activeTab === 'my-claims' && (
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {d.status === 'claimed' && (
                                <button
                                  onClick={() => handleAdvance(d.id, 'picked')}
                                  disabled={actionId === d.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3.5 py-1.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/40 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {actionId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bike className="h-3.5 w-3.5" />}
                                  Mark Picked
                                </button>
                              )}
                              {d.status === 'picked' && (
                                <button
                                  onClick={() => handleAdvance(d.id, 'delivered')}
                                  disabled={actionId === d.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {actionId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                                  Mark Delivered
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                        {isAdmin && activeTab === 'available' && (
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setConfirmRemove(d)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 transition-transform hover:scale-105"
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>

        {/* AI Agent info banner */}
        <Reveal className="mt-6">
          <div className="flex items-start gap-3 rounded-2xl glass-soft p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-white">AI Agent is monitoring.</span>{' '}
              The Smart Donation AI Agent automatically detects every new listing, validates it, finds the nearest NGO, and updates the status from Available to Claimed to Delivered. Claimed or completed donations are removed from this list in real time.
            </div>
          </div>
        </Reveal>
      </div>

      {/* Admin Remove Donation Confirmation Modal */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => { if (!removing) setConfirmRemove(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md rounded-3xl glass p-8 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { if (!removing) setConfirmRemove(null); }}
                className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
                  <AlertCircle className="h-5 w-5 text-rose-400" />
                </div>
                <h3 className="font-display text-xl font-bold text-white">Remove Donation</h3>
              </div>
              <p className="mt-4 text-sm text-slate-400">
                You are about to remove <span className="font-semibold text-white">{confirmRemove.food_item}</span> from <span className="font-semibold text-white">{confirmRemove.restaurant_name}</span>. The donor will be notified and the donation will be removed from all listings.
              </p>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Reason</label>
                <textarea
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="e.g. Expired food, duplicate listing, inappropriate content..."
                  rows={3}
                  className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { if (!removing) setConfirmRemove(null); }}
                  disabled={removing}
                  className="btn-ghost flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  disabled={removing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/40 transition-all hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                  {removing ? 'Removing...' : 'Remove Donation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
