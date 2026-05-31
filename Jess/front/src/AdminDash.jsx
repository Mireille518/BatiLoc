import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from './images/fcee.gif';
import { useTheme } from './contexts/ThemeContext';
import { lightTheme, darkTheme } from './theme';
import ThemeToggle from './components/ThemeToggle';
import { useConfirm } from './hooks/useConfirm';
import ConfirmModal from './components/ConfirmModal';
import { useInput } from './hooks/useInput';
import InputModal from './components/InputModal';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { apiRequest, API_ENDPOINTS } from './config/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const initialForm = {
  numBat: '',
  adresse: '',
  montant: '',
  statut: true,
  motifInactivite: '',
  ville: '',
  quartier: '',
  latitude: '',
  longitude: ''
};

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const initialImage = null;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { confirm, close, confirmState } = useConfirm();
  const { prompt: promptInput, close: closeInput, inputState } = useInput();
  const [batiments, setBatiments] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [conventions, setConventions] = useState([]);
  // Par défaut, afficher la vue (dashboard) en premier plutôt que les bâtiments
  const [activeSection, setActiveSection] = useState('dashboard'); // 'batiments', 'utilisateurs', 'conventions', 'statistiques', 'parametres', 'historique', 'demandes', 'statuts'
  const [demandesSuppression, setDemandesSuppression] = useState([]);
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [demandesModification, setDemandesModification] = useState([]);
  const [loadingDemandesModif, setLoadingDemandesModif] = useState(false);
  const [demandesCreation, setDemandesCreation] = useState([]);
  const [loadingDemandesCreation, setLoadingDemandesCreation] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [approveForm, setApproveForm] = useState({ nom: '', contact: '', email: '' });
  const [demandesReset, setDemandesReset] = useState([]);
  const [loadingDemandesReset, setLoadingDemandesReset] = useState(false);
  const [showResetApproveModal, setShowResetApproveModal] = useState(false);
  const [selectedResetDemande, setSelectedResetDemande] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [historique, setHistorique] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [filterActionType, setFilterActionType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterUserType, setFilterUserType] = useState('all'); // Filtre par type de poste
  const [searchHistorique, setSearchHistorique] = useState('');
  const [selectedHistorique, setSelectedHistorique] = useState([]); // IDs des éléments sélectionnés
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(initialImage);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedBatimentDetails, setSelectedBatimentDetails] = useState(null);
  const [showBatimentDetails, setShowBatimentDetails] = useState(false);
  const [loadingBatimentDetails, setLoadingBatimentDetails] = useState(false);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLoginLoader, setShowLoginLoader] = useState(false);
  
  // États pour la gestion des utilisateurs
  const [userForm, setUserForm] = useState({
    matricule: '',
    nom: '',
    contact: '',
    email: '',
    poste: 'caissier',
    mdp: '',
    numConv: ''
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  
  // États pour la recherche et filtrage
  const [searchBatiment, setSearchBatiment] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [filterPoste, setFilterPoste] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterStatutUtilisation, setFilterStatutUtilisation] = useState('all');
  
  // États pour les paramètres
  const [adminProfile, setAdminProfile] = useState({
    nom: '',
    email: '',
    contact: '',
    matricule: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    sessionTimeout: 48, // heures
    passwordMinLength: 8,
    enableNotifications: true
  });

  const API_URL = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/batiments`, []);
  const API_CONVS = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/conventions`, []);
  const [searchConventions, setSearchConventions] = useState('');
  const [selectedConvention, setSelectedConvention] = useState(null);
  const [showConventionModal, setShowConventionModal] = useState(false);
  
  // États pour les changements de statut
  const [statusChanges, setStatusChanges] = useState(null);
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(false);
  
  // États pour le formulaire de convention
  const [conventionStep, setConventionStep] = useState(1);
  const [conventionForm, setConventionForm] = useState({
    step1: { numBat: '', adresse: '', montant: '' },
    step2: { nomcli: '', datenais: '', lieunais: '', pere: '', mere: '', cin: '', delivcin: '', adressecli: '', activite: '', contact: '' }
  });
  const API_USERS_URL = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user`, []);

  const batimentMapCoords = useMemo(() => {
    if (!selectedBatimentDetails) return null;
    const latitude = Number(selectedBatimentDetails.latitude);
    const longitude = Number(selectedBatimentDetails.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { lat: latitude, lng: longitude };
  }, [selectedBatimentDetails]);

  // Calcul des dates maximales pour les champs de date
  // Date de naissance : plage de 1907 à 2007 (100 ans en arrière depuis 2007)
  // Minimum : 1er janvier 1907 (2007 - 100 ans)
  // Maximum : 31 décembre 2007
  // Le calendrier affichera les années en ordre décroissant (2007 → 1907)
  const minDateNaissance = useMemo(() => {
    // Date minimale fixée à 1907 (100 ans avant 2007)
    const minDate = new Date(1907, 0, 1); // 1er janvier 1907
    return minDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }, []);

  const maxDateNaissance = useMemo(() => {
    // Année maximale fixée à 2007
    const maxDate = new Date(2007, 11, 31); // 31 décembre 2007
    return maxDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }, []);

  // Date de délivrance CIN : logique basée sur la date de naissance
  // Minimum pour le calendrier = date ancienne pour permettre la navigation (2000)
  // Minimum logique = date de naissance + 18 ans (validation)
  // Maximum = aujourd'hui (pas de dates futures)
  const minDateDelivrance = useMemo(() => {
    // Date minimale absolue pour permettre la navigation dans le calendrier (2000)
    // Cela permet de scroller vers des années passées comme 2019
    const minAbsolute = new Date(2000, 0, 1); // 1er janvier 2000
    return minAbsolute.toISOString().split('T')[0];
  }, []);

  // Date minimale logique pour validation (date de naissance + 18 ans)
  const minDateDelivranceLogic = useMemo(() => {
    if (!conventionForm.step2.datenais) {
      return null;
    }
    const dateNaissance = new Date(conventionForm.step2.datenais);
    const dateMinCIN = new Date(dateNaissance.getFullYear() + 18, dateNaissance.getMonth(), dateNaissance.getDate());
    return dateMinCIN.toISOString().split('T')[0];
  }, [conventionForm.step2.datenais]);

  const maxDateDelivrance = useMemo(() => {
    // Toujours limiter à aujourd'hui (pas de dates futures)
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }, []);

  useEffect(() => {
    if (activeSection === 'batiments') {
      loadBatiments();
    } else if (activeSection === 'utilisateurs') {
      loadUtilisateurs(searchUser);
    } else if (activeSection === 'conventions') {
      loadConventions();
    } else if (activeSection === 'dashboard') {
      // Charger toutes les données nécessaires pour le dashboard
      loadBatiments();
      loadUtilisateurs();
      loadConventions();
    } else if (activeSection === 'parametres') {
      loadAdminProfile();
    } else if (activeSection === 'historique') {
      loadHistorique();
      setSelectedHistorique([]); // Réinitialiser les sélections
    } else if (activeSection === 'demandes') {
      loadDemandesSuppression();
      loadDemandesModification();
      loadDemandesCreation();
      loadDemandesReset();
    } else if (activeSection === 'statuts') {
      loadStatusChanges();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Recharger les utilisateurs quand la recherche change
  useEffect(() => {
    if (activeSection === 'utilisateurs') {
      const timeoutId = setTimeout(() => {
        loadUtilisateurs(searchUser);
      }, 300); // Debounce de 300ms
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchUser]);

  // Charger les demandes de modification au démarrage pour afficher le badge
  useEffect(() => {
    loadDemandesModification();
    loadDemandesCreation();
    loadDemandesReset();
    // Recharger les demandes toutes les 30 secondes pour mettre à jour le badge
    const interval = setInterval(() => {
      loadDemandesModification();
      loadDemandesCreation();
      loadDemandesReset();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Gérer l'overlay de chargement pendant la connexion
  useEffect(() => {
    const loginInProgress = localStorage.getItem('loginInProgress');
    if (loginInProgress === 'true') {
      setShowLoginLoader(true);
      // Attendre que la page soit complètement chargée
      const timer = setTimeout(() => {
        setShowLoginLoader(false);
        localStorage.removeItem('loginInProgress');
      }, 500); // Petit délai pour s'assurer que tout est chargé
      return () => clearTimeout(timer);
    }
  }, []);

  const loadAdminProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setAdminProfile({
          nom: user.nom || '',
          email: user.email || '',
          contact: '',
          matricule: user.matricule || ''
        });
      }
      
      // Récupérer les infos complètes depuis l'API
      const response = await fetch(`${API_USERS_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 200 && result.user) {
          setAdminProfile({
            nom: result.user.nom || '',
            email: result.user.email || '',
            contact: result.user.contact || '',
            matricule: result.user.matricule || ''
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  // Exporter les conventions au format CSV
  const exportConventions = () => {
    if (!conventions || conventions.length === 0) {
      setMsg('Aucune convention à exporter');
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    const headers = ['NumConv', 'DateConv', 'Adresse', 'Ville', 'Quartier', 'Montant', 'Locataire', 'Contact'];
    const rows = conventions.map(c => {
      const num = c.numConv || '';
      const date = c.dateConv ? new Date(c.dateConv).toLocaleDateString('fr-FR') : '';
      const adresse = c.batiment?.adresse || '';
      const ville = c.batiment?.ville || 'Fianarantsoa';
  const quartier = c.batiment?.quartier || 'Zone Est';
      const montant = c.batiment?.montant != null ? String(c.batiment.montant) : '';
      const loc = c.locataire?.nomcli || '';
      const contact = c.locataire?.contact || '';
      return [num, date, adresse, ville, quartier, montant, loc, contact];
    });

    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conventions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMsg('Export terminé');
    setTimeout(() => setMsg(''), 3000);
  };

  const loadHistorique = async () => {
    setLoadingHistorique(true);
    try {
      const token = localStorage.getItem('token');
      // Vérifier si les données de démo sont désactivées
      const demoDisabled = localStorage.getItem('historiqueDemoDisabled') === 'true';
      
      // TODO: Remplacer par l'endpoint réel de l'historique quand il sera disponible
      // Pour l'instant, on simule des données
      const API_HISTORIQUE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/historique`;
      
      try {
        const response = await fetch(API_HISTORIQUE_URL, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 200 && result.data) {
            setHistorique(result.data);
          } else {
            // Si l'API n'existe pas encore, utiliser localStorage + données de démonstration (si activées)
            const historiqueLocal = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
            if (demoDisabled) {
              setHistorique(historiqueLocal.sort((a, b) => new Date(b.date) - new Date(a.date)));
            } else {
              const demo = generateDemoHistorique();
              setHistorique([...historiqueLocal, ...demo].sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
          }
        } else {
          // Si l'API n'existe pas encore, utiliser localStorage + données de démonstration (si activées)
          const historiqueLocal = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
          if (demoDisabled) {
            setHistorique(historiqueLocal.sort((a, b) => new Date(b.date) - new Date(a.date)));
          } else {
            const demo = generateDemoHistorique();
            setHistorique([...historiqueLocal, ...demo].sort((a, b) => new Date(b.date) - new Date(a.date)));
          }
        }
      } catch (apiError) {
        // Si l'API n'existe pas encore, utiliser localStorage + données de démonstration (si activées)
        const historiqueLocal = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
        if (demoDisabled) {
          setHistorique(historiqueLocal.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } else {
          const demo = generateDemoHistorique();
          setHistorique([...historiqueLocal, ...demo].sort((a, b) => new Date(b.date) - new Date(a.date)));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      const historiqueLocal = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
      const demoDisabled = localStorage.getItem('historiqueDemoDisabled') === 'true';
      if (demoDisabled) {
        setHistorique(historiqueLocal.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        const demo = generateDemoHistorique();
        setHistorique([...historiqueLocal, ...demo].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } finally {
      setLoadingHistorique(false);
    }
  };

  // Fonction pour générer des données de démonstration (à supprimer quand l'API sera prête)
  const generateDemoHistorique = () => {
    const actions = ['Création', 'Modification', 'Suppression', 'Connexion', 'Déconnexion', 'Consultation'];
    const types = ['Bâtiment', 'Utilisateur', 'Convention', 'Facture', 'Paiement', 'Système'];
    const users = utilisateurs.length > 0 ? utilisateurs : [
      { matricule: 'ADMIN001', nom: 'Administrateur' },
      { matricule: 'CAIS001', nom: 'Caissier' },
      { matricule: 'OP001', nom: 'Redacteur' }
    ];
    
    const historique = [];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Derniers 30 jours
      
      historique.push({
        id: i + 1,
        utilisateur: user.nom,
        matricule: user.matricule,
        action: action,
        type: type,
        description: `${action} d'un(e) ${type.toLowerCase()}`,
        date: date.toISOString(),
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        statut: Math.random() > 0.1 ? 'Succès' : 'Échec'
      });
    }
    
    return historique.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Fonctions pour gérer l'effacement de l'historique
  const handleSelectAllHistorique = () => {
    const filtered = historique.filter(item => {
      const matchesSearch = !searchHistorique || 
        item.utilisateur.toLowerCase().includes(searchHistorique.toLowerCase()) ||
        item.description.toLowerCase().includes(searchHistorique.toLowerCase()) ||
        item.type.toLowerCase().includes(searchHistorique.toLowerCase());
      const matchesAction = filterActionType === 'all' || item.action === filterActionType;
      let matchesUserType = true;
      if (filterUserType !== 'all') {
        const user = utilisateurs.find(u => u.matricule === item.matricule);
        if (user) {
          matchesUserType = user.poste?.toLowerCase() === filterUserType.toLowerCase();
        }
      }
      return matchesSearch && matchesAction && matchesUserType;
    });
    if (selectedHistorique.length === filtered.length) {
      setSelectedHistorique([]);
    } else {
      setSelectedHistorique(filtered.map(item => item.id));
    }
  };

  const handleToggleSelectHistorique = (id) => {
    setSelectedHistorique(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleDeleteSelectedHistorique = async () => {
    if (selectedHistorique.length === 0) return;
    
    const count = selectedHistorique.length;
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ${count} élément(s) de l'historique ?`
    );
    
    if (!confirmed) return;

    try {
      // Supprimer du localStorage
      const historiqueLocal = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
      const updatedHistorique = historiqueLocal.filter(item => !selectedHistorique.includes(item.id));
      localStorage.setItem('historiqueActivites', JSON.stringify(updatedHistorique));
      
      // Mettre à jour l'état
      setHistorique(prev => prev.filter(item => !selectedHistorique.includes(item.id)));
      setSelectedHistorique([]);
      
      setMsg(`${count} élément(s) supprimé(s) de l'historique`);
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMsg('Erreur lors de la suppression');
    }
  };

  const handleDeleteAllHistorique = async () => {
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer TOUT l\'historique ? Cette action est irréversible.'
    );
    
    if (!confirmed) return;

    try {
      // Supprimer du localStorage
      localStorage.setItem('historiqueActivites', JSON.stringify([]));
      // Désactiver les données de démonstration pour éviter qu'elles ne reviennent
      localStorage.setItem('historiqueDemoDisabled', 'true');
      
      // Mettre à jour l'état - vider complètement l'historique
      setHistorique([]);
      setSelectedHistorique([]);
      
      setMsg('Tout l\'historique a été supprimé définitivement');
      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMsg('Erreur lors de la suppression');
    }
  };

  // Fonction pour formater le numéro de convention au format 480 052/TER/2024
  const formatConventionNumber = (convention) => {
    if (!convention || !convention.numConv) return '..../TER/....';
    
    const numConv = convention.numConv;
    const dateConv = convention.dateConv ? new Date(convention.dateConv) : new Date();
    const year = dateConv.getFullYear();
    
    // Déterminer le code de lieu (480 pour Fianarantsoa, 481 pour Manakara)
    // Par défaut 480 (Fianarantsoa)
    let codeLieu = '480';
    
    // Vérifier le lieu ou l'adresse pour déterminer le code
    const lieu = convention.lieu || '';
    const adresse = convention.batiment?.adresse || '';
    const lieuStr = (lieu + ' ' + adresse).toUpperCase();
    
    if (lieuStr.includes('MANAKARA')) {
      codeLieu = '481';
    } else {
      codeLieu = '480'; // Fianarantsoa par défaut
    }
    
    // Formater le numéro : 480 052/TER/2024
    const numFormatted = String(numConv).padStart(3, '0');
    return `${codeLieu} ${numFormatted}/TER/${year}`;
  };

  // Fonction pour charger les changements de statut
  const loadStatusChanges = async () => {
    setLoadingStatusChanges(true);
    setMsg('');
    try {
      const response = await apiRequest(API_ENDPOINTS.FACTURES_STATUS_CHANGES, {
        method: 'GET'
      });
      
      if (response.status === 200) {
        setStatusChanges(response);
        console.log('✅ Changements de statut chargés:', response.data);
      } else {
        setMsg(`Erreur: ${response.message || 'Statut inattendu'}`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des changements de statut:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des changements de statut';
      setMsg(errorMessage);
      if (errorMessage.includes('403') || errorMessage.includes('Accès refusé')) {
        setMsg('Accès refusé. Vérifiez vos permissions.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Token')) {
        setMsg('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/auth'), 2000);
      }
    } finally {
      setLoadingStatusChanges(false);
    }
  };

  const loadConventions = async (q = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Ajouter un timestamp pour éviter le cache du navigateur
      const timestamp = new Date().getTime();
      const searchQuery = q || searchConventions;
      // Demander toutes les conventions (limit élevé pour récupérer toutes les données)
      const baseUrl = searchQuery ? `${API_CONVS}?q=${encodeURIComponent(searchQuery)}&limit=1000` : `${API_CONVS}?limit=1000`;
      const separator = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${separator}_t=${timestamp}`;
      
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }
      const j = await r.json();
      if (j.status === 200) {
        // Forcer la mise à jour avec les nouvelles données
    // Normaliser les valeurs manquantes : ville => 'Fianarantsoa', quartier => 'Zone Est'
        const normalized = (j.data || []).map(c => {
          const bat = c.batiment ? { ...c.batiment } : {};
          const v = (bat.ville || '').toString().trim();
          const q = (bat.quartier || '').toString().trim();
          if (!v || v === '' || v.toLowerCase() === 'non renseignée' || v.toLowerCase() === 'non renseignee') {
            bat.ville = 'Fianarantsoa';
          }
          if (!q || q === '' || q.toLowerCase() === 'non renseigné' || q.toLowerCase() === 'non renseignee') {
            bat.quartier = 'Zone Est';
          }
          return { ...c, batiment: bat };
        });
        setConventions(normalized);
        // Mettre à jour aussi searchConventions si un paramètre q est passé
        if (q !== undefined && q !== '') {
          setSearchConventions(q);
        }
      }
    } catch (e) {
      console.error(e);
      setMsg("Erreur chargement conventions");
    } finally {
      setLoading(false);
    }
  };

  // Calcul des statistiques des conventions
  const conventionStats = useMemo(() => {
    const total = conventions.length;
    const confirmees = conventions.filter(c => c.statutConv).length;
    const enAttente = conventions.filter(c => !c.statutConv).length;
    const montantTotal = conventions.reduce((sum, c) => sum + (c.batiment?.montant || 0), 0);
    return { total, confirmees, enAttente, montantTotal };
  }, [conventions]);

  // Fonction pour obtenir le nombre de modifications d'une convention spécifique
  const getEditCountForConv = (numConv) => {
    if (!numConv) return 0;
    const modifications = JSON.parse(localStorage.getItem('modificationsJournalieres') || '[]');
    const convModifications = modifications.filter(m => m.numConv === numConv);
    return convModifications.length;
  };

  // Fonction pour modifier une convention
  const onEditConv = (c) => {
    // Charger les bâtiments si nécessaire
    if (batiments.length === 0) {
      loadBatimentsForConvention();
    }
    setSelectedConvention(c);
    setConventionForm({
      step1: {
        numBat: String(c.numBat || ''),
        adresse: c.batiment?.adresse || '',
        montant: c.batiment?.montant != null ? String(c.batiment.montant) : ''
      },
      step2: {
        nomcli: c.locataire?.nomcli || '',
        datenais: c.locataire?.datenais || '',
        lieunais: c.locataire?.lieunais || '',
        pere: c.locataire?.pere || '',
        mere: c.locataire?.mere || '',
        cin: c.locataire?.cin ? c.locataire.cin.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ') : '',
        delivcin: c.locataire?.delivcin || '',
        adressecli: c.locataire?.adressecli || '',
        activite: c.locataire?.activite || ''
      }
    });
    setConventionStep(1);
    setShowConventionModal(true);
  };

  // Fonction pour imprimer une convention
  const printConvention = async (c) => {
    const conventionNumber = formatConventionNumber(c);
    const data = {
      conventionNumber: conventionNumber,
      lieuVille: (c.batiment?.adresse || '').toUpperCase(),
      adresse: c.batiment?.adresse || '',
      montant: c.batiment?.montant != null ? c.batiment.montant : '',
      nomcli: c.locataire?.nomcli || '',
      datenais: c.locataire?.datenais || '',
      lieunais: c.locataire?.lieunais || '',
      pere: c.locataire?.pere || '',
      mere: c.locataire?.mere || '',
      cin: c.locataire?.cin || '',
      delivcin: c.locataire?.delivcin || '',
      adressecli: c.locataire?.adressecli || '',
      activite: c.locataire?.activite || ''
    };
    
    // Convertir le logo en base64 pour l'inclure dans le HTML
    let logoBase64 = '';
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = logoImage;
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            logoBase64 = canvas.toDataURL('image/gif');
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
      });
    } catch (e) {
      console.warn('Impossible de charger le logo, utilisation du chemin direct:', e);
      logoBase64 = logoImage;
    }
    
    const html = buildConventionHTML(data, logoBase64);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  // Styles CSS pour l'impression de convention
  const docCss = `
    @media screen {
      .doc { background: #e5e7eb; padding: 24px; }
      .page { width: 793.7px; min-height: 1122.5px; margin: 0 auto 24px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.12); padding: 32px 40px; }
    }
    @media print {
      @page { size: A4; margin: 0; }
      body, html { margin: 0; padding: 0; }
      .doc { background: white; padding: 0; }
      .page { width: 210mm; min-height: 297mm; margin: 0; padding: 20mm; box-shadow: none; }
    }
    .logo-container { text-align: center; margin-bottom: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .muted { color: #666; font-size: 12px; }
    .hl { font-weight: bold; }
    .title { text-align: center; font-size: 16px; font-weight: 700; margin: 20px 0; text-transform: uppercase; }
    .sep { height: 2px; background: #000; margin: 16px 0; }
    .article { margin: 12px 0; text-align: justify; line-height: 1.8; font-size: 13px; }
    .sig { margin-top: 40px; display: flex; justify-content: space-between; }
  `;

  // Fonction pour construire le HTML de la convention
  const buildConventionHTML = (data, logoBase64 = '') => {
    const y = new Date().getFullYear();
    const f = (v, d = '........') => (v ? String(v) : d);
    const money = (v) => (v != null && v !== '' ? Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '........');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Convention</title><style>${docCss}</style></head><body>
      <div class="doc">
        <div class="page">
          ${logoBase64 ? `<div class="logo-container">
            <img src="${logoBase64}" alt="Logo FCE" style="max-width: 120px; height: auto; margin-bottom: 8px; display: block;" />
          </div>` : ''}
          <div class="header">
            <div>
              <div style="font-weight:700">LA DIRECTION DE LA F.C.E.</div>
              <div>FIANARANTSOA</div>
            </div>
            <div class="muted">CONVENTION N° <span class="hl">${data.conventionNumber || `..../TER/${y}`}</span></div>
          </div>
          <div class="title">D'UN BÂTIMENT SIS À <span class="hl">${f(data.lieuVille, '................')}</span></div>
          <div class="sep"></div>
          <div class="article"><strong>Article 1 :</strong> La Société d'Etat Ligne FCE donne en location à titre temporaire à <span class="hl">${f(data.nomcli, 'nom du locataire')}</span> un bâtiment sis à <span class="hl">${f(data.adresse, 'lieux du location')}</span>.</div>
          <div class="article"><strong>Article 2 :</strong> La location est consentie pour permettre à Mme/Mr <span class="hl">${f(data.nomcli, 'nom du locataire')}</span></div>
          <div class="article" style="margin-top: 12px;">
            <div>né(e) le : <span class="hl">${f(data.datenais, 'date de naissance')}</span>, à <span class="hl">${f(data.lieunais, 'lieux de naissance')}</span>,</div>
            <div>Fils/fille de : <span class="hl">${f(data.pere, 'Père')}</span> et de <span class="hl">${f(data.mere, 'mère')}</span>.</div>
            <div>CIN : <span class="hl">${f(data.cin, 'N° CIN')}</span> délivrée le <span class="hl">${f(data.delivcin, 'date cin')}</span>.</div>
            <div>Adresse : <span class="hl">${f(data.adressecli, '................')}</span>.</div>
            <div>Activité : <span class="hl">${f(data.activite, '................')}</span></div>
            <div style="margin-top: 8px;">pour <span class="hl">usage du batiment</span></div>
          </div>
          <div class="article"><strong>Article 3 :</strong> Le locataire doit sous seule responsabilité se conformer aux prescriptions légales ou réglementaires relatives aux Chemins de Fer, ainsi qu'aux diverses dispositions relatives à la sécurité.</div>
          <div class="article"><strong>Article 4 :</strong> Aucune modification ou extension sur le fond loué ne peut être entreprise qu'avec l'accord de la ligne FCE.</div>
          <div class="article"><strong>Article 5 :</strong> Le locataire déclare expressément prendre à sa charge dans tous les cas les risques d'incendie. Il doit contracter une assurance pour un montant qu'il devra évaluer par ses soins.</div>
          <div class="article"><strong>Article 6 :</strong> Le locataire supportera seul toutes les charges de ville ou police instituée et paiera à compter de la date d'effet de la présente note, les taxes et impôts de toute nature gravant l'immeuble pendant la location. Ainsi qu'un droit de timbre proportionnel s'élevant en présent acte.</div>
          <div class="article"><strong>Article 7 :</strong> La présente location est établie à titre strictement personnel, au profit de Mme/Mr <span class="hl">${f(data.nomcli, 'Nom du locataire')}</span>. La cession ou la sous location du droit à bail, lui est interdite, sous peine de déchéance, sans autorisation spéciale écrite du Réseau National des Chemins de Fer Malagasy/FCE.</div>
          <div class="article"><strong>Article 8 :</strong> Le prix de location est fixé à <span class="hl">${money(data.montant)}</span> AR/TTC (${money(data.montant)} ARIARY) par mois payable en entier au début de chaque période par virement bancaire au compte BOA de la FCE 0009 02000 1 294564 000 0 – 88 et centraliser le bordereau de versement au Chef de Gare, ou envoyé la version numérique du bordereau à l'adresse email : <a href="mailto:contact.fce@fce.mg" style="color: #0ea5e9;">contact.fce@fce.mg</a> et</div>
        </div>

        <div class="page">
        <div style="margin-top: 32px;">
          <a href="mailto:fivanaina.razafindrabenja@fce.mg" style="color: #0ea5e9;">fivanaina.razafindrabenja@fce.mg</a> _Le non-paiement à l'échéance, entraînera une pénalité de retard de <span class="hl">cinq pourcent (1%)</span> par jour du loyer en fonction du nombre de jours de retard.
        </div>
        <div style="margin-top: 12px; text-align: justify;">
          La présente convention sera résiliée de plein de droit un mois après une lettre de rappel non suivie d'effet et le locataire pourra être poursuivi par voies légales pour les règlements des sommes dues par application de la présente convention.
        </div>
        <div class="article"><strong>Article 9 :</strong> La présente convention est conclue pour une durée d'un (01) an renouvelable avec une augmentation de <span class="hl">cinq pourcent (5%)</span> et à compter de la date d'effet de la notification. À l'expiration de cette période, la présente convention sera renouvelée par tacite reconduction sauf dénonciation régulière pour une nouvelle période.</div>
        <div class="article"><strong>Article 10 :</strong> Les deux parties peuvent résilier la présente convention avant son expiration par simple préavis.</div>
        <div class="article"><strong>Article 11 :</strong> Tout ce qui n'est pas prévu par la présente convention, devra se référer aux articles du Code Civil régissant le contrat de louage location.</div>
        <div class="article"><strong>Article 12 :</strong> Tout différend s'élevant entre la <strong>Direction de la FCE</strong> et Mme/Mr <span class="hl">${f(data.nomcli, 'Nom du locataire')}</span> à l'occasion de l'exécution du présent contrat sera porté devant le tribunal Administratif de FIANARANTSOA.</div>
        <div class="article"><strong>Article 13 :</strong> La présente convention annule la convention antérieure, mais pas les factures émises par le biais de la convention expirée, qui doivent être régularisées dans un délai raisonnable.</div>
        <div class="article"><strong>Article 14 :</strong> Pour l'exécution de la présente, les deux parties font élection de domicile :</div>
        <div style="margin-top: 8px; margin-left: 20px;">
          <div>FIANARANTSOA pour <strong>LA SOCIETE D'ETAT/RNCFM/FCE</strong></div>
          <div>FIANARANTSOA pour Mme/Mr <span class="hl">${f(data.nomcli, 'Nom du locataire')}</span></div>
          <div>LA DATE D'EFFET est fixée le : <span class="hl">${new Date().toLocaleDateString('fr-FR')}</span></div>
        </div>
        <div style="margin-top: 40px; margin-bottom: 20px;">Fianarantsoa le,</div>
        <div class="sig" style="display: flex; justify-content: space-between; margin-top: 28px;">
          <div style="text-align: center;">
            <div>Le Directeur de la FCE</div>
          </div>
          <div style="text-align: center;">
            <div>LE LOCATAIRE</div>
            <div style="font-size: 12px; margin-top: 4px;">Lu et approuvé</div>
          </div>
          <div style="text-align: center;">
            <div>Le Chef Service Patrimoine</div>
          </div>
        </div>
        <div style="margin-top: 60px; text-align: right; font-size: 13px;">
          <div>RAZAFINDRANBENIJA</div>
          <div>Livanaina Lucie</div>
        </div>
      </div>
    </div>
    </body></html>`;
    return html;
  };

  const handleDeleteConvention = async (numConv) => {
    // Demander une confirmation avant de supprimer la convention
    const confirmed = await confirm({
      title: 'Supprimer la convention',
      message: `Êtes-vous sûr de vouloir supprimer la convention ${numConv} ?\nCette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_CONVS}/${numConv}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();
      if (result.status === 200) {
        setMsg('Convention supprimée avec succès');
        await loadConventions();
        
        // Enregistrer dans l'historique
        const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
        const adminData = JSON.parse(localStorage.getItem('user') || '{}');
        historique.push({
          id: Date.now(),
          utilisateur: adminData.nom || 'Administrateur',
          matricule: adminData.matricule || 'N/A',
          action: 'Suppression',
          type: 'Convention',
          description: `Suppression de la convention ${numConv}`,
          date: new Date().toISOString(),
          details: {
            numConv: numConv
          },
          statut: 'Succès'
        });
        localStorage.setItem('historiqueActivites', JSON.stringify(historique));
      } else if (result.status === 409) {
        // Convention en attente - ne peut pas être supprimée
        setMsg(result.message || 'Impossible de supprimer : cette convention est encore en attente.');
      } else {
        setMsg(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de la suppression de la convention');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const loadBatimentsForConvention = async (onlyAvailable = false) => {
    try {
      const token = localStorage.getItem('token');
      // Si onlyAvailable est true, charger uniquement les bâtiments libres (non alloués)
      const url = onlyAvailable ? `${API_URL}?available=true` : API_URL;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }
      
      const result = await response.json();
      if (result.status === 200) {
        setBatiments(result.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement bâtiments:', error);
    }
  };

  // Fonction pour sauvegarder/créer une convention
  const handleSaveConvention = async () => {
    setLoading(true);
    try {
      // Supprimer les espaces du CIN avant l'envoi
      const cinWithoutSpaces = conventionForm.step2.cin.replace(/\s/g, '');
      const payload = { 
        ...conventionForm.step1, 
        ...conventionForm.step2,
        cin: cinWithoutSpaces,
        statutConv: false 
      };
      
      let method = 'POST';
      let url = API_CONVS;
      
      if (selectedConvention) {
        method = 'PUT';
        url = `${API_CONVS}/${selectedConvention.numConv}`;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }

      const result = await response.json();
      if (result.status === 200 || result.status === 201) {
        setMsg(selectedConvention ? 'Convention mise à jour avec succès' : 'Convention créée avec succès');
        
        // Recharger les conventions
        await loadConventions();
        
        // Fermer le modal et réinitialiser
        setShowConventionModal(false);
        setConventionStep(1);
        setSelectedConvention(null);
        setConventionForm({
          step1: { numBat: '', adresse: '', montant: '' },
          step2: { nomcli: '', datenais: '', lieunais: '', pere: '', mere: '', cin: '', delivcin: '', adressecli: '', activite: '', contact: '' }
        });
      } else {
        setMsg(result.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de l\'enregistrement de la convention');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const loadBatiments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }
      const result = await response.json();
      if (result.status === 200) {
        setBatiments(result.data);
      } else {
        setMsg('Erreur lors du chargement des bâtiments');
        setTimeout(() => setMsg(''), 2000);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors du chargement des bâtiments');
      setTimeout(() => setMsg(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const openBatimentDetails = async (batiment) => {
    if (!batiment) return;
    setSelectedBatimentDetails(batiment);
    setShowBatimentDetails(true);
    setLoadingBatimentDetails(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${batiment.numBat}?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();
      if (result.status === 200 && result.data) {
        setSelectedBatimentDetails(result.data);
      } else {
        setMsg('Impossible de charger le détail du bâtiment');
        setTimeout(() => setMsg(''), 2500);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du détail du bâtiment:', error);
      setMsg('Erreur lors du chargement du détail du bâtiment');
      setTimeout(() => setMsg(''), 2500);
    } finally {
      setLoadingBatimentDetails(false);
    }
  };

  const closeBatimentDetails = () => {
    setShowBatimentDetails(false);
    setSelectedBatimentDetails(null);
    setLoadingBatimentDetails(false);
  };

  const loadDemandesSuppression = async () => {
    setLoadingDemandes(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-suppression`;
      
      try {
        const response = await fetch(API_DEMANDES, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 200 && result.data) {
            setDemandesSuppression(result.data);
          } else {
            // Si l'API n'existe pas encore, utiliser localStorage
            const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
            setDemandesSuppression(demandes);
          }
        } else {
          // Si l'API n'existe pas encore, utiliser localStorage
          const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
          setDemandesSuppression(demandes);
        }
      } catch (apiError) {
        // Si l'API n'existe pas encore, utiliser localStorage
        const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
        setDemandesSuppression(demandes);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
      const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
      setDemandesSuppression(demandes);
    } finally {
      setLoadingDemandes(false);
    }
  };

  const handleApprouverDemande = async (demande) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-suppression/${demande.id}`;
      
      try {
        const response = await fetch(`${API_DEMANDES}/approuver`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'approuver' })
        });
        
        if (response.ok) {
          // Supprimer l'élément si c'est une convention
          if (demande.type === 'convention') {
            const API_CONVS = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/conventions/${demande.idElement}`;
            await fetch(API_CONVS, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          }
          
          // Mettre à jour localement
          const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
          const updated = demandes.map(d => 
            d.id === demande.id ? { ...d, statut: 'approuvee', dateApprobation: new Date().toISOString() } : d
          );
          localStorage.setItem('demandesSuppression', JSON.stringify(updated));
          setDemandesSuppression(updated);
          setMsg('Demande approuvée et suppression effectuée');
        }
      } catch (apiError) {
        // Si l'API n'existe pas encore, mettre à jour localement
        const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
        const updated = demandes.map(d => 
          d.id === demande.id ? { ...d, statut: 'approuvee', dateApprobation: new Date().toISOString() } : d
        );
        localStorage.setItem('demandesSuppression', JSON.stringify(updated));
        setDemandesSuppression(updated);
        setMsg('Demande approuvée (mode local)');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleRejeterDemande = async (demande) => {
    const confirmed = await confirm({
      title: 'Rejeter la demande',
      message: `Rejeter la demande de suppression de ${demande.type === 'convention' ? 'la convention' : 'l\'élément'} ${demande.idElement} ?`,
      type: 'warning',
      confirmText: 'Rejeter',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-suppression/${demande.id}`;
      
      try {
        const response = await fetch(`${API_DEMANDES}/rejeter`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'rejeter' })
        });
        
        if (response.ok) {
          const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
          const updated = demandes.map(d => 
            d.id === demande.id ? { ...d, statut: 'rejetee', dateRejet: new Date().toISOString() } : d
          );
          localStorage.setItem('demandesSuppression', JSON.stringify(updated));
          setDemandesSuppression(updated);
          setMsg('Demande rejetée');
        }
      } catch (apiError) {
        // Si l'API n'existe pas encore, mettre à jour localement
        const demandes = JSON.parse(localStorage.getItem('demandesSuppression') || '[]');
        const updated = demandes.map(d => 
          d.id === demande.id ? { ...d, statut: 'rejetee', dateRejet: new Date().toISOString() } : d
        );
        localStorage.setItem('demandesSuppression', JSON.stringify(updated));
        setDemandesSuppression(updated);
        setMsg('Demande rejetée (mode local)');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors du rejet');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const loadDemandesModification = async () => {
    setLoadingDemandesModif(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-modification`;
      
      try {
        const response = await fetch(API_DEMANDES, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 200 && result.data) {
            setDemandesModification(result.data);
          } else {
            const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
            setDemandesModification(demandes);
          }
        } else {
          const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
          setDemandesModification(demandes);
        }
      } catch (apiError) {
        const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
        setDemandesModification(demandes);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes de modification:', error);
      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
      setDemandesModification(demandes);
    } finally {
      setLoadingDemandesModif(false);
    }
  };

  const handleApprouverDemandeModification = async (demande) => {
    const confirmed = await confirm({
      title: 'Approuver la demande',
      message: `Approuver la demande de modification supplémentaire de ${demande.demandeur} ?`,
      type: 'info',
      confirmText: 'Approuver',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-modification/${demande.id}`;
      
      try {
        const response = await fetch(`${API_DEMANDES}/approuver`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'approuver' })
        });
      } catch (apiError) {
        // Si l'API n'existe pas encore, mettre à jour localement
      }
      
      // Mettre à jour localement
      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
      const updated = demandes.map(d => 
        d.id === demande.id ? { ...d, statut: 'approuvee', dateApprobation: new Date().toISOString(), utilisee: false } : d
      );
      localStorage.setItem('demandesModification', JSON.stringify(updated));
      setDemandesModification(updated);
      
      // Enregistrer dans l'historique
      const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
      const adminData = JSON.parse(localStorage.getItem('user') || '{}');
      historique.push({
        id: Date.now(),
        utilisateur: adminData.nom || 'Administrateur',
        matricule: adminData.matricule || 'N/A',
        action: 'Approbation',
        type: 'Demande',
        description: `Approbation de la demande de modification de ${demande.demandeur}`,
        date: new Date().toISOString(),
        details: {
          demandeId: demande.id,
          raison: demande.raison,
          convention: demande.convention
        },
        statut: 'Succès'
      });
      localStorage.setItem('historiqueActivites', JSON.stringify(historique));
      
      setMsg('Demande de modification approuvée');
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleRejeterDemandeModification = async (demande) => {
    const confirmed = await confirm({
      title: 'Rejeter la demande',
      message: `Rejeter la demande de modification de ${demande.demandeur} ?`,
      type: 'warning',
      confirmText: 'Rejeter',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-modification/${demande.id}`;
      
      try {
        const response = await fetch(`${API_DEMANDES}/rejeter`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'rejeter' })
        });
      } catch (apiError) {
        // Si l'API n'existe pas encore, mettre à jour localement
      }
      
      // Mettre à jour localement
      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
      const updated = demandes.map(d => 
        d.id === demande.id ? { ...d, statut: 'rejetee', dateRejet: new Date().toISOString() } : d
      );
      localStorage.setItem('demandesModification', JSON.stringify(updated));
      setDemandesModification(updated);
      
      // Enregistrer dans l'historique
      const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
      const adminData = JSON.parse(localStorage.getItem('user') || '{}');
      historique.push({
        id: Date.now(),
        utilisateur: adminData.nom || 'Administrateur',
        matricule: adminData.matricule || 'N/A',
        action: 'Rejet',
        type: 'Demande',
        description: `Rejet de la demande de modification de ${demande.demandeur}`,
        date: new Date().toISOString(),
        details: {
          demandeId: demande.id,
          raison: demande.raison,
          convention: demande.convention
        },
        statut: 'Succès'
      });
      localStorage.setItem('historiqueActivites', JSON.stringify(historique));
      
      setMsg('Demande de modification rejetée');
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors du rejet');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // Fonctions pour gérer les demandes de création de compte
  const loadDemandesCreation = async () => {
    setLoadingDemandesCreation(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user/demandes-creation`;
      
      try {
        const response = await fetch(API_DEMANDES, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 200 && result.data) {
            setDemandesCreation(result.data);
          } else {
            setDemandesCreation([]);
          }
        } else {
          setDemandesCreation([]);
        }
      } catch (apiError) {
        console.error('Erreur API demandes création:', apiError);
        setDemandesCreation([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes de création:', error);
      setDemandesCreation([]);
    } finally {
      setLoadingDemandesCreation(false);
    }
  };

  const handleApprouverDemandeCreation = async () => {
    if (!selectedDemande || !approveForm.nom || !approveForm.contact || !approveForm.email) {
      setMsg('Veuillez remplir tous les champs (nom, contact, email)');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user/demandes-creation/${selectedDemande.id}`;
      
      const response = await fetch(API_DEMANDES, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approuver',
          nom: approveForm.nom,
          contact: approveForm.contact,
          email: approveForm.email
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setMsg('Demande approuvée et compte créé avec succès');
        setShowApproveModal(false);
        setSelectedDemande(null);
        setApproveForm({ nom: '', contact: '', email: '' });
        loadDemandesCreation();
        if (activeSection === 'utilisateurs') {
          loadUtilisateurs(searchUser);
        } else {
          loadUtilisateurs();
        }
      } else {
        const error = await response.json();
        setMsg(error.message || 'Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleRejeterDemandeCreation = async (demande) => {
    const confirmed = await confirm({
      title: 'Rejeter la demande',
      message: `Rejeter la demande de création de compte pour le matricule ${demande.matricule} (${demande.poste}) ?`,
      type: 'warning',
      confirmText: 'Rejeter',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user/demandes-creation/${demande.id}`;
      
      const response = await fetch(API_DEMANDES, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'rejeter' })
      });
      
      if (response.ok) {
        setMsg('Demande rejetée');
        loadDemandesCreation();
      } else {
        const error = await response.json();
        setMsg(error.message || 'Erreur lors du rejet');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors du rejet');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // Fonctions pour gérer les demandes de réinitialisation de mot de passe
  const loadDemandesReset = async () => {
    setLoadingDemandesReset(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user/reset-password/demandes`;
      
      try {
        const response = await fetch(API_DEMANDES, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 200 && result.data) {
            setDemandesReset(result.data);
          } else {
            setDemandesReset([]);
          }
        } else {
          setDemandesReset([]);
        }
      } catch (apiError) {
        console.error('Erreur API demandes reset:', apiError);
        setDemandesReset([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes de réinitialisation:', error);
      setDemandesReset([]);
    } finally {
      setLoadingDemandesReset(false);
    }
  };

  const handleApprouverDemandeReset = async () => {
    if (!selectedResetDemande || !resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword) {
      setMsg('Veuillez remplir tous les champs (nouveau mot de passe et confirmation)');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setMsg('Les mots de passe ne correspondent pas');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    
    if (resetPasswordForm.newPassword.length < 6) {
      setMsg('Le mot de passe doit contenir au moins 6 caractères');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user/reset-password/demandes/${selectedResetDemande.id}`;
      
      const response = await fetch(API_DEMANDES, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approuver',
          newPassword: resetPasswordForm.newPassword
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setMsg('Demande approuvée et mot de passe réinitialisé avec succès');
        setShowResetApproveModal(false);
        setSelectedResetDemande(null);
        setResetPasswordForm({ newPassword: '', confirmPassword: '' });
        loadDemandesReset();
      } else {
        const error = await response.json();
        setMsg(error.message || 'Erreur lors de l\'approbation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleRejeterDemandeReset = async (demande) => {
    const confirmed = await confirm({
      title: 'Rejeter la demande',
      message: `Rejeter la demande de réinitialisation de mot de passe pour ${demande.nom} (${demande.matricule}) ?`,
      type: 'warning',
      confirmText: 'Rejeter',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user/reset-password/demandes/${demande.id}`;
      
      const response = await fetch(API_DEMANDES, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'rejeter' })
      });
      
      if (response.ok) {
        setMsg('Demande rejetée');
        loadDemandesReset();
      } else {
        const error = await response.json();
        setMsg(error.message || 'Erreur lors du rejet');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors du rejet');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const loadUtilisateurs = async (searchQuery = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      const url = searchQuery ? `${API_USERS_URL}?${params.toString()}` : API_USERS_URL;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }
      const result = await response.json();
      if (result.status === 200) {
        setUtilisateurs(result.data);
      } else {
        setMsg('Erreur lors du chargement des utilisateurs');
        setTimeout(() => setMsg(''), 2000);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors du chargement des utilisateurs');
      setTimeout(() => setMsg(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm(initialForm);
    setImageFile(initialImage);
    setImagePreview(null);
    setEditingId(null);
  };

  const resetUserForm = () => {
    setUserForm({
      matricule: '',
      nom: '',
      contact: '',
      email: '',
      poste: 'caissier',
      mdp: '',
      numConv: ''
    });
    setEditingUserId(null);
    setShowUserForm(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numBat || !form.adresse || !form.montant) {
      setMsg('Veuillez remplir tous les champs obligatoires');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    // Validation: si le statut est inactif, le motif d'inactivité est obligatoire
    if (!form.statut && (!form.motifInactivite || form.motifInactivite.trim() === '')) {
      setMsg('Le motif d\'inactivité est obligatoire lorsque le statut est inactif');
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    if (!editingId && !imageFile) {
      setMsg('Veuillez sélectionner une image');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('numBat', form.numBat);
      formData.append('adresse', form.adresse);
      formData.append('montant', form.montant);
      formData.append('statut', form.statut);
      if (form.motifInactivite) {
        formData.append('motifInactivite', form.motifInactivite);
      }
      formData.append('ville', form.ville);
      formData.append('quartier', form.quartier);
      formData.append('latitude', form.latitude);
      formData.append('longitude', form.longitude);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const token = localStorage.getItem('token');
      let response;
      if (editingId) {
        // UPDATE
        response = await fetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        // CREATE
        response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      }

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();

      if (result.status === 201 || result.status === 200) {
        setMsg(editingId ? 'Bâtiment mis à jour avec succès' : 'Bâtiment ajouté avec succès');
        await loadBatiments();
        reset();
      } else {
        setMsg(result.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg(error.message || 'Erreur lors de l\'enregistrement. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const onEdit = (b) => {
    setEditingId(b.numBat);
    setForm({
      numBat: b.numBat,
      adresse: b.adresse,
      montant: String(b.montant),
      statut: b.statut,
      motifInactivite: b.motifInactivite || '',
      ville: b.ville || '',
      quartier: b.quartier || '',
      latitude: b.latitude != null ? String(b.latitude) : '',
      longitude: b.longitude != null ? String(b.longitude) : ''
    });
    if (b.image) {
      setImagePreview(`data:image/jpeg;base64,${b.image}`);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
  };

  const onDelete = async (numBat) => {
    const token = localStorage.getItem('token');
    
    // CAS 1 : Vérifier d'abord si le bâtiment a une convention en cours
    // On vérifie via l'API pour avoir les données à jour
    try {
      const convResponse = await fetch(`${API_CONVS}?numBat=${numBat}&statut=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let conventionsActives = [];
      if (convResponse.ok) {
        const convData = await convResponse.json();
        if (convData.data && Array.isArray(convData.data)) {
          conventionsActives = convData.data.filter(conv => conv.statutConv === true);
        }
      }
      
      // CAS 1 : Le bâtiment a une convention EN COURS
      if (conventionsActives.length > 0) {
        setMsg('⚠️ Impossible de supprimer : ce bâtiment est encore loué par un client.');
        setTimeout(() => setMsg(''), 5000);
        // La notification sera créée côté backend lors de la tentative de suppression
        return;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des conventions:', error);
      // Continuer quand même, le backend vérifiera aussi
    }
    
    // CAS 2 et 3 : Le bâtiment n'a pas de convention en cours
    // Demander le motif de suppression (obligatoire)
    const motifOptions = [
      { value: 'Bâtiment détruit', label: 'Bâtiment détruit' },
      { value: 'Bâtiment inutilisable', label: 'Bâtiment inutilisable' },
      { value: 'Erreur d\'enregistrement', label: 'Erreur d\'enregistrement' },
      { value: 'Autre motif', label: 'Autre motif' }
    ];
    
    const motif = await promptInput({
      title: 'Motif de suppression',
      message: `Veuillez indiquer le motif de suppression du bâtiment n°${numBat} :`,
      inputLabel: 'Motif',
      inputPlaceholder: 'Sélectionner un motif...',
      type: 'warning',
      confirmText: 'Continuer',
      cancelText: 'Annuler',
      required: true,
      options: motifOptions
    });
    
    if (!motif) {
      return; // L'utilisateur a annulé
    }
    
    // Si "Autre motif" est sélectionné, demander la saisie libre
    let motifFinal = motif;
    if (motif === 'Autre motif') {
      const autreMotif = await promptInput({
        title: 'Préciser le motif',
        message: 'Veuillez préciser le motif de suppression :',
        inputLabel: 'Motif',
        inputPlaceholder: 'Entrez le motif de suppression...',
        type: 'warning',
        confirmText: 'Continuer',
        cancelText: 'Annuler',
        required: true,
        options: null
      });
      
      if (!autreMotif) {
        return; // L'utilisateur a annulé
      }
      motifFinal = autreMotif;
    }
    
    // Demander confirmation finale
    const confirmed = await confirm({
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer le bâtiment n°${numBat} ?\n\nMotif : ${motifFinal}`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    
    if (!confirmed) {
      return;
    }

    // Effectuer la suppression avec le motif
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${numBat}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motif: motifFinal })
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();

      if (result.status === 200) {
        setMsg('✅ Bâtiment supprimé avec succès');
        await loadBatiments();
      } else if (result.status === 409) {
        // CAS 1 : Convention en cours (double vérification côté backend)
        setMsg(`⚠️ ${result.message || 'Impossible de supprimer : ce bâtiment est encore loué par un client.'}`);
        if (result.details?.notification) {
          console.log('📢 Notification créée:', result.details.notification);
        }
        setTimeout(() => setMsg(''), 5000);
      } else if (result.status === 400) {
        // Motif manquant
        setMsg(`❌ ${result.message || 'Un motif de suppression est obligatoire'}`);
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg(`❌ ${result.message || 'Erreur lors de la suppression'}`);
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('❌ Erreur lors de la suppression');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour la gestion des utilisateurs
  const onEditUser = (u) => {
    setEditingUserId(u.matricule);
    setUserForm({
      matricule: u.matricule,
      nom: u.nom,
      contact: u.contact,
      email: u.email,
      poste: u.poste,
      mdp: '',
      numConv: u.numConv || ''
    });
    setShowUserForm(true);
  };

  const onDeleteUser = async (matricule) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_USERS_URL}/${matricule}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();

      if (result.status === 200) {
        setMsg('Utilisateur supprimé avec succès');
        await loadUtilisateurs(searchUser);
      } else {
        setMsg(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de la suppression');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.matricule || !userForm.nom || !userForm.contact || !userForm.email || !userForm.poste) {
      setMsg('Veuillez remplir tous les champs obligatoires');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    // Validation du contact : doit contenir exactement 10 chiffres
    if (userForm.contact.length !== 10 || !/^\d{10}$/.test(userForm.contact)) {
      setMsg('Le contact doit contenir exactement 10 chiffres (ex: 0343284689)');
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    if (!editingUserId && !userForm.mdp) {
      setMsg('Veuillez définir un mot de passe pour le nouvel utilisateur');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      const body = { ...userForm };
      if (!body.mdp) delete body.mdp; // Ne pas envoyer le mot de passe vide en cas de modification
      if (!body.numConv) body.numConv = null;

      if (editingUserId) {
        // UPDATE - Ne pas envoyer le matricule car il ne peut pas être modifié
        delete body.matricule;
        response = await fetch(`${API_USERS_URL}/${editingUserId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      } else {
        // CREATE
        response = await fetch(`${API_USERS_URL}/register`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();

      if (result.status === 201 || result.status === 200) {
        setMsg(editingUserId ? 'Utilisateur mis à jour avec succès' : 'Utilisateur créé avec succès');
        await loadUtilisateurs(searchUser);
        resetUserForm();
      } else {
        setMsg(result.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg(error.message || 'Erreur lors de l\'enregistrement. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // Fonctions de filtrage
  const filteredBatiments = batiments.filter(b => {
    const matchesSearch = !searchBatiment || 
      b.numBat.toString().includes(searchBatiment) || 
      b.adresse.toLowerCase().includes(searchBatiment.toLowerCase());
    const matchesStatut = filterStatut === 'all' || 
      (filterStatut === 'actif' && b.statut) || 
      (filterStatut === 'inactif' && !b.statut);
    const matchesStatutUtilisation = filterStatutUtilisation === 'all' ||
      (filterStatutUtilisation === 'libre' && (b.statutUtilisation === 'libre' || b.estLibre) && !(b.statutUtilisation === 'indisponible' || b.estIndisponible)) ||
      (filterStatutUtilisation === 'alloue' && (b.statutUtilisation === 'alloué' || b.estAlloue)) ||
      (filterStatutUtilisation === 'indisponible' && (b.statutUtilisation === 'indisponible' || b.estIndisponible));
    return matchesSearch && matchesStatut && matchesStatutUtilisation;
  });

  const filteredUtilisateurs = utilisateurs.filter(u => {
    const matchesSearch = !searchUser || 
      u.matricule.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.nom.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase());
    const matchesPoste = filterPoste === 'all' || u.poste === filterPoste;
    return matchesSearch && matchesPoste;
  });

  // Filtre de période pour les statistiques
  const [statsPeriodFilter, setStatsPeriodFilter] = useState('Toutes les données');
  const [evolutionPeriod, setEvolutionPeriod] = useState('mois'); // 'mois', 'semaine', 'jour', 'trimestre', 'annee'

  // Fonction pour filtrer par période
  const filterByPeriod = (items, period) => {
    if (period === 'Toutes les données') {
      return items;
    }

    const now = new Date();
    let startDate;

    switch (period) {
      case 'Ce mois':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Ce trimestre':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'Cette année':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return items;
    }

    return items.filter(item => {
      // Pour les conventions, utiliser dateConv, sinon utiliser createdAt, dateCreation ou date
      const itemDate = new Date(item.dateConv || item.createdAt || item.dateCreation || item.date);
      return itemDate >= startDate && itemDate <= now;
    });
  };

  // Statistiques avec filtre de période
  const statsFilteredBatiments = filterByPeriod(batiments, statsPeriodFilter);
  const statsFilteredUtilisateurs = filterByPeriod(utilisateurs, statsPeriodFilter);
  const statsFilteredConventions = filterByPeriod(conventions, statsPeriodFilter);

  // Vérifier si les colonnes Contact, Ville, Quartier ont des données
  const hasContactData = useMemo(() => {
    return conventions.some(c => c.contact && c.contact.trim() !== '' && c.contact !== 'N/A');
  }, [conventions]);

  const hasVilleData = useMemo(() => {
    return conventions.some(c => c.batiment?.ville && c.batiment.ville.trim() !== '' && c.batiment.ville !== 'Non renseignée');
  }, [conventions]);

  const hasQuartierData = useMemo(() => {
    return conventions.some(c => c.batiment?.quartier && c.batiment.quartier.trim() !== '' && c.batiment.quartier !== 'Non renseigné');
  }, [conventions]);

  const stats = {
    totalBatiments: statsFilteredBatiments.length,
    batimentsActifs: statsFilteredBatiments.filter(b => b.statut).length,
    totalUtilisateurs: statsFilteredUtilisateurs.length,
    utilisateursParPoste: {
      administrateur: statsFilteredUtilisateurs.filter(u => u.poste === 'administrateur').length,
      caissier: statsFilteredUtilisateurs.filter(u => u.poste === 'caissier').length,
      'opérateur de saisie': statsFilteredUtilisateurs.filter(u => u.poste === 'opérateur de saisie').length
    },
    totalConventions: statsFilteredConventions.length,
    conventionsConfirmees: statsFilteredConventions.filter(c => c.statutConv).length,
    conventionsEnAttente: statsFilteredConventions.filter(c => !c.statutConv).length,
    montantTotal: statsFilteredConventions.reduce((sum, c) => sum + (c.batiment?.montant || 0), 0),
    montantMoyen: statsFilteredConventions.length > 0 
      ? statsFilteredConventions.reduce((sum, c) => sum + (c.batiment?.montant || 0), 0) / statsFilteredConventions.length 
      : 0
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogoutModal(false);
    navigate('/');
  };

  // Fonctions pour les paramètres
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!adminProfile.nom || !adminProfile.email || !adminProfile.contact) {
      setMsg('Veuillez remplir tous les champs');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    // Validation du contact : doit contenir exactement 10 chiffres
    if (adminProfile.contact.length !== 10 || !/^\d{10}$/.test(adminProfile.contact)) {
      setMsg('Le contact doit contenir exactement 10 chiffres (ex: 0343284689)');
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_USERS_URL}/${adminProfile.matricule}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nom: adminProfile.nom,
          email: adminProfile.email,
          contact: adminProfile.contact
        })
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();
      if (result.status === 200) {
        setMsg('Profil mis à jour avec succès');
        // Mettre à jour le localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.nom = adminProfile.nom;
          user.email = adminProfile.email;
          localStorage.setItem('user', JSON.stringify(user));
        }
        await loadAdminProfile();
      } else {
        setMsg(result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMsg('Veuillez remplir tous les champs');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMsg('Le mot de passe doit contenir au moins 8 caractères');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMsg('Les mots de passe ne correspondent pas');
      setTimeout(() => setMsg(''), 2000);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // D'abord vérifier le mot de passe actuel en se connectant
      const loginResponse = await fetch(`${API_USERS_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matricule: adminProfile.matricule,
          poste: 'administrateur',
          mdp: passwordForm.currentPassword
        })
      });

      const loginResult = await loginResponse.json();
      if (loginResult.status !== 200) {
        setMsg('Mot de passe actuel incorrect');
        setTimeout(() => setMsg(''), 2000);
        setLoading(false);
        return;
      }

      // Mettre à jour le mot de passe
      const response = await fetch(`${API_USERS_URL}/${adminProfile.matricule}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mdp: passwordForm.newPassword
        })
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      const result = await response.json();
      if (result.status === 200) {
        setMsg('Mot de passe modifié avec succès');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        setMsg(result.message || 'Erreur lors de la modification du mot de passe');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMsg('Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }
      `}</style>
      {/* Overlay de chargement pendant la connexion */}
      {showLoginLoader && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          transition: 'opacity 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            color: '#fff'
          }}>
            <svg className="spinner" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2196f3' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"></path>
            </svg>
            <span style={{ fontSize: '18px', fontWeight: '600' }}>Connexion en cours...</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: currentTheme.colors.backgroundSecondary, transition: 'background-color 0.3s ease' }}>
      {/* NAVBAR LATÉRALE GAUCHE - FIXE */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '280px',
          height: '100vh',
          backgroundColor: currentTheme.colors.cardBackground,
          borderRight: `1px solid ${currentTheme.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          boxShadow: currentTheme.shadows.md,
          transition: 'all 0.3s ease',
          zIndex: 100,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Logo avec ton image */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{
            width: '180px',
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.15)' 
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            transition: 'all 0.3s ease',
            padding: '16px',
          }}>
            <img
              src={logoImage}
              alt="Logo Gestion Bâtiment Fianarantsoa"
              style={{
                width: '160px',
                height: 'auto',
                display: 'block',
                filter: isDark ? 'brightness(1.1)' : 'none',
                transition: 'filter 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Toggle du thème */}
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          backgroundColor: currentTheme.colors.backgroundTertiary, 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: `1px solid ${currentTheme.colors.borderLight}`
        }}>
          <span style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, fontWeight: '500' }}>
            {isDark ? '🌙 Mode sombre' : '☀️ Mode clair'}
          </span>
          <ThemeToggle />
        </div>

        {/* Menu */}
        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
            {[
              // Mettre 'Vue' en premier visuellement
              { icon: 'fa-chart-line', label: 'Vue', section: 'dashboard', active: activeSection === 'dashboard' },
              { icon: 'fa-building', label: 'Bâtiments', section: 'batiments', active: activeSection === 'batiments' },
              { icon: 'fa-users', label: 'Utilisateurs', section: 'utilisateurs', active: activeSection === 'utilisateurs' },
              { icon: 'fa-file-contract', label: 'Conventions', section: 'conventions', active: activeSection === 'conventions' },
              { icon: 'fa-sync-alt', label: 'Changements de statut', section: 'statuts', active: activeSection === 'statuts', badge: statusChanges?.data?.needsUpdate || 0 },
              { icon: 'fa-history', label: 'Historique', section: 'historique', active: activeSection === 'historique' },
              { icon: 'fa-exclamation-triangle', label: 'Demandes', section: 'demandes', active: activeSection === 'demandes', badge: demandesModification.filter(d => d.statut === 'en_attente').length + demandesCreation.filter(d => d.statut === 'en_attente').length + demandesReset.filter(d => d.statut === 'en_attente').length },
              { icon: 'fa-cog', label: 'Paramètres', section: 'parametres', active: activeSection === 'parametres' },
              { icon: 'fa-sign-out-alt', label: 'Déconnexion', section: 'logout', active: false },
            ].map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.section === 'batiments' || item.section === 'utilisateurs' || item.section === 'conventions' || item.section === 'statuts' || item.section === 'dashboard' || item.section === 'historique' || item.section === 'demandes' || item.section === 'parametres') {
                      setActiveSection(item.section);
                      setMsg('');
                      setShowUserForm(false);
                      if (item.section === 'statuts') {
                        loadStatusChanges();
                      }
                    } else if (item.section === 'logout') {
                      setShowLogoutModal(true);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    color: item.active ? currentTheme.colors.primary : currentTheme.colors.text,
                    backgroundColor: item.active ? (isDark ? 'rgba(77, 124, 254, 0.2)' : '#e7f3ff') : 'transparent',
                    fontWeight: item.active ? '600' : '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    border: item.active ? `1px solid ${currentTheme.colors.primary}` : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(77, 124, 254, 0.1)' : '#f0f8ff';
                      e.currentTarget.style.color = currentTheme.colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = currentTheme.colors.text;
                    }
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: '18px', color: item.active ? currentTheme.colors.primary : currentTheme.colors.textTertiary, lineHeight: 1, display: 'flex', alignItems: 'center' }}></i>
                  <span style={{ fontSize: '15px', lineHeight: 1, flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: item.badge > 9 ? '18px' : '14px',
                        height: '14px',
                        padding: 0,
                        borderRadius: item.badge > 9 ? '7px' : '50%',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.75)' : 'rgba(239, 68, 68, 0.7)',
                        color: 'white',
                        fontSize: '8px',
                        fontWeight: 600,
                        lineHeight: 1,
                        boxShadow: 'none',
                        position: 'relative',
                        flexShrink: 0,
                        marginLeft: 'auto'
                      }}
                      title={`${item.badge} demande(s) en attente`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Profil Admin */}
        <div
          style={{
            padding: '16px',
            backgroundColor: currentTheme.colors.backgroundTertiary,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: 'auto',
            border: `1px solid ${currentTheme.colors.borderLight}`,
            transition: 'all 0.3s ease',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: currentTheme.colors.primary,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontWeight: '600', color: currentTheme.colors.text, fontSize: '14px' }}>Admin</div>
            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary }}>admin@batiment.mg</div>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main style={{ 
        flex: 1, 
        marginLeft: '280px',
        padding: '32px', 
        backgroundColor: currentTheme.colors.backgroundSecondary, 
        transition: 'background-color 0.3s ease',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 24px', fontSize: '45px', color: currentTheme.colors.primary, fontWeight: '603', transition: 'color 0.3s ease' }}>
            {activeSection === 'batiments' && 'Gestion des Bâtiments'}
            {activeSection === 'utilisateurs' && 'Gestion des Utilisateurs'}
            {activeSection === 'conventions' && 'Gestion des Conventions'}
            {activeSection === 'dashboard' && 'Vue'}
            {activeSection === 'historique' && 'Historique des Actions'}
            {activeSection === 'parametres' && 'Paramètres'}
          </h1>

          {msg && (
            <div
              style={{
                margin: '0 0 20px',
                padding: '12px 16px',
                backgroundColor: msg.includes('Erreur') 
                  ? (isDark ? 'rgba(244, 67, 54, 0.2)' : '#fee')
                  : (isDark ? 'rgba(76, 175, 80, 0.2)' : '#d1f3e0'),
                color: msg.includes('Erreur') 
                  ? (isDark ? '#f44336' : '#c00')
                  : (isDark ? '#4caf50' : '#0d6b3a'),
                border: msg.includes('Erreur') 
                  ? `1px solid ${isDark ? 'rgba(244, 67, 54, 0.3)' : '#fcc'}`
                  : `1px solid ${isDark ? 'rgba(76, 175, 80, 0.3)' : '#a3e6c3'}`,
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              {msg}
            </div>
          )}

          {/* Section Bâtiments */}
          {activeSection === 'batiments' && (
            <>
              {/* Barre de recherche et filtres */}
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Rechercher par N° Bâtiment, Adresse ou Montant..."
                    value={searchBatiment}
                    onChange={e => setSearchBatiment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
                <div>
                  <select
                    value={filterStatut}
                    onChange={e => setFilterStatut(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text
                    }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="actif">Actifs</option>
                    <option value="inactif">Inactifs</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterStatutUtilisation}
                    onChange={e => setFilterStatutUtilisation(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text
                    }}
                  >
                    <option value="all">Tous (utilisation)</option>
                    <option value="libre">🟢 Libres</option>
                    <option value="alloue">🔴 Déjà alloués</option>
                    <option value="indisponible">⛔ Indisponibles</option>
                  </select>
                </div>
              </div>

              {/* Formulaire */}
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: currentTheme.shadows.md,
                  marginBottom: '32px',
                  border: `1px solid ${currentTheme.colors.borderLight}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <h2 style={{ 
                  margin: '0 0 20px', 
                  fontSize: '22px', 
                  color: currentTheme.colors.text, 
                  fontWeight: '600',
                  paddingBottom: '12px',
                  borderBottom: `2px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease'
                }}>
                  {editingId ? 'Modifier le bâtiment' : 'Ajouter un bâtiment'}
                </h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr 1fr' }}>

                    {/* Numéro Bâtiment */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Numéro Bâtiment *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.numBat}
                        onChange={e => setForm({ ...form, numBat: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxShadow: currentTheme.shadows.sm,
                      }}
                        onFocus={e => {
                          e.target.style.borderColor = '#90caf9';
                          e.target.style.boxShadow = '0 0 0 3px rgba(144, 202, 249, 0.3), 0 1px 3px rgba(0,0,0,0.1)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#e0e0e0';
                          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }}
                        disabled={loading || !!editingId}
                        required
                      />
                    </div>

                    {/* Adresse */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Adresse * (max 20 caractères)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={form.adresse}
                        onChange={e => setForm({ ...form, adresse: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxShadow: currentTheme.shadows.sm,
                      }}
                        onFocus={e => {
                          e.target.style.borderColor = '#90caf9';
                          e.target.style.boxShadow = '0 0 0 3px rgba(144, 202, 249, 0.3), 0 1px 3px rgba(0,0,0,0.1)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#e0e0e0';
                          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }}
                        disabled={loading}
                        required
                      />
                    </div>

                    {/* Montant */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Montant *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.montant}
                        onChange={e => setForm({ ...form, montant: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        boxShadow: currentTheme.shadows.sm,
                      }}
                        onFocus={e => {
                          e.target.style.borderColor = '#90caf9';
                          e.target.style.boxShadow = '0 0 0 3px rgba(144, 202, 249, 0.3), 0 1px 3px rgba(0,0,0,0.1)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#e0e0e0';
                          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Ville
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={form.ville}
                        onChange={e => setForm({ ...form, ville: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: currentTheme.shadows.sm,
                        }}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Quartier
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={form.quartier}
                        onChange={e => setForm({ ...form, quartier: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: currentTheme.shadows.sm,
                        }}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={form.latitude}
                        onChange={e => setForm({ ...form, latitude: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: currentTheme.shadows.sm,
                        }}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={form.longitude}
                        onChange={e => setForm({ ...form, longitude: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: currentTheme.shadows.sm,
                        }}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Statut et Motif d'inactivité */}
                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 2fr' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Statut *
                      </label>
                      <select
                        value={form.statut ? 'true' : 'false'}
                        onChange={e => {
                          const newStatut = e.target.value === 'true';
                          setForm({ 
                            ...form, 
                            statut: newStatut,
                            // Si le statut devient actif, effacer le motif
                            motifInactivite: newStatut ? '' : form.motifInactivite
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          cursor: 'pointer'
                        }}
                        disabled={loading}
                        required
                      >
                        <option value="true">Actif</option>
                        <option value="false">Inactif</option>
                      </select>
                    </div>

                    {!form.statut && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Motif d'inactivité {!form.statut && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        <textarea
                          value={form.motifInactivite}
                          onChange={e => setForm({ ...form, motifInactivite: e.target.value })}
                          placeholder="Ex: Réparation en cours, Démolition prévue..."
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: currentTheme.colors.cardBackground,
                            color: currentTheme.colors.text,
                            minHeight: '80px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                          disabled={loading}
                          required={!form.statut}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary }}>
                      Image {!editingId && '*'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundcolor: '#ececec',
                      }}
                      disabled={loading}
                      required={!editingId}
                    />
                    {imagePreview && (
                      <div style={{ marginTop: '10px' }}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            border: '1px solid #ddd'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '24px',
                    paddingTop: '0',
                    paddingBottom: '0',
                    backgroundColor: 'transparent',
                    width: 'auto',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                        minWidth: '120px'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#0056b3';
                          e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                          e.target.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#007bff';
                          e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                          e.target.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {loading ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Ajouter')}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={reset}
                        disabled={loading}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          minWidth: '120px'
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#5a6268';
                            e.target.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#6c757d';
                            e.target.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Liste des bâtiments en cartes */}
              {loading && batiments.length === 0 ? (
                <div
                  style={{
                    backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                    transition: 'all 0.3s ease',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: currentTheme.shadows.md,
                  }}
                >
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '16px' }}>Chargement...</div>
                </div>
              ) : batiments.length === 0 ? (
                <div
                  style={{
                    backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                    transition: 'all 0.3s ease',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: currentTheme.shadows.md,
                  }}
                >
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '16px' }}>Aucun bâtiment enregistré</div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {filteredBatiments.map(b => (
                    <div
                      key={b.numBat}
                      style={{
                        backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                    transition: 'all 0.3s ease',
                        borderRadius: '12px',
                        boxShadow: currentTheme.shadows.md,
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onClick={() => openBatimentDetails(b)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                      }}
                    >
                      {/* Image */}
                      <div
                        style={{
                          width: '100%',
                          height: '200px',
                          backgroundColor: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {b.image ? (
                          <img
                            src={`data:image/jpeg;base64,${b.image}`}
                            alt={`Bâtiment ${b.numBat}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div style={{
                            color: currentTheme.colors.textTertiary,
                            fontSize: '14px',
                            textAlign: 'center',
                          }}>
                            Pas d'image
                          </div>
                        )}
                      </div>

                      {/* Corps de la carte */}
                      <div style={{ padding: '20px' }}>
                        {/* Numéro (Titre) */}
                        <h5
                          style={{
                            margin: '0 0 12px',
                            fontSize: '20px',
                            fontWeight: '600',
                            color: currentTheme.colors.text,
                          }}
                        >
                          Cité n° {b.numBat}
                        </h5>

                        {/* Adresse */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: currentTheme.colors.textTertiary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fas fa-map-marker-alt" style={{ color: '#007bff' }}></i>
                          <span>{b.adresse}</span>
                        </p>

                        {/* Montant */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: currentTheme.colors.textTertiary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fas fa-dollar-sign" style={{ color: '#28a745' }}></i>
                          <span style={{ fontWeight: '600', color: currentTheme.colors.text }}>
                            {b.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ar
                          </span>
                        </p>

                        {/* Statut d'utilisation */}
                        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {/* Statut technique (Actif/Inactif) */}
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: b.statut ? '#d1f3e0' : '#ffe6e6',
                              color: b.statut ? '#0d6b3a' : '#dc3545',
                            }}
                          >
                            {b.statut ? '✓ Actif' : '✗ Inactif'}
                          </span>
                          
                          {/* Statut d'utilisation (Libre/Alloué/Indisponible) */}
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: b.statutUtilisation === 'indisponible' || b.estIndisponible 
                                ? '#fee2e2' 
                                : (b.statutUtilisation === 'libre' || b.estLibre) 
                                  ? '#e0f2fe' 
                                  : '#fef3c7',
                              color: b.statutUtilisation === 'indisponible' || b.estIndisponible 
                                ? '#991b1b' 
                                : (b.statutUtilisation === 'libre' || b.estLibre) 
                                  ? '#0369a1' 
                                  : '#b45309',
                            }}
                          >
                            {b.statutUtilisation === 'indisponible' || b.estIndisponible 
                              ? '⛔ Indisponible' 
                              : (b.statutUtilisation === 'libre' || b.estLibre) 
                                ? '🟢 Libre' 
                                : '🔴 Déjà alloué'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(b);
                            }}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1,
                              transition: 'background-color 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) e.currentTarget.style.backgroundColor = '#0056b3';
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) e.currentTarget.style.backgroundColor = '#007bff';
                            }}
                          >
                            <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                            Modifier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(b.numBat);
                            }}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1,
                              transition: 'background-color 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) e.currentTarget.style.backgroundColor = '#c82333';
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) e.currentTarget.style.backgroundColor = '#dc3545';
                            }}
                          >
                            <i className="fas fa-trash" style={{ marginRight: '6px' }}></i>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Section Utilisateurs */}
          {activeSection === 'utilisateurs' && (
            <>
              {/* Barre de recherche et filtres */}
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Rechercher par Matricule, Nom, Email, Contact ou Poste..."
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
                <div>
                  <select
                    value={filterPoste}
                    onChange={e => setFilterPoste(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text
                    }}
                  >
                    <option value="all">Tous les postes</option>
                    <option value="administrateur">Administrateur</option>
                    <option value="caissier">Caissier</option>
                    <option value="opérateur de saisie">Opérateur de saisie</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    resetUserForm();
                    setShowUserForm(true);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                    minWidth: '120px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0056b3';
                    e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#007bff';
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fas fa-plus"></i>
                  Nouvel utilisateur
                </button>
              </div>

              {/* Formulaire utilisateur */}
              {showUserForm && (
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: currentTheme.shadows.md,
                  marginBottom: '32px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                }}
              >
                  <h2 style={{ 
                    margin: '0 0 20px', 
                    fontSize: '22px', 
                    color: currentTheme.colors.text, 
                    fontWeight: '600',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #f0f0f0'
                  }}>
                    {editingUserId ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
                  </h2>
                  <form onSubmit={handleUserSubmit} style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Matricule *
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={userForm.matricule}
                          onChange={e => setUserForm({ ...userForm, matricule: e.target.value })}
                          disabled={!!editingUserId}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: editingUserId ? currentTheme.colors.backgroundTertiary : currentTheme.colors.cardBackground,
                            color: editingUserId ? currentTheme.colors.textTertiary : currentTheme.colors.text,
                            cursor: editingUserId ? 'not-allowed' : 'text'
                          }}
                          required
                        />
                        {editingUserId && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: currentTheme.colors.textTertiary }}>
                            Le matricule ne peut pas être modifié
                          </p>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Nom complet *
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          value={userForm.nom}
                          onChange={e => setUserForm({ ...userForm, nom: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Contact *
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          value={userForm.contact}
                          onChange={e => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setUserForm({ ...userForm, contact: value });
                          }}
                          placeholder="0343284689"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Email *
                        </label>
                        <input
                          type="email"
                          maxLength={30}
                          value={userForm.email}
                          onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Poste *
                        </label>
                        <select
                          value={userForm.poste}
                          onChange={e => setUserForm({ ...userForm, poste: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                          required
                        >
                          <option value="caissier">Caissier</option>
                          <option value="administrateur">Administrateur</option>
                          <option value="opérateur de saisie">Opérateur de saisie</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Mot de passe {!editingUserId && '*'}
                        </label>
                        <input
                          type="password"
                          value={userForm.mdp}
                          onChange={e => setUserForm({ ...userForm, mdp: e.target.value })}
                          placeholder={editingUserId ? 'Laisser vide pour ne pas modifier' : ''}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                          required={!editingUserId}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Numéro Convention
                        </label>
                        <input
                          type="number"
                          value={userForm.numConv}
                          onChange={e => setUserForm({ ...userForm, numConv: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: '24px',
                      paddingTop: '0',
                      paddingBottom: '0',
                      backgroundColor: 'transparent',
                      width: 'auto',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }}>
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1,
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                          minWidth: '120px'
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#0056b3';
                            e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                            e.target.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#007bff';
                            e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                            e.target.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {loading ? 'Enregistrement...' : (editingUserId ? 'Mettre à jour' : 'Créer')}
                      </button>
                      <button
                        type="button"
                        onClick={resetUserForm}
                        disabled={loading}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          minWidth: '120px'
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#5a6268';
                            e.target.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.target.style.backgroundColor = '#6c757d';
                            e.target.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading && utilisateurs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                    transition: 'all 0.3s ease',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: currentTheme.shadows.md,
                  }}
                >
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '16px' }}>Chargement...</div>
                </div>
              ) : utilisateurs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                    transition: 'all 0.3s ease',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: currentTheme.shadows.md,
                  }}
                >
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '16px' }}>Aucun utilisateur enregistré</div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {filteredUtilisateurs.map(u => (
                    <div
                      key={u.matricule}
                      style={{
                        backgroundColor: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '12px',
                        boxShadow: currentTheme.shadows.md,
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                      }}
                    >
                      {/* En-tête de la carte */}
                      <div
                        style={{
                          width: '100%',
                          height: '120px',
                          background: 'linear-gradient(135deg, #007bff, #0056b3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          color: 'white',
                          padding: '20px',
                        }}
                      >
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                          }}
                        >
                          {u.nom ? u.nom.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>Utilisateur</div>
                      </div>

                      {/* Corps de la carte */}
                      <div style={{ padding: '20px' }}>
                        {/* Nom */}
                        <h5
                          style={{
                            margin: '0 0 16px',
                            fontSize: '20px',
                            fontWeight: '600',
                            color: currentTheme.colors.text,
                          }}
                        >
                          {u.nom}
                        </h5>

                        {/* Matricule */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: currentTheme.colors.textTertiary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fas fa-id-card" style={{ color: '#007bff', width: '20px' }}></i>
                          <span><strong>Matricule:</strong> {u.matricule}</span>
                        </p>

                        {/* Email */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: currentTheme.colors.textTertiary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fas fa-envelope" style={{ color: '#28a745', width: '20px' }}></i>
                          <span>{u.email}</span>
                        </p>

                        {/* Contact */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: currentTheme.colors.textTertiary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fas fa-phone" style={{ color: '#dc3545', width: '20px' }}></i>
                          <span>{u.contact}</span>
                        </p>

                        {/* Poste */}
                        <div style={{ marginBottom: '12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: '#e7f3ff',
                              color: currentTheme.colors.primary,
                            }}
                          >
                            <i className="fas fa-briefcase"></i>
                            {u.poste.charAt(0).toUpperCase() + u.poste.slice(1)}
                          </span>
                        </div>

                        {/* Numéro Convention (si présent) */}
                        {u.numConv && (
                          <p
                            style={{
                              margin: '0 0 16px',
                              fontSize: '14px',
                              color: currentTheme.colors.textTertiary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <i className="fas fa-file-contract" style={{ color: '#ffc107', width: '20px' }}></i>
                            <span><strong>Conv.:</strong> {u.numConv}</span>
                          </p>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={() => onEditUser(u)}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                            Modifier
                          </button>
                          <button
                            onClick={() => onDeleteUser(u.matricule)}
                            disabled={loading}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            <i className="fas fa-trash" style={{ marginRight: '6px' }}></i>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Section Conventions */}
          {activeSection === 'conventions' && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ 
                  margin: '0 0 8px', 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: '#1f2937',
                  lineHeight: 1.2
                }}>
                  Tableau de bord
                </h1>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  Vue d'ensemble de votre activité de conventions
                </p>
              </div>

              {/* Cartes de Statistiques - 4 cartes */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px', 
                marginBottom: '32px' 
              }}>
                {/* Carte Total */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <i className="fas fa-file-contract" style={{ fontSize: '20px', color: '#3b82f6', lineHeight: 1 }}></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>Conventions totales</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937', textAlign: 'center' }}>{conventionStats.total}</div>
                </div>

                {/* Carte Confirmées */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <i className="fas fa-check-circle" style={{ fontSize: '20px', color: '#22c55e', lineHeight: '48px', width: '20px', textAlign: 'center' }}></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>Conventions confirmées</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937', textAlign: 'center' }}>{conventionStats.confirmees}</div>
                </div>

                {/* Carte En Attente */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <i className="fas fa-clock" style={{ fontSize: '20px', color: '#f59e0b', lineHeight: 1 }}></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>En attente</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937', textAlign: 'center' }}>{conventionStats.enAttente}</div>
                </div>

                {/* Carte Montant Total */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#f3e8ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}>
                      <i className="fas fa-coins" style={{ fontSize: '20px', color: '#a855f7', lineHeight: 1 }}></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>Montant total</div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#1f2937', textAlign: 'center' }}>
                    {conventionStats.montantTotal.toLocaleString('fr-FR')} Ar
                  </div>
                </div>
              </div>

              {/* Controls: compact area (export moved into table header) */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                {/* Small helper text or future filters can go here */}
                <div style={{ color: currentTheme.colors.textTertiary, fontSize: '13px' }}>Conventions</div>
              </div>

              {msg && (
                <div style={{ background: '#d4edda', color: '#155724', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', display: 'inline-flex', fontSize: '14px' }}>
                  {msg}
                </div>
              )}

              {/* Tableau Conventions récentes */}
              <div style={{
                background: currentTheme.colors.cardBackground,
                border: `1px solid ${currentTheme.colors.border}`,
                transition: 'all 0.3s ease',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}>
                {/* Titre du tableau */}
                <div style={{ 
                  padding: '20px 24px', 
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: 600, 
                    color: '#1f2937' 
                  }}>
                    Conventions récentes
                  </h2>
                  {/* Barre de recherche + Export */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <i className="fas fa-search" style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                        fontSize: '14px',
                      }}></i>
                      <input
                        type="search"
                        placeholder="Rechercher par N° Convention, Client, Date ou Montant..."
                        value={searchConventions}
                        onChange={(e) => {
                          const q = e.target.value;
                          setSearchConventions(q);
                          loadConventions(q);
                        }}
                        style={{
                          padding: '8px 12px 8px 36px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          width: '300px',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = currentTheme.colors.primary;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = currentTheme.colors.border;
                        }}
                      />
                    </div>
                    <button
                      onClick={exportConventions}
                      title="Exporter les conventions (CSV)"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        background: currentTheme.colors.cardBackground,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = currentTheme.colors.cardBackground;
                      }}
                    >
                      <i className="fas fa-download" style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}></i>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: currentTheme.colors.text }}>Exporter</span>
                    </button>
                  </div>
                </div>

                {loading && conventions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Chargement des conventions...</div>
                  </div>
                ) : conventions.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#9ca3af'
                  }}>
                    <i className="fas fa-file-contract" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
                    <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Aucune convention trouvée</p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>Aucune convention disponible</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ 
                        background: currentTheme.colors.backgroundTertiary,
                        borderBottom: `1px solid ${currentTheme.colors.border}`
                      }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>N° Convention</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '18%' }}>Client</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Ville</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, fontSize: '13px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Quartier</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Montant</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Statut</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Date</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '26%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conventions.map((c, index) => (
                        <tr 
                          key={c.numConv}
                          style={{
                            borderBottom: index < conventions.length - 1 ? `1px solid ${currentTheme.colors.border}` : 'none',
                            transition: 'background 0.2s ease',
                            cursor: 'pointer',
                            background: currentTheme.colors.cardBackground
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = currentTheme.colors.cardBackground;
                          }}
                          onClick={() => setSelectedConvention(c)}
                        >
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                            {formatConventionNumber(c)}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {c.locataire?.nomcli || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {c.batiment?.ville && c.batiment.ville.trim() !== '' && c.batiment.ville.toLowerCase() !== 'non renseignée' ? c.batiment.ville : 'Fianarantsoa'}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {c.batiment?.quartier && c.batiment.quartier.trim() !== '' && c.batiment.quartier.toLowerCase() !== 'non renseigné' ? c.batiment.quartier : 'Zone Est'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                            {Number(c.batiment?.montant || 0).toLocaleString('fr-FR')} Ar
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: c.statutConv ? '#dcfce7' : '#fef3c7',
                              color: c.statutConv ? '#166534' : '#92400e'
                            }}>
                              {c.statutConv ? 'Confirmé' : 'En attente'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                            {new Date(c.dateConv).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedConvention(c);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#6b7280',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6';
                                  e.currentTarget.style.color = '#007bff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.color = '#6b7280';
                                }}
                                title="Voir"
                              >
                                <i className="fas fa-eye" style={{ fontSize: '16px' }}></i>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!c.statutConv) {
                                    setMsg('Impossible de supprimer : cette convention est encore en attente.');
                                    setTimeout(() => setMsg(''), 3000);
                                    return;
                                  }
                                  handleDeleteConvention(c.numConv);
                                }}
                                disabled={!c.statutConv}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: !c.statutConv ? '#9ca3af' : '#dc3545',
                                  cursor: !c.statutConv ? 'not-allowed' : 'pointer',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s ease',
                                  opacity: !c.statutConv ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => {
                                  if (c.statutConv) {
                                    e.currentTarget.style.background = isDark ? 'rgba(220, 53, 69, 0.2)' : '#fee';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'none';
                                }}
                                title={!c.statutConv ? "Impossible de supprimer : convention en attente" : "Supprimer"}
                              >
                                <i className="fas fa-trash-alt" style={{ fontSize: '16px' }}></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Modal Détails Convention */}
          {selectedConvention && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={() => setSelectedConvention(null)}
            >
              <div
                style={{
                  background: currentTheme.colors.cardBackground,
                  borderRadius: '16px',
                  padding: '32px',
                  width: '90%',
                  maxWidth: '800px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${currentTheme.colors.border}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: currentTheme.colors.text }}>
                Convention {formatConventionNumber(selectedConvention)}
              </h2>
                  <button
                    onClick={() => setSelectedConvention(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: currentTheme.colors.textTertiary,
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '24px',
                      lineHeight: 1,
                      transition: 'all 0.2s ease',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                      e.currentTarget.style.color = currentTheme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = currentTheme.colors.textTertiary;
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Détails */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px' }}>
                  {/* Bâtiment */}
                  <div 
                    style={{
                      padding: '20px',
                      background: currentTheme.colors.backgroundTertiary,
                      borderRadius: '12px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      if (selectedConvention.batiment) {
                        openBatimentDetails(selectedConvention.batiment);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = currentTheme.colors.backgroundSecondary;
                      e.currentTarget.style.borderColor = currentTheme.colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                      e.currentTarget.style.borderColor = currentTheme.colors.border;
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: currentTheme.colors.primary }}>
                        Bâtiment
                      </h3>
                      <i className="fas fa-external-link-alt" style={{ fontSize: '12px', color: currentTheme.colors.primary, opacity: 0.7 }}></i>
                    </div>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: currentTheme.colors.text, lineHeight: 1.6 }}>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>N° :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedConvention.numBat}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedConvention.batiment?.adresse || 'N/A'}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Ville :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedConvention.batiment?.ville || 'Fianarantsoa'}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Quartier :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedConvention.batiment?.quartier || 'Zone Est'}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Loyer :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                          {Number(selectedConvention.batiment?.montant || 0).toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                      {selectedConvention.batiment?.superficie && (
                        <div>
                          <strong style={{ color: currentTheme.colors.textSecondary }}>Superficie :</strong>{' '}
                          <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                            {Number(selectedConvention.batiment.superficie).toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} m²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Locataire */}
                  <div style={{
                    padding: '20px',
                    background: currentTheme.colors.backgroundTertiary,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.primary }}>
                      Locataire
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: currentTheme.colors.text, lineHeight: 1.6 }}>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Nom :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedConvention.locataire?.nomcli || 'N/A'}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Né(e) :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {selectedConvention.locataire?.datenais || 'N/A'} à {selectedConvention.locataire?.lieunais || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>CIN :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {selectedConvention.locataire?.cin ? selectedConvention.locataire.cin.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ') : 'N/A'} {selectedConvention.locataire?.delivcin ? `(délivrée le ${selectedConvention.locataire.delivcin})` : ''}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Activité :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedConvention.locataire?.activite || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: `1px solid ${currentTheme.colors.border}` }}>
                  <button
                    onClick={() => {
                      printConvention(selectedConvention);
                    }}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(107, 114, 128, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#4b5563';
                      e.target.style.boxShadow = '0 4px 8px rgba(107, 114, 128, 0.3)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#6b7280';
                      e.target.style.boxShadow = '0 2px 4px rgba(107, 114, 128, 0.2)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <i className="fas fa-print" style={{ marginRight: '8px' }}></i>
                    Imprimer
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedConvention.statutConv) {
                        setMsg('Impossible de supprimer : cette convention est encore en attente.');
                        setTimeout(() => setMsg(''), 3000);
                        return;
                      }
                      handleDeleteConvention(selectedConvention.numConv);
                      setSelectedConvention(null);
                    }}
                    disabled={!selectedConvention.statutConv}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: !selectedConvention.statutConv ? '#9ca3af' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: !selectedConvention.statutConv ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: !selectedConvention.statutConv ? 'none' : '0 2px 4px rgba(220, 53, 69, 0.2)',
                      opacity: !selectedConvention.statutConv ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#c82333';
                      e.target.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.3)';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#dc3545';
                      e.target.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.2)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <i className="fas fa-trash-alt" style={{ marginRight: '8px' }}></i>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section Dashboard Moderne */}
          {activeSection === 'dashboard' && (
            <div>
              {/* Header moderne style dashboard */}
              <div style={{ 
                marginBottom: '32px'
              }}>
                <h1 style={{ 
                  margin: '0 0 8px', 
                  fontSize: '32px', 
                  fontWeight: 700, 
                  color: currentTheme.colors.text,
                  lineHeight: 1.2
                }}>
                  Hello, {(() => {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                      try {
                        const user = JSON.parse(userStr);
                        return user.nom || 'Administrateur';
                      } catch (e) {
                        return 'Administrateur';
                      }
                    }
                    return 'Administrateur';
                  })()}
                </h1>
                <p style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  color: currentTheme.colors.textTertiary,
                  fontWeight: 400
                }}>
                  This is your Dashboard
                </p>
              </div>

              {/* KPIs avec mini donut charts - Style moderne */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px', 
                marginBottom: '32px' 
              }}>
                {/* KPI Conventions */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500 }}>
                      Conventions Totales
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, marginBottom: '4px' }}>
                      {stats.totalConventions}
                    </div>
                    <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                      <i className="fas fa-arrow-up" style={{ marginRight: '4px' }}></i>
                      +{stats.conventionsConfirmees} confirmées
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                      <circle cx="18" cy="18" r="16" fill="none" stroke={currentTheme.colors.backgroundTertiary} strokeWidth="3" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="none" 
                        stroke="#22c55e" 
                        strokeWidth="3" 
                        strokeDasharray={`${stats.totalConventions > 0 ? (stats.conventionsConfirmees / stats.totalConventions) * 100 : 0} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: currentTheme.colors.text,
                      textAlign: 'center',
                      lineHeight: 1,
                      width: '100%'
                    }}>
                      {stats.totalConventions > 0 ? Math.round((stats.conventionsConfirmees / stats.totalConventions) * 100) : 0}%
                    </div>
                  </div>
                </div>

                {/* KPI Bâtiments */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500 }}>
                      Bâtiments Actifs
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, marginBottom: '4px' }}>
                      {stats.batimentsActifs}
                    </div>
                    <div style={{ fontSize: '12px', color: '#007bff', fontWeight: 600 }}>
                      <i className="fas fa-arrow-up" style={{ marginRight: '4px' }}></i>
                      {stats.totalBatiments} total
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                      <circle cx="18" cy="18" r="16" fill="none" stroke={currentTheme.colors.backgroundTertiary} strokeWidth="3" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="none" 
                        stroke="#007bff" 
                        strokeWidth="3" 
                        strokeDasharray={`${stats.totalBatiments > 0 ? (stats.batimentsActifs / stats.totalBatiments) * 100 : 0} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: currentTheme.colors.text,
                      textAlign: 'center',
                      lineHeight: 1,
                      width: '100%'
                    }}>
                      {stats.totalBatiments > 0 ? Math.round((stats.batimentsActifs / stats.totalBatiments) * 100) : 0}%
                    </div>
                  </div>
                </div>

                {/* KPI Utilisateurs */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500 }}>
                      Utilisateurs
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, marginBottom: '4px' }}>
                      {stats.totalUtilisateurs}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600 }}>
                      <i className="fas fa-users" style={{ marginRight: '4px' }}></i>
                      Actifs
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                      <circle cx="18" cy="18" r="16" fill="none" stroke={currentTheme.colors.backgroundTertiary} strokeWidth="3" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="3" 
                        strokeDasharray="75 100"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: currentTheme.colors.text,
                      textAlign: 'center',
                      lineHeight: 1,
                      width: '100%'
                    }}>
                      75%
                    </div>
                  </div>
                </div>

                {/* KPI Montant Total */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500 }}>
                      Montant Total
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: currentTheme.colors.text, marginBottom: '4px' }}>
                      {(stats.montantTotal / 1000000).toFixed(1)}M Ar
                    </div>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                      <i className="fas fa-coins" style={{ marginRight: '4px' }}></i>
                      {Math.round(stats.montantMoyen).toLocaleString('fr-FR')} Ar moyen
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                      <circle cx="18" cy="18" r="16" fill="none" stroke={currentTheme.colors.backgroundTertiary} strokeWidth="3" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="none" 
                        stroke="#f59e0b" 
                        strokeWidth="3" 
                        strokeDasharray={`${stats.totalConventions > 0 ? (stats.conventionsConfirmees / stats.totalConventions) * 100 : 0} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: currentTheme.colors.text,
                      textAlign: 'center',
                      lineHeight: 1,
                      width: '100%'
                    }}>
                      {stats.totalConventions > 0 ? Math.round((stats.conventionsConfirmees / stats.totalConventions) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphiques principaux - Style moderne */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
                marginBottom: '32px'
              }}>
                {/* Graphique en barres - Revenus mensuels */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <h3 style={{ 
                    margin: '0 0 24px', 
                    fontSize: '18px', 
                    fontWeight: 600,
                    color: currentTheme.colors.text 
                  }}>
                    Revenus Mensuels
                  </h3>
                  <div style={{ height: '280px', position: 'relative' }}>
                    {(() => {
                      // Calculer les revenus par mois pour les 6 derniers mois
                      const now = new Date();
                      const monthlyData = [];
                      for (let i = 5; i >= 0; i--) {
                        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
                        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
                        
                        const convsDuMois = statsFilteredConventions.filter(c => {
                          const convDate = new Date(c.dateConv || c.createdAt);
                          return convDate >= monthStart && convDate <= monthEnd;
                        });
                        
                        const montantMois = convsDuMois.reduce((sum, c) => sum + (c.batiment?.montant || 0), 0);
                        monthlyData.push({
                          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
                          amount: montantMois
                        });
                      }
                      
                      const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1);
                      
                      return (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '8px', paddingBottom: '30px' }}>
                          {monthlyData.map((data, idx) => {
                            const height = (data.amount / maxAmount) * 100;
                            return (
                              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ 
                                  width: '100%',
                                  height: `${height}%`,
                                  minHeight: '4px',
                                  background: `linear-gradient(180deg, #007bff 0%, #0056b3 100%)`,
                                  borderRadius: '8px 8px 0 0',
                                  position: 'relative',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '0.8';
                                  e.currentTarget.style.transform = 'scaleY(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.transform = 'scaleY(1)';
                                }}
                                >
                                  <div style={{
                                    position: 'absolute',
                                    top: '-24px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: currentTheme.colors.text,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {(data.amount / 1000).toFixed(0)}K
                                  </div>
                                </div>
                                <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, fontWeight: 500 }}>
                                  {data.month}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Graphique Radar - Répartition des activités */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <h3 style={{ 
                    margin: '0 0 24px', 
                    fontSize: '18px', 
                    fontWeight: 600,
                    color: currentTheme.colors.text 
                  }}>
                    Répartition des Activités
                  </h3>
                  <div style={{ height: '280px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => {
                      const categories = [
                        { name: 'Bâtiments', value: stats.totalBatiments, max: Math.max(stats.totalBatiments, stats.totalConventions, stats.totalUtilisateurs, 1) },
                        { name: 'Conventions', value: stats.totalConventions, max: Math.max(stats.totalBatiments, stats.totalConventions, stats.totalUtilisateurs, 1) },
                        { name: 'Utilisateurs', value: stats.totalUtilisateurs, max: Math.max(stats.totalBatiments, stats.totalConventions, stats.totalUtilisateurs, 1) },
                        { name: 'Confirmées', value: stats.conventionsConfirmees, max: Math.max(stats.totalBatiments, stats.totalConventions, stats.totalUtilisateurs, 1) },
                        { name: 'En Attente', value: stats.conventionsEnAttente, max: Math.max(stats.totalBatiments, stats.totalConventions, stats.totalUtilisateurs, 1) },
                        { name: 'Actifs', value: stats.batimentsActifs, max: Math.max(stats.totalBatiments, stats.totalConventions, stats.totalUtilisateurs, 1) }
                      ];
                      
                      const centerX = 150;
                      const centerY = 150;
                      const radius = 100;
                      const angleStep = (2 * Math.PI) / categories.length;
                      
                      const points = categories.map((cat, idx) => {
                        const angle = idx * angleStep - Math.PI / 2;
                        const value = (cat.value / cat.max) * radius;
                        return {
                          x: centerX + Math.cos(angle) * value,
                          y: centerY + Math.sin(angle) * value,
                          label: cat.name,
                          value: cat.value,
                          angle: angle
                        };
                      });
                      
                      const pathData = points.map((p, idx) => 
                        `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                      ).join(' ') + ' Z';
                      
                      const axisPoints = categories.map((cat, idx) => {
                        const angle = idx * angleStep - Math.PI / 2;
                        return {
                          x: centerX + Math.cos(angle) * radius,
                          y: centerY + Math.sin(angle) * radius,
                          label: cat.name,
                          angle: angle
                        };
                      });
                      
                      return (
                        <svg width="300" height="300" viewBox="0 0 300 300" style={{ overflow: 'visible' }}>
                          {/* Grille */}
                          {[0.25, 0.5, 0.75, 1].map(scale => (
                            <circle
                              key={scale}
                              cx={centerX}
                              cy={centerY}
                              r={radius * scale}
                              fill="none"
                              stroke={currentTheme.colors.border}
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          ))}
                          
                          {/* Axes */}
                          {axisPoints.map((ap, idx) => (
                            <line
                              key={idx}
                              x1={centerX}
                              y1={centerY}
                              x2={ap.x}
                              y2={ap.y}
                              stroke={currentTheme.colors.border}
                              strokeWidth="1"
                              opacity="0.3"
                            />
                          ))}
                          
                          {/* Zone remplie */}
                          <path
                            d={pathData}
                            fill="rgba(0, 123, 255, 0.2)"
                            stroke="#007bff"
                            strokeWidth="2"
                          />
                          
                          {/* Points */}
                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill="#007bff"
                                stroke="#fff"
                                strokeWidth="2"
                              />
                              <text
                                x={centerX + Math.cos(p.angle) * (radius + 20)}
                                y={centerY + Math.sin(p.angle) * (radius + 20)}
                                textAnchor="middle"
                                fontSize="11"
                                fill={currentTheme.colors.text}
                                fontWeight="500"
                              >
                                {p.label}
                              </text>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Graphique linéaire et Donut Chart */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px',
                marginBottom: '32px'
              }}>
                {/* Graphique linéaire - Statistics */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: currentTheme.colors.text 
                    }}>
                      Statistics
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={statsPeriodFilter}
                        onChange={(e) => setStatsPeriodFilter(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          background: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option>Toutes</option>
                        <option>Ce mois</option>
                        <option>Ce trimestre</option>
                        <option>Cette année</option>
                      </select>
                      <select
                        value={evolutionPeriod}
                        onChange={(e) => setEvolutionPeriod(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          background: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="mois">Mois</option>
                        <option value="semaine">Semaine</option>
                        <option value="jour">Jour</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ 
                    height: '280px',
                    position: 'relative',
                    padding: '20px 20px 50px 20px',
                    overflow: 'hidden'
                  }}>
                    {(() => {
                      const getEvolutionData = () => {
                        const now = new Date();
                        let labels = [];
                        let data = [];

                        switch (evolutionPeriod) {
                          case 'jour':
                            for (let i = 6; i >= 0; i--) {
                              const date = new Date(now);
                              date.setDate(date.getDate() - i);
                              const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                              const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                              
                              const convsDuJour = statsFilteredConventions.filter(c => {
                                const convDate = new Date(c.dateConv || c.createdAt);
                                return convDate >= dayStart && convDate <= dayEnd;
                              });
                              
                              const count = convsDuJour.length;
                              labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
                              data.push(count);
                            }
                            break;

                          case 'semaine':
                            for (let i = 5; i >= 0; i--) {
                              const date = new Date(now);
                              date.setDate(date.getDate() - (i * 7));
                              const weekStart = new Date(date);
                              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                              weekStart.setHours(0, 0, 0, 0);
                              const weekEnd = new Date(weekStart);
                              weekEnd.setDate(weekEnd.getDate() + 6);
                              weekEnd.setHours(23, 59, 59, 999);
                              
                              const convsDeLaSemaine = statsFilteredConventions.filter(c => {
                                const convDate = new Date(c.dateConv || c.createdAt);
                                return convDate >= weekStart && convDate <= weekEnd;
                              });
                              
                              const count = convsDeLaSemaine.length;
                              labels.push(`S${i + 1}`);
                              data.push(count);
                            }
                            break;

                          case 'mois':
                            for (let i = 5; i >= 0; i--) {
                              const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                              const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
                              const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
                              
                              const convsDuMois = statsFilteredConventions.filter(c => {
                                const convDate = new Date(c.dateConv || c.createdAt);
                                return convDate >= monthStart && convDate <= monthEnd;
                              });
                              
                              const count = convsDuMois.length;
                              labels.push(date.toLocaleDateString('fr-FR', { month: 'short' }));
                              data.push(count);
                            }
                            break;
                        }

                        return { labels, data };
                      };

                      const { labels, data } = getEvolutionData();
                      const maxValue = Math.max(...data.filter(d => d > 0), 1);
                      const minValue = Math.min(...data.filter(d => d > 0), 0);
                      const range = maxValue - minValue || 1;
                      
                      if (statsFilteredConventions.length === 0) {
                        return (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: currentTheme.colors.textTertiary
                          }}>
                            <i className="fas fa-chart-line" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                            <p style={{ margin: 0 }}>Aucune donnée disponible</p>
                          </div>
                        );
                      }

                      // Ajuster les points pour éviter les débordements
                      const chartPadding = 5; // Padding pour éviter que les points touchent les bords
                      const points = data.map((value, idx) => {
                        const x = chartPadding + (idx / (labels.length - 1 || 1)) * (100 - 2 * chartPadding);
                        const y = chartPadding + (100 - 2 * chartPadding) - ((value - minValue) / range) * (100 - 2 * chartPadding);
                        return { x, y, value, label: labels[idx] };
                      });

                      const pathData = points.map((p, idx) => {
                        return `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
                      }).join(' ');

                      const areaPath = points.length > 0 
                        ? `${pathData} L ${points[points.length - 1].x} ${100 - chartPadding} L ${points[0].x} ${100 - chartPadding} Z`
                        : '';

                      return (
                        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                          {/* Axe Y avec valeurs */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: '40px',
                            width: '45px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            paddingRight: '8px',
                            fontSize: '10px',
                            color: currentTheme.colors.textTertiary,
                            zIndex: 1
                          }}>
                            <span>{maxValue}</span>
                            <span>{Math.round(maxValue * 0.5)}</span>
                            <span>0</span>
                          </div>

                          {/* Graphique SVG */}
                          <svg 
                            width="calc(100% - 45px)"
                            height="calc(100% - 40px)"
                            viewBox="0 0 100 100" 
                            preserveAspectRatio="none"
                            style={{ 
                              marginLeft: '45px',
                              marginTop: 0,
                              marginBottom: '40px',
                              overflow: 'hidden',
                              display: 'block'
                            }}
                          >
                            {/* Zone remplie sous la ligne */}
                            {areaPath && (
                              <path
                                d={areaPath}
                                fill="url(#gradientAreaDashboard)"
                                opacity="0.2"
                              />
                            )}
                            
                            {/* Ligne principale */}
                            {pathData && (
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#007bff"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Points sur la ligne */}
                            {points.map((point, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r="3.5"
                                  fill="#007bff"
                                  stroke="#fff"
                                  strokeWidth="2"
                                />
                              </g>
                            ))}

                            {/* Gradient pour la zone remplie */}
                            <defs>
                              <linearGradient id="gradientAreaDashboard" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#007bff" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#007bff" stopOpacity="0.05" />
                              </linearGradient>
                            </defs>
                          </svg>

                          {/* Labels en bas */}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: '45px',
                            right: 0,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: currentTheme.colors.textTertiary,
                            paddingTop: '8px',
                            height: '40px',
                            alignItems: 'flex-start'
                          }}>
                            {labels.map((label, idx) => (
                              <span key={idx} style={{ flex: 1, textAlign: 'center' }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Donut Chart - Revenue Per Month */}
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <h3 style={{ 
                    margin: '0 0 24px', 
                    fontSize: '18px', 
                    fontWeight: 600,
                    color: currentTheme.colors.text 
                  }}>
                    Taux de Confirmation
                  </h3>
                  <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="200" height="200" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke={currentTheme.colors.backgroundTertiary}
                        strokeWidth="3"
                      />
                      {stats.totalConventions > 0 && (
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="#ec4899"
                          strokeWidth="3"
                          strokeDasharray={`${(stats.conventionsConfirmees / stats.totalConventions) * 100} ${100 - (stats.conventionsConfirmees / stats.totalConventions) * 100}`}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    <div style={{
                      position: 'relative',
                      zIndex: 1,
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <div style={{ fontSize: '36px', fontWeight: 700, color: currentTheme.colors.text, lineHeight: 1, marginBottom: '4px' }}>
                        {stats.totalConventions > 0 ? Math.round((stats.conventionsConfirmees / stats.totalConventions) * 100) : 0}%
                      </div>
                      <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                        Confirmées
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text, marginBottom: '4px' }}>
                      {stats.conventionsConfirmees} / {stats.totalConventions}
                    </div>
                    <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary }}>
                      Conventions confirmées
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Section Historique */}
          {activeSection === 'historique' && (
            <div>
              {/* Filtres et recherche */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                marginBottom: '24px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                  <input
                    type="text"
                    placeholder="Rechercher dans l'historique..."
                    value={searchHistorique}
                    onChange={(e) => setSearchHistorique(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      paddingLeft: '44px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      transition: 'all 0.2s ease'
                    }}
                  />
                  <i className="fas fa-search" style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: currentTheme.colors.textTertiary,
                    pointerEvents: 'none'
                  }}></i>
                </div>
                <select
                  value={filterActionType}
                  onChange={(e) => setFilterActionType(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    cursor: 'pointer',
                    minWidth: '180px'
                  }}
                >
                  <option value="all">Toutes les actions</option>
                  <option value="Création">Création</option>
                  <option value="Modification">Modification</option>
                  <option value="Suppression">Suppression</option>
                  <option value="Connexion">Connexion</option>
                  <option value="Déconnexion">Déconnexion</option>
                  <option value="Consultation">Consultation</option>
                </select>
                <select
                  value={filterUserType}
                  onChange={(e) => setFilterUserType(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    cursor: 'pointer',
                    minWidth: '180px'
                  }}
                >
                  <option value="all">Tous les rôles</option>
                  <option value="administrateur">Administrateur</option>
                  <option value="caissier">Caissier</option>
                  <option value="opérateur de saisie">Rédacteur</option>
                </select>
                
                {/* Boutons d'effacement */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  <button
                    onClick={handleDeleteSelectedHistorique}
                    disabled={selectedHistorique.length === 0}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: selectedHistorique.length > 0 ? '#dc3545' : currentTheme.colors.backgroundTertiary,
                      color: selectedHistorique.length > 0 ? 'white' : currentTheme.colors.textTertiary,
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: selectedHistorique.length > 0 ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedHistorique.length > 0) {
                        e.target.style.backgroundColor = '#c82333';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedHistorique.length > 0) {
                        e.target.style.backgroundColor = '#dc3545';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <i className="fas fa-trash-alt"></i>
                    Effacer la sélection ({selectedHistorique.length})
                  </button>
                  <button
                    onClick={handleDeleteAllHistorique}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#c82333';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#dc3545';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <i className="fas fa-trash"></i>
                    Tout effacer
                  </button>
                </div>
              </div>

              {/* Tableau de l'historique */}
              {loadingHistorique ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: currentTheme.colors.textTertiary }}></i>
                  <p style={{ marginTop: '16px', color: currentTheme.colors.textTertiary }}>Chargement de l'historique...</p>
                </div>
              ) : (
                <div style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: `1px solid ${currentTheme.colors.border}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{
                        backgroundColor: currentTheme.colors.backgroundTertiary,
                        borderBottom: `2px solid ${currentTheme.colors.border}`
                      }}>
                        <th style={{ padding: '16px', textAlign: 'center', width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={(() => {
                              const filtered = historique.filter(item => {
                                const matchesSearch = !searchHistorique || 
                                  item.utilisateur.toLowerCase().includes(searchHistorique.toLowerCase()) ||
                                  item.description.toLowerCase().includes(searchHistorique.toLowerCase()) ||
                                  item.type.toLowerCase().includes(searchHistorique.toLowerCase());
                                const matchesAction = filterActionType === 'all' || item.action === filterActionType;
                                let matchesUserType = true;
                                if (filterUserType !== 'all') {
                                  const user = utilisateurs.find(u => u.matricule === item.matricule);
                                  if (user) {
                                    matchesUserType = user.poste?.toLowerCase() === filterUserType.toLowerCase();
                                  }
                                }
                                return matchesSearch && matchesAction && matchesUserType;
                              });
                              return filtered.length > 0 && filtered.every(item => selectedHistorique.includes(item.id));
                            })()}
                            onChange={handleSelectAllHistorique}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer'
                            }}
                          />
                        </th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Heure</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Utilisateur</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historique
                        .filter(item => {
                          const matchesSearch = !searchHistorique || 
                            item.utilisateur.toLowerCase().includes(searchHistorique.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchHistorique.toLowerCase()) ||
                            item.type.toLowerCase().includes(searchHistorique.toLowerCase());
                          const matchesAction = filterActionType === 'all' || item.action === filterActionType;
                          
                          // Filtre par type de poste
                          let matchesUserType = true;
                          if (filterUserType !== 'all') {
                            const user = utilisateurs.find(u => u.matricule === item.matricule);
                            if (user) {
                              matchesUserType = user.poste?.toLowerCase() === filterUserType.toLowerCase();
                            } else {
                              // Si l'utilisateur n'est pas dans la liste, on peut essayer de deviner depuis le nom
                              const userPoste = item.utilisateur?.toLowerCase() || '';
                              if (filterUserType === 'caissier') {
                                matchesUserType = userPoste.includes('caissier');
                              } else if (filterUserType === 'opérateur de saisie') {
                                matchesUserType = userPoste.includes('opérateur') || userPoste.includes('rédacteur') || userPoste.includes('saisie');
                              } else if (filterUserType === 'administrateur') {
                                matchesUserType = userPoste.includes('admin') || userPoste.includes('administrateur');
                              }
                            }
                          }
                          
                          return matchesSearch && matchesAction && matchesUserType;
                        })
                        .map((item, index) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: index < historique.length - 1 ? `1px solid ${currentTheme.colors.border}` : 'none',
                              transition: 'background 0.2s ease',
                              backgroundColor: currentTheme.colors.cardBackground
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.colors.backgroundTertiary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.colors.cardBackground;
                            }}
                          >
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedHistorique.includes(item.id)}
                                onChange={() => handleToggleSelectHistorique(item.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer'
                                }}
                              />
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text }}>
                              {new Date(item.date).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text }}>
                              <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{item.utilisateur}</div>
                                <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary }}>{item.matricule}</div>
                              </div>
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: item.action === 'Création' ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7') :
                                  item.action === 'Modification' ? (isDark ? 'rgba(33, 150, 243, 0.2)' : '#e3f2fd') :
                                  item.action === 'Suppression' ? (isDark ? 'rgba(244, 67, 54, 0.2)' : '#ffebee') :
                                  item.action === 'Connexion' ? (isDark ? 'rgba(156, 39, 176, 0.2)' : '#f3e5f5') :
                                  (isDark ? 'rgba(158, 158, 158, 0.2)' : '#f5f5f5'),
                                color: item.action === 'Création' ? (isDark ? '#4caf50' : '#166534') :
                                  item.action === 'Modification' ? (isDark ? '#2196f3' : '#0d47a1') :
                                  item.action === 'Suppression' ? (isDark ? '#f44336' : '#b71c1c') :
                                  item.action === 'Connexion' ? (isDark ? '#9c27b0' : '#4a148c') :
                                  (isDark ? '#9e9e9e' : '#424242')
                              }}>
                                <i className={`fas ${
                                  item.action === 'Création' ? 'fa-plus-circle' :
                                  item.action === 'Modification' ? 'fa-edit' :
                                  item.action === 'Suppression' ? 'fa-trash' :
                                  item.action === 'Connexion' ? 'fa-sign-in-alt' :
                                  item.action === 'Déconnexion' ? 'fa-sign-out-alt' :
                                  'fa-eye'
                                }`} style={{ fontSize: '10px' }}></i>
                                {item.action}
                              </span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text }}>
                              {item.type}
                            </td>
                            <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text }}>
                              {item.description}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: item.statut === 'Succès' 
                                  ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7')
                                  : (isDark ? 'rgba(244, 67, 54, 0.2)' : '#ffebee'),
                                color: item.statut === 'Succès'
                                  ? (isDark ? '#4caf50' : '#166534')
                                  : (isDark ? '#f44336' : '#b71c1c')
                              }}>
                                {item.statut === 'Succès' ? '✓' : '✗'} {item.statut}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {historique.filter(item => {
                        const matchesSearch = !searchHistorique || 
                          item.utilisateur.toLowerCase().includes(searchHistorique.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchHistorique.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchHistorique.toLowerCase());
                        const matchesAction = filterActionType === 'all' || item.action === filterActionType;
                        
                        // Filtre par type de poste
                        let matchesUserType = true;
                        if (filterUserType !== 'all') {
                          const user = utilisateurs.find(u => u.matricule === item.matricule);
                          if (user) {
                            matchesUserType = user.poste?.toLowerCase() === filterUserType.toLowerCase();
                          } else {
                            // Si l'utilisateur n'est pas dans la liste, on peut essayer de deviner depuis le nom
                            const userPoste = item.utilisateur?.toLowerCase() || '';
                            if (filterUserType === 'caissier') {
                              matchesUserType = userPoste.includes('caissier');
                            } else if (filterUserType === 'opérateur de saisie') {
                              matchesUserType = userPoste.includes('opérateur') || userPoste.includes('rédacteur') || userPoste.includes('saisie');
                            } else if (filterUserType === 'administrateur') {
                              matchesUserType = userPoste.includes('admin') || userPoste.includes('administrateur');
                            }
                          }
                        }
                        
                        return matchesSearch && matchesAction && matchesUserType;
                      }).length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: currentTheme.colors.textTertiary }}>
                            <i className="fas fa-history" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                            <p>Aucun historique trouvé</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Statistiques rapides */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginTop: '24px'
              }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.primary, marginBottom: '8px' }}>
                    {historique.length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Total des actions</div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#4caf50', marginBottom: '8px' }}>
                    {historique.filter(h => h.statut === 'Succès').length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Actions réussies</div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#f44336', marginBottom: '8px' }}>
                    {historique.filter(h => h.statut === 'Échec').length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Actions échouées</div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.primary, marginBottom: '8px' }}>
                    {new Set(historique.map(h => h.matricule)).size}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Utilisateurs actifs</div>
                </div>
              </div>
            </div>
          )}

          {/* Section Demandes de Modification */}
          {activeSection === 'statuts' && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ 
                  margin: '0 0 8px', 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: currentTheme.colors.text,
                  lineHeight: 1.2
                }}>
                  Changements de Statut
                </h1>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: currentTheme.colors.textTertiary,
                  fontWeight: 400
                }}>
                  Visualisation des changements de statut basés sur la date Madagascar (UTC+3)
                </p>
              </div>

              {/* Boutons d'action - Lecture seule pour Admin */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '24px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={loadStatusChanges}
                  disabled={loadingStatusChanges}
                  style={{
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    padding: '12px 24px',
                    cursor: loadingStatusChanges ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className={`fas ${loadingStatusChanges ? 'fa-spinner fa-spin' : 'fa-refresh'}`}></i>
                  Actualiser
                </button>
                <div style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  backgroundColor: currentTheme.colors.backgroundTertiary,
                  color: currentTheme.colors.textTertiary,
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <i className="fas fa-info-circle"></i>
                  Mode lecture seule - Seul le Rédacteur peut mettre à jour les statuts
                </div>
              </div>

              {/* Message d'erreur */}
              {msg && (
                <div style={{
                  marginBottom: '24px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: msg.includes('✅') ? '#dcfce7' : msg.includes('ℹ️') ? '#dbeafe' : '#fee2e2',
                  color: msg.includes('✅') ? '#166534' : msg.includes('ℹ️') ? '#1e40af' : '#991b1b',
                  border: `1px solid ${msg.includes('✅') ? '#10b981' : msg.includes('ℹ️') ? '#3b82f6' : '#ef4444'}`,
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  {msg}
                </div>
              )}

              {/* Résumé (design adouci) */}
              {statusChanges?.data && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {[
                    {
                      label: 'Mois actuel (Madagascar)',
                      value: statusChanges.data.currentMonth,
                    },
                    {
                      label: 'À mettre à jour',
                      value: statusChanges.data.needsUpdate,
                    },
                    {
                      label: 'Statuts corrects',
                      value: statusChanges.data.allGood,
                    },
                    {
                      label: 'Total conventions',
                      value: statusChanges.data.total,
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      style={{
                        background: currentTheme.colors.cardBackground,
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '10px',
                        padding: '16px 18px',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: currentTheme.colors.textTertiary,
                        marginBottom: '6px',
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: '22px',
                        fontWeight: 600,
                        color: currentTheme.colors.text,
                      }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Liste des changements */}
              {loadingStatusChanges ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px', color: currentTheme.colors.primary }}></i>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Chargement des changements de statut...</div>
                </div>
              ) : statusChanges?.data ? (
                <div>
                  {/* Conventions à mettre à jour */}
                  {statusChanges.data.changes.filter(c => c.needsUpdate).length > 0 ? (
                    <div style={{ marginBottom: '32px' }}>
                      <h2 style={{ 
                        fontSize: '20px', 
                        fontWeight: 600, 
                        color: currentTheme.colors.text,
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }}></i>
                        Conventions nécessitant une mise à jour ({statusChanges.data.changes.filter(c => c.needsUpdate).length})
                      </h2>
                      <div style={{
                        display: 'grid',
                        gap: '12px'
                      }}>
                        {statusChanges.data.changes.filter(c => c.needsUpdate).map((change) => (
                          <div
                            key={change.numConv}
                            style={{
                              background: currentTheme.colors.cardBackground,
                              border: `1px solid ${change.expectedStatus === 'Confirmé' ? '#10b981' : '#f59e0b'}`,
                              borderRadius: '12px',
                              padding: '20px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ 
                                  fontWeight: 700, 
                                  fontSize: '16px', 
                                  color: currentTheme.colors.text 
                                }}>
                                  Convention #{change.numConv}
                                </span>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: currentTheme.colors.backgroundTertiary,
                                color: currentTheme.colors.text,
                                border: `1px solid ${currentTheme.colors.border}`
                              }}>
                                  {change.currentStatus}
                                </span>
                                <i className="fas fa-arrow-right" style={{ color: currentTheme.colors.textTertiary }}></i>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background: currentTheme.colors.backgroundTertiary,
                                color: currentTheme.colors.text,
                                border: `1px solid ${currentTheme.colors.border}`
                              }}>
                                  {change.expectedStatus}
                                </span>
                              </div>
                              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                <strong>Client:</strong> {change.locataire?.nomcli || 'N/A'}
                              </div>
                              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                <strong>Bâtiment:</strong> {change.batiment?.adresse || 'N/A'}
                              </div>
                              {change.lastPaymentMonth && (
                                <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                  <strong>Dernier paiement:</strong> {change.lastPaymentMonth}
                                </div>
                              )}
                              <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, fontStyle: 'italic', marginTop: '8px' }}>
                                {change.reason}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: currentTheme.colors.cardBackground,
                      border: `1px solid #10b981`,
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '32px',
                      textAlign: 'center'
                    }}>
                      <i className="fas fa-check-circle" style={{ fontSize: '32px', color: '#10b981', marginBottom: '12px' }}></i>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text }}>
                        ✅ Tous les statuts sont à jour !
                      </p>
                      <p style={{ margin: '8px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                        Aucune convention ne nécessite de mise à jour. Tous les statuts correspondent aux paiements actuels.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center'
                }}>
                  <i className="fas fa-info-circle" style={{ fontSize: '32px', color: currentTheme.colors.textTertiary, marginBottom: '12px' }}></i>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text }}>
                    Cliquez sur "Actualiser" pour charger les changements de statut
                  </p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'demandes' && (
            <div>
              {/* En-tête avec statistiques - Demandes de Modification uniquement */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                    {demandesModification.filter(d => d.statut === 'en_attente').length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>En attente</div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#4caf50', marginBottom: '8px' }}>
                    {demandesModification.filter(d => d.statut === 'approuvee').length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Approuvées</div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: '#f44336', marginBottom: '8px' }}>
                    {demandesModification.filter(d => d.statut === 'rejetee').length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Rejetées</div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.primary, marginBottom: '8px' }}>
                    {demandesModification.length}
                  </div>
                  <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>Total</div>
                </div>
              </div>

              {/* Demandes de Modification */}
              <div>
                <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: currentTheme.colors.text, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-edit" style={{ fontSize: '20px', color: currentTheme.colors.primary }}></i>
                  Demandes de Modification ({demandesModification.filter(d => d.statut === 'en_attente').length} en attente)
                </h2>
                
                {loadingDemandesModif ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: currentTheme.colors.textTertiary }}></i>
                    <p style={{ marginTop: '16px', color: currentTheme.colors.textTertiary }}>Chargement des demandes...</p>
                  </div>
                ) : demandesModification.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: currentTheme.colors.cardBackground,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <i className="fas fa-edit" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
                    <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: currentTheme.colors.text }}>Aucune demande de modification</p>
                    <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textTertiary }}>Les demandes de modification supplémentaires apparaîtront ici</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {demandesModification
                      .sort((a, b) => {
                        // Priorité: en_attente > approuvee > rejetee
                        const priority = { 'en_attente': 0, 'approuvee': 1, 'rejetee': 2 };
                        if (priority[a.statut] !== priority[b.statut]) {
                          return priority[a.statut] - priority[b.statut];
                        }
                        return new Date(b.date) - new Date(a.date);
                      })
                      .map((demande) => (
                      <div
                        key={demande.id}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          padding: '20px',
                          backgroundColor: demande.statut === 'en_attente' 
                            ? (isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb')
                            : currentTheme.colors.cardBackground,
                          borderRadius: '12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: demande.statut === 'en_attente' 
                                ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                                : demande.statut === 'approuvee'
                                ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7')
                                : (isDark ? 'rgba(244, 67, 54, 0.2)' : '#ffebee'),
                              color: demande.statut === 'en_attente'
                                ? (isDark ? '#f59e0b' : '#92400e')
                                : demande.statut === 'approuvee'
                                ? (isDark ? '#4caf50' : '#166534')
                                : (isDark ? '#f44336' : '#b71c1c')
                            }}>
                              <i className={`fas ${
                                demande.statut === 'en_attente' ? 'fa-clock' :
                                demande.statut === 'approuvee' ? 'fa-check-circle' :
                                'fa-times-circle'
                              }`} style={{ fontSize: '10px' }}></i>
                              {demande.statut === 'en_attente' ? 'En attente' :
                               demande.statut === 'approuvee' ? 'Approuvée' :
                               'Rejetée'}
                            </span>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: currentTheme.colors.text
                            }}>
                              Modification supplémentaire
                            </span>
                            {demande.convention && (
                              <span style={{
                                fontSize: '12px',
                                color: currentTheme.colors.textTertiary
                              }}>
                                - Convention #{demande.convention}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Demandeur: <strong style={{ color: currentTheme.colors.text }}>{demande.demandeur || 'Rédacteur'}</strong>
                              {demande.matricule && (
                                <span style={{ color: currentTheme.colors.textTertiary, marginLeft: '8px' }}>
                                  ({demande.matricule})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Date: <strong style={{ color: currentTheme.colors.text }}>
                                {new Date(demande.date).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </strong>
                            </div>
                          </div>
                          
                          <div style={{
                            padding: '12px',
                            backgroundColor: currentTheme.colors.backgroundTertiary,
                            borderRadius: '8px',
                            marginTop: '8px'
                          }}>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px', fontWeight: 600 }}>
                              Raison de la demande:
                            </div>
                            <div style={{ fontSize: '14px', color: currentTheme.colors.text }}>
                              {demande.raison || 'Aucune raison fournie'}
                            </div>
                          </div>
                        </div>
                        
                        {demande.statut === 'en_attente' && (
                          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexDirection: 'column', justifyContent: 'center', maxWidth: '140px', width: '100%' }}>
                            <button
                              onClick={() => handleApprouverDemandeModification(demande)}
                              disabled={loading}
                              style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'none',
                                width: '100%',
                                overflow: 'hidden',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                              onMouseEnter={(e) => {
                                if (!loading) {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = 'none';
                                  e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) {
                                  e.target.style.transform = 'translateY(0)';
                                  e.target.style.boxShadow = 'none';
                                  e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                                }
                              }}
                            >
                              <i className="fas fa-check-circle" style={{ fontSize: '14px' }}></i>
                              Approuver
                            </button>
                            <button
                              onClick={() => handleRejeterDemandeModification(demande)}
                              disabled={loading}
                              style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'none',
                                width: '100%',
                                overflow: 'hidden',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                              onMouseEnter={(e) => {
                                if (!loading) {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = 'none';
                                  e.target.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) {
                                  e.target.style.transform = 'translateY(0)';
                                  e.target.style.boxShadow = 'none';
                                  e.target.style.background = 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)';
                                }
                              }}
                            >
                              <i className="fas fa-times-circle" style={{ fontSize: '14px' }}></i>
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Demandes de Création de Compte */}
              <div style={{ marginTop: '48px' }}>
                <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: currentTheme.colors.text, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-user-plus" style={{ fontSize: '20px', color: currentTheme.colors.primary }}></i>
                  Demandes de Création de Compte ({demandesCreation.filter(d => d.statut === 'en_attente').length} en attente)
                </h2>
                
                {loadingDemandesCreation ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: currentTheme.colors.textTertiary }}></i>
                    <p style={{ marginTop: '16px', color: currentTheme.colors.textTertiary }}>Chargement des demandes...</p>
                  </div>
                ) : demandesCreation.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: currentTheme.colors.cardBackground,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <i className="fas fa-user-plus" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
                    <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: currentTheme.colors.text }}>Aucune demande de création de compte</p>
                    <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textTertiary }}>Les nouvelles demandes de création de compte apparaîtront ici</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {demandesCreation
                      .sort((a, b) => {
                        // Priorité: en_attente > approuvee > rejetee
                        const priority = { 'en_attente': 0, 'approuvee': 1, 'rejetee': 2 };
                        if (priority[a.statut] !== priority[b.statut]) {
                          return priority[a.statut] - priority[b.statut];
                        }
                        return new Date(b.dateCreation) - new Date(a.dateCreation);
                      })
                      .map((demande) => (
                      <div
                        key={demande.id}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          padding: '20px',
                          backgroundColor: demande.statut === 'en_attente' 
                            ? (isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb')
                            : currentTheme.colors.cardBackground,
                          borderRadius: '12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: demande.statut === 'en_attente' 
                                ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                                : demande.statut === 'approuvee'
                                ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7')
                                : (isDark ? 'rgba(244, 67, 54, 0.2)' : '#ffebee'),
                              color: demande.statut === 'en_attente'
                                ? (isDark ? '#f59e0b' : '#92400e')
                                : demande.statut === 'approuvee'
                                ? (isDark ? '#4caf50' : '#166534')
                                : (isDark ? '#f44336' : '#b71c1c')
                            }}>
                              <i className={`fas ${
                                demande.statut === 'en_attente' ? 'fa-clock' :
                                demande.statut === 'approuvee' ? 'fa-check-circle' :
                                'fa-times-circle'
                              }`} style={{ fontSize: '10px' }}></i>
                              {demande.statut === 'en_attente' ? 'En attente' :
                               demande.statut === 'approuvee' ? 'Approuvée' :
                               'Rejetée'}
                            </span>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: currentTheme.colors.text
                            }}>
                              Nouvelle demande de compte
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Matricule: <strong style={{ color: currentTheme.colors.text }}>{demande.matricule}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Poste: <strong style={{ color: currentTheme.colors.text }}>{demande.poste}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Date de demande: <strong style={{ color: currentTheme.colors.text }}>
                                {new Date(demande.dateCreation).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </strong>
                            </div>
                            {demande.dateApprobation && (
                              <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                Approuvée le: <strong style={{ color: currentTheme.colors.text }}>
                                  {new Date(demande.dateApprobation).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </strong>
                              </div>
                            )}
                            {demande.dateRejet && (
                              <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                Rejetée le: <strong style={{ color: currentTheme.colors.text }}>
                                  {new Date(demande.dateRejet).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {demande.statut === 'en_attente' && (
                          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexDirection: 'column', justifyContent: 'center', maxWidth: '140px', width: '100%' }}>
                            <button
                              onClick={() => {
                                setSelectedDemande(demande);
                                setShowApproveModal(true);
                              }}
                              disabled={loading}
                              style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'none',
                                width: '100%',
                                overflow: 'hidden',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              <i className="fas fa-check-circle" style={{ fontSize: '14px' }}></i>
                              Approuver
                            </button>
                            <button
                              onClick={() => handleRejeterDemandeCreation(demande)}
                              disabled={loading}
                              style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'none',
                                width: '100%',
                                overflow: 'hidden',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              <i className="fas fa-times-circle" style={{ fontSize: '14px' }}></i>
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Demandes de Réinitialisation de Mot de Passe */}
              <div style={{ marginTop: '48px' }}>
                <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: currentTheme.colors.text, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-key" style={{ fontSize: '20px', color: currentTheme.colors.primary }}></i>
                  Demandes de Réinitialisation de Mot de Passe ({demandesReset.filter(d => d.statut === 'en_attente').length} en attente)
                </h2>
                
                {loadingDemandesReset ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: currentTheme.colors.textTertiary }}></i>
                    <p style={{ marginTop: '16px', color: currentTheme.colors.textTertiary }}>Chargement des demandes...</p>
                  </div>
                ) : demandesReset.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: currentTheme.colors.cardBackground,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <i className="fas fa-key" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
                    <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: currentTheme.colors.text }}>Aucune demande de réinitialisation</p>
                    <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textTertiary }}>Les demandes de réinitialisation de mot de passe apparaîtront ici</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {demandesReset
                      .sort((a, b) => {
                        const priority = { 'en_attente': 0, 'approuvee': 1, 'rejetee': 2 };
                        if (priority[a.statut] !== priority[b.statut]) {
                          return priority[a.statut] - priority[b.statut];
                        }
                        return new Date(b.dateCreation) - new Date(a.dateCreation);
                      })
                      .map((demande) => (
                      <div
                        key={demande.id}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          padding: '20px',
                          backgroundColor: demande.statut === 'en_attente' 
                            ? (isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb')
                            : currentTheme.colors.cardBackground,
                          borderRadius: '12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: demande.statut === 'en_attente' 
                                ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                                : demande.statut === 'approuvee'
                                ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7')
                                : (isDark ? 'rgba(244, 67, 54, 0.2)' : '#ffebee'),
                              color: demande.statut === 'en_attente'
                                ? (isDark ? '#f59e0b' : '#92400e')
                                : demande.statut === 'approuvee'
                                ? (isDark ? '#4caf50' : '#166534')
                                : (isDark ? '#f44336' : '#b71c1c')
                            }}>
                              <i className={`fas ${
                                demande.statut === 'en_attente' ? 'fa-clock' :
                                demande.statut === 'approuvee' ? 'fa-check-circle' :
                                'fa-times-circle'
                              }`} style={{ fontSize: '10px' }}></i>
                              {demande.statut === 'en_attente' ? 'En attente' :
                               demande.statut === 'approuvee' ? 'Approuvée' :
                               'Rejetée'}
                            </span>
                            <span style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: currentTheme.colors.text
                            }}>
                              Demande de réinitialisation
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Utilisateur: <strong style={{ color: currentTheme.colors.text }}>{demande.nom || 'N/A'}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Matricule: <strong style={{ color: currentTheme.colors.text }}>{demande.matricule}</strong>
                            </div>
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Poste: <strong style={{ color: currentTheme.colors.text }}>{demande.poste}</strong>
                            </div>
                            {demande.email && (
                              <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                Email: <strong style={{ color: currentTheme.colors.text }}>{demande.email}</strong>
                              </div>
                            )}
                            <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                              Date de demande: <strong style={{ color: currentTheme.colors.text }}>
                                {new Date(demande.dateCreation).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </strong>
                            </div>
                            {demande.dateApprobation && (
                              <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                Approuvée le: <strong style={{ color: currentTheme.colors.text }}>
                                  {new Date(demande.dateApprobation).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </strong>
                              </div>
                            )}
                            {demande.dateRejet && (
                              <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '4px' }}>
                                Rejetée le: <strong style={{ color: currentTheme.colors.text }}>
                                  {new Date(demande.dateRejet).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {demande.statut === 'en_attente' && (
                          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexDirection: 'column', justifyContent: 'center', maxWidth: '140px', width: '100%' }}>
                            <button
                              onClick={() => {
                                setSelectedResetDemande(demande);
                                setShowResetApproveModal(true);
                              }}
                              disabled={loading}
                              style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'none',
                                width: '100%',
                                overflow: 'hidden',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              <i className="fas fa-check-circle" style={{ fontSize: '14px' }}></i>
                              Approuver
                            </button>
                            <button
                              onClick={() => handleRejeterDemandeReset(demande)}
                              disabled={loading}
                              style={{
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                boxShadow: 'none',
                                width: '100%',
                                overflow: 'hidden',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              <i className="fas fa-times-circle" style={{ fontSize: '14px' }}></i>
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Paramètres */}
          {activeSection === 'parametres' && (
            <div style={{ display: 'grid', gap: '24px', maxWidth: '1000px' }}>
              {/* Profil Administrateur */}
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
              >
                <h2 style={{ margin: '0 0 24px', fontSize: '22px', color: '#020cdb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-user-circle" style={{ fontSize: '24px' }}></i>
                  Profil Administrateur
                </h2>
                <form onSubmit={handleProfileUpdate} style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Matricule
                      </label>
                      <input
                        type="text"
                        value={adminProfile.matricule}
                        disabled
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.backgroundTertiary,
                          color: currentTheme.colors.textTertiary,
                          cursor: 'not-allowed'
                        }}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: currentTheme.colors.textTertiary }}>
                        Le matricule ne peut pas être modifié
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={adminProfile.nom}
                        onChange={e => setAdminProfile({ ...adminProfile, nom: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        maxLength={30}
                        value={adminProfile.email}
                        onChange={e => setAdminProfile({ ...adminProfile, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                        Contact *
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={adminProfile.contact}
                        onChange={e => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setAdminProfile({ ...adminProfile, contact: value });
                        }}
                        placeholder="0343284689"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                        minWidth: '120px'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#0056b3';
                          e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                          e.target.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.backgroundColor = '#007bff';
                          e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                          e.target.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </form>

                {/* Changement de mot de passe */}
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${currentTheme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: currentTheme.colors.text }}>Sécurité</h3>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: showPasswordForm ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: showPasswordForm ? '0 2px 4px rgba(108, 117, 125, 0.2)' : '0 2px 4px rgba(0, 123, 255, 0.2)',
                        minWidth: '120px'
                      }}
                      onMouseEnter={(e) => {
                        if (showPasswordForm) {
                          e.target.style.backgroundColor = '#5a6268';
                          e.target.style.boxShadow = '0 4px 8px rgba(108, 117, 125, 0.3)';
                        } else {
                          e.target.style.backgroundColor = '#0056b3';
                          e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                        }
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        if (showPasswordForm) {
                          e.target.style.backgroundColor = '#6c757d';
                          e.target.style.boxShadow = '0 2px 4px rgba(108, 117, 125, 0.2)';
                        } else {
                          e.target.style.backgroundColor = '#007bff';
                          e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                        }
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      {showPasswordForm ? 'Annuler' : 'Changer le mot de passe'}
                    </button>
                  </div>
                  {showPasswordForm && (
                    <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                          Mot de passe actuel *
                        </label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${currentTheme.colors.border}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                          }}
                          required
                        />
                      </div>
                      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                            Nouveau mot de passe * (min 8 caractères)
                          </label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: `1px solid ${currentTheme.colors.border}`,
                              borderRadius: '8px',
                              fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                            }}
                            minLength={8}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                            Confirmer le mot de passe *
                          </label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: `1px solid ${currentTheme.colors.border}`,
                              borderRadius: '8px',
                              fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                            }}
                            required
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="submit"
                          disabled={loading}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                          }}
                        >
                          {loading ? 'Modification...' : 'Modifier le mot de passe'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Paramètres Système */}
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: currentTheme.shadows.md,
                  border: `1px solid ${currentTheme.colors.borderLight}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <h2 style={{ margin: '0 0 24px', fontSize: '22px', color: currentTheme.colors.primary, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-cog" style={{ fontSize: '24px' }}></i>
                  Paramètres Système
                </h2>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                      Durée de session (heures)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={systemSettings.sessionTimeout}
                      onChange={e => setSystemSettings({ ...systemSettings, sessionTimeout: parseInt(e.target.value) || 48 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                      }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: currentTheme.colors.textTertiary }}>
                      Durée avant expiration du token JWT (actuellement: 48h)
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: currentTheme.colors.textSecondary, fontSize: '14px' }}>
                      Longueur minimale des mots de passe
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={20}
                      value={systemSettings.passwordMinLength}
                      onChange={e => setSystemSettings({ ...systemSettings, passwordMinLength: parseInt(e.target.value) || 8 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          color: currentTheme.colors.text
                      }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999' }}>
                      Minimum requis pour les nouveaux mots de passe
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: '500', color: '#444', fontSize: '14px', marginBottom: '4px' }}>
                        Notifications système
                      </label>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                        Activer les notifications pour les actions importantes
                      </p>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                      <input
                        type="checkbox"
                        checked={systemSettings.enableNotifications}
                        onChange={e => setSystemSettings({ ...systemSettings, enableNotifications: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: systemSettings.enableNotifications ? '#007bff' : '#ccc',
                        borderRadius: '26px',
                        transition: '0.3s'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '""',
                          height: '20px',
                          width: '20px',
                          left: '3px',
                          bottom: '3px',
                          backgroundColor: currentTheme.colors.cardBackground,
                          borderRadius: '50%',
                          transition: '0.3s',
                          transform: systemSettings.enableNotifications ? 'translateX(24px)' : 'translateX(0)'
                        }}></span>
                      </span>
                    </label>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : '#fff3cd', borderRadius: '8px', border: `1px solid ${currentTheme.colors.warning}`, color: currentTheme.colors.text }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                      <strong>Note :</strong> Ces paramètres sont actuellement en lecture seule. La modification nécessitera une configuration côté serveur.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations Système */}
              <div
                style={{
                  backgroundColor: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}
              >
                <h2 style={{ margin: '0 0 24px', fontSize: '22px', color: '#020cdb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-info-circle" style={{ fontSize: '24px' }}></i>
                  Informations Système
                </h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '500', color: '#444' }}>Version de l'application</span>
                    <span style={{ color: '#666' }}>1.0.0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '500', color: '#444' }}>Rôle actuel</span>
                    <span style={{ color: '#666', textTransform: 'capitalize' }}>Administrateur</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontWeight: '500', color: '#444' }}>Permissions</span>
                    <span style={{ color: '#28a745', fontWeight: '600' }}>Contrôle total</span>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #007bff' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#007bff', fontWeight: '600' }}>
                      <i className="fas fa-shield-alt" style={{ marginRight: '8px' }}></i>
                      Permissions Administrateur
                    </h4>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: currentTheme.colors.text }}>
                      <li>Gestion complète des bâtiments (CRUD)</li>
                      <li>Gestion complète des utilisateurs (CRUD)</li>
                      
                      <li>Accès aux statistiques</li>
                      <li>Modification des paramètres système</li>
                    </ul>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : '#fff3cd', borderRadius: '8px', border: `1px solid ${currentTheme.colors.warning}`, color: currentTheme.colors.text }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#856404', fontWeight: '600' }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                      Restrictions de Sécurité
                    </h4>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#856404' }}>
                      <li>Vous ne pouvez pas supprimer votre propre compte si vous êtes le seul administrateur</li>
                      <li>Le matricule ne peut pas être modifié (identifiant unique)</li>
                      <li>Au moins un administrateur doit toujours exister dans le système</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showBatimentDetails && selectedBatimentDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1600,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={closeBatimentDetails}
        >
          <div
            style={{
              backgroundColor: currentTheme.colors.cardBackground,
              border: `1px solid ${currentTheme.colors.border}`,
              borderRadius: '18px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '95vh',
              overflowY: 'auto',
              boxShadow: currentTheme.shadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px', borderBottom: `1px solid ${currentTheme.colors.border}` }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textTertiary }}>Bâtiment n° {selectedBatimentDetails.numBat}</p>
                <h2 style={{ margin: '4px 0 0', fontSize: '28px', color: currentTheme.colors.primary }}>
                  {selectedBatimentDetails.adresse || 'Adresse non renseignée'}
                </h2>
              </div>
              <button
                onClick={closeBatimentDetails}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: currentTheme.colors.text,
                  fontSize: '24px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Fermer les détails du bâtiment"
              >
                ×
              </button>
            </div>

            {loadingBatimentDetails ? (
              <div style={{ padding: '48px', textAlign: 'center', color: currentTheme.colors.textTertiary }}>
                Chargement...
              </div>
            ) : (
              <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '16px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    padding: '12px',
                    backgroundColor: currentTheme.colors.backgroundSecondary,
                    overflow: 'hidden',
                    boxShadow: currentTheme.shadows.sm
                  }}
                >
                  {batimentMapCoords ? (
                    <MapContainer
                      key={`${batimentMapCoords.lat}-${batimentMapCoords.lng}`}
                      center={[batimentMapCoords.lat, batimentMapCoords.lng]}
                      zoom={16}
                      scrollWheelZoom={false}
                      style={{ width: '100%', height: '260px', borderRadius: '12px' }}
                    >
                      <TileLayer
                        attribution='© OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[batimentMapCoords.lat, batimentMapCoords.lng]} icon={defaultMarkerIcon}>
                        <Popup>
                          Bâtiment n° {selectedBatimentDetails.numBat}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '260px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: currentTheme.colors.textTertiary,
                        fontSize: '14px'
                      }}
                    >
                      Coordonnées géographiques non renseignées
                    </div>
                  )}
                  {batimentMapCoords && (
                    <button
                      onClick={() => setShowFullscreenMap(true)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        padding: '8px 14px',
                        borderRadius: '999px',
                        border: 'none',
                        backgroundColor: '#05c46b',
                        color: '#fff',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>🗺️</span> Voir la map
                    </button>
                  )}
                  {batimentMapCoords && (
                    <div
                      style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '12px',
                        color: currentTheme.colors.textTertiary
                      }}
                    >
                      <span>Lat: {batimentMapCoords.lat.toFixed(6)} · Lon: {batimentMapCoords.lng.toFixed(6)}</span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${batimentMapCoords.lat}&mlon=${batimentMapCoords.lng}#map=18/${batimentMapCoords.lat}/${batimentMapCoords.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: currentTheme.colors.primary, fontWeight: 600 }}
                      >
                        Ouvrir dans OpenStreetMap
                      </a>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    width: '100%',
                    height: '260px',
                    borderRadius: '14px',
                    backgroundColor: '#f2f2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}
                >
                  {selectedBatimentDetails.image ? (
                    <img
                      src={`data:image/jpeg;base64,${selectedBatimentDetails.image}`}
                      alt={`Bâtiment ${selectedBatimentDetails.numBat}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: currentTheme.colors.textTertiary, fontSize: '13px' }}>Pas d'image disponible</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                    <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Montant</p>
                    <p style={{ margin: '6px 0 0', fontSize: '18px', color: currentTheme.colors.text, fontWeight: 600 }}>
                      {typeof selectedBatimentDetails.montant === 'number'
                        ? `${selectedBatimentDetails.montant.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} Ar`
                        : (selectedBatimentDetails.montant ?? 'Non renseigné')}
                    </p>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                    <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Superficie</p>
                    <p style={{ margin: '6px 0 0', fontSize: '18px', color: currentTheme.colors.text, fontWeight: 600 }}>
                      {selectedBatimentDetails.superficie 
                        ? `${selectedBatimentDetails.superficie.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} m²`
                        : 'Non renseigné'}
                    </p>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                    <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Statut technique</p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: selectedBatimentDetails.statut ? '#0d6b3a' : '#dc3545'
                      }}
                    >
                      {selectedBatimentDetails.statut ? 'Actif' : 'Inactif'}
                    </p>
                    {!selectedBatimentDetails.statut && selectedBatimentDetails.motifInactivite && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: currentTheme.colors.textTertiary, fontStyle: 'italic' }}>
                        Motif: {selectedBatimentDetails.motifInactivite}
                      </p>
                    )}
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                    <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Statut d'utilisation</p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: selectedBatimentDetails.statutUtilisation === 'indisponible' || selectedBatimentDetails.estIndisponible 
                          ? '#991b1b' 
                          : (selectedBatimentDetails.statutUtilisation === 'libre' || selectedBatimentDetails.estLibre) 
                            ? '#0369a1' 
                            : '#b45309'
                      }}
                    >
                      {selectedBatimentDetails.statutUtilisation === 'indisponible' || selectedBatimentDetails.estIndisponible 
                        ? '⛔ Indisponible' 
                        : (selectedBatimentDetails.statutUtilisation === 'libre' || selectedBatimentDetails.estLibre) 
                          ? '🟢 Libre' 
                          : '🔴 Déjà alloué'}
                    </p>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                    <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Ville</p>
                    <p style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text }}>
                      {selectedBatimentDetails.ville || ''}
                    </p>
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                    <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Quartier</p>
                    <p style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text }}>
                      {selectedBatimentDetails.quartier || ''}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${currentTheme.colors.border}`, backgroundColor: currentTheme.colors.backgroundSecondary }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: currentTheme.colors.text }}>Informations complémentaires</p>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                    Numéro du bâtiment : {selectedBatimentDetails.numBat}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                    Adresse : {selectedBatimentDetails.adresse || 'Non renseignée'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={closeBatimentDetails}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.backgroundSecondary,
                      color: currentTheme.colors.text,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showFullscreenMap && batimentMapCoords && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowFullscreenMap(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '960px',
              height: '90%',
              borderRadius: '20px',
              backgroundColor: currentTheme.colors.cardBackground,
              padding: '18px',
              boxShadow: currentTheme.shadows.xl,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: currentTheme.colors.primary }}>Carte du bâtiment {selectedBatimentDetails.numBat}</h3>
              <button
                onClick={() => setShowFullscreenMap(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: currentTheme.colors.textTertiary
                }}
                aria-label="Fermer la carte plein écran"
              >
                ×
              </button>
            </div>

            <MapContainer
              center={[batimentMapCoords.lat, batimentMapCoords.lng]}
              zoom={17}
              scrollWheelZoom
              style={{ flex: 1, borderRadius: '16px', border: `1px solid ${currentTheme.colors.border}` }}
            >
              <TileLayer
                attribution='© OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[batimentMapCoords.lat, batimentMapCoords.lng]} icon={defaultMarkerIcon}>
                <Popup>
                  Bâtiment n° {selectedBatimentDetails.numBat}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

      {/* Modal Convention - Seulement pour modifier (pas de création pour l'admin) */}
      {showConventionModal && selectedConvention && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => {
            setShowConventionModal(false);
            setConventionStep(1);
            setSelectedConvention(null);
            setConventionForm({
              step1: { numBat: '', adresse: '', montant: '' },
              step2: { nomcli: '', datenais: '', lieunais: '', pere: '', mere: '', cin: '', delivcin: '', adressecli: '', activite: '', contact: '' }
            });
          }}
        >
          <div
            style={{
              background: currentTheme.colors.cardBackground,
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${currentTheme.colors.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: currentTheme.colors.primary }}>
                {selectedConvention ? 'Modifier la convention' : 'Détails de la convention'}
              </h2>
              <button
                onClick={() => {
                  setShowConventionModal(false);
                  setConventionStep(1);
                  setSelectedConvention(null);
                  setConventionForm({
                    step1: { numBat: '', adresse: '', montant: '' },
                    step2: { nomcli: '', datenais: '', lieunais: '', pere: '', mere: '', cin: '', delivcin: '', adressecli: '', activite: '', contact: '' }
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.colors.textTertiary,
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '24px',
                  lineHeight: 1,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Indicateur d'étapes */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <div style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                background: conventionStep === 1 ? currentTheme.colors.primary : currentTheme.colors.backgroundTertiary,
                color: conventionStep === 1 ? currentTheme.colors.white : currentTheme.colors.textTertiary,
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600
              }}>
                Étape 1: Bâtiment
              </div>
              <div style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                background: conventionStep === 2 ? currentTheme.colors.primary : currentTheme.colors.backgroundTertiary,
                color: conventionStep === 2 ? currentTheme.colors.white : currentTheme.colors.textTertiary,
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600
              }}>
                Étape 2: Locataire
              </div>
            </div>

            {/* Étape 1: Bâtiment */}
            {conventionStep === 1 && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Bâtiment <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={conventionForm.step1.numBat}
                    onChange={(e) => {
                      const selected = batiments.find(b => String(b.numBat) === String(e.target.value));
                      setConventionForm({
                        ...conventionForm,
                        step1: {
                          numBat: e.target.value,
                          adresse: selected ? selected.adresse || '' : '',
                          montant: selected ? String(selected.montant || '') : ''
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Sélectionner un bâtiment</option>
                    {batiments.map(b => {
                      let statutText = '🔴 Déjà alloué';
                      if (b.statutUtilisation === 'indisponible' || b.estIndisponible) {
                        statutText = '⛔ Indisponible';
                      } else if (b.statutUtilisation === 'libre' || b.estLibre) {
                        statutText = '🟢 Libre';
                      }
                      return (
                        <option key={b.numBat} value={b.numBat}>
                          Bâtiment {b.numBat} - {b.adresse} ({statutText})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={conventionForm.step1.adresse}
                    onChange={(e) => setConventionForm({
                      ...conventionForm,
                      step1: { ...conventionForm.step1, adresse: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Montant (Ar)
                  </label>
                  <input
                    type="number"
                    value={conventionForm.step1.montant}
                    onChange={(e) => setConventionForm({
                      ...conventionForm,
                      step1: { ...conventionForm.step1, montant: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    onClick={() => {
                      setShowConventionModal(false);
                      setConventionStep(1);
                      setSelectedConvention(null);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (!conventionForm.step1.numBat) {
                        setMsg('Veuillez sélectionner un bâtiment');
                        setTimeout(() => setMsg(''), 2000);
                        return;
                      }
                      setConventionStep(2);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: currentTheme.colors.primary,
                      color: currentTheme.colors.white,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}

            {/* Étape 2: Locataire */}
            {conventionStep === 2 && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Nom du locataire <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={conventionForm.step2.nomcli}
                    onChange={(e) => setConventionForm({
                      ...conventionForm,
                      step2: { ...conventionForm.step2, nomcli: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      value={conventionForm.step2.datenais}
                      onChange={(e) => setConventionForm({
                        ...conventionForm,
                        step2: { ...conventionForm.step2, datenais: e.target.value }
                      })}
                      min={minDateNaissance}
                      max={maxDateNaissance}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                      Lieu de naissance
                    </label>
                    <input
                      type="text"
                      value={conventionForm.step2.lieunais}
                      onChange={(e) => setConventionForm({
                        ...conventionForm,
                        step2: { ...conventionForm.step2, lieunais: e.target.value }
                      })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                      Père
                    </label>
                    <input
                      type="text"
                      value={conventionForm.step2.pere}
                      onChange={(e) => {
                        // Ne garder que les lettres, espaces, apostrophes et tirets
                        const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
                        setConventionForm({
                        ...conventionForm,
                          step2: { ...conventionForm.step2, pere: value }
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        fontSize: '14px'
                      }}
                      placeholder="Nom complet du père (lettres uniquement)"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                      Mère
                    </label>
                    <input
                      type="text"
                      value={conventionForm.step2.mere}
                      onChange={(e) => {
                        // Ne garder que les lettres, espaces, apostrophes et tirets
                        const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
                        setConventionForm({
                        ...conventionForm,
                          step2: { ...conventionForm.step2, mere: value }
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        fontSize: '14px'
                      }}
                      placeholder="Nom complet de la mère (lettres uniquement)"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                      CIN <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={conventionForm.step2.cin}
                      onChange={(e) => {
                        // Ne garder que les chiffres
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        // Formater avec des espaces tous les 3 chiffres
                        const formatted = digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ');
                        setConventionForm({
                          ...conventionForm,
                          step2: { ...conventionForm.step2, cin: formatted }
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        fontSize: '14px'
                      }}
                      placeholder="123 456 789 012"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                      Date délivrance CIN
                    </label>
                    <input
                      type="date"
                      value={conventionForm.step2.delivcin}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        // Validation : la date doit être >= date de naissance + 18 ans
                        if (minDateDelivranceLogic && selectedDate < minDateDelivranceLogic) {
                          alert(`La date de délivrance CIN doit être au minimum le ${new Date(minDateDelivranceLogic).toLocaleDateString('fr-FR')} (18 ans après la date de naissance)`);
                          return;
                        }
                        // Validation : la date ne doit pas être dans le futur
                        if (selectedDate > maxDateDelivrance) {
                          alert('La date de délivrance CIN ne peut pas être dans le futur');
                          return;
                        }
                        setConventionForm({
                        ...conventionForm,
                          step2: { ...conventionForm.step2, delivcin: selectedDate }
                        });
                      }}
                      min={minDateDelivrance}
                      max={maxDateDelivrance}
                      disabled={!conventionForm.step2.datenais}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.cardBackground,
                        color: currentTheme.colors.text,
                        fontSize: '14px',
                        ...(!conventionForm.step2.datenais && { 
                          backgroundColor: currentTheme.colors.backgroundTertiary,
                          cursor: 'not-allowed',
                          opacity: 0.6
                        })
                      }}
                      title={!conventionForm.step2.datenais ? 'Veuillez d\'abord saisir la date de naissance' : minDateDelivranceLogic ? `Date de délivrance CIN (minimum: ${new Date(minDateDelivranceLogic).toLocaleDateString('fr-FR')})` : 'Date de délivrance CIN'}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={conventionForm.step2.adressecli}
                    onChange={(e) => setConventionForm({
                      ...conventionForm,
                      step2: { ...conventionForm.step2, adressecli: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Activité
                  </label>
                  <input
                    type="text"
                    value={conventionForm.step2.activite}
                    onChange={(e) => setConventionForm({
                      ...conventionForm,
                      step2: { ...conventionForm.step2, activite: e.target.value }
                    })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Contact
                  </label>
                  <input
                    type="text"
                    value={conventionForm.step2.contact}
                    onChange={(e) => {
                      // Ne garder que les chiffres, espaces, + et -
                      const value = e.target.value.replace(/[^0-9+\-\s]/g, '');
                      setConventionForm({
                        ...conventionForm,
                        step2: { ...conventionForm.step2, contact: value }
                      });
                    }}
                    placeholder="Ex: +261 34 12 345 67"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    onClick={() => setConventionStep(1)}
                    style={{
                      padding: '12px 24px',
                      background: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      border: `1px solid ${currentTheme.colors.border}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '14px'
                    }}
                  >
                    Précédent
                  </button>
                  <button
                    onClick={handleSaveConvention}
                    disabled={loading || !conventionForm.step2.nomcli || !selectedConvention}
                    style={{
                      padding: '12px 24px',
                      background: currentTheme.colors.primary,
                      color: currentTheme.colors.white,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading || !conventionForm.step2.nomcli || !selectedConvention ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: '14px',
                      opacity: loading || !conventionForm.step2.nomcli || !selectedConvention ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Enregistrement...' : (selectedConvention ? 'Modifier' : 'Créer (désactivé)')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmation de déconnexion */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.3s ease-out',
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{
              background: currentTheme.colors.cardBackground,
              border: `1px solid ${currentTheme.colors.border}`,
              transition: 'all 0.3s ease',
              borderRadius: '24px',
              width: '90%',
              maxWidth: '450px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              position: 'relative',
              animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: 'scale(1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header avec gradient animé */}
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                height: '120px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Effet de vague animé */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1)), linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1))',
                  backgroundSize: '30px 30px',
                  backgroundPosition: '0 0, 15px 15px',
                  opacity: 0.3,
                  animation: 'slide 20s linear infinite',
                }}
              />
              
              {/* Icône circulaire avec animation */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-40px',
                  width: '90px',
                  height: '90px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                  border: '4px solid ' + currentTheme.colors.cardBackground,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
            </div>

            {/* Contenu */}
            <div style={{ padding: '60px 32px 32px', textAlign: 'center' }}>
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: currentTheme.colors.text,
                  lineHeight: 1.3,
                  letterSpacing: '-0.5px',
                }}
              >
                Déconnexion
              </h3>
              <p
                style={{
                  margin: '0 0 32px',
                  fontSize: '15px',
                  color: currentTheme.colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                Êtes-vous sûr de vouloir vous déconnecter ?
                <br />
                <span style={{ fontSize: '13px', opacity: 0.8 }}>
                  Vous devrez vous reconnecter pour accéder à nouveau.
                </span>
              </p>

              {/* Boutons */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '14px 36px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                    position: 'relative',
                    overflow: 'hidden',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translateY(0) scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.02)';
                  }}
                >
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    <i className="fas fa-check" style={{ marginRight: '8px' }}></i>
                    Oui
                  </span>
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  style={{
                    padding: '14px 36px',
                    background: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    border: `2px solid ${currentTheme.colors.border}`,
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    minWidth: '120px',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = currentTheme.colors.backgroundTertiary;
                    e.target.style.borderColor = currentTheme.colors.primary;
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = currentTheme.colors.cardBackground;
                    e.target.style.borderColor = currentTheme.colors.border;
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'translateY(0) scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                >
                  <span>
                    <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                    Non
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes slide {
          0% {
            background-position: 0 0, 15px 15px;
          }
          100% {
            background-position: 30px 30px, 45px 45px;
          }
        }
      `}</style>

      {/* Modal de confirmation personnalisé */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={close}
        onConfirm={confirmState.onConfirm || (() => {})}
        onCancel={confirmState.onCancel || (() => {})}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />

      <InputModal
        isOpen={inputState.isOpen}
        onClose={closeInput}
        onConfirm={inputState.onConfirm || (() => {})}
        onCancel={inputState.onCancel || (() => {})}
        title={inputState.title}
        message={inputState.message}
        inputLabel={inputState.inputLabel}
        inputPlaceholder={inputState.inputPlaceholder}
        type={inputState.type}
        confirmText={inputState.confirmText}
        cancelText={inputState.cancelText}
        required={inputState.required}
        options={inputState.options}
      />

      {/* Modal d'approbation de demande de création de compte */}
      {showApproveModal && selectedDemande && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }} onClick={() => {
          if (!loading) {
            setShowApproveModal(false);
            setSelectedDemande(null);
            setApproveForm({ nom: '', contact: '', email: '' });
          }
        }}>
          <div style={{
            backgroundColor: currentTheme.colors.cardBackground,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${currentTheme.colors.border}`
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              margin: '0 0 24px',
              fontSize: '24px',
              fontWeight: 700,
              color: currentTheme.colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-user-plus" style={{ color: currentTheme.colors.primary }}></i>
              Approuver la demande de compte
            </h2>
            
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: currentTheme.colors.backgroundTertiary, borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary, marginBottom: '8px' }}>
                Matricule: <strong style={{ color: currentTheme.colors.text }}>{selectedDemande.matricule}</strong>
              </div>
              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                Poste: <strong style={{ color: currentTheme.colors.text }}>{selectedDemande.poste}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: currentTheme.colors.text,
                  fontSize: '14px'
                }}>
                  Nom complet <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={approveForm.nom}
                  onChange={(e) => setApproveForm({ ...approveForm, nom: e.target.value })}
                  placeholder="Entrez le nom complet"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.background,
                    color: currentTheme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: currentTheme.colors.text,
                  fontSize: '14px'
                }}>
                  Contact <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={approveForm.contact}
                  onChange={(e) => setApproveForm({ ...approveForm, contact: e.target.value })}
                  placeholder="Entrez le numéro de contact"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.background,
                    color: currentTheme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: currentTheme.colors.text,
                  fontSize: '14px'
                }}>
                  Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={approveForm.email}
                  onChange={(e) => setApproveForm({ ...approveForm, email: e.target.value })}
                  placeholder="Entrez l'adresse email"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.background,
                    color: currentTheme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleApprouverDemandeCreation}
                disabled={loading || !approveForm.nom || !approveForm.contact || !approveForm.email}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: loading || !approveForm.nom || !approveForm.contact || !approveForm.email
                    ? currentTheme.colors.backgroundTertiary
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: loading || !approveForm.nom || !approveForm.contact || !approveForm.email
                    ? currentTheme.colors.textTertiary
                    : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: loading || !approveForm.nom || !approveForm.contact || !approveForm.email
                    ? 'not-allowed'
                    : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Traitement...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Approuver et créer le compte
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedDemande(null);
                  setApproveForm({ nom: '', contact: '', email: '' });
                }}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: currentTheme.colors.text,
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'approbation de demande de réinitialisation de mot de passe */}
      {showResetApproveModal && selectedResetDemande && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }} onClick={() => {
          if (!loading) {
            setShowResetApproveModal(false);
            setSelectedResetDemande(null);
            setResetPasswordForm({ newPassword: '', confirmPassword: '' });
          }
        }}>
          <div style={{
            backgroundColor: currentTheme.colors.cardBackground,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${currentTheme.colors.border}`
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              margin: '0 0 24px',
              fontSize: '24px',
              fontWeight: 700,
              color: currentTheme.colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-key" style={{ color: currentTheme.colors.primary }}></i>
              Approuver la demande de réinitialisation
            </h2>
            
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: currentTheme.colors.backgroundTertiary, borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary, marginBottom: '8px' }}>
                Utilisateur: <strong style={{ color: currentTheme.colors.text }}>{selectedResetDemande.nom || 'N/A'}</strong>
              </div>
              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary, marginBottom: '8px' }}>
                Matricule: <strong style={{ color: currentTheme.colors.text }}>{selectedResetDemande.matricule}</strong>
              </div>
              <div style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                Poste: <strong style={{ color: currentTheme.colors.text }}>{selectedResetDemande.poste}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: currentTheme.colors.text,
                  fontSize: '14px'
                }}>
                  Nouveau mot de passe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                  placeholder="Entrez le nouveau mot de passe"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.background,
                    color: currentTheme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 600,
                  color: currentTheme.colors.text,
                  fontSize: '14px'
                }}>
                  Confirmer le mot de passe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                  placeholder="Confirmez le nouveau mot de passe"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: currentTheme.colors.background,
                    color: currentTheme.colors.text,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={handleApprouverDemandeReset}
                disabled={loading || !resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword || resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword || resetPasswordForm.newPassword.length < 6}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: loading || !resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword || resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword || resetPasswordForm.newPassword.length < 6
                    ? currentTheme.colors.backgroundTertiary
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: loading || !resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword || resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword || resetPasswordForm.newPassword.length < 6
                    ? currentTheme.colors.textTertiary
                    : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: loading || !resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword || resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword || resetPasswordForm.newPassword.length < 6
                    ? 'not-allowed'
                    : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Traitement...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    Approuver et réinitialiser
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowResetApproveModal(false);
                  setSelectedResetDemande(null);
                  setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                }}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: currentTheme.colors.text,
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}