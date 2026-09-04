import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, HeartHandshake, Bike, ShieldCheck, Utensils, Leaf, Users,
  Package, Navigation, Trophy, Award, Zap, ArrowUpRight,
  CheckCircle2, AlertTriangle, Download, Bot, Activity,
  Clock, MapPin, Search, Loader2, XCircle, Send,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  demoActivityLogs, demoAgentTasks,
} from '../data/demoData';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart, RadialBar,
} from 'recharts';
import { Counter, Reveal, SectionHeading, TiltCard } from './ui';
import { latestDonations, monthlyTrend, cityWiseData, foodCategoryData } from '../data/content';

const roles = [
  { id: 'restaurant', label: 'Restaurant', icon: Store },
  { id: 'ngo', label: 'NGO', icon: HeartHandshake },
  { id: 'volunteer', label: 'Volunteer', icon: Bike },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
];

const pieColors = ['#22C55E', '#84CC16', '#4ade80', '#a3e635', '#10B981', '#65a30d', '#16A34A'];

const restaurantDonations = [
  { food: 'Veg Biryani', meals: 120, status: 'Delivered', date: '12 Jul', freshness: '94%' },
  { food: 'Paneer Curry', meals: 85, status: 'Claimed', date: '12 Jul', freshness: '88%' },
  { food: 'Chapati (200)', meals: 200, status: 'Available', date: '13 Jul', freshness: '97%' },
  { food: 'Dal Makhani', meals: 60, status: 'Delivered', date: '11 Jul', freshness: '91%' },
  { food: 'Mixed Veg', meals: 140, status: 'Picked', date: '13 Jul', freshness: '85%' },
];

const leaderboard = [
  { rank: 1, name: 'Paradise Biryani', city: 'Hyderabad', meals: 8920, badge: 'gold' },
  { rank: 2, name: 'Barbeque Nation', city: 'Bengaluru', meals: 7650, badge: 'silver' },
  { rank: 3, name: 'Haldiram', city: 'Noida', meals: 6840, badge: 'bronze' },
  { rank: 4, name: "Domino's", city: 'Mumbai', meals: 5210, badge: null },
  { rank: 5, name: 'Behrouz Biryani', city: 'Bhopal', meals: 4980, badge: null },
];

const volunteerDeliveries = [
  { id: 'DLV-2041', from: 'Haldiram', to: 'Robin Hood Army', meals: 85, distance: '3.2 km', status: 'Completed', time: '14 min' },
  { id: 'DLV-2040', from: "Domino's", to: 'Feeding India', meals: 140, distance: '5.1 km', status: 'In Transit', time: '22 min' },
  { id: 'DLV-2039', from: 'Theobroma', to: 'Delhi Food Bank', meals: 60, distance: '2.4 km', status: 'Completed', time: '11 min' },
  { id: 'DLV-2038', from: 'Bikanervala', to: 'Goonj', meals: 95, distance: '4.8 km', status: 'Completed', time: '19 min' },
];

const radialData = [
  { name: 'Freshness', value: 94, fill: '#22C55E' },
  { name: 'On-time', value: 88, fill: '#84CC16' },
  { name: 'Claim rate', value: 76, fill: '#10B981' },
];

