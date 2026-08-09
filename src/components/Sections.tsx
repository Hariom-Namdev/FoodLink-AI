import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Utensils, HeartHandshake, Store, Bike, Leaf, Users, Clock, Navigation,
  TrendingUp, ScanEye, ShieldCheck, Route, Bot, BellRing, ArrowRight,
  MapPin, Package, Quote, Star, Trophy, Award, Zap, Sparkles, Plus, Minus,
  Search, Filter, BadgeCheck, Phone, Mail, X,
} from 'lucide-react';
import { Counter, Reveal, SectionHeading, TiltCard } from './ui';
import LiveMap from './LiveMap';
import ErrorBoundary from './ErrorBoundary';
import FeatureModal from './FeatureModal';
import {
  trustedBy, stats, aiFeatures, ngos, ngoCategories, latestDonations, testimonials,
  successStories, faqs, foodCategoryData, monthlyTrend,
  cityWiseData,
} from '../data/content';
import type { NGO } from '../data/content';

const iconMap: Record<string, any> = {
  utensils: Utensils, 'heart-handshake': HeartHandshake, store: Store, bike: Bike,
  leaf: Leaf, users: Users, clock: Clock, navigation: Navigation,
  'trending-up': TrendingUp, 'scan-eye': ScanEye, 'shield-check': ShieldCheck,
  route: Route, bot: Bot, 'bell-ring': BellRing,
};

