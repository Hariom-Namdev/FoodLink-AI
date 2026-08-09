import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

export default function WatchDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl glass p-2 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-lg bg-black/40 p-1.5 text-white hover:bg-black/60">
              <X className="h-5 w-5" />
            </button>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink-soft">
              {/* Animated demo "video" — a looping showcase of the platform */}
              <DemoAnimation />
            </div>
            <div className="px-5 py-4">
              <h3 className="font-display text-lg font-bold text-white">FoodLink AI — Platform Demo</h3>
              <p className="mt-1 text-sm text-slate-400">See how restaurants, NGOs, and volunteers work together to rescue food in real time.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DemoAnimation() {
  const steps = [
    { title: 'Restaurant lists surplus food', desc: 'Upload food details — AI predicts freshness instantly', icon: '🍽️' },
    { title: 'AI matches nearest NGO', desc: 'Smart matching finds the best-capacity NGO nearby', icon: '🤖' },
    { title: 'Volunteer picks up', desc: 'Route-optimized pickup with QR verification', icon: '🚴' },
    { title: 'Food reaches people', desc: 'Meals delivered, impact tracked live', icon: '❤️' },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-ink-soft via-ink to-ink-soft">
      <div className="absolute inset-0 aurora opacity-60" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative flex h-full flex-col items-center justify-center gap-6 p-8">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: [0, 1, 1, 0], x: [-30, 0, 0, 30] }}
            transition={{
              duration: 8,
              times: [0, 0.15, 0.85, 1],
              repeat: Infinity,
              delay: i * 2,
            }}
            className="flex items-center gap-4 rounded-2xl glass px-6 py-4"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <div className="font-display text-base font-bold text-white">{s.title}</div>
              <div className="text-sm text-slate-400">{s.desc}</div>
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          className="absolute bottom-6 flex items-center gap-2 text-sm text-primary"
        >
          <Sparkles className="h-4 w-4" /> AI-powered food rescue in action
        </motion.div>
      </div>
    </div>
  );
}