function StatCard({ icon: Icon, label, value, suffix, trend, color }: any) {
  return (
    <TiltCard className="h-full">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-glow`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <ArrowUpRight className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-3xl font-bold text-white">
        <Counter value={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </TiltCard>
  );
}

/* ---------------- Restaurant Dashboard ---------------- */
function RestaurantDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Utensils} label="Total Donations" value={1248} suffix="+" trend="12%" color="from-emerald-500 to-green-600" />
        <StatCard icon={Users} label="People Fed" value={38400} suffix="+" trend="8%" color="from-lime-500 to-emerald-600" />
        <StatCard icon={Leaf} label="CO₂ Saved (kg)" value={8420} suffix="" trend="15%" color="from-green-500 to-teal-600" />
        <StatCard icon={Trophy} label="Leaderboard Rank" value={3} suffix="" color="from-amber-500 to-yellow-600" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Donation History</h3>
            <div className="mt-5 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="rDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="meals" stroke="#22C55E" strokeWidth={2} fill="url(#rDash)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">AI Freshness Score</h3>
            <div className="mt-2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={radialData} innerRadius="30%" outerRadius="100%" startAngle={90} endAngle={-270}>
                  {radialData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.05)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-xs">
              {radialData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-slate-400">{d.name}</span>
                  <span className="font-semibold text-white">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Recent donations table */}
      <Reveal>
        <div className="overflow-hidden rounded-2xl glass">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="font-display text-base font-bold text-white">Recent Donations</h3>
            <button className="btn-ghost !py-2 !px-4 text-xs"><Download className="h-3.5 w-3.5" /> Export</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-white/5 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Food Item</th>
                  <th className="px-6 py-3 font-semibold">Meals</th>
                  <th className="px-6 py-3 font-semibold">Freshness</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {restaurantDonations.map((d, i) => (
                  <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-white">{d.food}</td>
                    <td className="px-6 py-4 text-slate-300">{d.meals}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-emerald-400">{d.freshness}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        d.status === 'Delivered' ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' :
                        d.status === 'Claimed' ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30' :
                        d.status === 'Available' ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30' :
                        'bg-violet-500/15 text-violet-300 ring-violet-500/30'
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ---------------- NGO Dashboard ---------------- */
function NGODashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Claimed Donations" value={842} suffix="+" trend="18%" color="from-emerald-500 to-green-600" />
        <StatCard icon={CheckCircle2} label="Completed Pickups" value={790} suffix="" trend="14%" color="from-lime-500 to-emerald-600" />
        <StatCard icon={Users} label="People Served" value={156000} suffix="+" trend="22%" color="from-green-500 to-teal-600" />
        <StatCard icon={Bike} label="Active Volunteers" value={48} suffix="" color="from-teal-500 to-green-600" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Nearby Available Food</h3>
            <div className="mt-4 space-y-3">
              {latestDonations.slice(0, 5).map((d, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl glass-soft px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{d.restaurant} · {d.food}</div>
                    <div className="text-xs text-slate-400">{d.city} · {d.meals} meals · {d.time}</div>
                  </div>
                  <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-105">
                    Claim
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Food Requirements</h3>
            <div className="mt-4 space-y-4">
              {[
                { item: 'Rice', needed: 500, have: 320, color: '#22C55E' },
                { item: 'Vegetables', needed: 300, have: 180, color: '#84CC16' },
                { item: 'Bread', needed: 200, have: 150, color: '#10B981' },
                { item: 'Milk', needed: 150, have: 60, color: '#a3e635' },
              ].map((r) => (
                <div key={r.item}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{r.item}</span>
                    <span className="text-slate-500">{r.have}/{r.needed} kg</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(r.have / r.needed) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: r.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ---------------- Volunteer Dashboard ---------------- */
function VolunteerDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Deliveries Made" value={1240} suffix="" trend="24%" color="from-emerald-500 to-green-600" />
        <StatCard icon={Users} label="Meals Delivered" value={38200} suffix="+" trend="19%" color="from-lime-500 to-emerald-600" />
        <StatCard icon={Zap} label="Reward Points" value={12480} suffix="" trend="32%" color="from-amber-500 to-yellow-600" />
        <StatCard icon={Award} label="Badges Earned" value={14} suffix="" color="from-green-500 to-teal-600" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Active Deliveries</h3>
            <div className="mt-4 space-y-3">
              {volunteerDeliveries.map((d) => (
                <div key={d.id} className="flex items-center gap-4 rounded-xl glass-soft px-4 py-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">{d.from} → {d.to}</div>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>{d.meals} meals</span><span>· {d.distance}</span><span>· {d.time}</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    d.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' : 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
                  }`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Your Badges</h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { name: 'First Drop', icon: '🌱', earned: true },
                { name: '100 Meals', icon: '🍽️', earned: true },
                { name: 'Night Owl', icon: '🌙', earned: true },
                { name: 'Speed King', icon: '⚡', earned: true },
                { name: '1K Meals', icon: '🏆', earned: true },
                { name: 'Marathon', icon: '🔥', earned: false },
              ].map((b) => (
                <div key={b.name} className={`flex flex-col items-center rounded-xl p-3 text-center ${b.earned ? 'glass-soft' : 'opacity-30 grayscale'}`}>
                  <span className="text-2xl">{b.icon}</span>
                  <span className="mt-1 text-[10px] font-medium text-slate-300">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ---------------- Donation Matching Agent Panel ---------------- */
interface ActivityLog {
  id: string;
  action: string;
  ngo_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

interface AgentTask {
  id: string;
  donation_id: string;
  status: string;
  current_ngo_id: string | null;
  notified_ngo_ids: string[];
  retry_count: number;
  timeout_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  donation?: {
    food_item: string;
    restaurant_name: string;
    city: string;
    quantity: number;
    meals: number;
    category: string;
    freshness_score: number;
    status: string;
  };
  current_ngo?: {
    name: string;
    city: string;
    category: string;
  } | null;
}

const actionLabels: Record<string, string> = {
  donation_detected: 'New donation detected',
  validated: 'Donation validated',
  validation_failed: 'Validation failed',
  ngo_notified: 'NGO notified',
  ngo_accepted: 'NGO accepted donation',
  ngo_rejected: 'NGO rejected donation',
  ngo_timeout: 'NGO did not respond in time',
  status_updated: 'Donation status updated',
  donor_notified: 'Donor notified',
  task_completed: 'Agent task completed',
  donation_delivered: 'Donation delivered',
  no_ngos_available: 'No NGOs available',
  donation_already_processed: 'Already processed',
  donation_not_found: 'Donation not found',
  claim_creation_failed: 'Claim creation failed',
};

const actionColors: Record<string, string> = {
  donation_detected: 'text-sky-400',
  validated: 'text-emerald-400',
  validation_failed: 'text-rose-400',
  ngo_notified: 'text-amber-400',
  ngo_accepted: 'text-emerald-400',
  ngo_rejected: 'text-rose-400',
  ngo_timeout: 'text-orange-400',
  status_updated: 'text-sky-400',
  task_completed: 'text-emerald-400',
  donation_delivered: 'text-emerald-400',
};

const actionBgColors: Record<string, string> = {
  donation_detected: 'bg-sky-500/10',
  validated: 'bg-emerald-500/10',
  validation_failed: 'bg-rose-500/10',
  ngo_notified: 'bg-amber-500/10',
  ngo_accepted: 'bg-emerald-500/10',
  ngo_rejected: 'bg-rose-500/10',
  ngo_timeout: 'bg-orange-500/10',
  status_updated: 'bg-sky-500/10',
  task_completed: 'bg-emerald-500/10',
  donation_delivered: 'bg-emerald-500/10',
};

const actionIcons: Record<string, any> = {
  donation_detected: Search,
  validated: CheckCircle2,
  validation_failed: XCircle,
  ngo_notified: Send,
  ngo_accepted: CheckCircle2,
  ngo_rejected: XCircle,
  ngo_timeout: Clock,
  status_updated: Activity,
  task_completed: CheckCircle2,
  donation_delivered: Package,
};

const taskStatusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending', color: 'text-slate-300', bg: 'bg-slate-500/15 ring-slate-500/30', icon: Clock },
  validating: { label: 'Validating', color: 'text-sky-300', bg: 'bg-sky-500/15 ring-sky-500/30', icon: Loader2 },
  notifying: { label: 'Notifying NGO', color: 'text-amber-300', bg: 'bg-amber-500/15 ring-amber-500/30', icon: Send },
  awaiting_response: { label: 'Awaiting NGO Response', color: 'text-amber-300', bg: 'bg-amber-500/15 ring-amber-500/30', icon: Clock },
  completed: { label: 'Completed', color: 'text-emerald-300', bg: 'bg-emerald-500/15 ring-emerald-500/30', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-rose-300', bg: 'bg-rose-500/15 ring-rose-500/30', icon: XCircle },
};

function TimeCountdown({ timeoutAt }: { timeoutAt: string | null }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!timeoutAt) { setRemaining(''); return; }
    const update = () => {
      const diff = new Date(timeoutAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const s = Math.floor(diff / 1000);
      setRemaining(`${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timeoutAt]);
  if (!remaining) return null;
  const expired = remaining === 'Expired';
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${expired ? 'text-rose-400' : 'text-amber-400'}`}>
      <Clock className={`h-3 w-3 ${expired ? '' : 'animate-pulse'}`} />
      {expired ? 'Timed out' : remaining}
    </span>
  );
}

export function AgentActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadLogs = async () => {
      const { data } = await supabase
        .from('agent_activity_log')
        .select('id, action, ngo_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (mounted && data && data.length > 0) setLogs(data);
      else if (mounted) setLogs(demoActivityLogs as unknown as ActivityLog[]);
    };

    const loadTasks = async () => {
      const { data } = await supabase
        .from('agent_tasks')
        .select(`
          id, donation_id, status, current_ngo_id, notified_ngo_ids,
          retry_count, timeout_at, error, created_at, updated_at,
          donation:donations ( food_item, restaurant_name, city, quantity, meals, category, freshness_score, status )
        `)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (mounted && data && data.length > 0) {
        const tasksWithNgo = await Promise.all((data as unknown as AgentTask[]).map(async (t) => {
          if (t.current_ngo_id) {
            const { data: ngo } = await supabase
              .from('ngos')
              .select('name, city, category')
              .eq('id', t.current_ngo_id)
              .maybeSingle();
            return { ...t, current_ngo: ngo };
          }
          return { ...t, current_ngo: null };
        }));
        setTasks(tasksWithNgo);
      } else if (mounted) {
        setTasks(demoAgentTasks as unknown as AgentTask[]);
      }
      if (mounted) setLoading(false);
    };

    loadLogs();
    loadTasks();

    const channel = supabase
      .channel('agent-realtime-panel')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_activity_log' },
        (payload: any) => {
          setLogs((prev) => [payload.new as ActivityLog, ...prev].slice(0, 30));
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'agent_tasks' },
        () => { loadTasks(); },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const activeTasks = tasks.filter((t) =>
    t.status === 'pending' || t.status === 'validating' ||
    t.status === 'notifying' || t.status === 'awaiting_response'
  );
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');
  const hasActivity = logs.length > 0 || tasks.length > 0;

  return (
    <Reveal className="lg:col-span-3">
      <div className="overflow-hidden rounded-2xl glass">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-white/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">Donation Matching Agent</h3>
            <p className="text-xs text-slate-500">Autonomous food donation lifecycle manager</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Active
          </span>
        </div>

        {/* Agent Stats Bar */}
        <div className="grid grid-cols-4 gap-px border-b border-white/5 bg-white/[0.02]">
          {[
            { label: 'In Progress', value: activeTasks.length, color: 'text-amber-400', icon: Loader2 },
            { label: 'Completed', value: completedTasks.length, color: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'Failed', value: failedTasks.length, color: 'text-rose-400', icon: XCircle },
            { label: 'Total Logs', value: logs.length, color: 'text-sky-400', icon: Activity },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-3 text-center">
              <stat.icon className={`mx-auto h-3.5 w-3.5 ${stat.color} ${stat.label === 'In Progress' && activeTasks.length > 0 ? 'animate-spin' : ''}`} />
              <div className={`mt-1 font-display text-lg font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Body: two columns */}
        <div className="grid gap-px bg-white/[0.02] lg:grid-cols-5">
          {/* Left: Active Workflows */}
          <div className="lg:col-span-3 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Workflows</h4>
            </div>
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading agent tasks...</div>
            ) : activeTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <Bot className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                No active workflows. The agent is idle and monitoring.
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {activeTasks.map((task) => {
                    const cfg = taskStatusConfig[task.status] || taskStatusConfig.pending;
                    const StatusIcon = cfg.icon;
                    const d = task.donation;
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-xl glass-soft p-4"
                      >
                        {/* Task header */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon className={`h-3 w-3 ${task.status === 'validating' ? 'animate-spin' : ''}`} />
                            {cfg.label}
                          </span>
                          <TimeCountdown timeoutAt={task.timeout_at} />
                        </div>

                        {/* Donation details */}
                        {d && (
                          <div className="mt-3 flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-white">{d.food_item}</div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                                <span>{d.restaurant_name}</span>
                                <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{d.city}</span>
                                <span>{d.meals} meals</span>
                                <span className="text-emerald-400">Freshness: {d.freshness_score}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Selected NGO */}
                        {task.current_ngo && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/5 px-3 py-2 ring-1 ring-amber-500/10">
                            <Send className="h-3 w-3 text-amber-400" />
                            <span className="text-xs text-slate-400">Notifying:</span>
                            <span className="text-xs font-semibold text-white">{task.current_ngo.name}</span>
                            <span className="text-xs text-slate-500">· {task.current_ngo.city}</span>
                          </div>
                        )}

                        {/* Notified NGOs history */}
                        {task.notified_ngo_ids && task.notified_ngo_ids.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span>NGOs tried: {task.notified_ngo_ids.length}</span>
                            <div className="flex gap-1">
                              {task.notified_ngo_ids.slice(0, 5).map((_, i) => (
                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-500/40" />
                              ))}
                              {task.notified_ngo_ids.length > 5 && (
                                <span className="text-[10px]">+{task.notified_ngo_ids.length - 5}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {task.error && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            {task.error}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right: Live Activity Log */}
          <div className="lg:col-span-2 border-t border-white/5 p-5 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live Activity Log</h4>
            </div>
            {logs.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No activity yet. Create a donation to see the agent in action.
              </div>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {logs.map((log) => {
                    const Icon = actionIcons[log.action] || Activity;
                    const color = actionColors[log.action] || 'text-slate-400';
                    const bg = actionBgColors[log.action] || 'bg-white/5';
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${bg}`}>
                          <Icon className={`h-3 w-3 ${color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-white">
                            {actionLabels[log.action] || log.action}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {log.details?.food_item && <span>{log.details.food_item}</span>}
                            {log.details?.ngo_name && <span>· {log.details.ngo_name}</span>}
                            {log.details?.reason && <span className="truncate">· {log.details.reason}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-600">{formatTime(log.created_at)}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!hasActivity && !loading && (
          <div className="border-t border-white/5 px-6 py-4 text-center text-xs text-slate-500">
            The agent is standing by. When a restaurant donates food, it will automatically validate, match, and notify the nearest NGO.
          </div>
        )}
      </div>
    </Reveal>
  );
}

/* ---------------- Admin Dashboard ---------------- */
function AdminDashboard() {
  const fraudFlags = [
    { restaurant: 'Local Eatery #4821', issue: 'Duplicate listing detected', severity: 'High' },
    { restaurant: 'Test Kitchen', issue: 'Unverified pickup location', severity: 'Medium' },
    { restaurant: 'Quick Bites', issue: 'Quantity mismatch (3x)', severity: 'Low' },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Store} label="Total Restaurants" value={5600} suffix="+" trend="11%" color="from-emerald-500 to-green-600" />
        <StatCard icon={HeartHandshake} label="Active NGOs" value={1240} suffix="+" trend="9%" color="from-lime-500 to-emerald-600" />
        <StatCard icon={Bike} label="Volunteers" value={8900} suffix="+" trend="17%" color="from-green-500 to-teal-600" />
        <StatCard icon={AlertTriangle} label="Fraud Flags" value={3} suffix="" color="from-rose-500 to-red-600" />
      </div>

      <AgentActivityFeed />

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Platform-wide Donation Trend</h3>
            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="meals" stroke="#22C55E" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="co2" stroke="#84CC16" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Fraud Detection</h3>
            <div className="mt-4 space-y-3">
              {fraudFlags.map((f, i) => (
                <div key={i} className="rounded-xl glass-soft p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{f.restaurant}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                      f.severity === 'High' ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' :
                      f.severity === 'Medium' ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30' :
                      'bg-sky-500/15 text-sky-300 ring-sky-500/30'
                    }`}>{f.severity}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{f.issue}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">City-wise Distribution</h3>
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

        <Reveal delay={0.1}>
          <div className="h-full rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Food Mix</h3>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={foodCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {foodCategoryData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ---------------- Leaderboard (shared) ---------------- */
function Leaderboard() {
  const badgeColor: Record<string, string> = {
    gold: 'from-amber-400 to-yellow-500',
    silver: 'from-slate-300 to-slate-400',
    bronze: 'from-orange-400 to-amber-600',
  };
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl glass">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="font-display text-base font-bold text-white">Top Donating Restaurants</h3>
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>
        <div className="space-y-1 px-3 pb-3">
          {leaderboard.map((l) => (
            <div key={l.rank} className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-white/5">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-bold ${
                l.badge ? `bg-gradient-to-br ${badgeColor[l.badge]} text-ink` : 'glass-soft text-slate-300'
              }`}>
                {l.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{l.name}</div>
                <div className="text-xs text-slate-400">{l.city}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-bold text-primary"><Counter value={l.meals} /></div>
                <div className="text-[10px] text-slate-500">meals</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export default function Dashboard() {
  const [role, setRole] = useState('restaurant');
  return (
    <section id="dashboard" className="section-pad relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Dashboards"
          title={<>One platform, <span className="gradient-text">every role</span></>}
          subtitle="Role-based dashboards with real-time analytics, AI insights, and actionable data for everyone in the chain."
        />

        {/* Role tabs */}
        <Reveal className="mt-10">
          <div className="mx-auto flex max-w-fit flex-wrap justify-center gap-2 rounded-2xl glass p-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                  role === r.id ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {role === r.id && (
                  <motion.div
                    layoutId="roleTab"
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
                <r.icon className="relative h-4 w-4" />
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* Dashboard content */}
        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {role === 'restaurant' && <RestaurantDashboard />}
              {role === 'ngo' && <NGODashboard />}
              {role === 'volunteer' && <VolunteerDashboard />}
              {role === 'admin' && <AdminDashboard />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Leaderboard for all */}
        <div className="mt-6">
          <Leaderboard />
        </div>
      </div>
    </section>
  );
}
