import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Utensils, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { foodCategories, cities } from '../data/content';

export default function DonateFoodModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    food_item: '', category: 'Rice', quantity: '', meals: '', city: 'Mumbai',
    lat: '', lng: '', expiry_hours: '6', image_url: '',
  });

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Simple AI freshness score based on category + expiry hours
  const calculateFreshness = (category: string, expiryHours: number) => {
    const baseScores: Record<string, number> = {
      Rice: 95, Dal: 92, Chapati: 88, Vegetables: 85, Fruits: 80,
      Milk: 70, Bread: 75, Sweets: 78, Snacks: 90, 'Packed Food': 93,
      Bakery: 82, Juices: 85, 'Water Bottles': 98,
    };
    const base = baseScores[category] || 85;
    const penalty = Math.max(0, (24 - expiryHours) / 24) * 15;
    return Math.max(50, Math.round(base - penalty));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!user) {
        setError('Please sign in to donate food.');
        setLoading(false);
        return;
      }

      const freshness = calculateFreshness(form.category, parseInt(form.expiry_hours));
      const { error } = await supabase.from('donations').insert({
        restaurant_id: user.id,
        restaurant_name: user.organization || user.full_name,
        food_item: form.food_item,
        category: form.category,
        quantity: parseInt(form.quantity) || 0,
        meals: parseInt(form.meals) || 0,
        city: form.city,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        expiry_hours: parseInt(form.expiry_hours) || 6,
        freshness_score: freshness,
        image_url: form.image_url,
        status: 'available',
      });

      if (error) throw error;

      // Trigger the Smart Donation AI Agent to process the new donation
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        await fetch(`${supabaseUrl}/functions/v1/smart-donation-agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({}),
        });
      } catch {
        // Agent will pick up the task on its next poll cycle regardless
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setForm({ food_item: '', category: 'Rice', quantity: '', meals: '', city: 'Mumbai', lat: '', lng: '', expiry_hours: '6', image_url: '' });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl glass p-8 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            {success ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-white">Donation Listed!</h3>
                <p className="mt-2 text-sm text-slate-400">Your food donation is now live. NGOs nearby will be notified instantly.</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
                    <Utensils className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">Donate Food</h2>
                    <p className="text-xs text-slate-400">List your surplus food for NGOs to claim</p>
                  </div>
                </div>

                {!user && (
                  <div className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-500/30">
                    Please sign in first to create a donation.
                  </div>
                )}
                {error && (
                  <div className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Food Item">
                    <input
                      required
                      value={form.food_item}
                      onChange={(e) => update('food_item', e.target.value)}
                      placeholder="e.g. Veg Biryani, Chapati (200)"
                      className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Category">
                      <select
                        value={form.category}
                        onChange={(e) => update('category', e.target.value)}
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
                      >
                        {foodCategories.map((c) => <option key={c} value={c} className="bg-ink-soft">{c}</option>)}
                      </select>
                    </Field>
                    <Field label="City">
                      <select
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
                      >
                        {cities.map((c) => <option key={c} value={c} className="bg-ink-soft">{c}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Quantity (servings)">
                      <input
                        type="number"
                        required
                        value={form.quantity}
                        onChange={(e) => update('quantity', e.target.value)}
                        placeholder="e.g. 200"
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>
                    <Field label="Meals (est. people fed)">
                      <input
                        type="number"
                        required
                        value={form.meals}
                        onChange={(e) => update('meals', e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry (hours)">
                      <input
                        type="number"
                        required
                        value={form.expiry_hours}
                        onChange={(e) => update('expiry_hours', e.target.value)}
                        placeholder="6"
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>
                    <Field label="Image URL (optional)">
                      <input
                        value={form.image_url}
                        onChange={(e) => update('image_url', e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Latitude (optional)">
                      <input
                        value={form.lat}
                        onChange={(e) => update('lat', e.target.value)}
                        placeholder="19.0760"
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>
                    <Field label="Longitude (optional)">
                      <input
                        value={form.lng}
                        onChange={(e) => update('lng', e.target.value)}
                        placeholder="72.8777"
                        className="w-full rounded-xl glass-soft px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </Field>
                  </div>

                  {/* AI freshness preview */}
                  <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 ring-1 ring-primary/20">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div className="text-sm">
                      <span className="font-semibold text-white">AI Freshness Score: </span>
                      <span className="font-bold text-primary">{calculateFreshness(form.category, parseInt(form.expiry_hours) || 6)}%</span>
                      <span className="text-slate-400"> · estimated edible hours: {form.expiry_hours || 6}h</span>
                    </div>
                  </div>

                  <button type="submit" disabled={loading || !user} className="btn-primary group w-full disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? 'Listing...' : 'List Donation'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
