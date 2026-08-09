import { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Utensils, Search, ArrowRight } from 'lucide-react';
import { Counter } from './ui';
import DonateFoodModal from './DonateFoodModal';
import WatchDemoModal from './WatchDemoModal';
import ErrorBoundary from './ErrorBoundary';

const EarthScene = lazy(() => import('./EarthScene'));

const EarthFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-64 w-64 animate-pulseGlow rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl" />
  </div>
);

export default function Hero() {
  const navigate = useNavigate();
  const [donateOpen, setDonateOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 aurora" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink" />

      {/* 3D Earth */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary fallback={<EarthFallback />}>
          <Suspense fallback={<EarthFallback />}>
            <EarthScene />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pt-28 sm:px-8 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-semibold text-green-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Food Rescue · Live across 30+ Indian cities
          </div>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl text-balance">
            Turning Surplus Food
            <br />
            into <span className="gradient-text">Hope.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl text-balance">
            An AI-powered platform connecting restaurants with NGOs to reduce food waste and fight hunger — one meal at a time.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button onClick={() => setDonateOpen(true)} className="btn-primary group">
              <Utensils className="h-4 w-4" />
              Donate Food
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button onClick={() => {
              const el = document.getElementById('ngos');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              else navigate('/#ngos');
            }} className="btn-ghost group">
              <Search className="h-4 w-4" />
              Find NGOs
            </button>
            <button onClick={() => setDemoOpen(true)} className="btn-ghost group">
              <Play className="h-4 w-4 fill-white" />
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Live counter strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { label: 'Meals Saved', value: 8420000, suffix: '+' },
            { label: 'NGOs', value: 1240, suffix: '+' },
            { label: 'Restaurants', value: 5600, suffix: '+' },
            { label: 'CO₂ Saved (kg)', value: 1850000, suffix: '+' },
          ].map((s) => (
            <div key={s.label} className="stat-card rounded-xl glass-soft px-4 py-3">
              <div className="font-display font-bold text-white stat-card-value">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-400">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

<DonateFoodModal open={donateOpen} onClose={() => setDonateOpen(false)} />
      <WatchDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </section>
  );
}
