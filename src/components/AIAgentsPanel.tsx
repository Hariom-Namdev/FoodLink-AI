import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, CheckCircle2, XCircle, Loader2, Clock,
  Package, MapPin, Send, Search, Target, TrendingUp,
  Brain, Sparkles, ChevronDown, ChevronUp, Cpu,
  ShieldCheck, AlertTriangle, Route, BarChart3, Leaf, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Reveal } from './ui';

// ============ Types ============
interface Recommendation {
  id: string;
  task_id: string;
  donation_id: string;
  ngo_id: string;
  ngo_name: string;
  ngo_city: string;
  ngo_category: string;
  ngo_capacity: number;
  match_score: number;
  reasoning: string;
  match_factors: {
    distance: number;
    capacity: number;
    category_fit: number;
    urgency: number;
    freshness: number;
  };
  distance_km: number;
  rank: number;
  selected: boolean;
  created_at: string;
}

interface DonationWithRecs {
  donation: {
    id: string;
    food_item: string;
    restaurant_name: string;
    city: string;
    quantity: number;
    meals: number;
    category: string;
    freshness_score: number;
    expiry_hours: number;
    status: string;
    created_at: string;
  };
  recommendations: Recommendation[];
  task_status: string;
  task_id: string;
}

interface AgentOutput {
  id: string;
  agent_type: string;
  donation_id: string | null;
  ngo_id: string | null;
  severity: string;
  title: string;
  summary: string;
  output: Record<string, any>;
  created_at: string;
}

interface AgentSummary {
  agent_type: string;
  total_tasks: number;
  pending_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_recommendations: number;
  avg_match_score: number;
  total_outputs: number;
  latest_output_at: string | null;
}

// ============ Agent definitions ============
const AGENT_DEFS: Record<string, { name: string; icon: any; color: string; description: string }> = {
  donation_matching: {
    name: 'Donation Matching Agent',
    icon: Target,
    color: 'from-emerald-500 to-green-600',
    description: 'Analyzes food type, quantity, location, urgency, and NGO capacity to recommend the best matching NGO for each donation.',
  },
  expiry_prediction: {
    name: 'Expiry Prediction Agent',
    icon: Clock,
    color: 'from-amber-500 to-orange-600',
    description: 'Predicts food shelf life and alerts when donations are nearing expiry to prioritize urgent pickups.',
  },
  route_optimization: {
    name: 'Route Optimization Agent',
    icon: Route,
    color: 'from-sky-500 to-blue-600',
    description: 'Optimizes volunteer pickup routes to minimize travel time and maximize delivery efficiency.',
  },
  fraud_detection: {
    name: 'Fraud Detection Agent',
    icon: ShieldCheck,
    color: 'from-rose-500 to-red-600',
    description: 'Detects suspicious donations, duplicate listings, and quantity mismatches using pattern analysis.',
  },
  impact_analytics: {
    name: 'Impact Analytics Agent',
    icon: BarChart3,
    color: 'from-violet-500 to-purple-600',
    description: 'Analyzes platform-wide impact metrics and generates insights for optimizing food redistribution.',
  },
};

const AGENT_ORDER = ['donation_matching', 'expiry_prediction', 'route_optimization', 'fraud_detection', 'impact_analytics'];

// ============ Factor score bar ============
function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400 capitalize">{label.replace('_', ' ')}</span>
        <span className="font-semibold text-slate-300">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ============ Match score ring ============
function ScoreRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#84CC16' : score >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute font-display text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ============ Severity badge ============
function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { color: string; bg: string; icon: any }> = {
    critical: { color: 'text-rose-300', bg: 'bg-rose-500/15 ring-rose-500/30', icon: XCircle },
    warning: { color: 'text-amber-300', bg: 'bg-amber-500/15 ring-amber-500/30', icon: AlertTriangle },
    success: { color: 'text-emerald-300', bg: 'bg-emerald-500/15 ring-emerald-500/30', icon: CheckCircle2 },
    info: { color: 'text-sky-300', bg: 'bg-sky-500/15 ring-sky-500/30', icon: Sparkles },
  };
  const cfg = config[severity] || config.info;
  const Icon = cfg.icon;
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-2.5 w-2.5" />
      {severity.toUpperCase()}
    </span>
  );
}

