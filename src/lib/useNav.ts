import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Hook that returns a navigate function for both hash-section scrolling (landing)
// and route navigation (auth/dashboard pages).
export function useNav() {
  const navigate = useNavigate();

  const go = useCallback((id: string) => {
    // If we're on the landing page, scroll to section
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // Otherwise navigate to landing then scroll
    if (id === 'hero' || id === 'how' || id === 'ai' || id === 'ngos' || id === 'map' || id === 'impact' || id === 'contact') {
      navigate(`/#${id}`);
      return;
    }
    if (id === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    if (id === 'login' || id === 'signup') {
      navigate('/auth');
      return;
    }
    navigate(`/${id}`);
  }, [navigate]);

  return go;
}