/* ---------------- Trusted By ---------------- */
export function TrustedBy() {
  return (
    <section className="border-y border-white/5 bg-ink-soft/40 py-12">
      <div className="container-x px-5 sm:px-8 lg:px-16">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Trusted by India's leading food-relief organizations
          </p>
        </Reveal>
        <div className="no-bar mt-8 flex gap-x-12 overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-x-12">
            {[...trustedBy, ...trustedBy].map((name, i) => (
              <span key={i} className="whitespace-nowrap font-display text-lg font-semibold text-slate-400/70">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Live Statistics ---------------- */
export function LiveStats() {
  return (
    <section className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Live Impact"
          title={<>Real-time numbers, <span className="gradient-text">real lives changed</span></>}
          subtitle="Every meal rescued is a meal that reaches someone in need. Here's what the FoodLink AI community has achieved together."
        />
        <div className="mt-14 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((s, i) => {
            const Icon = iconMap[s.icon] || Leaf;
            return (
              <Reveal key={s.label} delay={i * 0.06} className="h-full">
                <TiltCard className="stat-card h-full w-full overflow-visible">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-white/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-4 font-display font-bold text-white stat-card-value">
                    <Counter value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-400">{s.label}</div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- How It Works ---------------- */
const steps = [
  { n: '01', title: 'Restaurant Lists Surplus', desc: 'Restaurants upload food details — quantity, category, prep time. AI estimates freshness automatically.', icon: Store, color: 'from-emerald-500 to-green-600' },
  { n: '02', title: 'AI Matches Nearest NGO', desc: 'Our engine finds the best-capacity NGO within range and sends an instant claim notification.', icon: Bot, color: 'from-lime-500 to-emerald-600' },
  { n: '03', title: 'Volunteer Picks Up', desc: 'A nearby volunteer gets route-optimized pickup instructions with QR code verification.', icon: Bike, color: 'from-green-500 to-teal-600' },
  { n: '04', title: 'Food Reaches People', desc: 'Meals are delivered, logged, and impact is tracked in real time on the live dashboard.', icon: HeartHandshake, color: 'from-emerald-500 to-lime-600' },
];

export function HowItWorks() {
  return (
    <section id="how" className="section-pad relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="How It Works"
          title={<>From kitchen surplus to <span className="gradient-text">someone's plate</span> in 4 steps</>}
          subtitle="A seamless, AI-orchestrated flow that turns food waste into nourishment within hours."
        />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="group relative h-full">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative h-full rounded-2xl glass p-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-glow`}>
                    <s.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="mt-5 font-display text-sm font-bold text-primary">{s.n}</div>
                  <h3 className="mt-1 font-display text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-600 lg:block">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- AI Features ---------------- */
export function AIFeatures() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const handleCardClick = (title: string) => {
    if (title === 'AI Chatbot') {
      navigate('/chatbot');
    } else {
      setActiveFeature(title);
    }
  };

  return (
    <section id="ai" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="AI Engine"
          title={<>Intelligence at every <span className="gradient-text">step of the chain</span></>}
          subtitle="Twelve AI capabilities working together to make food rescue faster, safer, and smarter."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {aiFeatures.map((f, i) => {
            const Icon = iconMap[f.icon] || Sparkles;
            return (
              <Reveal key={f.title} delay={(i % 4) * 0.08}>
                <TiltCard className="group h-full cursor-pointer" >
                  <button onClick={() => handleCardClick(f.title)} className="flex h-full w-full flex-col text-left">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} shadow-glow`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-white">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Try it <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
      <FeatureModal open={!!activeFeature} onClose={() => setActiveFeature(null)} featureKey={activeFeature} />
    </section>
  );
}

/* ---------------- Featured NGOs ---------------- */
export function FeaturedNGOs() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<NGO | null>(null);

  const cities = ['All', ...Array.from(new Set(ngos.map((n) => n.city)))];

  const filtered = ngos.filter((n) => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q || n.name.toLowerCase().includes(q) || n.address.toLowerCase().includes(q);
    const matchesCity = city === 'All' || n.city === city;
    const matchesCategory = category === 'All' || n.category === category;
    return matchesQuery && matchesCity && matchesCategory;
  });

  return (
    <section id="ngos" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Our Partners"
          title={<>NGOs making it <span className="gradient-text">happen on the ground</span></>}
          subtitle="A network of trusted, verified organizations delivering meals to communities that need them most."
        />

        {/* Search & filters */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by NGO name or location..."
              className="w-full rounded-xl glass-soft py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5" /> City:
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-lg glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
            >
              {cities.map((c) => <option key={c} value={c} className="bg-ink-soft">{c}</option>)}
            </select>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5" /> Category:
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg glass-soft px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
            >
              {ngoCategories.map((c) => <option key={c} value={c} className="bg-ink-soft">{c}</option>)}
            </select>
            <span className="ml-auto text-xs text-slate-500">
              {filtered.length} of {ngos.length} NGOs
            </span>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="mt-14 rounded-2xl glass p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-4 text-slate-400">No NGOs found matching your search. Try different keywords or filters.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n, i) => (
              <Reveal key={n.name} delay={(i % 3) * 0.06}>
                <button
                  onClick={() => setSelected(n)}
                  className="group flex w-full items-center gap-4 rounded-2xl glass p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-2xl ring-1 ring-white/10">
                    {n.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate font-display text-base font-bold text-white">{n.name}</h3>
                      {n.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-400" />}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {n.city}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">
                        <Counter value={n.served} /> meals
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-amber-400">
                        <Star className="h-3 w-3 fill-current" /> {n.rating}
                      </span>
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md rounded-3xl glass p-8 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelected(null)} className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-3xl ring-1 ring-white/10">
                  {selected.logo}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-xl font-bold text-white">{selected.name}</h3>
                    {selected.verified && <BadgeCheck className="h-5 w-5 text-sky-400" />}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-3.5 w-3.5" /> {selected.address}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Meals Served</div>
                  <div className="mt-1 font-display text-lg font-bold text-primary">
                    <Counter value={selected.served} />
                  </div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Rating</div>
                  <div className="mt-1 flex items-center gap-1 font-display text-lg font-bold text-amber-400">
                    <Star className="h-4 w-4 fill-current" /> {selected.rating}
                  </div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Daily Capacity</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">
                    <Counter value={selected.capacity} /> meals
                  </div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Established</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">{selected.established}</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl glass-soft p-4">
                <div className="text-xs text-slate-400">Category</div>
                <div className="mt-1 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{selected.category}</div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="h-4 w-4 text-slate-500" /> {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="h-4 w-4 text-slate-500" /> {selected.email}
                </div>
              </div>

              <button onClick={() => setSelected(null)} className="btn-primary mt-6 w-full">
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------------- Latest Donations ---------------- */
const statusStyle: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  claimed: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  picked: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  delivered: 'bg-green-500/15 text-green-300 ring-green-500/30',
};

export function LatestDonations() {
  return (
    <section className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Live Feed"
          title={<>Fresh donations, <span className="gradient-text">streaming now</span></>}
          subtitle="A real-time view of surplus food being listed, claimed, and delivered across India."
        />
        <div className="mx-auto mt-14 max-w-4xl space-y-3">
          {latestDonations.map((d, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="flex items-center gap-4 rounded-xl glass-soft px-5 py-4 transition-colors hover:bg-white/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-white">{d.restaurant}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${statusStyle[d.status]}`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.city}</span>
                    <span>· {d.food}</span>
                    <span>· {d.meals} meals</span>
                    <span>· {d.time}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Live Food Map ---------------- */
export function LiveFoodMap() {
  return (
    <section id="map" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Live Food Map"
          title={<>India's food rescue, <span className="gradient-text">visualized live</span></>}
          subtitle="Restaurants, NGOs, and volunteers connected across 30+ cities. Search, filter, and click markers for details."
        />
        <Reveal className="mt-14">
          <ErrorBoundary fallback={<div className="rounded-3xl glass p-20 text-center text-slate-400">Map unavailable. Please refresh the page.</div>}>
            <LiveMap />
          </ErrorBoundary>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Success Stories ---------------- */
export function SuccessStories() {
  return (
    <section className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Success Stories"
          title={<>Milestones that <span className="gradient-text">moved a nation</span></>}
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {successStories.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl glass p-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <MapPin className="h-3.5 w-3.5" /> {s.city}
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{s.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <div className="font-display text-2xl font-bold gradient-text">
                      <Counter value={s.meals} />
                    </div>
                    <div className="text-xs text-slate-500">meals delivered</div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    by<br /><span className="font-semibold text-white">{s.ngo}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
export function Testimonials() {
  return (
    <section className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Voices"
          title={<>Loved by the people who <span className="gradient-text">make it work</span></>}
        />
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 2) * 0.1}>
              <div className="relative h-full rounded-2xl glass p-7">
                <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/20" />
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-base leading-relaxed text-slate-200">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Volunteer Section ---------------- */
export function VolunteerSection() {
  const navigate = useNavigate();
  const perks = [
    { icon: Trophy, title: 'Leaderboard', desc: 'Compete with top volunteers nationwide' },
    { icon: Award, title: 'Badges & Rewards', desc: 'Earn points for every meal delivered' },
    { icon: Route, title: 'Optimized Routes', desc: 'AI plans your most efficient path' },
    { icon: Zap, title: 'Instant Matching', desc: 'Get matched with nearby pickups instantly' },
  ];
  return (
    <section className="section-pad">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl glass p-8 sm:p-12">
          <div className="absolute inset-0 aurora opacity-50" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading
                center={false}
                eyebrow="Join the Movement"
                title={<>Become a <span className="gradient-text">food rescue volunteer</span></>}
                subtitle="Deliver hope, one meal at a time. Join 8,900+ volunteers across India earning rewards while fighting food waste."
              />
              <div className="mt-8 flex flex-wrap gap-4">
                <button onClick={() => navigate('/auth')} className="btn-primary group">
                  Sign Up as Volunteer
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => navigate('/dashboard')} className="btn-ghost">See Leaderboard</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {perks.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.08}>
                  <div className="rounded-2xl glass-soft p-5">
                    <p.icon className="h-6 w-6 text-primary" />
                    <h4 className="mt-3 font-display text-sm font-bold text-white">{p.title}</h4>
                    <p className="mt-1 text-xs text-slate-400">{p.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Impact Dashboard preview ---------------- */
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';

const pieColors = ['#22C55E', '#84CC16', '#4ade80', '#a3e635', '#10B981', '#65a30d', '#16A34A'];

export function ImpactDashboard() {
  return (
    <section id="impact" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Impact Dashboard"
          title={<>The numbers behind <span className="gradient-text">the movement</span></>}
          subtitle="Live analytics from the FoodLink AI network — updated as meals are rescued every minute."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* Trend area chart */}
          <Reveal className="lg:col-span-2">
            <div className="rounded-2xl glass p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-white">Monthly Donation Trend</h3>
                <span className="text-xs text-slate-400">meals rescued</span>
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="gMeals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="meals" stroke="#22C55E" strokeWidth={2} fill="url(#gMeals)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>

          {/* Pie chart */}
          <Reveal delay={0.1}>
            <div className="h-full rounded-2xl glass p-6">
              <h3 className="font-display text-base font-bold text-white">Food Categories</h3>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={foodCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {foodCategoryData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {foodCategoryData.map((c, i) => (
                  <span key={c.name} className="flex items-center gap-1.5 text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* City-wise bar */}
          <Reveal className="lg:col-span-3" delay={0.1}>
            <div className="rounded-2xl glass p-6">
              <h3 className="font-display text-base font-bold text-white">City-wise Meals Rescued</h3>
              <div className="mt-6 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityWiseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="city" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="meals" fill="#22C55E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="FAQ"
          title={<>Questions, <span className="gradient-text">answered</span></>}
        />
        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="overflow-hidden rounded-2xl glass">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-base font-semibold text-white">{f.q}</span>
                  <span className="shrink-0 text-primary">
                    {open === i ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: open === i ? 'auto' : 0, opacity: open === i ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm leading-relaxed text-slate-400">{f.a}</p>
                </motion.div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Contact ---------------- */
export function Contact() {
  const navigate = useNavigate();
  return (
    <section id="contact" className="section-pad">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-3xl glass p-8 text-center sm:p-14">
          <div className="absolute inset-0 aurora opacity-60" />
          <div className="relative">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-300">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulseGlow" />
                Get Started
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl text-balance">
                Ready to turn your surplus into <span className="gradient-text">someone's meal?</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg text-balance">
                Join 5,600+ restaurants and 1,240+ NGOs already on FoodLink AI. It's free, always.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <button onClick={() => navigate('/auth')} className="btn-primary group">
                  Register as Restaurant
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button onClick={() => navigate('/auth')} className="btn-ghost">Register as NGO</button>
                <button onClick={() => navigate('/auth')} className="btn-ghost">Become a Volunteer</button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
export function Footer() {
  const navigate = useNavigate();
  const linkMap: Record<string, string> = {
    'How It Works': '/#how',
    'AI Features': '/#ai',
    'Live Map': '/#map',
    'Impact Dashboard': '/#impact',
    'Pricing': '/#contact',
    'Restaurant Registration': '/auth',
    'Add Donation': '/dashboard',
    'Analytics': '/dashboard',
    'Leaderboard': '/dashboard',
    'Reports': '/dashboard',
    'NGO Registration': '/auth',
    'Find Food': '/dashboard',
    'Volunteer Requests': '/dashboard',
    'Organization Profile': '/profile',
    'About': '/#hero',
    'Contact': '/#contact',
    'Privacy Policy': '/#contact',
    'Terms of Service': '/#contact',
    'Careers': '/#contact',
  };
  const cols = [
    { title: 'Platform', links: ['How It Works', 'AI Features', 'Live Map', 'Impact Dashboard', 'Pricing'] },
    { title: 'For Donors', links: ['Restaurant Registration', 'Add Donation', 'Analytics', 'Leaderboard', 'Reports'] },
    { title: 'For NGOs', links: ['NGO Registration', 'Find Food', 'Volunteer Requests', 'Organization Profile'] },
    { title: 'Company', links: ['About', 'Contact', 'Privacy Policy', 'Terms of Service', 'Careers'] },
  ];
  const handleLink = (label: string) => {
    const path = linkMap[label] || '/';
    if (path.startsWith('/#')) {
      const section = path.slice(2);
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      navigate(path);
    }
  };
  return (
    <footer className="border-t border-white/5 bg-ink-soft/40">
      <div className="container-x px-5 py-14 sm:px-8 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
                <Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold text-white">FoodLink<span className="text-primary"> AI</span></span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              An AI-powered platform turning surplus food into hope. Connecting restaurants, NGOs, and volunteers across India.
            </p>
            <div className="mt-5 flex gap-3">
              {['Twitter', 'LinkedIn', 'Instagram', 'GitHub'].map((s) => (
                <a key={s} href={`https://${s.toLowerCase()}.com`} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg glass-soft text-slate-400 transition-colors hover:text-primary">
                  <span className="text-xs font-semibold">{s[0]}</span>
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-bold text-white">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <button onClick={() => handleLink(l)} className="text-sm text-slate-400 transition-colors hover:text-primary">{l}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Newsletter */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-sm text-slate-400">Get impact updates monthly. No spam.</p>
          <form className="flex w-full max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); (e.target as HTMLFormElement).reset(); }}>
            <input
              type="email"
              required
              placeholder="you@email.com"
              className="flex-1 rounded-full glass-soft px-5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="btn-primary !py-2.5">Subscribe</button>
          </form>
        </div>
        <div className="mt-8 border-t border-white/5 pt-6 text-center text-xs text-slate-500">
          © 2026 FoodLink AI. Built to fight hunger, one meal at a time.
        </div>
      </div>
    </footer>
  );
}
