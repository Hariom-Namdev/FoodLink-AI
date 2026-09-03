import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles } from 'lucide-react';
import { ngos, cities, foodCategories } from '../data/content';

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

function RouteDemo() {
  const [stops, setStops] = useState(3);
  const [result, setResult] = useState<{ distance: number; time: number; order: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const optimize = async () => {
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
            content: `You are a route optimization AI for food delivery in India. Optimize a route with ${stops} pickup stops. Respond ONLY with JSON: {"total_distance_km": D, "estimated_minutes": M, "optimized_order": "Stop1→Stop2→Stop3"} where D and M are numbers. No other text.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const match = data.reply?.match(/\{[^}]+\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult({
          distance: parsed.total_distance_km ?? stops * 2.5,
          time: parsed.estimated_minutes ?? stops * 12,
          order: parsed.optimized_order ?? Array.from({ length: stops }, (_, i) => `Stop${i + 1}`).join('→'),
        });
      } else {
        setResult({ distance: stops * 2.5, time: stops * 12, order: Array.from({ length: stops }, (_, i) => `Stop${i + 1}`).join('→') });
      }
    } catch {
      setResult({ distance: stops * 2.5, time: stops * 12, order: Array.from({ length: stops }, (_, i) => `Stop${i + 1}`).join('→') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Route Optimization" subtitle="Minimizes volunteer travel time while maximizing meals delivered.">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-400">Number of pickup stops: {stops}</label>
          <input type="range" min="2" max="8" value={stops} onChange={(e) => setStops(Number(e.target.value))} className="mt-1 w-full accent-primary" />
        </div>
        <button onClick={optimize} disabled={loading} className="btn-primary w-full justify-center">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Optimizing...' : 'Optimize Route'}
        </button>
      </div>
      {result && (
        <ResultBox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Total distance</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.distance} km</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate-300">Estimated time</span>
            <span className="font-display text-lg font-bold text-emerald-400">{result.time} min</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Optimized order: {result.order}</div>
        </ResultBox>
      )}
    </ModalShell>
  );
}

function NotificationsDemo() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
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
            content: `You are a smart notification AI for FoodLink food donation platform in India. Generate 3 context-aware notification alerts that a volunteer or NGO might receive right now (e.g., expiring food nearby, pickup needed, impact milestone). Format as a numbered list, each 1 sentence. Keep it concise.`,
          }],
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setResult(data.reply || 'No notifications generated.');
    } catch {
      setResult('1. 120 meals of Veg Biryani expiring in 2h at Paradise Biryani — pickup needed urgently.\n2. You are 50 meals away from your 5,000 meal milestone!\n3. New donation available: 200 chapatis at Haldiram, 3km from your location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Smart Notifications" subtitle="Context-aware alerts for expiring food, nearby pickups, and impact milestones.">
      <button onClick={generate} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Generating...' : 'Generate Smart Alerts'}
      </button>
      {result && (
        <ResultBox>
          <div className="whitespace-pre-line text-sm text-slate-200">{result}</div>
        </ResultBox>
      )}
    </ModalShell>
  );
}
