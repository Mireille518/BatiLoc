// Design tokens et thème de l'application
export const lightTheme = {
  colors: {
    primary: '#020cdb',
    primaryLight: '#3d3df0',
    primaryDark: '#0109a8',
    secondary: '#007bff',
    success: '#3d9757',
    successLight: '#5cb377',
    danger: '#dc3545',
    dangerLight: '#e85d6d',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    gray: '#6c757d',
    grayLight: '#adb5bd',
    white: '#ffffff',
    black: '#000000',
    // Couleurs spécifiques au thème clair
    background: '#ffffff',
    backgroundSecondary: '#f5f7fa',
    backgroundTertiary: '#f8f9fa',
    text: '#1a1a1a',
    textSecondary: '#333333',
    textTertiary: '#666666',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    cardBackground: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowHover: 'rgba(0, 0, 0, 0.12)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    h1: {
      fontSize: '45px',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    small: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.1)',
    xl: '0 10px 30px rgba(0, 0, 0, 0.12)',
  },
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
};

export const darkTheme = {
  colors: {
    primary: '#5a9fff',
    primaryLight: '#7ab3ff',
    primaryDark: '#4d7cfe',
    secondary: '#6b9aff',
    success: '#66bb6a',
    successLight: '#81c784',
    danger: '#ef5350',
    dangerLight: '#f44336',
    warning: '#ffb74d',
    info: '#64b5f6',
    light: '#2d2d2d',
    dark: '#0f0f0f',
    gray: '#757575',
    grayLight: '#9e9e9e',
    white: '#1a1a1a',
    black: '#e0e0e0',
    // Couleurs spécifiques au thème sombre - plus douces pour les yeux
    background: '#0f0f0f',
    backgroundSecondary: '#1a1a1a',
    backgroundTertiary: '#252525',
    text: '#e5e5e5',
    textSecondary: '#c0c0c0',
    textTertiary: '#909090',
    border: '#2d2d2d',
    borderLight: '#252525',
    cardBackground: '#1a1a1a',
    shadow: 'rgba(0, 0, 0, 0.4)',
    shadowHover: 'rgba(0, 0, 0, 0.6)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    h1: {
      fontSize: '45px',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    small: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
    md: '0 2px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.5)',
    xl: '0 10px 30px rgba(0, 0, 0, 0.6)',
  },
  transitions: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
  },
};

// Thème par défaut (pour compatibilité)
export const theme = lightTheme;

export default theme;


