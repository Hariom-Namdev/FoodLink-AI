import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, HeartHandshake, Bike, ShieldCheck, Utensils, Leaf, Users,
  Package, Navigation, Trophy, Award, Zap, ArrowUpRight,
  CheckCircle2, AlertTriangle, Download, Plus, X, Loader2, AlertCircle,
  Search, Clock, Filter,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart, RadialBar,
} from 'recharts';
import { useAuth } from '../lib/auth';
import { supabase, type Donation } from '../lib/supabase';
import { Counter, Reveal, SectionHeading, TiltCard } from '../components/ui';
import { latestDonations, monthlyTrend } from '../data/content';
import DonateFoodModal from '../components/DonateFoodModal';
import { AgentActivityFeed } from '../components/Dashboard';

type RoleId = 'restaurant' | 'ngo' | 'volunteer' | 'admin';

const roles: { id: RoleId; label: string; icon: any }[] = [
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

function StatCard({ icon: Icon, label, value, suffix, trend, color, onClick }: any) {
  return (
    <TiltCard className={`stat-card h-full w-full ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
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
      <div className="mt-4 font-display font-bold text-white stat-card-value">
        <Counter value={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </TiltCard>
  );
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Restaurant Dashboard ---------------- */
function RestaurantDashboard({ donations, onDonate }: { donations: Donation[]; onDonate: () => void }) {
  const userDonations = donations;
  const totalMeals = userDonations.reduce((s, d) => s + d.meals, 0) || 38400;
  const co2Saved = Math.round(totalMeals * 0.22) || 8420;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-white">Restaurant Overview</h3>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(userDonations.length ? userDonations : restaurantDonations, 'my-donations.csv')} className="btn-ghost !py-2 !px-4 text-xs">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={onDonate} className="btn-primary !py-2 !px-4 text-xs">
            <Plus className="h-3.5 w-3.5" /> New Donation
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Utensils} label="Total Donations" value={userDonations.length || 1248} suffix="+" trend="12%" color="from-emerald-500 to-green-600" />
        <StatCard icon={Users} label="People Fed" value={totalMeals} suffix="+" trend="8%" color="from-lime-500 to-emerald-600" />
        <StatCard icon={Leaf} label="CO₂ Saved (kg)" value={co2Saved} suffix="" trend="15%" color="from-green-500 to-teal-600" />
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

      <Reveal>
        <div className="overflow-hidden rounded-2xl glass">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="font-display text-base font-bold text-white">Recent Donations</h3>
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
                {(userDonations.length ? userDonations : restaurantDonations as any).map((d: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-white">{d.food_item || d.food}</td>
                    <td className="px-6 py-4 text-slate-300">{d.meals}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-emerald-400">{d.freshness_score ? `${d.freshness_score}%` : d.freshness}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${
                        (d.status || '').includes('deliver') ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' :
                        (d.status || '').includes('claim') ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30' :
                        (d.status || '').includes('available') ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30' :
                        'bg-violet-500/15 text-violet-300 ring-violet-500/30'
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{d.date || new Date(d.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
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
function NGODashboard({ donations, onClaim, onAdvance }: { donations: Donation[]; onClaim: (id: string) => void; onAdvance: (id: string, status: 'picked' | 'delivered') => void }) {
  const available = donations.filter((d) => d.status === 'available');
  const myClaims = donations.filter((d) => d.status === 'claimed' || d.status === 'picked');
  const displayDonations = available.length ? available : latestDonations.filter((d) => d.status === 'available');

  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-bold text-white">NGO Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Claimed Donations" value={842} suffix="+" trend="18%" color="from-emerald-500 to-green-600" />
        <StatCard icon={CheckCircle2} label="Completed Pickups" value={790} suffix="" trend="14%" color="from-lime-500 to-emerald-600" />
        <StatCard icon={Users} label="People Served" value={156000} suffix="+" trend="22%" color="from-green-500 to-teal-600" />
        <StatCard icon={Bike} label="Active Volunteers" value={48} suffix="" color="from-teal-500 to-green-600" />
      </div>

      {/* My Active Claims — Mark as Picked / Delivered */}
      {myClaims.length > 0 && (
        <Reveal>
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">My Active Claims</h3>
            <p className="mt-1 text-xs text-slate-400">Track your claimed donations and update their status as you pick up and deliver.</p>
            <div className="mt-4 space-y-3">
            {myClaims.map((d) => (
              <div key={d.id} className="flex items-center gap-4 rounded-xl glass-soft px-4 py-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${d.status === 'claimed' ? 'bg-amber-500/15' : 'bg-violet-500/15'}`}>
                  {d.status === 'claimed' ? <Package className="h-4 w-4 text-amber-400" /> : <Bike className="h-4 w-4 text-violet-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{d.restaurant_name} · {d.food_item}</div>
                  <div className="text-xs text-slate-400">{d.city} · {d.meals} meals · {d.quantity} servings</div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${
                  d.status === 'claimed' ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30' : 'bg-violet-500/15 text-violet-300 ring-violet-500/30'
                }`}>{d.status}</span>
                {d.status === 'claimed' ? (
                  <button
                    onClick={() => onAdvance(d.id, 'picked')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3.5 py-1.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/40 transition-transform hover:scale-105"
                  >
                    <Bike className="h-3.5 w-3.5" />
                    Mark Picked
                  </button>
                ) : (
                  <button
                    onClick={() => onAdvance(d.id, 'delivered')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40 transition-transform hover:scale-105"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Delivered
                  </button>
                )}
              </div>
            ))}
            </div>
          </div>
        </Reveal>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Nearby Available Food</h3>
            <div className="mt-4 space-y-3">
              {displayDonations.slice(0, 6).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-4 rounded-xl glass-soft px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{d.restaurant_name || d.restaurant} · {d.food_item || d.food}</div>
                    <div className="text-xs text-slate-400">{d.city} · {d.meals} meals · {d.time || ''}</div>
                  </div>
                  <button
                    onClick={() => onClaim(d.id || i)}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-105"
                  >
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
      <h3 className="font-display text-lg font-bold text-white">Volunteer Overview</h3>
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

/* ---------------- Admin Dashboard ---------------- */
function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
        <Icon className="h-7 w-7 text-slate-500" />
      </div>
      <p className="mt-4 text-sm text-slate-400">{text}</p>
    </div>
  );
}

interface AdminStats {
  restaurants: number;
  ngos: number;
  volunteers: number;
  total_donations: number;
  available: number;
  claimed: number;
  picked: number;
  delivered: number;
  removed: number;
  total_meals: number;
  total_claims: number;
  active_claims: number;
  completed_claims: number;
}

interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  organization: string;
  city: string;
  phone: string;
  created_at: string;
  donation_count?: number;
}

function AdminDashboard({ donations, onRemove }: { donations: Donation[]; onRemove: (d: Donation, reason: string) => void }) {
  const [selected, setSelected] = useState<Donation | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed' | 'picked' | 'delivered' | 'removed'>('all');
  const [confirmRemove, setConfirmRemove] = useState<Donation | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);
  const [detailModal, setDetailModal] = useState<'restaurants' | 'ngos' | 'volunteers' | 'fraud' | null>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [detailCityFilter, setDetailCityFilter] = useState('all');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [profileRows, setProfileRows] = useState<ProfileRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
      if (mounted && !error && data) setStats(data as AdminStats);
    };
    loadStats();
    return () => { mounted = false; };
  }, [donations]);

  useEffect(() => {
    if (!detailModal) { setProfileRows([]); return; }
    setDetailLoading(true);
    let mounted = true;

    const loadDetail = async () => {
      if (detailModal === 'fraud') {
        const { data } = await supabase
          .from('donations')
          .select('id, restaurant_name, food_item, city, status, created_at, freshness_score')
          .or('status.eq.removed, freshness_score.lt.70')
          .order('created_at', { ascending: false })
          .limit(20);
        if (mounted && data) {
          setProfileRows(data.map((d: any) => ({
            id: d.id,
            full_name: d.restaurant_name,
            role: 'donation',
            organization: d.food_item,
            city: d.city || '',
            phone: '',
            created_at: d.created_at,
            donation_count: d.freshness_score,
          })));
        }
      } else {
        const roleFilter = detailModal === 'restaurants' ? 'restaurant' : detailModal === 'ngos' ? 'ngo' : 'volunteer';
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, organization, city, phone, created_at')
          .eq('role', roleFilter)
          .order('created_at', { ascending: false });
        if (mounted && !error && data) {
          if (detailModal === 'restaurants') {
            const withCounts = await Promise.all((data as ProfileRow[]).map(async (p) => {
              const { count } = await supabase
                .from('donations')
                .select('id', { count: 'exact', head: true })
                .eq('restaurant_id', p.id);
              return { ...p, donation_count: count || 0 };
            }));
            if (mounted) setProfileRows(withCounts);
          } else {
            setProfileRows(data as ProfileRow[]);
          }
        } else if (mounted) {
          setProfileRows([]);
        }
      }
      if (mounted) setDetailLoading(false);
    };
    loadDetail();
    return () => { mounted = false; };
  }, [detailModal]);

  const allDonations = donations;
  const filtered = filter === 'all' ? allDonations : allDonations.filter((d) => d.status === filter);

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    claimed: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    picked: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
    delivered: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    removed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  };

  // Compute fraud flags from real donations: removed donations + low freshness
  const fraudFlags = allDonations
    .filter((d) => d.status === 'removed' || d.freshness_score < 70)
    .slice(0, 5)
    .map((d) => ({
      restaurant: d.restaurant_name,
      issue: d.status === 'removed' ? 'Removed by admin' : `Low freshness score (${d.freshness_score}%)`,
      severity: d.status === 'removed' ? 'High' : d.freshness_score < 60 ? 'High' : 'Medium',
    }));

  // Compute chart data from real donations
  const cityWise = useMemo(() => {
    const cityMap: Record<string, number> = {};
 allDonations.forEach((d) => {
      if (d.status === 'removed') return;
      cityMap[d.city] = (cityMap[d.city] || 0) + d.meals;
    });
    return Object.entries(cityMap)
      .map(([city, meals]) => ({ city, meals }))
      .sort((a, b) => b.meals - a.meals)
      .slice(0, 8);
  }, [allDonations]);

  const foodMix = useMemo(() => {
    const catMap: Record<string, number> = {};
    allDonations.forEach((d) => {
      if (d.status === 'removed') return;
      catMap[d.category] = (catMap[d.category] || 0) + 1;
    });
    const entries = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    if (entries.length === 0) return [{ name: 'No data', value: 1 }];
    return entries;
  }, [allDonations]);

  const trendData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    allDonations.forEach((d) => {
      if (d.status === 'removed') return;
      const date = new Date(d.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      monthMap[key] = (monthMap[key] || 0) + d.meals;
    });
    const entries = Object.entries(monthMap)
      .map(([month, meals]) => ({ month, meals, co2: Math.round(meals * 0.22) }))
      .slice(-12);
    if (entries.length === 0) return [{ month: '—', meals: 0, co2: 0 }];
    return entries;
  }, [allDonations]);
  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-bold text-white">Admin Overview</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Store} label="Total Restaurants" value={stats?.restaurants ?? 0} suffix="" color="from-emerald-500 to-green-600" onClick={() => { setDetailModal('restaurants'); setDetailSearch(''); setDetailCityFilter('all'); }} />
        <StatCard icon={HeartHandshake} label="Active NGOs" value={stats?.ngos ?? 0} suffix="" color="from-lime-500 to-emerald-600" onClick={() => { setDetailModal('ngos'); setDetailSearch(''); setDetailCityFilter('all'); }} />
        <StatCard icon={Bike} label="Volunteers" value={stats?.volunteers ?? 0} suffix="" color="from-green-500 to-teal-600" onClick={() => { setDetailModal('volunteers'); setDetailSearch(''); setDetailCityFilter('all'); }} />
        <StatCard icon={AlertTriangle} label="Fraud Flags" value={fraudFlags.length} suffix="" color="from-rose-500 to-red-600" onClick={() => { setDetailModal('fraud'); setDetailSearch(''); setDetailCityFilter('all'); }} />
      </div>

      {/* Donation Management Table */}
      <Reveal>
        <div className="rounded-2xl glass p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-white">Donation Management</h3>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'available', 'claimed', 'picked', 'delivered', 'removed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    filter === s ? 'bg-primary text-white shadow-glow' : 'glass-soft text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4 font-semibold">Restaurant</th>
                  <th className="pb-3 pr-4 font-semibold">Food</th>
                  <th className="pb-3 pr-4 font-semibold">City</th>
                  <th className="pb-3 pr-4 font-semibold">Meals</th>
                  <th className="pb-3 pr-4 font-semibold">Freshness</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="py-3 pr-4 font-semibold text-white">{d.restaurant_name}</td>
                    <td className="py-3 pr-4 text-slate-300">{d.food_item}</td>
                    <td className="py-3 pr-4 text-slate-400">{d.city}</td>
                    <td className="py-3 pr-4 text-slate-300">{d.meals}</td>
                    <td className="py-3 pr-4">
                      <span className={`font-semibold ${d.freshness_score >= 85 ? 'text-emerald-400' : d.freshness_score >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {d.freshness_score}%
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ring-1 ${statusColors[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(d)}
                          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 hover:shadow-glow"
                        >
                          View
                        </button>
                        {d.status !== 'removed' && d.status !== 'delivered' && (
                          <button
                            onClick={() => { setConfirmRemove(d); setRemoveReason(''); }}
                            className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">No donations found for this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

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
                <X className="h-5 w-5" />
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
                  onClick={async () => {
                    setRemoving(true);
                    setRemoveError(null);
                    try {
                      await onRemove(confirmRemove, removeReason || 'Removed by admin');
                      setConfirmRemove(null);
                      setRemoveReason('');
                    } catch (err: any) {
                      setRemoveError(err?.message || 'Failed to remove donation');
                    } finally {
                      setRemoving(false);
                    }
                  }}
                  disabled={removing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/40 transition-all hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                  {removing ? 'Removing...' : 'Remove Donation'}
                </button>
                {removeError && (
                  <p className="mt-3 text-xs text-rose-400">{removeError}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Donation AI Agent Panel */}
      <AgentActivityFeed />

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="rounded-2xl glass p-6">
            <h3 className="font-display text-base font-bold text-white">Platform-wide Donation Trend</h3>
            <div className="mt-6 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
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
                <BarChart data={cityWise}>
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
                  <Pie data={foodMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {foodMix.map((_, i) => (
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

      {/* Donation detail modal */}
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
              <h3 className="font-display text-xl font-bold text-white">{selected.restaurant_name}</h3>
              <p className="mt-1 text-sm text-slate-400">{selected.city}</p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Food Item</div>
                  <div className="mt-1 text-sm font-semibold text-white">{selected.food_item}</div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Category</div>
                  <div className="mt-1 text-sm font-semibold text-white">{selected.category}</div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Meals</div>
                  <div className="mt-1 font-display text-lg font-bold text-primary">{selected.meals}</div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Quantity</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">{selected.quantity}</div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Freshness Score</div>
                  <div className={`mt-1 font-display text-lg font-bold ${selected.freshness_score >= 85 ? 'text-emerald-400' : selected.freshness_score >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{selected.freshness_score}%</div>
                </div>
                <div className="rounded-xl glass-soft p-4">
                  <div className="text-xs text-slate-400">Expiry</div>
                  <div className="mt-1 font-display text-lg font-bold text-white">{selected.expiry_hours}h left</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl glass-soft p-4">
                <span className="text-xs text-slate-400">Status</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${statusColors[selected.status]}`}>{selected.status}</span>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Prep time: {selected.prep_time} · Created {new Date(selected.created_at).toLocaleString()}
              </div>

              <button onClick={() => setSelected(null)} className="btn-primary mt-6 w-full">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Detail Modals for Admin Overview Cards ===== */}
      <AnimatePresence>
        {detailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setDetailModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl glass shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    detailModal === 'restaurants' ? 'bg-emerald-500/15' :
                    detailModal === 'ngos' ? 'bg-lime-500/15' :
                    detailModal === 'volunteers' ? 'bg-teal-500/15' :
                    'bg-rose-500/15'
                  }`}>
                    {detailModal === 'restaurants' ? <Store className="h-5 w-5 text-emerald-400" /> :
                     detailModal === 'ngos' ? <HeartHandshake className="h-5 w-5 text-lime-400" /> :
                     detailModal === 'volunteers' ? <Bike className="h-5 w-5 text-teal-400" /> :
                     <AlertTriangle className="h-5 w-5 text-rose-400" />}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      {detailModal === 'restaurants' ? 'All Restaurants' :
                       detailModal === 'ngos' ? 'Active NGOs' :
                       detailModal === 'volunteers' ? 'Volunteers' :
                       'Fraud Flags'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {detailModal === 'restaurants' ? 'Registered restaurants on the platform' :
                       detailModal === 'ngos' ? 'NGOs actively accepting donations' :
                       detailModal === 'volunteers' ? 'Volunteer network details' :
                       'Flagged donations requiring review'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setDetailModal(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search + filter bar */}
              <div className="flex flex-col gap-3 border-b border-white/5 px-6 py-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    placeholder="Search by name, city, or contact..."
                    className="w-full rounded-xl glass-soft py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={detailCityFilter}
                    onChange={(e) => setDetailCityFilter(e.target.value)}
                    className="rounded-xl glass-soft px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all" className="bg-ink-soft">All Cities</option>
                    {(detailModal === 'restaurants' ? ['Mumbai','Delhi','Bengaluru','Pune','Chennai','Hyderabad','Jaipur','Kolkata'] :
                     detailModal === 'ngos' ? ['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Pune','Coimbatore','Amritsar'] :
                     detailModal === 'volunteers' ? ['Mumbai','Delhi','Bengaluru','Pune','Hyderabad','Chennai','Surat','Kolkata'] :
                     ['Mumbai','Delhi','Bengaluru','Pune','Chennai','Hyderabad']).map((c) => (
                      <option key={c} value={c} className="bg-ink-soft">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal body — scrollable */}
              <div className="max-h-[55vh] overflow-y-auto px-6 py-4">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* ===== Restaurants ===== */}
                    {detailModal === 'restaurants' && (() => {
                      const filtered = profileRows.filter((r) =>
                        (detailCityFilter === 'all' || r.city === detailCityFilter) &&
                        (!detailSearch || r.full_name.toLowerCase().includes(detailSearch.toLowerCase()) || r.city.toLowerCase().includes(detailSearch.toLowerCase()) || r.organization.toLowerCase().includes(detailSearch.toLowerCase()))
                      );
                      if (filtered.length === 0) return <EmptyState icon={Store} text="No restaurants match your filters" />;
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                              <tr>
                                <th className="pb-3 pr-4 font-semibold">Name</th>
                                <th className="pb-3 pr-4 font-semibold">Organization</th>
                                <th className="pb-3 pr-4 font-semibold">City</th>
                                <th className="pb-3 pr-4 font-semibold">Total Donations</th>
                                <th className="pb-3 font-semibold">Joined</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((r, i) => (
                                <motion.tr
                                  key={r.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="border-t border-white/5 hover:bg-white/5"
                                >
                                  <td className="py-3 pr-4 font-medium text-white">{r.full_name}</td>
                                  <td className="py-3 pr-4 text-slate-300">{r.organization || '—'}</td>
                                  <td className="py-3 pr-4 text-slate-400">{r.city || '—'}</td>
                                  <td className="py-3 pr-4 font-display font-bold text-primary">{r.donation_count ?? 0}</td>
                                  <td className="py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* ===== NGOs ===== */}
                    {detailModal === 'ngos' && (() => {
                      const filtered = profileRows.filter((r) =>
                        (detailCityFilter === 'all' || r.city === detailCityFilter) &&
                        (!detailSearch || r.full_name.toLowerCase().includes(detailSearch.toLowerCase()) || r.city.toLowerCase().includes(detailSearch.toLowerCase()) || r.organization.toLowerCase().includes(detailSearch.toLowerCase()) || (r.phone && r.phone.includes(detailSearch)))
                      );
                      if (filtered.length === 0) return <EmptyState icon={HeartHandshake} text="No NGOs match your filters" />;
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                              <tr>
                                <th className="pb-3 pr-4 font-semibold">Name</th>
                                <th className="pb-3 pr-4 font-semibold">Organization</th>
                                <th className="pb-3 pr-4 font-semibold">City</th>
                                <th className="pb-3 pr-4 font-semibold">Contact</th>
                                <th className="pb-3 font-semibold">Joined</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((r, i) => (
                                <motion.tr
                                  key={r.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="border-t border-white/5 hover:bg-white/5"
                                >
                                  <td className="py-3 pr-4 font-medium text-white">{r.full_name}</td>
                                  <td className="py-3 pr-4 text-slate-300">{r.organization || '—'}</td>
                                  <td className="py-3 pr-4 text-slate-400">{r.city || '—'}</td>
                                  <td className="py-3 pr-4 text-slate-400">{r.phone || '—'}</td>
                                  <td className="py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* ===== Volunteers ===== */}
                    {detailModal === 'volunteers' && (() => {
                      const filtered = profileRows.filter((r) =>
                        (detailCityFilter === 'all' || r.city === detailCityFilter) &&
                        (!detailSearch || r.full_name.toLowerCase().includes(detailSearch.toLowerCase()) || r.city.toLowerCase().includes(detailSearch.toLowerCase()) || r.organization.toLowerCase().includes(detailSearch.toLowerCase()))
                      );
                      if (filtered.length === 0) return <EmptyState icon={Bike} text="No volunteers match your filters" />;
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-slate-500">
                              <tr>
                                <th className="pb-3 pr-4 font-semibold">Name</th>
                                <th className="pb-3 pr-4 font-semibold">City</th>
                                <th className="pb-3 pr-4 font-semibold">Organization</th>
                                <th className="pb-3 font-semibold">Joined</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((r, i) => (
                                <motion.tr
                                  key={r.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="border-t border-white/5 hover:bg-white/5"
                                >
                                  <td className="py-3 pr-4 font-medium text-white">{r.full_name}</td>
                                  <td className="py-3 pr-4 text-slate-300">{r.city || '—'}</td>
                                  <td className="py-3 pr-4 text-slate-400">{r.organization || '—'}</td>
                                  <td className="py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* ===== Fraud Flags ===== */}
                    {detailModal === 'fraud' && (() => {
                      const filtered = profileRows.filter((r) =>
                        (detailCityFilter === 'all' || r.city === detailCityFilter) &&
                        (!detailSearch || r.full_name.toLowerCase().includes(detailSearch.toLowerCase()) || r.city.toLowerCase().includes(detailSearch.toLowerCase()) || r.organization.toLowerCase().includes(detailSearch.toLowerCase()))
                      );
                      if (filtered.length === 0) return <EmptyState icon={AlertTriangle} text="No fraud flags match your filters" />;
                      return (
                        <div className="space-y-3">
                          {filtered.map((r, i) => {
                            const isRemoved = r.role === 'removed';
                            const risk = (r.donation_count ?? 100) < 70 ? 'High' : isRemoved ? 'High' : 'Medium';
                            return (
                              <motion.div
                                key={r.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-xl glass-soft p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-white">{r.full_name}</span>
                                      <span className="text-xs text-slate-500">· {r.city || 'Unknown'}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">{r.organization} — {isRemoved ? 'Removed by admin' : 'Low freshness score'}</p>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                                        isRemoved ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                                      }`}>{isRemoved ? 'Removed' : 'Flagged'}</span>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                                    risk === 'High' ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30' :
                                    'bg-amber-500/15 text-amber-300 ring-amber-500/30'
                                  }`}>{risk} Risk</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Leaderboard ---------------- */
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

/* ---------------- Main Dashboard Page ---------------- */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'restaurant' | 'ngo' | 'volunteer' | 'admin'>(user?.role === 'admin' ? 'admin' : (user?.role || 'restaurant'));
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      if (role === 'restaurant') {
        const { data, error } = await supabase.from('donations').select('*').eq('restaurant_id', user.id).order('created_at', { ascending: false });
        if (error) console.error('Failed to load donations:', error.message);
        if (data) setDonations(data as Donation[]);
      } else if (role === 'ngo') {
        const { data: d, error } = await supabase.from('donations').select('*').eq('status', 'available').order('created_at', { ascending: false });
        if (error) console.error('Failed to load available donations:', error.message);
        if (d) setDonations(d as Donation[]);
      } else if (role === 'admin') {
        const { data: d, error } = await supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) console.error('Failed to load all donations:', error.message);
        if (d) setDonations(d as Donation[]);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    }
  }, [user, role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime: auto-refresh when donations change (agent updates status)
  useEffect(() => {
    const channel = supabase
      .channel('donations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // Realtime: poll agent tasks for active processing (every 15s)
  useEffect(() => {
    const interval = setInterval(async () => {
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
        // Silent — agent will run on next cycle
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleClaim = async (donationId: string) => {
    if (!user) return;
    const { error: claimError } = await supabase.from('claims').insert({
      donation_id: donationId,
      ngo_id: user.id,
      ngo_name: user.organization || user.full_name,
      status: 'claimed',
    });
    if (claimError) {
      console.error('Claim failed:', claimError.message);
      return;
    }
    const { error: updateError } = await supabase.from('donations').update({ status: 'claimed' }).eq('id', donationId);
    if (updateError) {
      console.error('Donation status update failed:', updateError.message);
    }
    loadData();
  };

  const handleRemove = async (donation: Donation, reason: string) => {
    const { error } = await supabase.rpc('admin_remove_donation', {
      p_donation_id: donation.id,
      p_reason: reason,
    });
    if (error) {
      console.error('Remove failed:', error.message);
      throw error;
    }
    loadData();
  };

  const handleAdvance = async (donationId: string, newStatus: 'picked' | 'delivered') => {
    const { error } = await supabase.rpc('advance_donation_status', {
      p_donation_id: donationId,
      p_new_status: newStatus,
    });
    if (error) {
      console.error('Status advance failed:', error.message);
      return;
    }
    loadData();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <section id="dashboard" className="section-pad relative min-h-screen pt-28">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Dashboard"
          title={<>Welcome back, <span className="gradient-text">{user.full_name || user.organization || 'User'}</span></>}
          subtitle="Your role-based dashboard with real-time analytics and AI insights."
        />

        {/* Role tabs */}
        <Reveal className="mt-10">
          <div className="mx-auto flex max-w-fit flex-wrap justify-center gap-2 rounded-2xl glass p-2">
            {roles.filter((r) => r.id !== 'admin' || user?.role === 'admin').map((r) => (
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
              {role === 'restaurant' && <RestaurantDashboard donations={donations} onDonate={() => setDonateOpen(true)} />}
              {role === 'ngo' && <NGODashboard donations={donations} onClaim={handleClaim} onAdvance={handleAdvance} />}
              {role === 'volunteer' && <VolunteerDashboard />}
              {role === 'admin' && <AdminDashboard donations={donations} onRemove={handleRemove} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6">
          <Leaderboard />
        </div>
      </div>

      <DonateFoodModal open={donateOpen} onClose={() => { setDonateOpen(false); loadData(); }} />
    </section>
  );
}
