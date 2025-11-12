// Design tokens et thème de l'application
export const theme = {
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

export default theme;


