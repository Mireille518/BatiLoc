import { useState, useCallback, useRef } from 'react';

export const useInput = () => {
  const [inputState, setInputState] = useState({
    isOpen: false,
    title: '',
    message: '',
    inputLabel: 'Motif',
    inputPlaceholder: 'Entrez le motif...',
    onConfirm: null,
    onCancel: null,
    type: 'warning',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    required: true,
    options: null
  });

  const resolveRef = useRef(null);

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setInputState({
        isOpen: true,
        title: options.title || 'Saisie requise',
        message: options.message || 'Veuillez saisir les informations demandées',
        inputLabel: options.inputLabel || 'Motif',
        inputPlaceholder: options.inputPlaceholder || 'Entrez le motif...',
        type: options.type || 'warning',
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        required: options.required !== undefined ? options.required : true,
        options: options.options || null,
        onConfirm: (value) => {
          if (resolveRef.current) {
            resolveRef.current(value);
            resolveRef.current = null;
          }
          setInputState(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          if (resolveRef.current) {
            resolveRef.current(null);
            resolveRef.current = null;
          }
          setInputState(prev => ({ ...prev, isOpen: false }));
        }
      });
    });
  }, []);

  const close = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(null);
      resolveRef.current = null;
    }
    setInputState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    prompt,
    close,
    inputState
  };
};

