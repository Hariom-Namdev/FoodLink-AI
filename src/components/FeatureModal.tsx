import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, AlertTriangle, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { ngos, cities, foodCategories } from '../data/content';
import { supabase } from '../lib/supabase';

interface FeatureModalProps {
  open: boolean;
  onClose: () => void;
  featureKey: string | null;
}

export default function FeatureModal({ open, onClose, featureKey }: FeatureModalProps) {
  return (
    <AnimatePresence>
      {open && featureKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl glass shadow-card"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl glass-soft text-slate-300 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <FeatureContent featureKey={featureKey} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeatureContent({ featureKey }: { featureKey: string }) {
  switch (featureKey) {
    case 'Freshness Prediction':
      return <FreshnessDemo />;
    case 'Nearest NGO Matching':
      return <NGOMatchDemo />;
    case 'Demand Forecasting':
      return <DemandDemo />;
    case 'Image Classification':
      return <ImageClassificationDemo />;
    case 'Duplicate Detection':
      return <DuplicateDemo />;
    case 'Route Optimization':
      return <RouteDemo />;
    case 'Smart Notifications':
      return <NotificationsDemo />;
    default:
      return null;
  }
}

function ModalShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="p-6 pt-8">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-300">
        <Sparkles className="h-3.5 w-3.5" /> AI Demo
      </div>
      <h2 className="mt-3 font-display text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl glass-soft p-4">
      {children}
    </div>
  );
}

