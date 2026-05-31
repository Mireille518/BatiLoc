import { useState, useCallback, useRef } from 'react';

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    type: 'warning',
    confirmText: 'Confirmer',
    cancelText: 'Annuler'
  });

  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirmation',
        message: options.message || 'Êtes-vous sûr de vouloir continuer ?',
        type: options.type || 'warning',
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        onConfirm: () => {
          if (resolveRef.current) {
            resolveRef.current(true);
            resolveRef.current = null;
          }
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
          }
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const close = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirm,
    close,
    confirmState
  };
};

