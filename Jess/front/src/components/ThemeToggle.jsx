import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ style = {} }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'relative',
        width: '56px',
        height: '28px',
        borderRadius: '28px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: isDark ? 'rgba(77, 124, 254, 0.25)' : 'rgba(255, 255, 255, 0.9)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        boxShadow: isDark 
          ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(77, 124, 254, 0.2)' 
          : '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        padding: '0',
        margin: '0',
        display: 'flex',
        alignItems: 'center',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(77, 124, 254, 0.4)' : 'rgba(0, 0, 0, 0.12)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(77, 124, 254, 0.3)' : 'rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode sombre actif' : 'Mode clair actif'}
    >
      <span
        style={{
          position: 'absolute',
          height: '22px',
          width: '22px',
          left: '3px',
          bottom: '3px',
          backgroundColor: isDark ? '#4d7cfe' : '#ffffff',
          borderRadius: '50%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isDark ? 'translateX(28px)' : 'translateX(0)',
          boxShadow: isDark 
            ? '0 2px 8px rgba(77, 124, 254, 0.4), 0 0 0 2px rgba(77, 124, 254, 0.1)' 
            : '0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ 
          fontSize: '14px',
          lineHeight: '1',
          filter: isDark ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
        }}>
          {isDark ? '🌙' : '☀️'}
        </span>
      </span>
    </button>
  );
};

export default ThemeToggle;

