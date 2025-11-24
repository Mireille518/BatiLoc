import { useState, useEffect } from "react";
import "./style.css";
import fceL from './images/fcee.gif';
import { useLocation, useNavigate } from "react-router-dom";

export default function AuthForm() {
  const navigate = useNavigate();
  // Champs du formulaire de connexion
  const [loginMatricule, setLoginMatricule] = useState("");
  const [loginPoste, setLoginPoste] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Handler de soumission du formulaire de connexion
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    if (!loginMatricule || !loginPoste || !loginPassword) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs.' });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: loginMatricule.trim(),
          poste: loginPoste,
          mdp: loginPassword
        })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Marquer que la connexion est en cours pour maintenir l'animation
        localStorage.setItem('loginInProgress', 'true');
        setMessage({ type: 'success', text: `Connexion réussie ! Poste: ${data.user?.poste}` });
        // Redirection selon le poste
        const poste = (data.user?.poste || '').toLowerCase();
        let target = '/';
        if (poste.includes('admin')) target = '/admin';
        else if (poste.includes('caissier')) target = '/caissier';
        else if (poste.includes('opérateur')) target = '/redacteur';
        else target = '/';
        // Garder l'animation active pendant la redirection
        // Ne pas mettre setLoading(false) pour que l'animation continue
        setTimeout(() => {
          navigate(target);
        }, 1200);
        // L'animation continuera jusqu'à ce que la page se charge
      } else {
        setMessage({ type: 'danger', text: `Erreur: ${data.message || 'Erreur de connexion.'} Poste reçu: ${data.user?.poste || 'aucun'}` });
        setLoading(false);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Erreur serveur ou réseau.' });
      setLoading(false);
    }
  };
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(
    location.state?.isLogin !== undefined ? location.state.isLogin : true
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [progress, setProgress] = useState(33);
  const [currentStep, setCurrentStep] = useState(1);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <div className="modal-overlay">
      <div className={`modal-auth-container fade-in-auth${fadeIn ? ' show' : ''}`}> 
        {/* Bloc unique : logo, tabs, formulaire */}
        <div className="auth-header" style={{ marginBottom: '1.2rem' }}>
          <img src={fceL} alt="Logo FCE" className="logo-img" />
          <div className="auth-header-text">
            <div className="auth-header-subtitle">Depuis 1936</div>
            <div className="auth-header-motto">
              <div>Efa Ela Nitaterana . . .</div>
              <div>. . . Sady Mbola Hianteherana</div>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-button ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setMessage({ type: '', text: '' });
              setCurrentStep(1);
            }}
          >
            Connexion
          </button>
          <button
            className={`tab-button ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setMessage({ type: '', text: '' });
              setCurrentStep(1);
            }}
          >
            Inscription
          </button>
        </div>
        <div className="form-container">
          {/* Messages */}
          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} mt-3`}>
              {message.text}
            </div>
          )}
          {/* Formulaire de Connexion */}
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} autoComplete="off">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Matricule"
                  className="input-field form-control"
                  value={loginMatricule}
                  onChange={e => setLoginMatricule(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <select
                  className="select-field form-control"
                  value={loginPoste}
                  onChange={e => setLoginPoste(e.target.value)}
                  required
                >
                  <option value="">Sélectionnez votre poste</option>
                  <option value="caissier">Caissier</option>
                  <option value="administrateur">Administrateur</option>
                  <option value="opérateur de saisie">Opérateur de saisie</option>
                </select>
              </div>
              <div className="input-group password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  className="input-field form-control"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              <button 
                className="submit-button w-100" 
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"></path>
                    </svg>
                    <span>Connexion...</span>
                  </>
                ) : (
                  <span>Connexion</span>
                )}
              </button>
            </form>
          ) : (
            <div className="registerr">
              <div className="input-group">
                <input type="text" placeholder="Matricule" className="input-field form-control" required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Nom complet" className="input-field form-control" required />
              </div>
              <div className="input-group">
                <input type="tel" placeholder="Contact (ex: 034 56 788 98)" className="input-field form-control" required />
              </div>
              <div className="input-group">
                <input type="email" placeholder="Adresse email" className="input-field form-control" required />
              </div>
              <div className="input-group">
                <select className="select-field form-control" required>
                  <option value="">Sélectionnez votre poste</option>
                  <option value="caissier">Caissier</option>
                  <option value="administrateur">Administrateur</option>
                  <option value="opérateur de saisie">Opérateur de saisie</option>
                </select>
              </div>
              <div className="input-group password-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Mot de passe" 
                  className="input-field form-control" 
                  required 
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              <div className="input-group password-wrapper">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirmer le mot de passe" 
                  className="input-field form-control" 
                  required 
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
              <button className="submit-button w-100" type="button">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Inscription
                </span>
              </button>
            </div>
          )}
        </div>
        {/* Animation CSS */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100px) skewX(-25deg); }
            100% { transform: translateX(300px) skewX(-25deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
