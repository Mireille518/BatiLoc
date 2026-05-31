import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../theme';

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel,
  title = 'Confirmation',
  message = 'Êtes-vous sûr de vouloir continuer ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  icon = null
}) => {
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  if (!isOpen) return null;

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'danger':
        return 'fa-exclamation-triangle';
      case 'warning':
        return 'fa-exclamation-circle';
      case 'info':
        return 'fa-info-circle';
      case 'success':
        return 'fa-check-circle';
      default:
        return 'fa-question-circle';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          primary: '#ef4444',
          bg: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
          border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
          icon: '#ef4444'
        };
      case 'warning':
        return {
          primary: '#f59e0b',
          bg: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
          border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
          icon: '#f59e0b'
        };
      case 'info':
        return {
          primary: '#3b82f6',
          bg: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
          border: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
          icon: '#3b82f6'
        };
      case 'success':
        return {
          primary: '#22c55e',
          bg: isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
          border: isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0',
          icon: '#22c55e'
        };
      default:
        return {
          primary: currentTheme.colors.primary,
          bg: currentTheme.colors.backgroundTertiary,
          border: currentTheme.colors.border,
          icon: currentTheme.colors.primary
        };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => {
        if (onCancel) onCancel();
        if (onClose) onClose();
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <div
        style={{
          background: currentTheme.colors.cardBackground,
          borderRadius: '16px',
          padding: 0,
          width: '90%',
          maxWidth: '480px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${currentTheme.colors.border}`,
          animation: 'slideUp 0.3s ease-out',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec icône */}
        <div
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%)`,
            padding: '24px',
            textAlign: 'center',
            color: 'white'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <i 
              className={`fas ${getIcon()}`} 
              style={{ 
                fontSize: '28px',
                color: 'white'
              }}
            ></i>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: 'white'
            }}
          >
            {title}
          </h2>
        </div>

        {/* Contenu */}
        <div style={{ padding: '32px 24px' }}>
          <div
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              color: currentTheme.colors.text,
              marginBottom: '32px',
              textAlign: 'center',
              whiteSpace: 'pre-line'
            }}
          >
            {message}
          </div>

          {/* Boutons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}
          >
            <button
              onClick={() => {
                if (onCancel) onCancel();
                if (onClose) onClose();
              }}
              style={{
                padding: '12px 24px',
                background: currentTheme.colors.cardBackground,
                color: currentTheme.colors.text,
                border: `1px solid ${currentTheme.colors.border}`,
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '100px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = currentTheme.colors.backgroundTertiary;
                e.target.style.borderColor = currentTheme.colors.primary;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = currentTheme.colors.cardBackground;
                e.target.style.borderColor = currentTheme.colors.border;
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                if (onClose) onClose();
              }}
              style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '100px',
                boxShadow: `0 4px 12px ${colors.primary}40`
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 6px 16px ${colors.primary}60`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = `0 4px 12px ${colors.primary}40`;
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