// ============ Recommendation card ============
function RecommendationCard({ rec, isExpanded, onToggle }: {
  rec: Recommendation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const factorColors: Record<string, string> = {
    distance: '#22C55E',
    capacity: '#84CC16',
    category_fit: '#10B981',
    urgency: '#F59E0B',
    freshness: '#06B6D4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 transition-all ${rec.selected ? 'glass-soft ring-1 ring-emerald-500/30' : 'glass-soft'}`}
    >
      <div className="flex items-center gap-3">
        <ScoreRing score={rec.match_score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white">{rec.ngo_name}</span>
            {rec.selected && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                <Sparkles className="h-2.5 w-2.5" /> Selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{rec.ngo_city}</span>
            <span>· {rec.distance_km} km</span>
            <span>· {rec.ngo_category}</span>
            <span>· Cap: {rec.ngo_capacity}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500">Rank</div>
          <div className="font-display text-sm font-bold text-white">#{rec.rank}</div>
        </div>
        <button onClick={onToggle} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/10">
                <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-slate-300">{rec.reasoning}</p>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(rec.match_factors).map(([key, val]) => (
                  <FactorBar key={key} label={key} value={val} color={factorColors[key] || '#64748B'} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ Donation with recommendations card ============
function DonationRecCard({ item }: { item: DonationWithRecs }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const d = item.donation;

  const taskStatusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-slate-300', bg: 'bg-slate-500/15 ring-slate-500/30', icon: Clock },
    validating: { label: 'Analyzing', color: 'text-sky-300', bg: 'bg-sky-500/15 ring-sky-500/30', icon: Loader2 },
    awaiting_response: { label: 'NGO Notified', color: 'text-amber-300', bg: 'bg-amber-500/15 ring-amber-500/30', icon: Send },
    completed: { label: 'Matched', color: 'text-emerald-300', bg: 'bg-emerald-500/15 ring-emerald-500/30', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'text-rose-300', bg: 'bg-rose-500/15 ring-rose-500/30', icon: XCircle },
  };
  const cfg = taskStatusConfig[item.task_status] || taskStatusConfig.pending;
  const StatusIcon = cfg.icon;
  const topRec = item.recommendations[0];

  return (
    <div className="rounded-2xl glass p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{d.food_item}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
              <span>{d.restaurant_name}</span>
              <span>· {d.city}</span>
              <span>· {d.meals} meals</span>
              <span className="text-emerald-400">· Freshness: {d.freshness_score}%</span>
              <span>· {d.expiry_hours}h left</span>
            </div>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className={`h-3 w-3 ${item.task_status === 'validating' ? 'animate-spin' : ''}`} />
          {cfg.label}
        </span>
      </div>

      {topRec && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-500/5 p-3 ring-1 ring-emerald-500/10">
          <ScoreRing score={topRec.match_score} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Top Match</div>
            <div className="truncate text-sm font-semibold text-white">{topRec.ngo_name}</div>
            <div className="text-xs text-slate-400">{topRec.distance_km} km · {topRec.ngo_category}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">Score</div>
            <div className="font-display text-lg font-bold text-emerald-400">{topRec.match_score}<span className="text-xs text-slate-500">/100</span></div>
          </div>
        </div>
      )}

      {item.recommendations.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <Target className="h-3 w-3" />
            {item.recommendations.length} NGO Recommendations
          </div>
          {item.recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              isExpanded={expanded === rec.id}
              onToggle={() => setExpanded(expanded === rec.id ? null : rec.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Agent output card (for non-matching agents) ============
function AgentOutputCard({ output, agentType }: { output: AgentOutput; agentType: string }) {
  const [expanded, setExpanded] = useState(false);
  const def = AGENT_DEFS[agentType];
  const Icon = def?.icon || Bot;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl glass p-4"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${def?.color || 'from-slate-500 to-slate-600'}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={output.severity} />
            <span className="truncate text-sm font-semibold text-white">{output.title}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{output.summary}</p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
              {Object.entries(output.output).map(([key, val]) => (
                <OutputDataItem key={key} label={key} value={val} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 text-[10px] text-slate-500">
        {new Date(output.created_at).toLocaleString()}
      </div>
    </motion.div>
  );
}

// ============ Output data item (renders JSONB values) ============
function OutputDataItem({ label, value }: { label: string; value: any }) {
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') return val.toLocaleString('en-IN');
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return `${val.length} items`;
    if (typeof val === 'object') return `${Object.keys(val).length} fields`;
    return String(val);
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 capitalize">{label.replace(/_/g, ' ')}</span>
      <span className="font-semibold text-slate-200">{formatValue(value)}</span>
    </div>
  );
}

// ============ Impact analytics dashboard ============
function ImpactDashboard({ output }: { output: AgentOutput | null }) {
  if (!output) {
    return (
      <div className="py-8 text-center">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">No impact data yet. The Impact Analytics Agent will generate a report when donations exist.</p>
      </div>
    );
  }

  const d = output.output;
  const metrics = [
    { label: 'Meals Delivered', value: d.total_meals_delivered || 0, icon: Package, color: 'text-emerald-400' },
    { label: 'People Fed', value: d.people_fed || 0, icon: Target, color: 'text-sky-400' },
    { label: 'Waste Prevented', value: `${d.waste_prevented_kg || 0} kg`, icon: Leaf, color: 'text-amber-400' },
    { label: 'CO2 Saved', value: `${d.co2_saved_kg || 0} kg`, icon: Zap, color: 'text-violet-400' },
    { label: 'Success Rate', value: `${d.success_rate || 0}%`, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Verified NGOs', value: d.verified_ngos || 0, icon: ShieldCheck, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl glass p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Platform Impact Report</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{output.summary}</p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl glass-soft p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${m.color}`} />
                <span className="text-[10px] uppercase tracking-wide text-slate-500">{m.label}</span>
              </div>
              <div className="mt-1.5 font-display text-xl font-bold text-white">{m.value}</div>
            </div>
          );
        })}
      </div>

      {/* City breakdown */}
      {d.city_breakdown && d.city_breakdown.length > 0 && (
        <div className="rounded-2xl glass p-4">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">City Breakdown</span>
          </div>
          <div className="space-y-2">
            {d.city_breakdown.map((c: any) => (
              <div key={c.city} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{c.city}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{c.donations} donations</span>
                  <span className="font-semibold text-emerald-400">{c.delivered} delivered</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily trend */}
      {d.daily_trend && d.daily_trend.length > 0 && (
        <div className="rounded-2xl glass p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">7-Day Trend</span>
          </div>
          <div className="flex items-end gap-1.5">
            {d.daily_trend.map((t: any) => {
              const maxMeals = Math.max(...d.daily_trend.map((t: any) => t.meals || 0), 1);
              const height = Math.max(4, ((t.meals || 0) / maxMeals) * 60);
              return (
                <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-gradient-to-t from-primary/40 to-primary/80" style={{ height: `${height}px` }} />
                  <span className="text-[8px] text-slate-500">{t.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Agent registry sidebar ============
function AgentRegistry({ summaries, activeAgent, onSelect }: {
  summaries: AgentSummary[];
  activeAgent: string;
  onSelect: (agent: string) => void;
}) {
  return (
    <div className="space-y-2">
      {AGENT_ORDER.map((key) => {
        const def = AGENT_DEFS[key];
        const summary = summaries.find((s) => s.agent_type === key);
        const Icon = def.icon;
        const isActive = activeAgent === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full rounded-xl p-4 text-left transition-all ${isActive ? 'glass-soft ring-1 ring-primary/30' : 'glass-soft opacity-60 hover:opacity-100'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${def.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-semibold text-white">{def.name}</span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Active
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{def.description}</p>
              </div>
            </div>
            {summary && (
              <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/5 pt-2">
                <div className="text-center">
                  <div className="font-display text-sm font-bold text-white">{summary.total_tasks || summary.total_outputs}</div>
                  <div className="text-[8px] uppercase text-slate-500">{key === 'donation_matching' ? 'Tasks' : 'Outputs'}</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-sm font-bold text-amber-400">{summary.pending_tasks}</div>
                  <div className="text-[8px] uppercase text-slate-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-sm font-bold text-emerald-400">{summary.completed_tasks}</div>
                  <div className="text-[8px] uppercase text-slate-500">Done</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-sm font-bold text-sky-400">
                    {summary.avg_match_score > 0 ? Math.round(summary.avg_match_score) : '—'}
                  </div>
                  <div className="text-[8px] uppercase text-slate-500">Score</div>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============ Main AI Agents Panel ============
export function AIAgentsPanel() {
  const [donationsWithRecs, setDonationsWithRecs] = useState<DonationWithRecs[]>([]);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, AgentOutput[]>>({});
  const [summaries, setSummaries] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeAgent, setActiveAgent] = useState('donation_matching');

  const loadData = useCallback(async () => {
    try {
      // Load agent summary
      const { data: summaryData } = await supabase.rpc('get_agent_summary');
      if (summaryData) setSummaries(summaryData as AgentSummary[]);

      // Load donation matching tasks with recommendations
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select(`
          id, donation_id, status, agent_type, created_at,
          donation:donations ( id, food_item, restaurant_name, city, quantity, meals, category, freshness_score, expiry_hours, status, created_at )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && tasks) {
        const items: DonationWithRecs[] = [];
        for (const task of tasks as any[]) {
          if (!task.donation) continue;
          const { data: recs } = await supabase.rpc('get_donation_recommendations', {
            p_donation_id: task.donation_id,
          });
          items.push({
            donation: task.donation,
            recommendations: (recs as Recommendation[]) || [],
            task_status: task.status,
            task_id: task.id,
          });
        }
        setDonationsWithRecs(items);
      }

      // Load outputs for all non-matching agents
      const outputs: Record<string, AgentOutput[]> = {};
      for (const agentType of AGENT_ORDER) {
        if (agentType === 'donation_matching') continue;
        const { data: outs } = await supabase.rpc('get_agent_outputs', {
          p_agent_type: agentType,
          p_limit: 15,
        });
        outputs[agentType] = (outs as AgentOutput[]) || [];
      }
      setAgentOutputs(outputs);
      setLoading(false);
    } catch (err) {
      console.error('AI Agents panel load error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('ai-agents-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_recommendations' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_outputs' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const filtered = search
    ? donationsWithRecs.filter((item) =>
        item.donation.food_item.toLowerCase().includes(search.toLowerCase()) ||
        item.donation.restaurant_name.toLowerCase().includes(search.toLowerCase()) ||
        item.donation.city.toLowerCase().includes(search.toLowerCase()) ||
        item.recommendations.some((r) => r.ngo_name.toLowerCase().includes(search.toLowerCase()))
      )
    : donationsWithRecs;

  const activeDef = AGENT_DEFS[activeAgent];
  const ActiveIcon = activeDef?.icon || Bot;

  return (
    <Reveal className="lg:col-span-3">
      <div className="overflow-hidden rounded-2xl glass">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-white/10">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">AI Agents</h3>
            <p className="text-xs text-slate-500">5 autonomous agents managing the donation lifecycle</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {summaries.reduce((s, a) => s + a.pending_tasks, 0)} Active
          </span>
        </div>

        {/* Body: two columns */}
        <div className="grid gap-px bg-white/[0.02] lg:grid-cols-5">
          {/* Left: Agent Registry */}
          <div className="lg:col-span-2 border-r border-white/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agent Registry</h4>
            </div>
            <AgentRegistry summaries={summaries} activeAgent={activeAgent} onSelect={setActiveAgent} />
          </div>

          {/* Right: Active agent output */}
          <div className="lg:col-span-3 p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ActiveIcon className="h-3.5 w-3.5 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{activeDef?.name} Output</h4>
              </div>
              {activeAgent === 'donation_matching' && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search donations..."
                    className="w-40 rounded-lg glass-soft py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activeAgent === 'donation_matching' ? (
              filtered.length === 0 ? (
                <div className="py-8 text-center">
                  <Bot className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">No donations yet. When a restaurant donates food, the agent will analyze and recommend matching NGOs here.</p>
                </div>
              ) : (
                <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {filtered.map((item) => (
                      <DonationRecCard key={item.donation.id} item={item} />
                    ))}
                  </AnimatePresence>
                </div>
              )
            ) : activeAgent === 'impact_analytics' ? (
              <div className="max-h-[600px] overflow-y-auto pr-1">
                <ImpactDashboard output={agentOutputs['impact_analytics']?.[0] || null} />
              </div>
            ) : (
              (agentOutputs[activeAgent] || []).length === 0 ? (
                <div className="py-8 text-center">
                  <ActiveIcon className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">No outputs yet. This agent will generate results when it next runs.</p>
                </div>
              ) : (
                <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {(agentOutputs[activeAgent] || []).map((out) => (
                      <AgentOutputCard key={out.id} output={out} agentType={activeAgent} />
                    ))}
                  </AnimatePresence>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
