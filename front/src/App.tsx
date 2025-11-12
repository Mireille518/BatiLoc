import { useState, useEffect } from "react";
import "./style.css";
import fceL from './images/fcee.gif';
import EyeOpen from './images/oeil.png';
import EyeClosed from './images/fermer-les-yeux.png';
import { useNavigate, useLocation } from "react-router-dom";
import { Card, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import admin from './images/gear.png';
import redacteur from './images/edit.png';
import caisse from './images/salary.png';

export default function AuthForm() {
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

  const [loginData, setLoginData] = useState({
    matricule: '',
    poste: '',
    mdp: ''
  });

  const [registerData, setRegisterData] = useState({
    matricule:'',
    nom: '',
    contact: '',
    email: '',
    mdp: '',
    confirmMdp: '',
    poste: '' // 'admin', 'caisse', 'redacteur'
  });

  const [phoneError, setPhoneError] = useState('')
  // Fonction de validation
  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, ''); // Garde seulement les chiffres
    if (cleaned.length !== 10) return false;

    const validPrefixes = ['032', '033', '034', '037', '038'];
    const prefix = cleaned.substring(0, 3);
    return validPrefixes.includes(prefix);
  };
  const navigate = useNavigate();
  const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user`;

  // Mapping des rôles
  const roleToPoste = {
    admin: 'administrateur',
    caisse: 'caissier',
    redacteur: 'opérateur de saisie'
  };

  // Validation des étapes
  const isStep1Valid =
    registerData.matricule &&
    registerData.nom &&
    registerData.contact &&
    registerData.email &&
    registerData.contact.replace(/\D/g, '').length === 10 &&
    validatePhone(registerData.contact) &&
    !phoneError; const isStep2Valid = !!registerData.poste;
  const isStep3Valid = registerData.mdp.length >= 6 && registerData.mdp === registerData.confirmMdp;

  // Mise à jour du progress
  useEffect(() => {
    setProgress(currentStep * 33);
  }, [currentStep]);

  // Fonction pour afficher un message
  const showMessage = (text: string, type: 'success' | 'error' = 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // Fonction pour sélectionner un poste
  const selectPoste = (poste: 'admin' | 'caisse' | 'redacteur') => {
    setRegisterData({ ...registerData, poste });
  };

  // Navigation entre étapes
  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid) {
      setCurrentStep(3);
    } else if (currentStep === 3 && isStep3Valid) {
      handleRegisterSubmit();
    }
  };

  // Connexion
  const handleLoginSubmit = async () => {
    if (!loginData.matricule || !loginData.poste || !loginData.mdp) {
      showMessage('Veuillez remplir tous les champs', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: loginData.matricule.trim(),
          poste: loginData.poste,
          mdp: loginData.mdp
        })
      });

      // Vérifier si la réponse est OK avant de parser JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `Erreur ${response.status}: ${errorText}` };
        }
        showMessage(errorData.message || `Erreur ${response.status}`, 'error');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showMessage('Connexion réussie !', 'success');

        const poste = (data.user?.poste || '').toLowerCase();
        let target = '/';
        if (poste.includes('admin')) target = '/admin';
        else if (poste.includes('caissier')) target = '/caissier';
        else if (poste.includes('opérateur')) target = '/redacteur';

        setLoginData({ matricule: '', poste: '', mdp: '' });

        setTimeout(() => {
          navigate(target);
        }, 1000);
      } else {
        showMessage(data.message || 'Identifiants incorrects', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('Erreur de connexion au serveur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Inscription
  const handleRegisterSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) {
      showMessage('Veuillez remplir tous les champs correctement', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      showMessage('Email invalide', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: registerData.matricule,
          nom: registerData.nom,
          contact: registerData.contact,
          email: registerData.email,
          mdp: registerData.mdp,
          poste: roleToPoste[registerData.poste as keyof typeof roleToPoste]
        })
      });

      const data = await response.json();

      if (response.ok && data.matricule) {
        showMessage(`Inscription réussie ! Matricule : ${data.matricule}`, 'success');

        setRegisterData({
        matricule:'',  nom: '', contact: '', email: '', mdp: '', confirmMdp: '', poste: ''
        });
        setCurrentStep(1);

        setTimeout(() => {
          setIsLogin(true);
        }, 2000);
      } else {
        showMessage(data.message || 'Erreur lors de l\'inscription', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('Erreur serveur', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">

      <div className="auth-wrapper">
        <div className="auth-header">
          <img src={fceL} alt="Logo FCE" className="logo-img" />
        </div>

        <div className="auth-container">
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
              <div>
                <div className="input-group mb-3">
                  <input
                    type="text"
                    placeholder="Matricule"
                    className="input-field form-control"
                    value={loginData.matricule}
                    onChange={(e) => setLoginData({ ...loginData, matricule: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="input-group mb-3">
                  <select
                    className="select-field form-control"
                    value={loginData.poste}
                    onChange={(e) => setLoginData({ ...loginData, poste: e.target.value })}
                    disabled={loading}
                  >
                    <option value="">Sélectionnez votre poste</option>
                    <option value="caissier">Caissier</option>
                    <option value="administrateur">Administrateur</option>
                    <option value="opérateur de saisie">Opérateur de saisie</option>
                  </select>
                </div>

                <div className="input-group password-wrapper mb-3">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    className="input-field form-control"
                    value={loginData.mdp}
                    onChange={(e) => setLoginData({ ...loginData, mdp: e.target.value })}
                    disabled={loading}
                  />
                  <button
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <img
                      src={showPassword ? EyeOpen : EyeClosed}
                      alt="toggle"
                      className="password-toggle-icon"
                    />
                  </button>
                </div>

                <button
                  onClick={handleLoginSubmit}
                  disabled={loading}
                  className={`submit-button w-100 ${loading ? 'loading' : ''}`}
                >
                  <span className="submit-button-icon">→</span>
                  {loading ? 'Connexion...' : 'Connexion'}
                </button>

                <div className="footer-link text-center mt-3">
                  Mot de passe oublié ? <span className="text-primary">Réinitialiser</span>
                </div>
              </div>
            ) : (
              /* Formulaire d'Inscription Multi-étapes */
              <div className="registerr">
                {/* Étape 1 */}
                {currentStep === 1 && (
                  <div className="premiere">
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        placeholder="Matricule"
                        className="input-field form-control"
                        value={registerData.matricule}
                        onChange={(e) => setRegisterData({ ...registerData, matricule: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        placeholder="Nom complet"
                        className="input-field form-control"
                        value={registerData.nom}
                        onChange={(e) => setRegisterData({ ...registerData, nom: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="input-group mb-3">
                      <input
                        type="tel"
                        placeholder="Contact (ex: 034 56 788 98)"
                        className={`input-field form-control ${phoneError ? 'is-invalid' : ''}`}
                        value={registerData.contact}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ''); // Garde seulement les chiffres
                          if (value.length > 10) value = value.slice(0, 10); // Max 10 chiffres

                          // Formatage : 034 56 788 98
                          let formatted = '';
                          if (value.length > 0) formatted += value.slice(0, 3); // 034
                          if (value.length > 3) formatted += ' ' + value.slice(3, 5); // 56
                          if (value.length > 5) formatted += ' ' + value.slice(5, 8); // 788
                          if (value.length > 8) formatted += ' ' + value.slice(8, 10); // 98

                          setRegisterData({ ...registerData, contact: formatted });

                          // Validation
                          const cleaned = value;
                          if (cleaned.length === 10 && validatePhone(cleaned)) {
                            setPhoneError('');
                          } else if (cleaned.length > 0) {
                            setPhoneError(
                              cleaned.length < 10
                                ? '10 chiffres requis'
                                : 'Préfixe invalide (032, 033, 034, 037, 038)'
                            );
                          } else {
                            setPhoneError('');
                          }
                        }}
                        maxLength={13} // 10 chiffres + 3 espaces
                        disabled={loading}
                      />
                      {phoneError && <div className="invalid-feedback d-block">{phoneError}</div>}
                    </div>
                    <div className="input-group mb-4">
                      <input
                        type="email"
                        placeholder="Adresse email"
                        className="input-field form-control"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={!isStep1Valid || loading}
                      className="submit-button w-100"
                      style={{
                        backgroundColor: isStep1Valid ? '#007bff' : '#ccc',
                        cursor: isStep1Valid ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Suivant
                    </button>
                  </div>
                )}

                {/* Étape 2 */}
                {currentStep === 2 && (
                  <div className="secondaire">
                    <p className="text-center mb-4 text-muted">Choisissez votre rôle</p>
                    <Row className="justify-content-center g-3">
                      {[
                        { key: 'admin', img: admin, label: 'Admin' },
                        { key: 'caisse', img: caisse, label: 'Caisse' },
                        { key: 'redacteur', img: redacteur, label: 'Rédacteur' }
                      ].map((role) => (
                        <Col xs={4} key={role.key}>
                          <Card
                            className={`text-center h-100 ${registerData.poste === role.key ? 'border-primary shadow-sm' : ''}`}
                            style={{ cursor: 'pointer', width: '5.5rem', margin: '0 auto' }}
                            onClick={() => selectPoste(role.key as 'admin' | 'caisse' | 'redacteur')}
                          >
                            <Card.Body className="p-2">
                              <img src={role.img} alt={role.label} className="iconee mb-1" style={{ width: '32px' }} />
                              <small className="fw-bold d-block">{role.label}</small>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>

                    <button
                      onClick={handleNext}
                      disabled={!isStep2Valid || loading}
                      className="submit-button w-100 mt-4"
                      style={{
                        backgroundColor: isStep2Valid ? '#007bff' : '#ccc',
                        cursor: isStep2Valid ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Suivant
                    </button>
                  </div>
                )}

                {/* Étape 3 */}
                {currentStep === 3 && (
                  <div className="troisième">
                    <div className="input-group password-wrapper mb-3">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mot de passe (min 6 caractères)"
                        className="input-field form-control"
                        value={registerData.mdp}
                        onChange={(e) => setRegisterData({ ...registerData, mdp: e.target.value })}
                        disabled={loading}
                      />
                      <button className="password-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
                        <img src={showPassword ? EyeOpen : EyeClosed} alt="toggle" className="password-toggle-icon" />
                      </button>
                    </div>

                    <div className="input-group password-wrapper mb-4">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirmer le mot de passe"
                        className="input-field form-control"
                        value={registerData.confirmMdp}
                        onChange={(e) => setRegisterData({ ...registerData, confirmMdp: e.target.value })}
                        disabled={loading}
                      />
                      <button className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">
                        <img src={showConfirmPassword ? EyeOpen : EyeClosed} alt="toggle" className="password-toggle-icon" />
                      </button>
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={!isStep3Valid || loading}
                      className={`submit-button w-100 ${loading ? 'loading' : ''}`}
                      style={{
                        backgroundColor: isStep3Valid ? '#020cdb' : '#ccc',
                        cursor: isStep3Valid ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <span className="submit-button-icon">+</span>
                      {loading ? 'Inscription...' : 'S’inscrire'}
                    </button>
                  </div>
                )}

                {/* Barre de progression */}
                <div className="px-3 mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Étape {currentStep} sur 3</span>
                  </div>
                  <div
                    className="progress"
                    style={{
                      height: '12px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      className="progress-bar"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #020cdb, #42a5f5)',
                        transition: 'width 0.6s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: '50px',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          transform: 'skewX(-25deg)',
                          animation: 'shimmer 2s infinite'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100px) skewX(-25deg); }
          100% { transform: translateX(300px) skewX(-25deg); }
        }
      `}</style>
    </div>
  );
}