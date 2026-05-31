


import React, { useState } from 'react';
import './Home.css';
import AuthForm from './App';
import fceLogo from './images/fcee.gif';
import batilockLogo from './images/2.png';
import fceImage from './images/Fianarantsoa_03.JPG';
import { useTheme } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const handleShowLogin = () => setShowLoginModal(true);
  const handleCloseLogin = () => setShowLoginModal(false);
  const { isDark } = useTheme();

  return (
    <div className={`home-container ${isDark ? 'dark-mode' : ''}`}>
      {/* Logo Batilock en haut à gauche */}
      <div className="home-logo-container">
        <img src={batilockLogo} alt="Logo Batilock" className="batilock-logo-img" />
        <div className="home-logo-text">
          <span className="home-logo-title">BATILOC</span>
        </div>
      </div>
      
      {/* Toggle du thème en haut à droite - Design discret */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 1001,
        width: 'auto',
        height: 'auto',
      }}>
        <ThemeToggle />
      </div>
      
      {/* Main Content - Two Columns */}
      <div className="home-main-content">
        {/* Left Section - Train Illustration */}
        <div className="home-left-section">
          <div className="train-illustration">
            <img
              src={fceImage}
              alt="Train FCE Fianarantsoa"
              className="train-illustration-img"
            />
            {/* Texte FCE répété en grand avec animation de défilement */}
            <div className="fce-text-overlay">
              <span className="fce-text-large">BATILOC</span>
            </div>
            {/* Decorative elements */}
            <div className="decorative-circle decorative-circle-1"></div>
            <div className="decorative-circle decorative-circle-2"></div>
          </div>
        </div>

        {/* Right Section - Marketing Content */}
        <div className="home-right-section">
          <div className="marketing-content">
            <div className="heading-wrapper">
              <h1 className="main-heading">
                GERER VOS CONVENTIONS 
                <br />
                DE BÂTIMENT AVEC EFFICACITÉ
              </h1>
            </div>
            <div className="tagline-container">
              <div className="tagline-wrapper">
                <span className="tagline-text">La plateforme tout-en-un pour les professionnels du bâtiment</span>
                <span className="tagline-text">La plateforme tout-en-un pour les professionnels du bâtiment</span>
                <span className="tagline-text">La plateforme tout-en-un pour les professionnels du bâtiment</span>
              </div>
            </div>
            <button className="commencer-btn" onClick={handleShowLogin}>
              Commencer →
            </button>
          </div>
        </div>
      </div>
      {showLoginModal && (
        <>
          <AuthForm />
          <button
            className="close-modal-btn"
            onClick={handleCloseLogin}
            aria-label="Fermer le modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

export default Home;