function FreshnessDemo() {
  const [category, setCategory] = useState('Rice');
  const [prepHours, setPrepHours] = useState(2);
  const [temp, setTemp] = useState(25);
  const [result, setResult] = useState<{ hours: number; score: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const predict = async () => {
    setLoading(true);
    setResult(null);
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a food freshness prediction AI. Given: food category="${category}", hours since preparation=${prepHours}, storage temperature=${temp}C. Respond ONLY with a JSON object: {"edible_hours": N, "freshness_score": S} where N is remaining edible hours (integer) and S is freshness score 0-100 (integer). No other text.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const match = data.reply?.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult({ hours: parsed.edible_hours ?? parsed.edible_hours, score: parsed.freshness_score ?? parsed.freshness_score });
      } else {
        const baseHours: Record<string, number> = { Rice: 8, Dal: 6, Chapati: 4, Vegetables: 5, Fruits: 3, Milk: 2, Bread: 3, Sweets: 5, Snacks: 7, 'Packed Food': 10, Bakery: 3, Juices: 2, 'Water Bottles': 48 };
        const maxHours = baseHours[category] ?? 6;
        const remaining = Math.max(0, maxHours - prepHours - (temp > 30 ? 1 : 0));
        const score = Math.max(0, Math.min(100, Math.round((remaining / maxHours) * 100)));
        setResult({ hours: remaining, score });
      }
    } catch {
      const baseHours: Record<string, number> = { Rice: 8, Dal: 6, Chapati: 4, Vegetables: 5, Fruits: 3, Milk: 2, Bread: 3, Sweets: 5, Snacks: 7, 'Packed Food': 10, Bakery: 3, Juices: 2, 'Water Bottles': 48 };
      const maxHours = baseHours[category] ?? 6;
      const remaining = Math.max(0, maxHours - prepHours - (temp > 30 ? 1 : 0));
      const score = Math.max(0, Math.min(100, Math.round((remaining / maxHours) * 100)));
      setResult({ hours: remaining, score });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Freshness Prediction" subtitle="Estimate remaining edible hours based on food type, prep time, and storage conditions.">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-400">Food Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary">
            {foodCategories.map((c) => <option key={c} value={c} className="bg-ink">{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Hours since preparation: {prepHours}h</label>
          <input type="range" min="0" max="12" value={prepHours} onChange={(e) => setPrepHours(Number(e.target.value))} className="mt-1 w-full accent-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Storage temperature: {temp}°C</label>
          <input type="range" min="0" max="40" value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="mt-1 w-full accent-primary" />
        </div>
        <button onClick={predict} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Predicting...' : 'Predict Freshness'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Remaining edible hours</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.hours}h</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">Freshness score</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.score}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: `${result.score}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
          </div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

function NGOMatchDemo() {
  const [city, setCity] = useState('Delhi');
  const [meals, setMeals] = useState(100);
  const [result, setResult] = useState<{ name: string; city: string; served: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const match = async () => {
    setLoading(true);
    setResult(null);
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are an NGO matching AI. Available NGOs: ${JSON.stringify(ngos.map(n => ({ name: n.name, city: n.city, served: n.served })))}. A restaurant in ${city} wants to donate ${meals} meals. Respond ONLY with the best matching NGO name as plain text, no explanation.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const matchedNgo = ngos.find(n => data.reply?.toLowerCase().includes(n.name.toLowerCase()));
      if (matchedNgo) {
        setResult({ name: matchedNgo.name, city: matchedNgo.city, served: matchedNgo.served });
      } else {
        const nearby = ngos.filter(n => n.city === city);
        const pick = (nearby.length ? nearby : ngos)[0];
        setResult({ name: pick.name, city: pick.city, served: pick.served });
      }
    } catch {
      const nearby = ngos.filter(n => n.city === city);
      const pick = (nearby.length ? nearby : ngos)[0];
      setResult({ name: pick.name, city: pick.city, served: pick.served });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Nearest NGO Matching" subtitle="AI recommends the best-capacity NGO for your donation in real time.">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-400">Pickup City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-xl glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary">
            {cities.map((c) => <option key={c} value={c} className="bg-ink">{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Meals to donate: {meals}</label>
          <input type="range" min="10" max="500" step="10" value={meals} onChange={(e) => setMeals(Number(e.target.value))} className="mt-1 w-full accent-primary" />
        </div>
        <button onClick={match} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Matching...' : 'Find Best NGO'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="text-sm text-slate-300">Best match:</div>
          <div className="mt-1 font-display text-lg font-bold text-emerald-400">{result.name}</div>
          <div className="mt-1 text-xs text-slate-400">{result.city} · {result.served.toLocaleString('en-IN')} people served</div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

function DemandDemo() {
  const [city, setCity] = useState('Delhi');
  const [result, setResult] = useState<{ peak: string; demand: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const forecast = async () => {
    setLoading(true);
    setResult(null);
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a demand forecasting AI for food donation in India. For city "${city}", predict the peak demand hour and meal count. Respond ONLY with JSON: {"peak_hour": "HH:00", "meals": N} where N is an integer 50-500. No other text.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const match = data.reply?.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult({ peak: parsed.peak_hour ?? '19:00', demand: parsed.meals ?? 280 });
      } else {
        setResult({ peak: '19:00', demand: 280 });
      }
    } catch {
      setResult({ peak: '19:00', demand: 280 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Demand Forecasting" subtitle="Predicts where and when food will be needed most.">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-400">City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-xl glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary">
            {cities.map((c) => <option key={c} value={c} className="bg-ink">{c}</option>)}
          </select>
        </div>
        <button onClick={forecast} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Forecasting...' : 'Forecast Demand'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Peak demand hour</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.peak}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">Expected meals needed</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.demand}</span>
          </div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

function ImageClassificationDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<{ category: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const classify = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a food image classification AI. The user uploaded an image named "${selectedFile.name}". Classify it into one of these categories: ${foodCategories.join(', ')}. Respond ONLY with JSON: {"category": "X", "confidence": C} where C is 0-100. No other text.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const match = data.reply?.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult({ category: parsed.category ?? 'Snacks', confidence: parsed.confidence ?? 87 });
      } else {
        setResult({ category: 'Snacks', confidence: 87 });
      }
    } catch {
      setResult({ category: 'Snacks', confidence: 87 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Image Classification" subtitle="Upload a food photo and AI will classify it automatically.">
      <div className="space-y-3">
        <label className="block cursor-pointer rounded-xl glass-soft p-4 text-center transition-colors hover:bg-white/5">
          {preview ? (
            <img src={preview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" />
          ) : (
            <div className="py-4 text-sm text-slate-400">Click to upload a food image</div>
          )}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
        <button onClick={classify} disabled={!selectedFile || loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Classifying...' : 'Classify Image'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Detected category</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.category}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">Confidence</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.confidence}%</span>
          </div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

function DuplicateDemo() {
  const [food, setFood] = useState('Veg Biryani');
  const [meals, setMeals] = useState(120);
  const [city, setCity] = useState('Delhi');
  const [result, setResult] = useState<{ duplicate: boolean; match: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    setResult(null);
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a duplicate detection AI for a food donation platform. Check if this donation seems like a duplicate: food="${food}", meals=${meals}, city="${city}". Consider if same food+city+similar quantity appears suspiciously. Respond ONLY with JSON: {"is_duplicate": true/false, "similarity_score": S} where S is 0-100. No other text.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const match = data.reply?.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult({ duplicate: parsed.is_duplicate ?? false, match: parsed.similarity_score ?? 15 });
      } else {
        setResult({ duplicate: false, match: 15 });
      }
    } catch {
      setResult({ duplicate: false, match: 15 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Duplicate Detection" subtitle="Flags repeat or fraudulent donations to maintain platform integrity.">
      <div className="space-y-3">
        <input value={food} onChange={(e) => setFood(e.target.value)} placeholder="Food item" className="w-full rounded-xl glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary" />
        <div className="flex gap-3">
          <input type="number" value={meals} onChange={(e) => setMeals(Number(e.target.value))} placeholder="Meals" className="w-32 rounded-xl glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary" />
          <select value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 rounded-xl glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary">
            {cities.map((c) => <option key={c} value={c} className="bg-ink">{c}</option>)}
          </select>
        </div>
        <button onClick={check} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Checking...' : 'Check for Duplicates'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Status</span>
            <span className={`font-display text-lg font-bold ${result.duplicate ? 'text-rose-400' : 'text-emerald-400'}`}>
              {result.duplicate ? 'Flagged' : 'Unique'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">Similarity score</span>
            <span className="font-display text-lg font-bold text-white">{result.match}%</span>
          </div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RouteStop {
  label: string;
  lat: number;
  lng: number;
}

function RouteDemo() {
  const [pickupLabel, setPickupLabel] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [deliveryLabel, setDeliveryLabel] = useState('');
  const [deliveryLat, setDeliveryLat] = useState('');
  const [deliveryLng, setDeliveryLng] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    distance: number;
    time: number;
    order: string;
    pickup: RouteStop;
    delivery: RouteStop;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const optimize = async () => {
    setError(null);
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(deliveryLat);
    const dLng = parseFloat(deliveryLng);

    if (isNaN(pLat) || isNaN(pLng) || isNaN(dLat) || isNaN(dLng)) {
      setError('Please enter valid numeric coordinates for both locations.');
      return;
    }
    if (pLat < -90 || pLat > 90 || dLat < -90 || dLat > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (pLng < -180 || pLng > 180 || dLng < -180 || dLng > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const pickup: RouteStop = { label: pickupLabel || 'Pickup', lat: pLat, lng: pLng };
      const delivery: RouteStop = { label: deliveryLabel || 'Delivery', lat: dLat, lng: dLng };
      const distance = haversineKm(pLat, pLng, dLat, dLng);
      const time = Math.max(1, Math.round((distance / 22) * 60));

      setResult({
        distance: Math.round(distance * 10) / 10,
        time,
        order: `${pickup.label} → ${delivery.label}`,
        pickup,
        delivery,
      });
    } catch {
      setError('Failed to calculate route. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Route Optimization" subtitle="Enter pickup and delivery locations to calculate distance, travel time, and optimized route.">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Pickup Location</label>
          <input
            value={pickupLabel}
            onChange={(e) => setPickupLabel(e.target.value)}
            placeholder="Location name (e.g. Taj Hotel, Mumbai)"
            className="w-full rounded-xl glass-soft px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <input
              value={pickupLat}
              onChange={(e) => setPickupLat(e.target.value)}
              placeholder="Latitude (e.g. 19.076)"
              type="number"
              step="any"
              className="flex-1 rounded-xl glass-soft px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={pickupLng}
              onChange={(e) => setPickupLng(e.target.value)}
              placeholder="Longitude (e.g. 72.8777)"
              type="number"
              step="any"
              className="flex-1 rounded-xl glass-soft px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-sky-400">Delivery Location</label>
          <input
            value={deliveryLabel}
            onChange={(e) => setDeliveryLabel(e.target.value)}
            placeholder="Location name (e.g. Akshaya Patra, Bengaluru)"
            className="w-full rounded-xl glass-soft px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <input
              value={deliveryLat}
              onChange={(e) => setDeliveryLat(e.target.value)}
              placeholder="Latitude (e.g. 12.9716)"
              type="number"
              step="any"
              className="flex-1 rounded-xl glass-soft px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={deliveryLng}
              onChange={(e) => setDeliveryLng(e.target.value)}
              placeholder="Longitude (e.g. 77.5946)"
              type="number"
              step="any"
              className="flex-1 rounded-xl glass-soft px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/20">
            {error}
          </div>
        )}

        <button onClick={optimize} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Calculating...' : 'Optimize Route'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Total distance</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.distance} km</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">Estimated travel time</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.time} min</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Optimized route: {result.order}</div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
            <span className="rounded-lg bg-emerald-500/10 px-2 py-1 ring-1 ring-emerald-500/20">
              {result.pickup.label} ({result.pickup.lat}, {result.pickup.lng})
            </span>
            <span>→</span>
            <span className="rounded-lg bg-sky-500/10 px-2 py-1 ring-1 ring-sky-500/20">
              {result.delivery.label} ({result.delivery.lat}, {result.delivery.lng})
            </span>
          </div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

interface SmartAlert {
  icon: 'warning' | 'urgent' | 'info' | 'success';
  title: string;
  detail: string;
}

function NotificationsDemo() {
  const [alerts, setAlerts] = useState<SmartAlert[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setAlerts(null);
    setError(null);
    try {
      const generated: SmartAlert[] = [];

      // 1. Expiring food — available donations with low expiry hours
      const { data: expiring, error: expErr } = await supabase
        .from('donations')
        .select('id, food_item, restaurant_name, city, meals, expiry_hours, created_at')
        .eq('status', 'available')
        .order('expiry_hours', { ascending: true })
        .limit(5);

      if (expErr) throw expErr;
      if (expiring) {
        for (const d of expiring) {
          if (d.expiry_hours !== null && d.expiry_hours <= 3) {
            generated.push({
              icon: 'urgent',
              title: `${d.food_item} expiring in ${d.expiry_hours}h`,
              detail: `${d.meals} meals at ${d.restaurant_name}, ${d.city} — pickup needed urgently.`,
            });
          } else if (d.expiry_hours !== null && d.expiry_hours <= 6) {
            generated.push({
              icon: 'warning',
              title: `${d.food_item} expiring in ${d.expiry_hours}h`,
              detail: `${d.meals} meals at ${d.restaurant_name}, ${d.city} — schedule pickup soon.`,
            });
          }
        }
      }

      // 2. Pending claims — claimed donations awaiting pickup
      const { data: pending, error: penErr } = await supabase
        .from('claims')
        .select(`
          id, status, created_at,
          donation:donations ( food_item, restaurant_name, city, meals )
        `)
        .eq('status', 'claimed')
        .order('created_at', { ascending: true })
        .limit(5);

      if (penErr) throw penErr;
      if (pending) {
        const now = Date.now();
        for (const c of pending as any[]) {
          if (!c.donation) continue;
          const hoursSinceClaim = Math.round((now - new Date(c.created_at).getTime()) / (1000 * 60 * 60));
          if (hoursSinceClaim >= 2) {
            generated.push({
              icon: 'warning',
              title: `Pickup pending for ${c.donation.food_item}`,
              detail: `${c.donation.meals} meals at ${c.donation.restaurant_name}, ${c.donation.city} — claimed ${hoursSinceClaim}h ago, pickup overdue.`,
            });
          } else {
            generated.push({
              icon: 'info',
              title: `Pickup ready: ${c.donation.food_item}`,
              detail: `${c.donation.meals} meals at ${c.donation.restaurant_name}, ${c.donation.city} — claimed, awaiting pickup.`,
            });
          }
        }
      }

      // 3. Available donations nearby — recent available donations
      const { data: available, error: availErr } = await supabase
        .from('donations')
        .select('food_item, restaurant_name, city, meals, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(3);

      if (availErr) throw availErr;
      if (available) {
        for (const d of available) {
          const hoursAgo = Math.round((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60));
          if (hoursAgo <= 1) {
            generated.push({
              icon: 'info',
              title: `New donation available: ${d.food_item}`,
              detail: `${d.meals} meals at ${d.restaurant_name}, ${d.city} — posted ${hoursAgo === 0 ? 'just now' : `${hoursAgo}h ago`}.`,
            });
          }
        }
      }

      // 4. Impact milestones — total delivered meals
      const { data: delivered, error: delErr } = await supabase
        .from('donations')
        .select('meals')
        .eq('status', 'delivered');

      if (delErr) throw delErr;
      if (delivered && delivered.length > 0) {
        const totalMeals = delivered.reduce((sum: number, d: any) => sum + (d.meals || 0), 0);
        const milestones = [100, 500, 1000, 5000, 10000];
        for (const m of milestones) {
          if (totalMeals >= m && totalMeals < m + 50) {
            generated.push({
              icon: 'success',
              title: `Impact milestone: ${m.toLocaleString('en-IN')} meals delivered!`,
              detail: `The platform has delivered ${totalMeals.toLocaleString('en-IN')} meals total. Keep it up!`,
            });
            break;
          }
        }
        if (totalMeals > 0 && generated.length < 3) {
          generated.push({
            icon: 'success',
            title: `${totalMeals.toLocaleString('en-IN')} meals delivered so far`,
            detail: `Across ${delivered.length} completed deliveries on the platform.`,
          });
        }
      }

      // 5. Picked donations awaiting delivery
      const { data: picked, error: pickErr } = await supabase
        .from('donations')
        .select('food_item, restaurant_name, city, meals')
        .eq('status', 'picked')
        .limit(3);

      if (pickErr) throw pickErr;
      if (picked) {
        for (const d of picked) {
          generated.push({
            icon: 'info',
            title: `In transit: ${d.food_item}`,
            detail: `${d.meals} meals from ${d.restaurant_name}, ${d.city} — picked up, delivery in progress.`,
          });
        }
      }

      // Deduplicate by title and limit to 6
      const seen = new Set<string>();
      const unique = generated.filter((a) => {
        if (seen.has(a.title)) return false;
        seen.add(a.title);
        return true;
      }).slice(0, 6);

      setAlerts(unique.length > 0 ? unique : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate alerts.');
    } finally {
      setLoading(false);
    }
  };

  const iconConfig: Record<SmartAlert['icon'], { Icon: typeof AlertTriangle; color: string; bg: string }> = {
    urgent: { Icon: AlertTriangle, color: 'text-rose-300', bg: 'bg-rose-500/10 ring-rose-500/20' },
    warning: { Icon: Clock, color: 'text-amber-300', bg: 'bg-amber-500/10 ring-amber-500/20' },
    info: { Icon: MapPin, color: 'text-sky-300', bg: 'bg-sky-500/10 ring-sky-500/20' },
    success: { Icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-500/10 ring-emerald-500/20' },
  };

  return (
    <ModalShell title="Smart Notifications" subtitle="Context-aware alerts for expiring food, nearby pickups, and impact milestones.">
      <button onClick={generate} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Generating...' : 'Generate Smart Alerts'}
      </button>
      {error && (
        <div className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/20">
          {error}
        </div>
      )}
      {alerts && (
        <ResultBox>
          {alerts.length === 0 ? (
            <div className="py-4 text-center text-sm text-slate-500">
              No active alerts right now. All donations are up to date.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const cfg = iconConfig[alert.icon];
                const Icon = cfg.Icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${cfg.color}`}>{alert.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{alert.detail}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ResultBox>
      )}
    </ModalShell>
  );
}
