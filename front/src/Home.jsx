import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  const handleNavigate = (path, isLogin = true) => {
    // Ajouter une classe pour l'animation de scroll
    const container = document.querySelector('.home-container');
    if (container) {
      container.classList.add('slide-out-left');
    }
    
    // Naviguer après un court délai pour permettre l'animation
    setTimeout(() => {
      navigate(path, { state: { isLogin } });
    }, 500);
  };

  return (
    <div className="home-container">
      <div className="content">
        <h1>Gérez Vos Conventions de Bâtiment avec Efficacité avec l' <span className='gcb'>App : GCB</span></h1>
        <p>La plateforme tout-en-un pour les professionnels.</p>
        <div className="buttons">
          <button 
            className="primary-button" 
            onClick={() => handleNavigate('/auth', true)}
          >
            Se connecter
          </button>
          <button 
            className="secondary-button"
            onClick={() => handleNavigate('/auth', false)}
          >
            S'inscrire ?
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;