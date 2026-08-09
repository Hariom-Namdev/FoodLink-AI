import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Leaf, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import DonateFoodModal from './DonateFoodModal';

const links = [
  { label: 'How It Works', id: 'how' },
  { label: 'AI Features', id: 'ai' },
  { label: 'NGOs', id: 'ngos' },
  { label: 'Live Map', id: 'map' },
  { label: 'Impact', id: 'impact' },
  { label: 'Dashboard', id: 'dashboard' },
  { label: 'Available Food', id: 'available-donations' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    if (id === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    if (id === 'available-donations') {
      navigate('/available-donations');
      return;
    }
    if (id === 'hero') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Section scroll — navigate to landing first if not there
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAuth = () => {
    setOpen(false);
    navigate('/auth');
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className={`mx-auto max-w-7xl px-4 transition-all duration-300 ${scrolled ? 'pt-2' : 'pt-4'}`}>
        <nav className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 ${scrolled ? 'glass shadow-card' : 'glass-soft'}`}>
          {/* Logo */}
          <button onClick={() => go('hero')} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-white">
              FoodLink<span className="text-primary"> AI</span>
            </span>
          </button>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white">
                  <UserIcon className="h-4 w-4" />
                  {user.full_name || user.organization || 'Profile'}
                </button>
                <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <button onClick={handleAuth} className="text-sm font-semibold text-slate-200 hover:text-white">
                Sign In
              </button>
            )}
            <button onClick={() => setDonateOpen(true)} className="btn-primary !py-2.5 !px-5">
              Donate Food
            </button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white lg:hidden">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden rounded-2xl glass p-4 lg:hidden"
            >
              <div className="flex flex-col gap-1">
                {links.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => go(l.id)}
                    className="rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5"
                  >
                    {l.label}
                  </button>
                ))}
                {user ? (
                  <>
                    <button onClick={() => { setOpen(false); navigate('/profile'); }} className="rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5">
                      Profile
                    </button>
                    <button onClick={handleSignOut} className="rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button onClick={handleAuth} className="rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/5">
                    Sign In
                  </button>
                )}
                <button onClick={() => { setOpen(false); setDonateOpen(true); }} className="btn-primary mt-2 w-full">
                  Donate Food
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <DonateFoodModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </motion.header>
  );
}
