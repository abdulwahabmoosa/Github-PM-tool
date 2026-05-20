import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ message: '', variant: 'info' });

  const showToast = useCallback((message, variant = 'info') => {
    setToast({ message, variant });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ message: '', variant: 'info' });
  }, []);

  return { toast, showToast, hideToast };
}
