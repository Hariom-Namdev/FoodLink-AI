import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ErrorBoundary from './components/ErrorBoundary';
import {
  TrustedBy, LiveStats, HowItWorks, AIFeatures, FeaturedNGOs,
  LatestDonations, LiveFoodMap, SuccessStories, Testimonials,
  VolunteerSection, ImpactDashboard, FAQ, Contact, Footer,
} from './components/Sections';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ChatbotPage from './pages/ChatbotPage';
import AvailableDonationsPage from './pages/AvailableDonationsPage';
import AIChatbot from './components/AIChatbot';

function ScrollToHash() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash, pathname]);
  return null;
}

function LandingPage() {
  return (
    <>
      <Hero />
      <TrustedBy />
      <LiveStats />
      <HowItWorks />
      <AIFeatures />
      <FeaturedNGOs />
      <LatestDonations />
      <LiveFoodMap />
      <SuccessStories />
      <Testimonials />
      <VolunteerSection />
      <ImpactDashboard />
      <FAQ />
      <Contact />
    </>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <div className="relative min-h-screen bg-ink text-white">
      <Navbar />
      <ErrorBoundary>
        <ScrollToHash />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/chatbot" element={<ChatbotPage />} />
              <Route path="/available-donations" element={<AvailableDonationsPage />} />
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </ErrorBoundary>
      <Footer />
      <AIChatbot />
    </div>
  );
}
