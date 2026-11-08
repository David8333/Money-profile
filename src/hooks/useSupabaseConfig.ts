import { useState, useEffect } from 'react';
import { isSupabaseConfigured, supabaseConfig } from '../services/supabase/client';

export function useSupabaseConfig() {
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  return {
    isConfigured,
    config: supabaseConfig,
    showConfigModal,
    setShowConfigModal,
    checkConfiguration: () => {
      const configured = isSupabaseConfigured();
      setIsConfigured(configured);
      return configured;
    },
  };
}
