import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setSupabaseConfig } from './services/supabase';

async function init() {
  try {
    const res = await fetch('/api/supabase-config');
    const { supabaseUrl, supabaseAnonKey } = await res.json();
    if (supabaseUrl && supabaseAnonKey) {
      setSupabaseConfig(supabaseUrl, supabaseAnonKey);
    }
  } catch (error) {
    console.warn('Could not auto-retrieve Supabase credentials, using local mockup mode:', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

init();
