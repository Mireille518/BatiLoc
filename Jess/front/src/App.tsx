import { useState, useEffect } from "react";
import "./style.css";
// image imported but not used directly in this component - keep for potential use
import _fceL from './images/fcee.gif';
import batilockLogo from './images/2.png';
import { useLocation, useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from './config/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function AuthForm() {
  const navigate = useNavigate();
  // Champs du formulaire de connexion
  const [loginMatricule, setLoginMatricule] = useState("");
  const [loginPoste, setLoginPoste] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Handler de soumission du formulaire de connexion
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    if (!loginMatricule || !loginPoste || !loginPassword) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs.' });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: loginMatricule.trim(),
          poste: loginPoste,
          mdp: loginPassword
        })
      });

      // Vérifier si la réponse est OK avant de parser le JSON
      let data;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // Si ce n'est pas du JSON, lire comme texte pour le debug
          const text = await response.text();
          console.error('Réponse non-JSON:', text);
          setMessage({ type: 'danger', text: `Erreur serveur: ${response.status} ${response.statusText}` });
          setLoading(false);
          return;
        }
      } catch (parseError) {
        console.error('Erreur parsing JSON:', parseError);
        setMessage({ type: 'danger', text: `Erreur serveur: Impossible de lire la réponse (${response.status})` });
        setLoading(false);
        return;
      }

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
        // Vérifier si c'est une demande de création de compte
        if (data.demandeCreee || data.demandeEnAttente) {
          if (data.demandeEnAttente) {
            setMessage({ 
              type: 'warning', 
              text: 'Votre demande de création de compte est en attente d\'approbation par l\'administrateur. Vous recevrez une notification une fois approuvée.' 
            });
          } else {
            setMessage({ 
              type: 'info', 
              text: 'Votre demande de création de compte a été envoyée à l\'administrateur. Vous recevrez une notification une fois approuvée. Vous pouvez réessayer de vous connecter après l\'approbation.' 
            });
          }
        } else {
          setMessage({ type: 'danger', text: `Erreur: ${data.message || 'Erreur de connexion.'}` });
        }
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Erreur login:', err);
      const errorMessage = err.message || 'Erreur serveur ou réseau.';
      // Vérifier si c'est une erreur CORS
      if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
        setMessage({ type: 'danger', text: 'Erreur CORS: Le serveur backend ne répond pas ou bloque la requête. Vérifiez que le serveur est démarré.' });
      } else {
        setMessage({ type: 'danger', text: `Erreur: ${errorMessage}` });
      }
      setLoading(false);
    }
  };
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(
    location.state?.isLogin !== undefined ? location.state.isLogin : true
  );
  // The setter functions below may not always be used depending on UI flow.
  // Reference them to satisfy strict 'noUnusedLocals' in some build environments.
  void setIsLogin;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [progress, setProgress] = useState(33);
  void setProgress;
  void progress;
  const [currentStep, setCurrentStep] = useState(1);
  void setCurrentStep;
  void currentStep;
  const [fadeIn, setFadeIn] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  void mousePosition;
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: demande, 2: vérification code, 3: nouveau mot de passe
  const [resetData, setResetData] = useState({
    matricule: '',
    poste: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    recoveryKey: ''
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setFadeIn(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const container = document.querySelector('.modal-auth-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = ((mouseEvent.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = ((mouseEvent.clientY - rect.top) / rect.height - 0.5) * 20;
        setMousePosition({ x, y });
      }
    };

    const container = document.querySelector('.modal-auth-container');
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <div className="modal-overlay">
      <div 
        className={`modal-auth-container fade-in-auth${fadeIn ? ' show' : ''}`}
      > 
        {/* Logo Batiloc */}
        <div className="auth-logo-container">
          <img src={batilockLogo} alt="Batiloc Logo" className="auth-logo-img" />
        </div>
        
        {/* Header avec titre */}
        <div className="auth-header" style={{ marginBottom: '1.2rem' }}>
          <div className="login-title">BIENVENUE</div>
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
                <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                  <path d="M3 7l9 6 9-6"></path>
                </svg>
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
                <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <select
                  className="select-field form-control"
                  value={loginPoste}
                  onChange={e => setLoginPoste(e.target.value)}
                  required
                  style={{ paddingLeft: '3rem', appearance: 'none', backgroundImage: 'none' }}
                >
                  <option value="">Sélectionnez votre poste</option>
                  <option value="caissier">Caissier</option>
                  <option value="administrateur">Administrateur</option>
                  <option value="opérateur de saisie">Opérateur de saisie</option>
                </select>
              </div>
              <div className="input-group password-wrapper">
                <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
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
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  style={{
                    zIndex: 10,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '28px',
                    minHeight: '28px',
                    borderRadius: '4px'
                  }}
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
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem', 
                marginTop: '0.5rem', 
                fontSize: '0.85rem', 
                color: '#2c5282',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer', 
                  userSelect: 'none' 
                }}>
               <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowResetModal(true);
                    setResetStep(1);
                  }}
                  style={{ 
                    color: '#2c5282', 
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s ease'
                  }} 
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  MOT DE PASSE OUBLIÉ ?
                </a>
                </label>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem', 
                marginTop: '0.5rem', 
                fontSize: '0.85rem', 
                color: '#2c5282',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer', 
                  userSelect: 'none' 
                }}>
                  <input 
                    type="checkbox" 
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      cursor: 'pointer', 
                      accentColor: '#2c5282'
                    }} 
                  />
                  <span>se souvenir de moi</span>
                </label>

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

      {/* Modal de réinitialisation de mot de passe */}
      {showResetModal && (
        <div className="reset-password-modal">
          <div className="reset-password-content">
            <button 
              className="close-reset-modal"
              onClick={() => {
                setShowResetModal(false);
                setResetStep(1);
                setResetData({
                  matricule: '',
                  poste: '',
                  code: '',
                  newPassword: '',
                  confirmPassword: '',
                  recoveryKey: ''
                });
                setResetMessage({ type: '', text: '' });
              }}
            >
              ×
            </button>
            {/* Logo Batiloc */}
            <div className="auth-logo-container">
              <img src={batilockLogo} alt="Batiloc Logo" className="auth-logo-img" />
            </div>
            {/* Header avec titre */}
            <div className="auth-header" style={{ marginBottom: '1.2rem' }}>
              <div className="login-title">RÉINITIALISATION</div>
            </div>
            <div className="form-container">
            
            {resetMessage.text && (
              <div className={`alert ${resetMessage.type === 'success' ? 'alert-success' : resetMessage.type === 'warning' ? 'alert-warning' : 'alert-danger'} mt-3`}>
                {resetMessage.text}
              </div>
            )}

            {resetStep === 1 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setResetLoading(true);
                setResetMessage({ type: '', text: '' });
                
                // Vérifier si c'est un admin (peut réinitialiser directement) ou un autre utilisateur (doit faire une demande)
                const isAdmin = resetData.poste.toLowerCase() === 'administrateur';
                
                try {
                  if (isAdmin) {
                    // Admin : réinitialisation directe
                    const response = await fetch('http://localhost:3000/api/user/reset-password/request', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        matricule: resetData.matricule,
                        poste: resetData.poste
                      })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                      setResetMessage({ 
                        type: 'success', 
                        text: data.code ? `Code généré: ${data.code} (valable 15 minutes)` : 'Code envoyé par email' 
                      });
                      setResetStep(2);
                    } else {
                      setResetMessage({ type: 'danger', text: data.message || 'Erreur lors de la génération du code' });
                    }
                  } else {
                    // Autres utilisateurs : créer une demande
                    const response = await fetch('http://localhost:3000/api/user/reset-password/request-demand', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        matricule: resetData.matricule,
                        poste: resetData.poste
                      })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                      setResetMessage({ 
                        type: 'success', 
                        text: 'Votre demande de réinitialisation de mot de passe a été envoyée à l\'administrateur. Vous recevrez une notification une fois approuvée.' 
                      });
                      setTimeout(() => {
                        setShowResetModal(false);
                        setResetStep(1);
                        setResetData({
                          matricule: '',
                          poste: '',
                          code: '',
                          newPassword: '',
                          confirmPassword: '',
                          recoveryKey: ''
                        });
                      }, 3000);
                    } else {
                      setResetMessage({ type: 'danger', text: data.message || 'Erreur lors de la création de la demande' });
                    }
                  }
                } catch (err) {
                  setResetMessage({ type: 'danger', text: 'Erreur serveur ou réseau' });
                } finally {
                  setResetLoading(false);
                }
              }}>
                <div className="input-group">
                  <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                    <path d="M3 7l9 6 9-6"></path>
                  </svg>
                  <input
                    type="text"
                    placeholder="Matricule"
                    className="input-field"
                    value={resetData.matricule}
                    onChange={e => setResetData({...resetData, matricule: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group">
                  <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <select
                    className="select-field"
                    value={resetData.poste}
                    onChange={e => setResetData({...resetData, poste: e.target.value})}
                    required
                    style={{ paddingLeft: '2.5rem' }}
                  >
                    <option value="">Sélectionnez votre poste</option>
                    <option value="caissier">Caissier</option>
                    <option value="administrateur">Administrateur</option>
                    <option value="opérateur de saisie">Opérateur de saisie</option>
                  </select>
                </div>
                {resetData.poste === 'administrateur' && (
                  <div className="input-group">
                    <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      type="text"
                      placeholder="Clé de récupération (optionnel)"
                      className="input-field"
                      value={resetData.recoveryKey}
                      onChange={e => setResetData({...resetData, recoveryKey: e.target.value})}
                    />
                    <small style={{ color: '#999', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block', opacity: 0.7 }}>
                      Clé d'urgence pour admin (voir .env ADMIN_RECOVERY_KEY)
                    </small>
                  </div>
                )}
                {resetData.poste && resetData.poste.toLowerCase() !== 'administrateur' && (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: '#fff3cd', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    border: '1px solid #ffc107'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#856404' }}>
                      <strong>Note :</strong> En tant que {resetData.poste}, votre demande de réinitialisation sera envoyée à l'administrateur pour approbation.
                    </p>
                  </div>
                )}
                <button className="submit-button w-100" type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Génération...' : 'Générer le code'}
                </button>
              </form>
            )}

            {resetStep === 2 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                
                if (resetData.newPassword !== resetData.confirmPassword) {
                  setResetMessage({ type: 'danger', text: 'Les mots de passe ne correspondent pas' });
                  return;
                }

                if (resetData.newPassword.length < 6) {
                  setResetMessage({ type: 'danger', text: 'Le mot de passe doit contenir au moins 6 caractères' });
                  return;
                }

                setResetLoading(true);
                setResetMessage({ type: '', text: '' });
                
                try {
                  const response = await fetch('http://localhost:3000/api/user/reset-password/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      matricule: resetData.matricule,
                      poste: resetData.poste,
                      code: resetData.code || undefined,
                      recoveryKey: resetData.recoveryKey || undefined,
                      newPassword: resetData.newPassword
                    })
                  });
                  
                  const data = await response.json();
                  
                  if (response.ok) {
                    setResetMessage({ type: 'success', text: 'Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.' });
                    setTimeout(() => {
                      setShowResetModal(false);
                      setResetStep(1);
                      setResetData({
                        matricule: '',
                        poste: '',
                        code: '',
                        newPassword: '',
                        confirmPassword: '',
                        recoveryKey: ''
                      });
                    }, 2000);
                  } else {
                    setResetMessage({ type: 'danger', text: data.message || 'Erreur lors de la réinitialisation' });
                  }
                } catch (err) {
                  setResetMessage({ type: 'danger', text: 'Erreur serveur ou réseau' });
                } finally {
                  setResetLoading(false);
                }
              }}>
                <div className="input-group">
                  <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                    <path d="M3 7l9 6 9-6"></path>
                  </svg>
                  <input
                    type="text"
                    placeholder="Code de réinitialisation"
                    className="input-field"
                    value={resetData.code}
                    onChange={e => setResetData({...resetData, code: e.target.value})}
                    required={!resetData.recoveryKey}
                  />
                </div>
                <div className="input-group password-wrapper">
                  <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    className="input-field"
                    value={resetData.newPassword}
                    onChange={e => setResetData({...resetData, newPassword: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group password-wrapper">
                  <svg className="input-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type="password"
                    placeholder="Confirmer le mot de passe"
                    className="input-field"
                    value={resetData.confirmPassword}
                    onChange={e => setResetData({...resetData, confirmPassword: e.target.value})}
                    required
                  />
                </div>
                <button className="submit-button w-100" type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Réinitialisation...' : 'Réinitialiser'}
                </button>
              </form>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
