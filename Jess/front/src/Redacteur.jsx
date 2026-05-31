import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from './images/fcee.gif';
import { useTheme } from './contexts/ThemeContext';
import { lightTheme, darkTheme } from './theme';
import ThemeToggle from './components/ThemeToggle';
import { apiRequest, API_ENDPOINTS } from './config/api';
import { useConfirm } from './hooks/useConfirm';
import ConfirmModal from './components/ConfirmModal';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Etats initiaux
const initialStep1 = { numBat: '', adresse: '', montant: '' };
const initialStep2 = { nomcli: '', datenais: '', lieunais: '', pere: '', mere: '', cin: '', delivcin: '', adressecli: '', activite: '', contact: '' };

export default function RedacteurHome() {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { confirm, close, confirmState } = useConfirm();
  const [activeSection, setActiveSection] = useState('conventions'); // 'batiments' | 'conventions' | 'statuts'
  const [batiments, setBatiments] = useState([]);
  const [conventions, setConventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLoginLoader, setShowLoginLoader] = useState(false);

  // Form wizard
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState(initialStep1);
  const [step2, setStep2] = useState(initialStep2);
  const [editingConv, setEditingConv] = useState(null); // object or null
  const [editCountById, setEditCountById] = useState({}); // client-only limit (2)
  const [search, setSearch] = useState('');
  const [selectedConv, setSelectedConv] = useState(null);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [demandesModification, setDemandesModification] = useState([]);
  const [showBatimentDetail, setShowBatimentDetail] = useState(false);
  const [batimentForDetail, setBatimentForDetail] = useState(null);
  const [loadingBatimentDetails, setLoadingBatimentDetails] = useState(false);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  
  // État pour les changements de statut
  const [statusChanges, setStatusChanges] = useState(null);
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(false);
  
  // État pour les paramètres
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [allUsers, setAllUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ nom: '', email: '', contact: '' });

  const API_BATS = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/batiments`, []);
  const API_CONVS = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/conventions`, []);
  const API_USERS = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user`, []);
  const todayStr = useMemo(() => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }), []);

  // Calcul des dates maximales pour les champs de date
  // Date de naissance : maximum il y a 18 ans (personnes majeures uniquement)
  // Minimum : il y a 100 ans (pour limiter la plage d'années visible)
  const minDateNaissance = useMemo(() => {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    return minDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }, []);

  const maxDateNaissance = useMemo(() => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
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

  const maxDateDelivrance = useMemo(() => {
    // Toujours limiter à aujourd'hui (pas de dates futures)
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }, []);

  // Filtre de période pour les statistiques
  const [statsPeriodFilter, setStatsPeriodFilter] = useState('Toutes les données');
  const [evolutionPeriod, setEvolutionPeriod] = useState('mois'); // 'mois', 'semaine', 'jour', 'trimestre', 'annee'

  // Fonction pour filtrer les conventions par période
  const filterConventionsByPeriod = (conventions, period) => {
    if (period === 'Toutes les données') {
      return conventions;
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
        return conventions;
    }

    return conventions.filter(conv => {
      const convDate = new Date(conv.dateConv || conv.createdAt);
      return convDate >= startDate && convDate <= now;
    });
  };

  // Filtrage local des conventions par nom du client (comme dans AdminDash pour les bâtiments)
  const filteredConventions = useMemo(() => {
    let filtered = conventions;
    
    // Filtre par recherche (nom du client uniquement)
    if (search) {
      filtered = filtered.filter(c => {
        const nomClient = c.locataire?.nomcli || '';
        return nomClient.toLowerCase().includes(search.toLowerCase());
      });
    }
    
    // Filtre par période pour les statistiques
    return filterConventionsByPeriod(filtered, statsPeriodFilter);
  }, [conventions, search, statsPeriodFilter]);

  // Vérifier si les colonnes Contact, Ville, Quartier ont des données
  const hasContactData = useMemo(() => {
    return filteredConventions.some(c => c.contact && c.contact.trim() !== '' && c.contact !== 'N/A');
  }, [filteredConventions]);

  const hasVilleData = useMemo(() => {
    return filteredConventions.some(c => c.batiment?.ville && c.batiment.ville.trim() !== '' && c.batiment.ville !== 'Non renseignée');
  }, [filteredConventions]);

  const hasQuartierData = useMemo(() => {
    return filteredConventions.some(c => c.batiment?.quartier && c.batiment.quartier.trim() !== '' && c.batiment.quartier !== 'Non renseigné');
  }, [filteredConventions]);

  const stats = useMemo(() => {
    const total = filteredConventions.length;
    const confirmees = filteredConventions.filter(c => c.statutConv).length;
    const enAttente = filteredConventions.filter(c => !c.statutConv).length;
    const montantTotal = filteredConventions.reduce((sum, c) => sum + (c.batiment?.montant || 0), 0);
    return { total, confirmees, enAttente, montantTotal };
  }, [filteredConventions]);

  // Fonction pour obtenir le nombre de modifications d'une convention spécifique
  const getEditCountForConv = (numConv) => {
    if (!numConv) return 0;
    const modifications = JSON.parse(localStorage.getItem('modificationsJournalieres') || '[]');
    const convModifications = modifications.filter(m => m.numConv === numConv);
    return convModifications.length;
  };

  // Crée (si besoin) une demande de modification pour cette convention (visible côté admin)
  const ensureEditRequestRecorded = async (numConv, raison = 'Limite de modifications atteinte (2 tentatives)') => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');

    // Ne rien faire si une demande est déjà en attente pour cette convention
    const existingPending = demandes.find(d => d.convention === numConv && d.statut === 'en_attente' && !d.utilisee);
    if (existingPending) {
      return;
    }

    // Tenter d'envoyer à l'API (si disponible)
    try {
      const token = localStorage.getItem('token');
      const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-modification`;
      await fetch(API_DEMANDES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'modification',
          raison,
          demandeur: userData.matricule || userData.nom || 'Rédacteur',
          convention: numConv
        })
      });
    } catch (apiError) {
      // Silencieux si l'API n'est pas dispo (fallback localStorage)
    }

    // Enregistrer localement la demande pour qu'elle remonte côté admin
    demandes.push({
      id: Date.now(),
      type: 'modification',
      raison,
      demandeur: userData.nom || 'Rédacteur',
      matricule: userData.matricule || 'N/A',
      convention: numConv,
      statut: 'en_attente',
      date: new Date().toISOString(),
      utilisee: false
    });
    localStorage.setItem('demandesModification', JSON.stringify(demandes));
    setDemandesModification(demandes);

    // Historiser
    const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
    historique.push({
      id: Date.now(),
      utilisateur: userData.nom || 'Rédacteur',
      matricule: userData.matricule || 'N/A',
      action: 'Demande de modification',
      type: 'Convention',
      description: `Demande d'autorisation (auto) pour la convention ${numConv}`,
      date: new Date().toISOString(),
      details: { raison, convention: numConv },
      statut: 'En attente'
    });
    localStorage.setItem('historiqueActivites', JSON.stringify(historique));
  };

  // Fonction pour enregistrer une modification dans l'historique
  const enregistrerModificationHistorique = (convention, action) => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
    
    historique.push({
      id: Date.now(),
      utilisateur: userData.nom || 'Rédacteur',
      matricule: userData.matricule || 'N/A',
      action: action,
      type: 'Convention',
      description: `${action} de la convention ${convention.numConv}`,
      date: new Date().toISOString(),
      details: {
        numConv: convention.numConv,
        locataire: convention.locataire?.nomcli || 'N/A',
        batiment: convention.batiment?.adresse || 'N/A'
      },
      statut: 'Succès'
    });
    
    localStorage.setItem('historiqueActivites', JSON.stringify(historique));
    
    // Enregistrer aussi dans les modifications journalières
    const modifications = JSON.parse(localStorage.getItem('modificationsJournalieres') || '[]');
    modifications.push({
      id: Date.now(),
      numConv: convention.numConv,
      date: new Date().toISOString(),
      action: action
    });
    localStorage.setItem('modificationsJournalieres', JSON.stringify(modifications));
  };

  // Fonction pour charger les changements de statut
  const loadStatusChanges = async () => {
    setLoadingStatusChanges(true);
    setMsg(''); // Réinitialiser le message d'erreur
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      
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
      // Afficher aussi dans la console pour déboguer
      if (errorMessage.includes('403') || errorMessage.includes('Accès refusé')) {
        setMsg('Accès refusé. Vérifiez vos permissions.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Token')) {
        setMsg('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/auth'), 2000);
      } else {
        setMsg(`Erreur: ${errorMessage}`);
      }
    } finally {
      setLoadingStatusChanges(false);
    }
  };

  // Fonction pour mettre à jour les statuts
  const updateStatuses = async () => {
    try {
      setLoadingStatusChanges(true);
      setMsg(''); // Réinitialiser le message
      
      console.log('🔄 Mise à jour des statuts en cours...');
      const response = await apiRequest(API_ENDPOINTS.FACTURES_CHECK_STATUSES, {
        method: 'GET'
      });
      
      if (response.status === 200) {
        const updatedCount = response.data?.updated || 0;
        const checkedCount = response.data?.checked || 0;
        const updatedConventions = response.data?.updatedConventions || [];
        
        console.log(`✅ Mise à jour terminée: ${updatedCount} statut(s) mis à jour sur ${checkedCount} vérifié(s)`);
        if (updatedConventions.length > 0) {
          console.log(`📝 Conventions mises à jour: ${updatedConventions.join(', ')}`);
        }
        
        if (updatedCount > 0) {
          setMsg(`✅ ${updatedCount} statut(s) mis à jour avec succès ! (Conventions: ${updatedConventions.join(', ')})`);
          
          // Afficher un message détaillé dans la console
          console.log('📊 DÉTAILS DES CHANGEMENTS:');
          console.log(`   • ${updatedCount} convention(s) modifiée(s)`);
          console.log(`   • Conventions: ${updatedConventions.join(', ')}`);
          console.log(`   • Changement: Confirmé → En attente`);
        } else {
          setMsg(`ℹ️ Tous les statuts sont déjà à jour (${checkedCount} convention(s) vérifiée(s))`);
        }
        
        // Attendre un court délai pour que l'utilisateur voie le message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recharger les changements et les conventions pour mettre à jour l'affichage
        console.log('🔄 Rechargement des données pour voir les changements...');
        // Forcer le rechargement en vidant d'abord le cache
        setStatusChanges(null);
        
        // Recharger d'abord les conventions pour voir les changements de statut IMMÉDIATEMENT
        console.log('🔄 Rechargement des conventions pour voir les changements...');
        await loadConventions();
        console.log('✅ Conventions rechargées - Les statuts ont changé de "Confirmé" à "En attente"');
        
        // Attendre un peu pour que l'utilisateur voie les changements dans la liste des conventions
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Puis recharger les changements de statut pour voir que la liste est vide
        console.log('🔄 Rechargement des changements de statut...');
        await loadStatusChanges();
        
        // Après le rechargement, la liste des conventions à mettre à jour devrait être vide
        console.log('✅ Données rechargées, les changements sont maintenant visibles:');
        console.log('   • Dans "Conventions": Les statuts sont maintenant "En attente"');
        console.log('   • Dans "Changements de statut": La liste est vide (tous les statuts sont à jour)');
      } else {
        setMsg(`Erreur: ${response.message || 'Statut inattendu'}`);
      }
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour des statuts:', err);
      const errorMessage = err.message || 'Erreur lors de la mise à jour des statuts';
      setMsg(`Erreur: ${errorMessage}`);
    } finally {
      setLoadingStatusChanges(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'batiments') {
      loadBatiments();
    } else if (activeSection === 'conventions') {
      loadConventions();
    } else if (activeSection === 'statuts') {
      loadStatusChanges();
    }
    // Charger les demandes de modification
    const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
    setDemandesModification(demandes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Load bâtiments when the wizard opens (even if we are in conventions section)
  // Pour la création de convention, charger uniquement les bâtiments disponibles
  // Pour l'édition, charger tous les bâtiments
  useEffect(() => {
    if (showWizard) {
      // Si on est en mode création (pas d'editingConv), toujours recharger les bâtiments disponibles
      // Si on est en mode édition (editingConv existe), charger tous les bâtiments
      const availableOnly = !editingConv;
      console.log(`🔍 Chargement bâtiments - Mode création: ${availableOnly}, editingConv: ${editingConv ? editingConv.numConv : 'null'}`);
      loadBatiments(availableOnly);
    }
  }, [showWizard, editingConv]);

  // Gérer l'overlay de chargement pendant la connexion
  useEffect(() => {
    const loginInProgress = localStorage.getItem('loginInProgress');
    if (loginInProgress === 'true') {
      setShowLoginLoader(true);
      // Attendre que la page soit complètement chargée
      const timer = setTimeout(() => {
        setShowLoginLoader(false);
        localStorage.removeItem('loginInProgress');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetWizard = () => {
    setStep(1);
    setStep1(initialStep1);
    setStep2(initialStep2);
    setEditingConv(null);
    // Réinitialiser la liste des bâtiments pour forcer le rechargement avec les bons filtres
    // Cela garantit qu'on charge toujours les bâtiments disponibles lors de la création
    setBatiments([]);
  };
  
  // Fonction pour ouvrir le wizard en mode création (nouvelle convention)
  const openNewConventionWizard = () => {
    // Réinitialiser d'abord pour mettre editingConv à null
    resetWizard();
    // Ouvrir le wizard - le useEffect se chargera de recharger les bâtiments disponibles
    setShowWizard(true);
  };

  const loadBatiments = async (availableOnly = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Ajouter le paramètre available=true si on charge uniquement les bâtiments disponibles
      // Ajouter un timestamp pour éviter le cache
      const timestamp = new Date().getTime();
      const url = availableOnly 
        ? `${API_BATS}?available=true&_t=${timestamp}` 
        : `${API_BATS}?_t=${timestamp}`;
      
      console.log(`🏗️ Chargement bâtiments - URL: ${url}, availableOnly: ${availableOnly}`);
      
      const r = await fetch(url, {
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
        console.log(`✅ ${j.data?.length || 0} bâtiment(s) chargé(s) (availableOnly: ${availableOnly})`);
        setBatiments(j.data || []);
      } else {
        console.error('❌ Erreur chargement bâtiments:', j);
        setMsg("Erreur chargement bâtiments");
      }
    } catch (e) {
      console.error('❌ Erreur chargement bâtiments:', e);
      setMsg("Erreur chargement bâtiments");
    } finally {
      setLoading(false);
    }
  };

  const loadConventions = async () => {
    setLoading(true);
    setMsg(''); // Réinitialiser le message d'erreur
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      
      // Ajouter un timestamp pour éviter le cache du navigateur
      const timestamp = new Date().getTime();
      // Demander toutes les conventions (limit élevé pour récupérer toutes les données)
      const url = `${API_CONVS}?limit=1000&_t=${timestamp}`;
      
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
        setLoading(false);
        return;
      }
      
      if (!r.ok) {
        throw new Error(`Erreur HTTP: ${r.status} ${r.statusText}`);
      }
      
      const j = await r.json();
      
      if (j.status === 200 || j.status === 201) {
        // Forcer la mise à jour avec les nouvelles données
        const newData = Array.isArray(j.data) ? j.data : [];
        console.log(`✅ ${newData.length} convention(s) chargée(s) avec succès`);
        setConventions(newData);
      } else {
        // Gérer les autres statuts
        const errorMsg = j.message || `Erreur: statut ${j.status}`;
        setMsg(errorMsg);
        console.error('Erreur chargement conventions:', j);
        // Ne pas vider les conventions en cas d'erreur, garder les données existantes
      }
    } catch (e) {
      console.error('Erreur chargement conventions:', e);
      setMsg("Erreur chargement conventions: " + (e.message || 'Erreur inconnue'));
      // Ne pas vider les conventions en cas d'erreur réseau
    } finally {
      setLoading(false);
    }
  };


  // Dans ton composant
  const breadcrumbRef = useRef(null);

  useEffect(() => {
    if (breadcrumbRef.current) {
      const activeStep = breadcrumbRef.current.querySelector(`[data-step="${step}"]`);
      if (activeStep) {
        activeStep.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [step]); // Défile à chaque changement d'étape
  const canNextFromStep1 = () => {
    return step1.numBat && Number(step1.numBat) > 0 && step1.adresse && step1.adresse.length <= 20 && step1.montant !== '' && Number(step1.montant) >= 0;
  };
  const canNextFromStep2 = () => {
    const s = step2;
    return s.nomcli && s.datenais && s.lieunais && s.pere && s.mere && s.cin && s.delivcin && s.adressecli && s.activite;
  };

  // Select handler: when choosing a building, auto-fill adresse and montant
  const onSelectBatiment = (e) => {
    const value = e.target.value;
    const selected = batiments.find(b => String(b.numBat) === String(value));
    if (selected) {
      setStep1({
        numBat: String(selected.numBat),
        adresse: selected.adresse || '',
        montant: selected.montant != null ? String(selected.montant) : ''
      });
    } else {
      setStep1({ numBat: '', adresse: '', montant: '' });
    }
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

  const batimentMapCoords = useMemo(() => {
    if (!batimentForDetail) return null;
    const latitude = Number(batimentForDetail.latitude);
    const longitude = Number(batimentForDetail.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { lat: latitude, lng: longitude };
  }, [batimentForDetail]);

  const openBatimentDetail = async (batiment) => {
    if (!batiment) {
      console.warn('openBatimentDetail: batiment is null or undefined');
      return;
    }
    console.log('openBatimentDetail called with:', batiment);
    setBatimentForDetail(batiment);
    setShowBatimentDetail(true);
    setLoadingBatimentDetails(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BATS}/${batiment.numBat}?_t=${Date.now()}`, {
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
      if (result.status === 200 && result.data) {
        setBatimentForDetail(result.data);
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

  const closeBatimentDetail = () => {
    setShowBatimentDetail(false);
    setBatimentForDetail(null);
    setLoadingBatimentDetails(false);
  };

  const onSubmitWizard = async () => {
    setLoading(true);
    try {
      // Supprimer les espaces du CIN avant l'envoi
      const cinWithoutSpaces = step2.cin.replace(/\s/g, '');
      const payload = { ...step1, ...step2, cin: cinWithoutSpaces, statutConv: false };
      let method = 'POST';
      let url = API_CONVS;
      if (editingConv) {
        // Vérifier la limite de 2 modifications par convention
        const countForConv = getEditCountForConv(editingConv.numConv);
        if (countForConv >= 2) {
          // Vérifier si une demande d'approbation existe et est approuvée pour cette convention
          const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
          const demandeApprouvee = demandes.find(d => 
            d.convention === editingConv.numConv &&
            d.statut === 'approuvee' && 
            !d.utilisee
          );
          
          if (!demandeApprouvee) {
            // Créer automatiquement une demande pour l'admin
            await ensureEditRequestRecorded(editingConv.numConv);
            setMsg(`Limite de 2 modifications atteinte pour la convention ${editingConv.numConv}. Demande envoyée à l'administrateur.`);
            setShowEditRequestModal(true);
            setLoading(false);
            return;
          } else {
            // Marquer la demande comme utilisée
            const updatedDemandes = demandes.map(d => 
              d.id === demandeApprouvee.id ? { ...d, utilisee: true } : d
            );
            localStorage.setItem('demandesModification', JSON.stringify(updatedDemandes));
          }
        }
        
        method = 'PUT';
        url = `${API_CONVS}/${editingConv.numConv}`;
      }

      const token = localStorage.getItem('token');
      const r = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }

      const j = await r.json();
      if (j.status === 200 || j.status === 201) {
        if (editingConv) {
          // Mettre à jour immédiatement la convention dans l'état local avec les données retournées
          if (j.data) {
            setConventions(prev => prev.map(c => 
              c.numConv === editingConv.numConv ? j.data : c
            ));
          }
          
          // Enregistrer dans l'historique
          const convention = conventions.find(c => c.numConv === editingConv.numConv);
          if (convention) {
            enregistrerModificationHistorique(convention, 'Modification');
          }
          
          setEditCountById(prev => ({ ...prev, [editingConv.numConv]: (prev[editingConv.numConv] || 0) + 1 }));
        } else {
          // Enregistrer la création dans l'historique
          const nouvelleConvention = j.data || { numConv: payload.numConv || 'N/A' };
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
          
          historique.push({
            id: Date.now(),
            utilisateur: userData.nom || 'Rédacteur',
            matricule: userData.matricule || 'N/A',
            action: 'Création',
            type: 'Convention',
            description: `Création de la convention ${nouvelleConvention.numConv || 'N/A'}`,
            date: new Date().toISOString(),
            details: {
              numConv: nouvelleConvention.numConv || 'N/A',
              locataire: payload.nomcli || 'N/A',
              batiment: payload.adresse || 'N/A'
            },
            statut: 'Succès'
          });
          
          localStorage.setItem('historiqueActivites', JSON.stringify(historique));
        }
        setMsg(editingConv ? 'Convention mise à jour' : 'Convention créée');
        // Réinitialiser editingConv avant de recharger
        setEditingConv(null);
        // Recharger les conventions immédiatement
        await loadConventions();
        setShowWizard(false);
        resetWizard();
      } else {
        // Afficher les erreurs de validation si disponibles
        if (j.errors && Array.isArray(j.errors)) {
          const errorMessages = j.errors.map(e => e.message).join(', ');
          setMsg(`Erreurs de validation: ${errorMessages}`);
        } else {
          setMsg(j.message || 'Erreur enregistrement convention');
        }
        console.error('Erreur API:', j);
      }
    } catch (e) {
      console.error(e);
      setMsg('Erreur enregistrement convention');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 2500);
    }
  };

  const onEffacerTout = async () => {
    const firstConfirm = await confirm({
      title: '⚠️ ATTENTION',
      message: 'Cette action va supprimer TOUTES les conventions. Cette action est irréversible.\n\nÊtes-vous sûr de vouloir continuer ?',
      type: 'danger',
      confirmText: 'Continuer',
      cancelText: 'Annuler'
    });

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = await confirm({
      title: '⚠️ DERNIÈRE CONFIRMATION',
      message: 'Vous êtes sur le point de supprimer TOUTES les conventions. Cette action ne peut pas être annulée.\n\nConfirmez-vous cette action ?',
      type: 'danger',
      confirmText: 'Confirmer',
      cancelText: 'Annuler'
    });

    if (!secondConfirm) {
      return;
    }

    setLoading(true);
    try {
      // Filtrer les conventions : exclure celles qui sont "en attente" (statutConv = false)
      const conventionsToDelete = conventions.filter(conv => conv.statutConv === true);
      const conventionsEnAttente = conventions.filter(conv => conv.statutConv === false);
      
      if (conventionsToDelete.length === 0) {
        setMsg('Aucune convention supprimable. Toutes les conventions sont encore en attente.');
        setLoading(false);
        setTimeout(() => setMsg(''), 5000);
        return;
      }
      
      if (conventionsEnAttente.length > 0) {
        const confirmMsg = `${conventionsEnAttente.length} convention(s) en attente seront exclues de la suppression. Voulez-vous continuer ?`;
        const shouldContinue = await confirm({
          title: '⚠️ Conventions en attente',
          message: confirmMsg,
          type: 'warning',
          confirmText: 'Continuer',
          cancelText: 'Annuler'
        });
        
        if (!shouldContinue) {
          setLoading(false);
          return;
        }
      }
      
      let successCount = 0;
      let errorCount = 0;

      for (const conv of conventionsToDelete) {
        try {
          await apiRequest(API_ENDPOINTS.CONVENTION(conv.numConv), {
            method: 'DELETE'
          });
          successCount++;
        } catch (err) {
          console.error(`Erreur lors de la suppression de la convention ${conv.numConv}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        let msg = `✅ ${successCount} convention(s) supprimée(s)${errorCount > 0 ? `. ${errorCount} erreur(s).` : ' avec succès.'}`;
        if (conventionsEnAttente.length > 0) {
          msg += ` ${conventionsEnAttente.length} convention(s) en attente exclue(s).`;
        }
        setMsg(msg);
        // Recharger les conventions
        await loadConventions();
        setConventions([]);
      } else {
        setMsg(`❌ Aucune convention n'a pu être supprimée. ${errorCount} erreur(s).`);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression en masse:', err);
      setMsg('Erreur lors de la suppression en masse des conventions');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const onCancelConv = async (numConv) => {
    // S'assurer que numConv est un nombre
    const numConvInt = parseInt(numConv);
    if (isNaN(numConvInt)) {
      setMsg('Numéro de convention invalide');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    
    const convention = conventions.find(c => c.numConv === numConvInt);
    if (!convention) {
      setMsg('Convention non trouvée');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    
    // Vérifier si la convention est "en attente" (statutConv = false)
    if (convention.statutConv === false) {
      setMsg('❌ Impossible de supprimer : cette convention est encore en attente.');
      setTimeout(() => setMsg(''), 5000);
      return;
    }
    
    setLoading(true);
    try {
      console.log('🗑️ Suppression de la convention:', numConvInt);
      
      // Supprimer directement la convention avec apiRequest
      const result = await apiRequest(API_ENDPOINTS.CONVENTION(numConvInt), {
        method: 'DELETE'
      });

      console.log('✅ Résultat suppression:', result);
      
      if (result.status === 200) {
        setMsg('✅ Convention supprimée avec succès');
        
        // Fermer le modal si ouvert
        if (selectedConv && selectedConv.numConv === numConvInt) {
          setSelectedConv(null);
        }
        
        // Retirer la convention de la liste immédiatement pour un feedback visuel instantané
        setConventions(prev => prev.filter(c => c.numConv !== numConvInt));
        
        // Forcer le rechargement des conventions avec un petit délai pour s'assurer que la DB est à jour
        setTimeout(async () => {
          await loadConventions();
        }, 100);
      } else if (result.status === 409) {
        // Convention en attente - ne peut pas être supprimée
        setMsg('❌ ' + (result.message || 'Impossible de supprimer : cette convention est encore en attente.'));
      } else {
        setMsg('❌ ' + (result.message || 'Erreur lors de la suppression'));
      }
    } catch (e) {
      console.error('❌ Erreur lors de la suppression:', e);
      setMsg('❌ Erreur lors de la suppression de la convention: ' + (e.message || 'Erreur inconnue'));
      
      // Si erreur d'authentification, rediriger vers login
      if (e.message && (e.message.includes('401') || e.message.includes('403'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const onEditConv = async (c) => {
    // Vérifier la limite de 2 modifications par convention
    const countForConv = getEditCountForConv(c.numConv);
    if (countForConv >= 2) {
      // Vérifier si une demande d'approbation existe et est approuvée pour cette convention
      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
      const demandeApprouvee = demandes.find(d => 
        d.convention === c.numConv &&
        d.statut === 'approuvee' && 
        !d.utilisee
      );
      
      if (!demandeApprouvee) {
        // Demande automatique envoyée à l'admin, notification utilisateur
        await ensureEditRequestRecorded(c.numConv, 'Limite de 2 modifications atteinte (demande auto)');
        setMsg(`Demande envoyée automatiquement à l'administrateur pour la convention ${c.numConv}. En attente d'approbation.`);
        // Pas de blocage du bouton : il reste cliquable, mais on sort tant que l'admin n'a pas approuvé
        return;
      }
    }
    
    setEditingConv(c);
    setStep1({
      numBat: String(c.numBat),
      adresse: c.batiment?.adresse || '',
      montant: c.batiment?.montant != null ? String(c.batiment.montant) : ''
    });
    setStep2({
      nomcli: c.locataire?.nomcli || '',
      datenais: c.locataire?.datenais || '',
      lieunais: c.locataire?.lieunais || '',
      pere: c.locataire?.pere || '',
      mere: c.locataire?.mere || '',
      cin: c.locataire?.cin ? c.locataire.cin.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ') : '',
      delivcin: c.locataire?.delivcin || '',
      adressecli: c.locataire?.adressecli || '',
      activite: c.locataire?.activite || '',
      contact: c.contact || ''
    });
    setShowWizard(true);
    setStep(1);
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

  const printConvention = async (c) => {
    const cinFormatted = c.locataire?.cin ? c.locataire.cin.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ') : '';
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
      cin: cinFormatted,
      delivcin: c.locataire?.delivcin || '',
      adressecli: c.locataire?.adressecli || '',
      activite: c.locataire?.activite || ''
    };
    
    // Convertir le logo en base64 pour l'inclure dans le HTML
    let logoBase64 = '';
    try {
      // Utiliser le chemin de l'image importé par webpack
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
      // Fallback: utiliser le chemin direct
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogoutModal(false);
    navigate('/');
  };

  const previewText = ({ step1: s1 = step1, step2: s2 = step2 }) => {
    const year = new Date().getFullYear();
    return (
      `CONVENTION N° ....../TER/${year}\n\n` +
      `Article 1 : La Société d'Etat Ligne FCE donne en location à titre temporaire à ${s2.nomcli} un bâtiment sis à ${s1.adresse}.\n` +
      `Article 2 : La location est consentie pour permettre à ${s2.nomcli}.\n\n` +
      `Locataire né(e) le ${s2.datenais} à ${s2.lieunais}, fils/fille de ${s2.pere} et de ${s2.mere}.\n` +
      `CIN: ${s2.cin} délivrée le ${s2.delivcin}. Adresse: ${s2.adressecli}. Activité: ${s2.activite}.\n\n` +
      `Bâtiment ${s1.numBat} – Montant: ${s1.montant} Ar.`
    );
  };

  // Styles A4 + rendu 2 pages (aperçu et impression)
  const docCss = `
    @media screen {
      .doc { background: #e5e7eb; padding: 24px; }
      .page { width: 793.7px; /* A4 210mm at 96dpi */ min-height: 1122.5px; margin: 0 auto 24px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.12); padding: 32px 40px; }
    }
    @media print {
      @page { 
        size: A4;
        margin: 0;
      }
      body, html { 
        margin: 0; 
        padding: 0; 
        background: #e5e7eb;
        width: 100%;
      }
      .doc { 
        background: #e5e7eb;
        padding: 20mm 0;
        min-height: 100vh;
      }
      .page { 
        width: 210mm; 
        min-height: 297mm; 
        margin: 0 auto;
        background: #fff;
        page-break-after: always; 
        padding: 15mm 18mm;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .page:last-child { page-break-after: auto; }
    }
    .hl { color: #0ea5e9; font-weight: 600; }
    .title { text-align: center; font-weight: 700; text-transform: uppercase; }
    .subtitle { text-align: center; margin-top: 2px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .logo-container { text-align: left; margin-bottom: 16px; }
    .logo-container img { max-width: 120px; height: auto; display: block; }
    .sep { height: 1px; background: #e5e7eb; margin: 12px 0 16px; }
    .article { margin: 8px 0; text-align: justify; }
    .sig { display: flex; justify-content: space-between; margin-top: 28px; }
    .muted { color: #6b7280; font-size: 12px; }
    `;
  {/* {step === 3 && (
                <div style={{ display: 'grid', gap: 16 }}>
                  <style>{docCss}</style>
                  <div className="doc" style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                   
                    <div className="page" style={{ flex: '0 0 793.7px' }}>
                      <div className="header">
                        <div>
                          <div style={{ fontWeight: 700 }}>LA DIRECTION DE LA F.C.E.</div>
                          <div>FIANARANTSOA</div>
                        </div>
                        <div className="muted">CONVENTION N° <span className="hl">..../TER/${new Date().getFullYear()}</span></div>
                      </div>
                      <div className="title">D'UN BÂTIMENT SIS À <span className="hl">{step1.adresse ? step1.adresse.toUpperCase() : 'MANAKARA'}</span></div>
                      <div className="sep"></div>
                      <div className="article"><strong>Article 1 :</strong> La Société d'Etat Ligne FCE donne en location à titre temporaire à <span className="hl">{step2.nomcli || 'nom du locataire'}</span> d'un bâtiment sis à <span className="hl">{step1.adresse || 'lieux du location'}</span>.</div>
                      <div className="article"><strong>Article 2 :</strong> la location est consentie pour permettre à Mme/Mr <span className="hl">{step2.nomcli || 'nom du locataire'}</span></div>
                      <div className="article" style={{ marginTop: 12 }}>
                        <div>né le : <span className="hl">{step2.datenais || 'date de naissance'}</span>, à <span className="hl">{step2.lieunais || 'lieux de naissance'}</span>,</div>
                        <div>Fils de : <span className="hl">{step2.pere || 'Père'}</span> et de <span className="hl">{step2.mere || 'mère'}</span>.</div>
                        <div>CIN : <span className="hl">{step2.cin || 'N° CIN'}</span> délivrée le <span className="hl">{step2.delivcin || 'date cin'}</span>.</div>
                        <div>Adresse : <span className="hl">{step2.adressecli || '................................'}</span>.</div>
                        <div>Activité : <span className="hl">{step2.activite || '................................'}</span></div>
                        <div style={{ marginTop: 8 }}>pour <span className="hl">usage du batiment</span></div>
                      </div>
                      <div className="article"><strong>Article 3 :</strong> Le locataire doit sous seule responsabilité se conformer aux prescriptions légales ou réglementaires relatives aux Chemins de Fer, ainsi qu'aux diverses dispositions relatives à la sécurité.</div>
                      <div className="article"><strong>Article 4 :</strong> Aucune modification ou extension sur le fond loué ne peut être entreprise qu'avec l'accord de la ligne FCE.</div>
                      <div className="article"><strong>Article 5 :</strong> Le locataire déclare expressément prendre à sa charge dans tous les cas les risques d'incendie Il doit contracter une assurance pour un montant qui devra évaluer par ses soins.</div>
                      <div className="article"><strong>Article 6 :</strong> Le locataire supportera seul toutes les charges de ville ou police instituée et paiera à compter de la date d'effet de la présente note, les taxes et impôts de toute nature gravant l'immeuble pendant la location. Ainsi qu'un droit de timbre proportionnel s'élevant en présent acte.</div>
                      <div className="article"><strong>Article 7 :</strong> La présente location est établie à titre strictement personnel, au profit de Mme/Mr <span className="hl">{step2.nomcli || 'Nom du locataire'}</span>. La cession ou la sous location du droit à bail, lui est interdite, sous peine de déchéance, sans autorisation spéciale écrite du Réseau National des Chemins de Fer Malagasy/FCE.</div>
                      <div className="article"><strong>Article 8 :</strong> Le prix de location est fixé à <span className="hl">tarif</span> AR/TTC (<span className="hl">tarif en lettre</span> ARIARY) par mois payable en entier au début de chaque période par virement bancaire au compte BOA de la FCE 0009 02000 1 294564 000 0 – 88 et centraliser le bordereau de versement au Chef de Gare, ou envoyé la version numérique du bordereau à l'adresse email : <a href="mailto:contact.fce@fce.mg" style={{ color: '#0ea5e9' }}>contact.fce@fce.mg</a> et</div>
                    </div>

                    
                    <div className="page" style={{ flex: '0 0 793.7px' }}>
                      <div style={{ marginTop: 32 }}>
                        <a href="mailto:fivanaina.razafindrabenja@fce.mg" style={{ color: '#0ea5e9' }}>fivanaina.razafindrabenja@fce.mg</a> _Le non-paiement à l'échéance, entraînera une pénalité de retard de <span className="hl">cinq pourcent (1%)</span> par jour du loyer en fonction du nombre de jours de retard.
                      </div>
                      <div style={{ marginTop: 12, textAlign: 'justify' }}>
                        La présente convention sera résiliée de plein de droit un mois après une lettre de rappel non suivie d'effet et le locataire pourra être poursuivi par voies légales pour les règlements des sommes dues par application de la présente convention.
                      </div>
                      <div className="article"><strong>Article 9 :</strong> La présente convention est conclue pour une durée d'un (01) an renouvelable avec une augmentation de <span className="hl">cinq pourcent (5%)</span> et à compter de la date d'effet de la notification. À l'expiration de cette période, la présente convention sera renouvelée par tacite reconduction sauf dénonciation régulière pour une nouvelle période.</div>
                      <div className="article"><strong>Article 10 :</strong> Les deux parties peuvent résilier la présente convention avant son expiration par simple préavis.</div>
                      <div className="article"><strong>Article 11 :</strong> tout ce qui n'est pas prévu par la présente convention, devra se référer aux articles du Code Civil régissant le contrat de louange location.</div>
                      <div className="article"><strong>Article 12 :</strong> Tout différend s'élevant entre la <strong>Direction de la FCE</strong> et Mme/Mr <span className="hl">{step2.nomcli || 'Nom du locataire'}</span> à l'occasion de l'exécution du présent contrat sera porté devant le tribunal Administratif de FIANARANTSOA.</div>
                      <div className="article"><strong>Article 13 :</strong> la présente convention annule la convention antérieure, mais pas les factures émises par le biais de la convention expirée, qui doivent être régularisés dans un délai raisonnable.</div>
                      <div className="article"><strong>Article 14 :</strong> Pour l'exécution de la présente, les deux parties font élection de domicile :</div>
                      <div style={{ marginTop: 8, marginLeft: 20 }}>
                        <div>FIANARANTSOA pour <strong>LA SOCIETE D'ETAT/RNCFM/FCE</strong></div>
                        <div>FIANARANTSOA pour Mme/Mr <span className="hl">{step2.nomcli || 'Nom du locataire'}</span></div>
                        <div>LA DATE D'EFFET est fixée le : <span className="hl">{step2.datenais || 'date du convention'}</span></div>
                      </div>
                      <div style={{ marginTop: 40, marginBottom: 20 }}>Fianarantsoa le,</div>
                      <div className="sig" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div>Le Directeur de la FCE</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>LE LOCATAIRE</div>
                          <div style={{ fontSize: 12, marginTop: 4 }}>Lu et approuvé</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div>Le Chef Service Patrimoine</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 60, textAlign: 'right', fontSize: 13 }}>
                        <div>RAZAFINDRANBENIJA</div>
                        <div>Livanaina Lucie</div>
                      </div>
                    </div>
                  </div>
                  <WizardFooter />
                </div>
              )} */}

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

  const WizardFooter = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderTop: '1px solid #e5e7eb', 
      padding: '20px 32px',
      background: currentTheme.colors.background
    }}>
      <button 
        type="button" 
        onClick={() => { setShowWizard(false); resetWizard(); }} 
        disabled={loading} 
        style={{
          padding: '12px 24px',
          background: currentTheme.colors.cardBackground,
          color: '#6b7280',
          border: '1px solid #d1d5db',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = currentTheme.colors.cardBackground;
            e.currentTarget.style.borderColor = '#d1d5db';
          }
        }}
      >
        Annuler
      </button>
      <div style={{ display: 'flex', gap: 12 }}>
        {step > 1 && (
          <button 
            type="button" 
            onClick={() => setStep(step - 1)} 
            disabled={loading} 
            style={{
              padding: '12px 24px',
              background: currentTheme.colors.cardBackground,
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = currentTheme.colors.cardBackground;
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
          >
            <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
            Précédent
          </button>
        )}
        {step < 3 && (
          <button 
            type="button" 
            onClick={() => setStep(step + 1)} 
            disabled={loading || (step === 1 ? !canNextFromStep1() : !canNextFromStep2())} 
            style={{ 
              padding: '12px 24px',
              background: (step === 1 ? canNextFromStep1() : canNextFromStep2()) 
                ? `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.primaryDark} 100%)` 
                : currentTheme.colors.border,
              color: currentTheme.colors.white,
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: (step === 1 ? canNextFromStep1() : canNextFromStep2()) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: (step === 1 ? canNextFromStep1() : canNextFromStep2()) 
                ? '0 4px 12px rgba(0, 123, 255, 0.3)' 
                : 'none'
            }}
            onMouseEnter={(e) => {
              if ((step === 1 ? canNextFromStep1() : canNextFromStep2())) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if ((step === 1 ? canNextFromStep1() : canNextFromStep2())) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
              }
            }}
          >
            Suivant
            <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i>
          </button>
        )}
        {step === 3 && (() => {
          // Vérifier si la limite est atteinte pour une modification
          const isEditMode = editingConv !== null;
          const limitReached = isEditMode && (() => {
            const countForConv = getEditCountForConv(editingConv.numConv);
            if (countForConv >= 2) {
              const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
              const demandeApprouvee = demandes.find(d => 
                d.convention === editingConv.numConv &&
                d.statut === 'approuvee' && 
                !d.utilisee
              );
              return !demandeApprouvee;
            }
            return false;
          })();

          return (
            <>
              {limitReached && (
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditRequestModal(true);
                    setEditRequestReason('');
                  }}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: loading 
                      ? currentTheme.colors.border 
                      : `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)`,
                    color: currentTheme.colors.white,
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: loading 
                      ? 'none' 
                      : '0 4px 12px rgba(245, 158, 11, 0.3)',
                    marginRight: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                    }
                  }}
                >
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  Demander autorisation
                </button>
              )}
              <button 
                type="button" 
                onClick={onSubmitWizard} 
                disabled={loading || limitReached} 
                style={{
                  padding: '12px 24px',
                  background: loading || limitReached
                    ? currentTheme.colors.border 
                    : `linear-gradient(135deg, ${currentTheme.colors.success} 0%, ${currentTheme.colors.successLight} 100%)`,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: loading || limitReached ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: loading || limitReached
                    ? 'none' 
                    : '0 4px 12px rgba(34, 197, 94, 0.3)',
                  opacity: limitReached ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading && !limitReached) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && !limitReached) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check" style={{ marginRight: '8px' }}></i>
                    {editingConv ? 'Mettre à jour' : 'Valider'}
                  </>
                )}
              </button>
            </>
          );
        })()}
      </div>
    </div>
  );

  return (
    <>
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: currentTheme.colors.backgroundSecondary, overflow: 'hidden', transition: 'background-color 0.3s ease' }}>
      <aside
        style={{
          width: '280px',
          backgroundColor: currentTheme.colors.cardBackground,
          borderRight: `1px solid ${currentTheme.colors.border}`,
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: 'auto',
          zIndex: 100,
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
              { icon: 'fa-building', label: 'Bâtiments', section: 'batiments', active: activeSection === 'batiments' },
              { icon: 'fa-file-contract', label: 'Conventions', section: 'conventions', active: activeSection === 'conventions' },
              { icon: 'fa-sync-alt', label: 'Changements de statut', section: 'statuts', active: activeSection === 'statuts', badge: statusChanges?.data?.needsUpdate || 0 },
              { icon: 'fa-cog', label: 'Paramètres', section: 'parametres', active: activeSection === 'parametres' },
              { icon: 'fa-sign-out-alt', label: 'Déconnexion', section: 'logout', active: false },
            ].map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.section === 'batiments' || item.section === 'conventions' || item.section === 'statuts' || item.section === 'parametres') {
                      setActiveSection(item.section);
                      setMsg('');
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
                    backgroundColor: item.active ? (isDark ? 'rgba(77, 124, 254, 0.2)' : currentTheme.colors.backgroundTertiary) : 'transparent',
                    fontWeight: item.active ? '600' : '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    border: item.active ? `1px solid ${currentTheme.colors.primary}` : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center' }}></i>
                  <span style={{ lineHeight: 1, flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      minWidth: '20px',
                      textAlign: 'center'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Contenu principal */}
      <main style={{ 
        flex: 1,
        marginLeft: '280px', 
        padding: '32px', 
        backgroundColor: currentTheme.colors.background,
        width: 'calc(100% - 280px)',
        overflowY: 'auto',
        height: '100vh',
      }}>
        {activeSection === 'batiments' && (
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
                Liste des Bâtiments
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: currentTheme.colors.textTertiary,
                fontWeight: 400
              }}>
                Consultation en lecture seule des bâtiments disponibles
              </p>
            </div>

            {/* Barre de recherche */}
            <div style={{ marginBottom: '24px' }}>
              <input
                type="search"
                placeholder="Rechercher par N° Bâtiment, Adresse ou Montant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  background: currentTheme.colors.cardBackground,
                  color: currentTheme.colors.text,
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(77, 124, 254, 0.2)' : 'rgba(0, 123, 255, 0.1)'}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = currentTheme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Liste des bâtiments */}
            {loading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: currentTheme.colors.cardBackground,
                borderRadius: '12px',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: currentTheme.colors.textTertiary }}></i>
                <p style={{ marginTop: '16px', color: currentTheme.colors.textTertiary }}>Chargement des bâtiments...</p>
              </div>
            ) : batiments.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                background: currentTheme.colors.cardBackground,
                borderRadius: '12px',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                <i className="fas fa-building" style={{ fontSize: '48px', color: currentTheme.colors.textTertiary, marginBottom: '16px' }}></i>
                <p style={{ color: currentTheme.colors.textTertiary, fontSize: '16px' }}>Aucun bâtiment trouvé</p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '20px' 
              }}>
                {batiments
                  .filter(b => {
                    if (!search) return true;
                    const searchLower = search.toLowerCase();
                    return (
                      String(b.numBat).toLowerCase().includes(searchLower) ||
                      (b.adresse && b.adresse.toLowerCase().includes(searchLower))
                    );
                  })
                  .map((batiment) => (
                    <div
                      key={batiment.numBat}
                      style={{
                        background: currentTheme.colors.cardBackground,
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '12px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                    >
                      {/* Header de la carte */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '16px' 
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.primaryDark} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
                        }}>
                          <i className="fas fa-building" style={{ fontSize: '20px', color: currentTheme.colors.white }}></i>
                        </div>
                        <div>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: '18px', 
                            fontWeight: 700, 
                            color: currentTheme.colors.text 
                          }}>
                            Cité n°{batiment.numBat}
                          </h3>
                        </div>
                      </div>

                      {/* Informations du bâtiment */}
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: currentTheme.colors.textTertiary, 
                            marginBottom: '4px',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Adresse
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            color: currentTheme.colors.text,
                            fontWeight: 500
                          }}>
                            {batiment.adresse || 'Non spécifiée'}
                          </div>
                        </div>

                        {batiment.montant !== undefined && batiment.montant !== null && (
                          <div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: currentTheme.colors.textTertiary, 
                              marginBottom: '4px',
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Montant mensuel
                            </div>
                            <div style={{ 
                              fontSize: '16px', 
                              color: '#22c55e',
                              fontWeight: 700
                            }}>
                              {Number(batiment.montant).toLocaleString('fr-FR')} Ar
                            </div>
                          </div>
                        )}

                        {batiment.image && (
                          <div style={{ marginTop: '12px' }}>
                            <img
                              src={`data:image/jpeg;base64,${batiment.image}`}
                              alt={`Bâtiment ${batiment.numBat}`}
                              style={{
                                width: '100%',
                                height: '180px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: `1px solid ${currentTheme.colors.border}`
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        
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

            {/* Boutons d'action */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={updateStatuses}
                disabled={loadingStatusChanges}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: loadingStatusChanges ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: loadingStatusChanges ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className={`fas ${loadingStatusChanges ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                Mettre à jour les statuts
              </button>
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
            </div>

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

                {/* Toutes les conventions */}
                <div>
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: 600, 
                    color: currentTheme.colors.text,
                    marginBottom: '16px'
                  }}>
                    Toutes les conventions ({statusChanges.data.total})
                  </h2>
                  <div style={{
                    background: currentTheme.colors.cardBackground,
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: currentTheme.colors.backgroundTertiary, borderBottom: `1px solid ${currentTheme.colors.border}` }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary }}>N° Conv.</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Client</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Statut actuel</th>
                          <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Statut attendu</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Dernier paiement</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusChanges.data.changes.map((change, index) => (
                          <tr 
                            key={change.numConv}
                            style={{
                              borderBottom: index < statusChanges.data.changes.length - 1 ? `1px solid ${currentTheme.colors.border}` : 'none',
                              background: change.needsUpdate ? (isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2') : 'transparent'
                            }}
                          >
                            <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: currentTheme.colors.text }}>
                              #{change.numConv}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: currentTheme.colors.text }}>
                              {change.locataire?.nomcli || 'N/A'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: change.currentStatus === 'Confirmé' ? '#dcfce7' : '#fef3c7',
                                color: change.currentStatus === 'Confirmé' ? '#166534' : '#92400e'
                              }}>
                                {change.currentStatus}
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: change.expectedStatus === 'Confirmé' ? '#dcfce7' : '#fef3c7',
                                color: change.expectedStatus === 'Confirmé' ? '#166534' : '#92400e'
                              }}>
                                {change.expectedStatus}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                              {change.lastPaymentMonth || 'Aucun'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px', color: currentTheme.colors.textTertiary, fontStyle: 'italic' }}>
                              {change.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : msg && (msg.includes('Erreur') || msg.includes('Accès') || msg.includes('Session')) ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '16px', color: '#ef4444' }}></i>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>Erreur de chargement</p>
                <p style={{ margin: '8px 0 16px', fontSize: '14px', color: '#6b7280' }}>{msg}</p>
                <button
                  onClick={loadStatusChanges}
                  disabled={loadingStatusChanges}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingStatusChanges ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    opacity: loadingStatusChanges ? 0.6 : 1
                  }}
                >
                  {loadingStatusChanges ? 'Chargement...' : 'Réessayer'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: currentTheme.colors.textTertiary }}>
                <i className="fas fa-info-circle" style={{ fontSize: '48px', marginBottom: '16px', color: '#d1d5db' }}></i>
                <p style={{ margin: 0, fontSize: '16px' }}>Aucune donnée disponible</p>
                <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Cliquez sur "Actualiser" pour charger les données</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'parametres' && (
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
                Paramètres
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#6b7280',
                fontWeight: 400
              }}>
                Gérez vos préférences et votre compte
              </p>
            </div>

            {/* Cartes de paramètres */}
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Mon Profil */}
              <div style={{
                background: currentTheme.colors.cardBackground,
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
                  }}>
                    <i className="fas fa-user" style={{ fontSize: '24px', color: currentTheme.colors.white }}></i>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: currentTheme.colors.text }}>Mon Profil</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>Informations personnelles et sécurité</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>
                      Matricule
                    </label>
                <input
                      type="text"
                      value={user?.matricule || ''}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: currentTheme.colors.textTertiary,
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>
                      Poste
                    </label>
                    <input
                      type="text"
                      value={user?.poste ? user.poste.charAt(0).toUpperCase() + user.poste.slice(1) : ''}
                      readOnly
                  style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: currentTheme.colors.textTertiary,
                        cursor: 'not-allowed'
                      }}
                    />
              </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: currentTheme.colors.textTertiary,
                        cursor: 'not-allowed'
                      }}
                    />
            </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151'
                    }}>
                      Contact
                    </label>
                    <input
                      type="text"
                      value={user?.contact || ''}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        color: currentTheme.colors.textTertiary,
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                  <button
                    style={{
                      padding: '12px 24px',
                      background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.primaryDark} 100%)`,
                      color: currentTheme.colors.white,
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
                    }}
                  >
                    <i className="fas fa-key" style={{ marginRight: '8px' }}></i>
                    Modifier le mot de passe
                  </button>
                </div>
              </div>

              {/* Préférences */}
              <div style={{
                background: currentTheme.colors.cardBackground,
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: `1px solid ${currentTheme.colors.border}`,
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}>
                    <i className="fas fa-sliders-h" style={{ fontSize: '24px', color: currentTheme.colors.white }}></i>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: currentTheme.colors.text }}>Préférences</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>Personnalisez votre expérience</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: isDark ? currentTheme.colors.backgroundTertiary : '#f9fafb', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: currentTheme.colors.text, marginBottom: '4px' }}>Langue</div>
                      <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary }}>Choisissez votre langue préférée</div>
                    </div>
                    <select style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      fontSize: '14px',
                      background: currentTheme.colors.cardBackground,
                      transition: 'all 0.3s ease',
                      color: currentTheme.colors.text,
                      cursor: 'pointer',
                      minWidth: '150px'
                    }}>
                      <option value="fr">Français</option>
                      <option value="mg">Malagasy</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: isDark ? currentTheme.colors.backgroundTertiary : '#f9fafb', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: currentTheme.colors.text, marginBottom: '4px' }}>Format de date</div>
                      <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary }}>Format d'affichage des dates</div>
                    </div>
                    <select style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      fontSize: '14px',
                      background: currentTheme.colors.cardBackground,
                      transition: 'all 0.3s ease',
                      color: currentTheme.colors.text,
                      cursor: 'pointer',
                      minWidth: '150px'
                    }}>
                      <option value="fr-FR">DD/MM/YYYY</option>
                      <option value="en-US">MM/DD/YYYY</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: isDark ? currentTheme.colors.backgroundTertiary : '#f9fafb', borderRadius: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: currentTheme.colors.text, marginBottom: '4px' }}>Thème</div>
                      <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary }}>Apparence de l'interface</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                        {isDark ? '🌙 Mode sombre' : '☀️ Mode clair'}
                      </span>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </div>

              {/* Paramètres de conventions (pour Rédacteur) */}
              {(user?.poste === 'opérateur de saisie' || user?.poste === 'redacteur') && (
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  borderRadius: '16px',
                  padding: '28px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                    }}>
                      <i className="fas fa-file-contract" style={{ fontSize: '24px', color: 'white' }}></i>
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: currentTheme.colors.text }}>Paramètres de Conventions</h2>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>Configuration des conventions</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: isDark ? currentTheme.colors.backgroundTertiary : '#f9fafb', borderRadius: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: currentTheme.colors.text, marginBottom: '4px' }}>Limite de modifications</div>
                        <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary }}>Nombre maximum de modifications par convention</div>
                      </div>
                      <div style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: isDark 
                          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)'
                          : 'linear-gradient(135deg, #e7f3ff 0%, #d0e7ff 100%)',
                        border: `2px solid ${isDark ? '#3b82f6' : '#007bff'}`,
                        fontWeight: 700,
                        fontSize: '18px',
                        color: isDark ? '#60a5fa' : '#007bff'
                      }}>
                        2
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: isDark ? currentTheme.colors.backgroundTertiary : '#f9fafb', borderRadius: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: currentTheme.colors.text, marginBottom: '4px' }}>Format d'impression</div>
                        <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary }}>Format par défaut pour l'impression</div>
                      </div>
                      <select style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        fontSize: '14px',
                        background: currentTheme.colors.cardBackground,
                        transition: 'all 0.3s ease',
                        color: currentTheme.colors.text,
                        cursor: 'pointer',
                        minWidth: '150px'
                      }}>
                        <option value="a4">A4 (Portrait)</option>
                        <option value="a4-landscape">A4 (Paysage)</option>
                      </select>
                    </div>
                  </div>
              </div>
            )}

              {/* Gestion des utilisateurs (Admin uniquement) */}
              {user?.poste === 'administrateur' && (
                <div style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.3s ease',
                  borderRadius: '16px',
                  padding: '28px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                    }}>
                      <i className="fas fa-users-cog" style={{ fontSize: '24px', color: 'white' }}></i>
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>Gestion des Utilisateurs</h2>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>Modifier les informations des utilisateurs</p>
                    </div>
                  </div>

                  {loading && allUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>Chargement des utilisateurs...</div>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: '#9ca3af'
                    }}>
                      <i className="fas fa-users" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
                      <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>Aucun utilisateur trouvé</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {allUsers.map((u) => (
                        <div
                          key={u.matricule}
                          style={{
                            padding: '20px',
                            background: editingUser?.matricule === u.matricule ? '#f0f9ff' : '#f9fafb',
                            borderRadius: '12px',
                            border: editingUser?.matricule === u.matricule ? '2px solid #007bff' : '1px solid #e5e7eb',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {editingUser?.matricule === u.matricule ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div>
                                  <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#374151'
                                  }}>
                                    Nom <span style={{ color: '#ef4444' }}>*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={editUserForm.nom}
                                    onChange={(e) => setEditUserForm({ ...editUserForm, nom: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      borderRadius: '10px',
                                      border: '1px solid #d1d5db',
                                      fontSize: '14px',
                                      color: '#1f2937'
                                    }}
                                    placeholder="Nom complet"
                                  />
                                </div>
                                <div>
                                  <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#374151'
                                  }}>
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={editUserForm.email}
                                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      borderRadius: '10px',
                                      border: '1px solid #d1d5db',
                                      fontSize: '14px',
                                      color: '#1f2937'
                                    }}
                                    placeholder="Email"
                                  />
                                </div>
                                <div>
                                  <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#374151'
                                  }}>
                                    Contact
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={10}
                                    value={editUserForm.contact}
                                    onChange={e => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                      setEditUserForm({ ...editUserForm, contact: value });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      borderRadius: '10px',
                                      border: '1px solid #d1d5db',
                                      fontSize: '14px',
                                      color: '#1f2937'
                                    }}
                                    placeholder="0343284689"
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditUserForm({ nom: '', email: '', contact: '' });
                                  }}
                                  style={{
                                    padding: '10px 20px',
                                    background: currentTheme.colors.cardBackground,
                                    border: `1px solid ${currentTheme.colors.border}`,
                                    transition: 'all 0.2s ease',
                                    color: currentTheme.colors.textTertiary,
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = currentTheme.colors.cardBackground;
                                  }}
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => updateUserName(u.matricule, editUserForm)}
                                  disabled={loading || !editUserForm.nom}
                                  style={{
                                    padding: '10px 20px',
                                    background: loading || !editUserForm.nom 
                                      ? '#d1d5db' 
                                      : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: loading || !editUserForm.nom ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: loading || !editUserForm.nom ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading && editUserForm.nom) {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!loading && editUserForm.nom) {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                  }}
                                >
                                  {loading ? (
                                    <>
                                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                      Enregistrement...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                                      Enregistrer
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.primaryDark} 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '16px'
                                  }}>
                                    {u.nom ? u.nom.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '16px', color: '#1f2937' }}>{u.nom || 'N/A'}</div>
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                      {u.matricule} • {u.poste ? u.poste.charAt(0).toUpperCase() + u.poste.slice(1) : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '52px' }}>
                                  {u.email} • {u.contact}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditUserForm({
                                    nom: u.nom || '',
                                    email: u.email || '',
                                    contact: u.contact || ''
                                  });
                                }}
                                style={{
                                  padding: '10px 20px',
                                  background: `linear-gradient(135deg, ${currentTheme.colors.primary} 0%, ${currentTheme.colors.primaryDark} 100%)`,
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
                                }}
                              >
                                <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
                                Modifier
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
                </div>
              )}

        {false && activeSection === 'statistiques' && (
          <div>
            {/* Header avec titre et filtres */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '32px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h1 style={{ 
                  margin: '0 0 8px', 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: currentTheme.colors.text,
                  lineHeight: 1.2
                }}>
                  Performance des Conventions
                </h1>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: currentTheme.colors.textTertiary,
                  fontWeight: 400
                }}>
                  Analyse détaillée de vos conventions
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  value={statsPeriodFilter}
                  onChange={(e) => setStatsPeriodFilter(e.target.value)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    background: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    fontSize: '14px',
                    cursor: 'pointer',
                    minWidth: '180px'
                  }}
                >
                  <option>Toutes les données</option>
                  <option>Ce mois</option>
                  <option>Ce trimestre</option>
                  <option>Cette année</option>
                </select>
                <button
                  style={{
                    padding: '10px 20px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#007bff';
                  }}
                >
                  <i className="fas fa-file-pdf"></i>
                  Exporter en PDF
                </button>
              </div>
            </div>

            {/* Cartes de métriques clés - Style moderne avec fond bleu */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px', 
              marginBottom: '32px' 
            }}>
              <div style={{
                background: isDark 
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 100%)'
                  : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: isDark 
                  ? '0 4px 12px rgba(30, 58, 95, 0.4)'
                  : '0 4px 12px rgba(0, 123, 255, 0.3)',
                color: 'white'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                  Conventions Totales
                </div>
                <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '4px' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  <i className="fas fa-file-contract" style={{ marginRight: '4px' }}></i>
                  Total enregistrées
                </div>
              </div>

              <div style={{
                background: isDark 
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 100%)'
                  : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: isDark 
                  ? '0 4px 12px rgba(30, 58, 95, 0.4)'
                  : '0 4px 12px rgba(0, 123, 255, 0.3)',
                color: 'white'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                  Confirmées
                </div>
                <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '4px' }}>
                  {stats.confirmees}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                  {stats.total > 0 ? Math.round((stats.confirmees / stats.total) * 100) : 0}% du total
                </div>
              </div>

              <div style={{
                background: isDark 
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 100%)'
                  : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: isDark 
                  ? '0 4px 12px rgba(30, 58, 95, 0.4)'
                  : '0 4px 12px rgba(0, 123, 255, 0.3)',
                color: 'white'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                  En Attente
                </div>
                <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '4px' }}>
                  {stats.enAttente}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  <i className="fas fa-clock" style={{ marginRight: '4px' }}></i>
                  {stats.total > 0 ? Math.round((stats.enAttente / stats.total) * 100) : 0}% du total
                </div>
              </div>

              <div style={{
                background: isDark 
                  ? 'linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 100%)'
                  : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: isDark 
                  ? '0 4px 12px rgba(30, 58, 95, 0.4)'
                  : '0 4px 12px rgba(0, 123, 255, 0.3)',
                color: 'white'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                  Montant Total
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                  {(stats.montantTotal / 1000000).toFixed(1)}M Ar
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  <i className="fas fa-coins" style={{ marginRight: '4px' }}></i>
                  {stats.montantTotal.toLocaleString('fr-FR')} Ar
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
                color: 'white'
              }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}>
                  Taux de Confirmation
                </div>
                <div style={{ fontSize: '36px', fontWeight: 700, marginBottom: '4px' }}>
                  {stats.total > 0 ? Math.round((stats.confirmees / stats.total) * 100) : 0}%
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  <i className="fas fa-chart-line" style={{ marginRight: '4px' }}></i>
                  {stats.confirmees >= stats.enAttente ? (
                    <span><i className="fas fa-arrow-up" style={{ marginRight: '4px' }}></i>+{Math.round((stats.confirmees / stats.total) * 100) - Math.round((stats.enAttente / stats.total) * 100)}% au-dessus</span>
                  ) : (
                    <span><i className="fas fa-arrow-down" style={{ marginRight: '4px' }}></i>En dessous</span>
                  )}
                </div>
              </div>
            </div>

            {/* Graphiques et analyses */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* Graphique de répartition */}
              <div style={{
                background: currentTheme.colors.cardBackground,
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                <h3 style={{ 
                  margin: '0 0 20px', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  color: currentTheme.colors.text 
                }}>
                  Répartition par Statut
                </h3>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '200px',
                  position: 'relative'
                }}>
                  {/* Graphique donut simple */}
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: `conic-gradient(
                      #22c55e 0% ${(stats.confirmees / stats.total) * 100}%,
                      #f59e0b ${(stats.confirmees / stats.total) * 100}% 100%
                    )`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: currentTheme.colors.cardBackground,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: currentTheme.colors.text }}>
                        {stats.total}
                      </div>
                      <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary }}>
                        Total
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
                    <span style={{ fontSize: '14px', color: currentTheme.colors.text }}>Confirmées ({stats.confirmees})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
                    <span style={{ fontSize: '14px', color: currentTheme.colors.text }}>En attente ({stats.enAttente})</span>
                  </div>
                </div>
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  background: '#f0f7ff',
                  borderRadius: '8px',
                  border: '1px solid #b3d9ff'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#007bff', marginBottom: '4px' }}>
                    Recommandation
                  </div>
                  <div style={{ fontSize: '12px', color: '#0056b3' }}>
                    {stats.enAttente > 0 
                      ? `Il y a ${stats.enAttente} convention(s) en attente. Assurez-vous de les traiter rapidement pour améliorer le taux de confirmation.`
                      : 'Excellent ! Toutes les conventions sont confirmées.'}
                  </div>
                </div>
              </div>

              {/* Graphique de tendance */}
              <div style={{
                background: currentTheme.colors.cardBackground,
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ 
                    margin: 0, 
                  fontSize: '18px', 
                  fontWeight: 600,
                  color: currentTheme.colors.text 
                }}>
                    Évolution
                </h3>
                  <select
                    value={evolutionPeriod}
                    onChange={(e) => setEvolutionPeriod(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      background: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    <option value="jour">Par jour</option>
                    <option value="semaine">Par semaine</option>
                    <option value="mois">Par mois</option>
                    <option value="trimestre">Par trimestre</option>
                    <option value="annee">Par année</option>
                  </select>
                </div>
                <div style={{ 
                  height: '280px',
                  position: 'relative',
                  padding: '20px',
                  paddingBottom: '40px'
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
                            
                            const conventionsDuJour = conventions.filter(c => {
                              const convDate = new Date(c.dateConv || c.createdAt);
                              convDate.setHours(0, 0, 0, 0);
                              return convDate >= dayStart && convDate <= dayEnd;
                            });
                            
                            const count = conventionsDuJour.length;
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
                            
                            const conventionsDeLaSemaine = conventions.filter(c => {
                              const convDate = new Date(c.dateConv || c.createdAt);
                              return convDate >= weekStart && convDate <= weekEnd;
                            });
                            
                            const count = conventionsDeLaSemaine.length;
                            labels.push(`S${i + 1}`);
                            data.push(count);
                          }
                          break;

                        case 'mois':
                          for (let i = 5; i >= 0; i--) {
                            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
                            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
                            
                            const conventionsDuMois = conventions.filter(c => {
                              const convDate = new Date(c.dateConv || c.createdAt);
                              return convDate >= monthStart && convDate <= monthEnd;
                            });
                            
                            const count = conventionsDuMois.length;
                            labels.push(date.toLocaleDateString('fr-FR', { month: 'short' }));
                            data.push(count);
                          }
                          break;

                        case 'trimestre':
                          for (let i = 3; i >= 0; i--) {
                            const date = new Date(now.getFullYear(), now.getMonth() - (i * 3), 1);
                            const quarter = Math.floor(date.getMonth() / 3);
                            const quarterStart = new Date(date.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
                            const quarterEnd = new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
                            
                            const conventionsDuTrimestre = conventions.filter(c => {
                              const convDate = new Date(c.dateConv || c.createdAt);
                              return convDate >= quarterStart && convDate <= quarterEnd;
                            });
                            
                            const count = conventionsDuTrimestre.length;
                            labels.push(`T${quarter + 1} ${date.getFullYear()}`);
                            data.push(count);
                          }
                          break;

                        case 'annee':
                          for (let i = 4; i >= 0; i--) {
                            const year = now.getFullYear() - i;
                            const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
                            const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
                            
                            const conventionsDeLAnnee = conventions.filter(c => {
                              const convDate = new Date(c.dateConv || c.createdAt);
                              return convDate >= yearStart && convDate <= yearEnd;
                            });
                            
                            const count = conventionsDeLAnnee.length;
                            labels.push(year.toString());
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
                    
                    if (conventions.length === 0) {
                    return (
                        <div style={{
                          width: '100%',
                          textAlign: 'center', 
                          padding: '40px',
                          color: currentTheme.colors.textTertiary
                        }}>
                          <i className="fas fa-chart-line" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                          <p style={{ margin: 0 }}>Aucune donnée disponible pour l'évolution</p>
                        </div>
                      );
                    }

                    const chartHeight = 240;
                    const points = data.map((value, idx) => {
                      const x = (idx / (labels.length - 1 || 1)) * 100;
                      const y = range > 0 ? 100 - ((value - minValue) / range) * 100 : 50;
                      return { x, y, value, label: labels[idx] };
                    });

                    const pathData = points.map((p, idx) => {
                      return `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
                    }).join(' ');

                    const areaPath = points.length > 0 
                      ? `${pathData} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
                      : '';

                    return (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: '40px',
                          width: '50px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          paddingRight: '8px',
                          fontSize: '10px',
                          color: currentTheme.colors.textTertiary
                        }}>
                          <span>{maxValue}</span>
                          <span>{Math.round(maxValue * 0.5)}</span>
                          <span>0</span>
                        </div>

                        <svg 
                          width="100%" 
                          height="100%" 
                          viewBox="0 0 100 100" 
                          preserveAspectRatio="none"
                          style={{ 
                            marginLeft: '50px',
                            marginRight: '20px',
                            overflow: 'visible'
                          }}
                        >
                          {areaPath && (
                            <path
                              d={areaPath}
                              fill="url(#gradientAreaRedacteur)"
                              opacity="0.2"
                            />
                          )}
                          
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

                          {points.map((point, idx) => (
                            <g key={idx}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="5"
                                fill="#007bff"
                                stroke="#fff"
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  const tooltip = e.target.parentElement.querySelector('.tooltip');
                                  if (tooltip) {
                                    tooltip.style.opacity = '1';
                                    tooltip.setAttribute('x', point.x);
                                    tooltip.setAttribute('y', point.y - 8);
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  const tooltip = e.target.parentElement.querySelector('.tooltip');
                                  if (tooltip) tooltip.style.opacity = '0';
                                }}
                              />
                              <g className="tooltip" opacity="0" style={{ transition: 'opacity 0.2s ease', pointerEvents: 'none' }}>
                                <rect
                                  x={point.x - 15}
                                  y={point.y - 12}
                                  width="30"
                                  height="10"
                                  rx="4"
                                  fill={currentTheme.colors.cardBackground}
                                  stroke={currentTheme.colors.border}
                                  strokeWidth="1"
                                />
                                <text
                                  x={point.x}
                                  y={point.y - 5}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill={currentTheme.colors.text}
                                  fontWeight="600"
                                >
                                  {point.value}
                                </text>
                              </g>
                            </g>
                          ))}

                          <defs>
                            <linearGradient id="gradientAreaRedacteur" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#007bff" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#007bff" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: '50px',
                          right: '20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: currentTheme.colors.textTertiary
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
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  background: isDark ? 'rgba(77, 124, 254, 0.1)' : '#f0f7ff',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? 'rgba(77, 124, 254, 0.3)' : '#b3d9ff'}`
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: currentTheme.colors.primary, marginBottom: '4px' }}>
                    Recommandation
                  </div>
                  <div style={{ fontSize: '12px', color: currentTheme.colors.textSecondary }}>
                    {evolutionPeriod === 'jour' && 'Analysez les tendances quotidiennes pour identifier les jours de forte activité et optimiser votre gestion quotidienne.'}
                    {evolutionPeriod === 'semaine' && 'Surveillez les tendances hebdomadaires pour identifier les semaines de forte activité et planifier vos ressources en conséquence.'}
                    {evolutionPeriod === 'mois' && 'Surveillez les tendances mensuelles pour identifier les périodes de forte activité et planifier vos ressources en conséquence.'}
                    {evolutionPeriod === 'trimestre' && 'Analysez les tendances trimestrielles pour identifier les trimestres de forte activité et planifier vos ressources à moyen terme.'}
                    {evolutionPeriod === 'annee' && 'Analysez les tendances annuelles pour identifier les années de forte activité et planifier vos ressources à long terme.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau détaillé */}
            <div style={{
              background: currentTheme.colors.cardBackground,
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: `1px solid ${currentTheme.colors.border}`
            }}>
              <h3 style={{ 
                margin: '0 0 20px', 
                fontSize: '18px', 
                fontWeight: 600,
                color: currentTheme.colors.text 
              }}>
                Détails par Bâtiment
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${currentTheme.colors.border}` }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: currentTheme.colors.textTertiary }}>Bâtiment</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: currentTheme.colors.textTertiary }}>Conventions</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: currentTheme.colors.textTertiary }}>Montant Total</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: currentTheme.colors.textTertiary }}>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batiments.slice(0, 5).map((bat) => {
                      const batConvs = conventions.filter(c => c.batiment?.numBat === bat.numBat);
                      const batConfirmed = batConvs.filter(c => c.statutConv).length;
                      const batAmount = batConvs.reduce((sum, c) => sum + (c.batiment?.montant || 0), 0);
                      return (
                        <tr 
                          key={bat.numBat} 
                          style={{ borderBottom: `1px solid ${currentTheme.colors.border}`, cursor: 'pointer' }} 
                          onClick={() => openBatimentDetail(bat)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openBatimentDetail(bat);
                            }
                          }}
                        >
                          <td style={{ padding: '12px', fontSize: '14px', color: currentTheme.colors.text }}>
                            Cité n°{bat.numBat}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {batConvs.length}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: currentTheme.colors.text }}>
                            {batAmount.toLocaleString('fr-FR')} Ar
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 500,
                              background: batConfirmed === batConvs.length ? '#dcfce7' : '#fef3c7',
                              color: batConfirmed === batConvs.length ? '#166534' : '#92400e'
                            }}>
                              {batConvs.length > 0 ? Math.round((batConfirmed / batConvs.length) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'conventions' && (
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
                Tableau de bord
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: currentTheme.colors.textTertiary,
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
                    background: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <i className="fas fa-file-contract" style={{ fontSize: '20px', color: isDark ? '#60a5fa' : '#3b82f6', lineHeight: 1 }}></i>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>Conventions totales</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, textAlign: 'center' }}>{stats.total}</div>
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
                    background: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '20px', color: isDark ? '#4ade80' : '#22c55e', lineHeight: '48px', width: '20px', textAlign: 'center' }}></i>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>Conventions confirmées</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, textAlign: 'center' }}>{stats.confirmees}</div>
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
                    background: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <i className="fas fa-clock" style={{ fontSize: '20px', color: isDark ? '#fbbf24' : '#f59e0b', lineHeight: 1 }}></i>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>En attente</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, textAlign: 'center' }}>{stats.enAttente}</div>
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
                    background: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <i className="fas fa-coins" style={{ fontSize: '20px', color: isDark ? '#a78bfa' : '#a855f7', lineHeight: 1 }}></i>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: currentTheme.colors.textTertiary, marginBottom: '8px', fontWeight: 500, textAlign: 'center' }}>Montant total</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: currentTheme.colors.text, textAlign: 'center' }}>
                  {stats.montantTotal.toLocaleString('fr-FR')} Ar
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: '20px', 
              marginBottom: '32px' 
            }}>
              {/* Bouton Nouvelle convention */}
              <button
                onClick={openNewConventionWizard}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                  fontWeight: '600',
                  fontSize: '14px',
                  minWidth: '120px',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0056b3';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                }}
              >
                <span>Nouvelle convention</span>
                <i className="fas fa-plus"></i>
              </button>

              {/* Bouton Exporter */}
              <button
                onClick={() => {}}
                style={{
                  background: currentTheme.colors.cardBackground,
                  border: `1px solid ${currentTheme.colors.border}`,
                  transition: 'all 0.2s ease',
                  color: currentTheme.colors.text,
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <i className="fas fa-download" style={{ fontSize: '20px', color: '#6b7280' }}></i>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Exporter les données</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Télécharger un rapport</div>
              </button>
            </div>

            {msg && (
              <div style={{ 
                background: msg.includes('✅') ? '#d4edda' : msg.includes('❌') ? '#f8d7da' : '#d1ecf1', 
                color: msg.includes('✅') ? '#155724' : msg.includes('❌') ? '#721c24' : '#0c5460', 
                padding: '14px 18px', 
                borderRadius: '10px', 
                marginBottom: '24px', 
                display: 'flex', 
                alignItems: 'center',
                gap: '10px',
                fontSize: '15px',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `1px solid ${msg.includes('✅') ? '#c3e6cb' : msg.includes('❌') ? '#f5c6cb' : '#bee5eb'}`
              }}>
                <i className={`fas ${msg.includes('✅') ? 'fa-check-circle' : msg.includes('❌') ? 'fa-exclamation-circle' : 'fa-info-circle'}`} style={{ fontSize: '18px' }}></i>
                <span>{msg}</span>
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
                {/* Barre de recherche */}
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
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  style={{
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      width: '250px',
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
            </div>

              {loading && conventions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Chargement des conventions...</div>
                </div>
              ) : filteredConventions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <i className="fas fa-file-contract" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
                  <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: '#4b5563' }}>
                    {search ? 'Aucune convention trouvée pour cette recherche' : 'Aucune convention trouvée'}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                    {search ? 'Essayez avec un autre nom de client' : 'Cliquez sur "Nouvelle convention" pour commencer'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ 
                      background: currentTheme.colors.backgroundTertiary,
                      borderBottom: `1px solid ${currentTheme.colors.border}`
                    }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>N° Convention</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Client</th>
                      {hasContactData && <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Contact</th>}
                      {hasVilleData && <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Ville</th>}
                      {hasQuartierData && <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Quartier</th>}
                      <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Montant</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Superficie</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Statut</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConventions.map((c, index) => (
                      <tr 
                      key={c.numConv}
                        style={{
                          borderBottom: index < filteredConventions.length - 1 ? `1px solid ${currentTheme.colors.border}` : 'none',
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
                        onClick={() => openBatimentDetail(c.batiment)}
                      >
                        <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                          {formatConventionNumber(c)}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {c.locataire?.nomcli || 'N/A'}
                        </td>
                        {hasContactData && <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {c.contact && c.contact.trim() !== '' && c.contact !== 'N/A' ? c.contact : '-'}
                        </td>}
                        {hasVilleData && <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {c.batiment?.ville && c.batiment.ville.trim() !== '' && c.batiment.ville !== 'Non renseignée' ? c.batiment.ville : '-'}
                        </td>}
                        {hasQuartierData && <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {c.batiment?.quartier && c.batiment.quartier.trim() !== '' && c.batiment.quartier !== 'Non renseigné' ? c.batiment.quartier : '-'}
                        </td>}
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                          {Number(c.batiment?.montant || 0).toLocaleString('fr-FR')} Ar
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 500 }}>
                          {c.batiment?.superficie 
                            ? `${Number(c.batiment.superficie).toLocaleString('fr-FR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })} m²`
                            : <span style={{ color: currentTheme.colors.textTertiary, fontStyle: 'italic' }}>N/A</span>}
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
                                setSelectedConv(c);
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
                                onEditConv(c);
                              }}
                              disabled={(() => {
                                const countForConv = getEditCountForConv(c.numConv);
                                if (countForConv < 2) return false;
                                const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                const demandeApprouvee = demandes.find(d => 
                                  d.convention === c.numConv &&
                                  d.statut === 'approuvee' && 
                                  !d.utilisee
                                );
                                return !demandeApprouvee;
                              })()}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: (() => {
                                  const countForConv = getEditCountForConv(c.numConv);
                                  if (countForConv < 2) return '#6b7280';
                                  const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                  const demandeApprouvee = demandes.find(d => 
                                    d.convention === c.numConv &&
                                    d.statut === 'approuvee' && 
                                    !d.utilisee
                                  );
                                  return demandeApprouvee ? '#6b7280' : '#d1d5db';
                                })(),
                                cursor: (() => {
                                  const countForConv = getEditCountForConv(c.numConv);
                                  if (countForConv < 2) return 'pointer';
                                  const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                  const demandeApprouvee = demandes.find(d => 
                                    d.convention === c.numConv &&
                                    d.statut === 'approuvee' && 
                                    !d.utilisee
                                  );
                                  return demandeApprouvee ? 'pointer' : 'not-allowed';
                                })(),
                                padding: '8px',
                                borderRadius: '6px',
                                transition: 'all 0.2s ease',
                                opacity: (() => {
                                  const countForConv = getEditCountForConv(c.numConv);
                                  if (countForConv < 2) return 1;
                                  const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                  const demandeApprouvee = demandes.find(d => 
                                    d.convention === c.numConv &&
                                    d.statut === 'approuvee' && 
                                    !d.utilisee
                                  );
                                  return demandeApprouvee ? 1 : 0.4;
                                })()
                              }}
                              onMouseEnter={(e) => {
                                const countForConv = getEditCountForConv(c.numConv);
                                if (countForConv < 2) {
                                  e.currentTarget.style.background = '#f3f4f6';
                                  e.currentTarget.style.color = '#007bff';
                                } else {
                                  const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                  const demandeApprouvee = demandes.find(d => 
                                    d.convention === c.numConv &&
                                    d.statut === 'approuvee' && 
                                    !d.utilisee
                                  );
                                  if (demandeApprouvee) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.color = '#007bff';
                                  }
                                }
                              }}
                              onMouseLeave={(e) => {
                                const countForConv = getEditCountForConv(c.numConv);
                                if (countForConv < 2) {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.color = '#6b7280';
                                } else {
                                  const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                  const demandeApprouvee = demandes.find(d => 
                                    d.convention === c.numConv &&
                                    d.statut === 'approuvee' && 
                                    !d.utilisee
                                  );
                                  if (demandeApprouvee) {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.color = '#6b7280';
                                  }
                                }
                              }}
                              title={(() => {
                                const countForConv = getEditCountForConv(c.numConv);
                                if (countForConv >= 2) {
                                  const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                                  const demandeApprouvee = demandes.find(d => 
                                    d.convention === c.numConv &&
                                    d.statut === 'approuvee' && 
                                    !d.utilisee
                                  );
                                  return demandeApprouvee 
                                    ? `Modifications: ${countForConv}/2 (Autorisation approuvée)` 
                                    : `Modifications: ${countForConv}/2 (Limite atteinte)`;
                                }
                                return `Modifier (${countForConv}/2 modifications)`;
                              })()}
                            >
                              <i className="fas fa-edit" style={{ fontSize: '16px' }}></i>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                printConvention(c);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: currentTheme.colors.textTertiary,
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
                              title="Télécharger"
                            >
                              <i className="fas fa-download" style={{ fontSize: '16px' }}></i>
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
        {selectedConv && (
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
            onClick={() => setSelectedConv(null)}
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
                  Convention {formatConventionNumber(selectedConv)}
                </h2>
                <button
                  onClick={() => setSelectedConv(null)}
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
                <div style={{
                  padding: '20px',
                  background: currentTheme.colors.backgroundTertiary,
                  borderRadius: '12px',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.primary }}>
                    Bâtiment
                  </h3>
                  <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: currentTheme.colors.text, lineHeight: 1.6 }}>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>N° :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>{selectedConv.numBat}</span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>{selectedConv.batiment?.adresse || 'N/A'}</span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Loyer :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                        {Number(selectedConv.batiment?.montant || 0).toLocaleString('fr-FR')} Ar
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Superficie :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                        {selectedConv.batiment?.superficie 
                          ? `${Number(selectedConv.batiment.superficie).toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} m²`
                          : 'Non renseigné'}
                      </span>
                    </div>
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
                      <span style={{ color: currentTheme.colors.text }}>{selectedConv.locataire?.nomcli || 'N/A'}</span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Né(e) :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>
                        {selectedConv.locataire?.datenais || 'N/A'} à {selectedConv.locataire?.lieunais || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>CIN :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>
                        {selectedConv.locataire?.cin ? selectedConv.locataire.cin.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1 ') : 'N/A'} {selectedConv.locataire?.delivcin ? `(délivrée le ${selectedConv.locataire.delivcin})` : ''}
                      </span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Activité :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>{selectedConv.locataire?.activite || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc demande de modification quand la limite est atteinte */}
              {(() => {
                const countForConv = getEditCountForConv(selectedConv.numConv);
                const demandesForConv = demandesModification.filter(d => d.convention === selectedConv.numConv);
                const demandeApprouvee = demandesForConv.find(d => d.statut === 'approuvee' && !d.utilisee);
                const demandeEnAttente = demandesForConv.find(d => d.statut === 'en_attente' && !d.utilisee);
                const demandeRefusee = demandesForConv.find(d => d.statut === 'refusee' && !d.utilisee);
                const limitReached = countForConv >= 2;

                if (!limitReached && demandesForConv.length === 0) return null;

                const statusBadge = (label, color) => (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: color.bg,
                    color: color.text
                  }}>
                    <i className="fas fa-info-circle"></i>
                    {label}
                  </span>
                );

                return (
                  <div style={{
                    marginBottom: 24,
                    padding: 16,
                    borderRadius: 12,
                    border: `1px solid ${currentTheme.colors.border}`,
                    background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }} />
                      <div style={{ fontWeight: 700, color: currentTheme.colors.text }}>
                        Limite de modifications atteinte ({countForConv}/2)
                      </div>
                      {limitReached && demandeApprouvee && statusBadge('Demande approuvée', { bg: '#dcfce7', text: '#166534' })}
                      {limitReached && demandeEnAttente && statusBadge('Demande en attente', { bg: '#fef3c7', text: '#92400e' })}
                      {limitReached && demandeRefusee && statusBadge('Demande refusée', { bg: '#fee2e2', text: '#991b1b' })}
                    </div>

                    {demandesForConv.length > 0 && (
                      <div style={{ fontSize: 13, color: currentTheme.colors.textSecondary, display: 'grid', gap: 6 }}>
                        {demandesForConv.map(d => (
                          <div key={d.id} style={{
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: isDark ? 'rgba(0,0,0,0.08)' : '#f8fafc',
                            border: `1px dashed ${currentTheme.colors.border}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, color: currentTheme.colors.text }}>
                                Demande du {new Date(d.date || d.id).toLocaleDateString('fr-FR')}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: (() => {
                                if (d.statut === 'approuvee') return '#166534';
                                if (d.statut === 'refusee') return '#b91c1c';
                                return '#92400e';
                              })() }}>
                                {d.statut === 'approuvee' ? 'Approuvée' : d.statut === 'refusee' ? 'Refusée' : 'En attente'}
                              </span>
                            </div>
                            <div style={{ color: currentTheme.colors.textSecondary, lineHeight: 1.4 }}>
                              Raison : {d.raison || '—'}
                            </div>
                            {d.utilisee && (
                              <div style={{ marginTop: 6, fontSize: 12, color: currentTheme.colors.textTertiary }}>
                                (Autorisation déjà utilisée)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {limitReached && !demandeApprouvee && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {demandeEnAttente ? (
                          <span style={{ fontSize: 13, color: currentTheme.colors.text }}>
                            Une demande est déjà en attente d'approbation.
                          </span>
                        ) : (
                          <>
                            <span style={{ fontSize: 13, color: currentTheme.colors.text }}>
                              Envoyez une demande d'autorisation pour continuer la modification.
                            </span>
                            <button
                              onClick={() => {
                                setEditingConv(selectedConv);
                                setShowEditRequestModal(true);
                                setEditRequestReason('');
                              }}
                              style={{
                                padding: '10px 14px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)'
                              }}
                            >
                              Demander une autorisation
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: `1px solid ${currentTheme.colors.border}` }}>
                <button
                  onClick={() => {
                    onEditConv(selectedConv);
                    setSelectedConv(null);
                  }}
                  disabled={(() => {
                    const countForConv = getEditCountForConv(selectedConv.numConv);
                    if (countForConv < 2) return false;
                    const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                    const demandeApprouvee = demandes.find(d => 
                      d.convention === selectedConv.numConv &&
                      d.statut === 'approuvee' && 
                      !d.utilisee
                    );
                    return !demandeApprouvee;
                  })()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: (() => {
                      const countForConv = getEditCountForConv(selectedConv.numConv);
                      if (countForConv < 2) return 'pointer';
                      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                      const demandeApprouvee = demandes.find(d => 
                        d.convention === selectedConv.numConv &&
                        d.statut === 'approuvee' && 
                        !d.utilisee
                      );
                      return demandeApprouvee ? 'pointer' : 'not-allowed';
                    })(),
                    opacity: (() => {
                      const countForConv = getEditCountForConv(selectedConv.numConv);
                      if (countForConv < 2) return 1;
                      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                      const demandeApprouvee = demandes.find(d => 
                        d.convention === selectedConv.numConv &&
                        d.statut === 'approuvee' && 
                        !d.utilisee
                      );
                      return demandeApprouvee ? 1 : 0.5;
                    })(),
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    const countForConv = getEditCountForConv(selectedConv.numConv);
                    if (countForConv < 2) {
                      e.target.style.backgroundColor = '#0056b3';
                      e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                      e.target.style.transform = 'translateY(-1px)';
                    } else {
                      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                      const demandeApprouvee = demandes.find(d => 
                        d.convention === selectedConv.numConv &&
                        d.statut === 'approuvee' && 
                        !d.utilisee
                      );
                      if (demandeApprouvee) {
                        e.target.style.backgroundColor = '#0056b3';
                        e.target.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    const countForConv = getEditCountForConv(selectedConv.numConv);
                    if (countForConv < 2) {
                      e.target.style.backgroundColor = '#007bff';
                      e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                      e.target.style.transform = 'translateY(0)';
                    } else {
                      const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                      const demandeApprouvee = demandes.find(d => 
                        d.convention === selectedConv.numConv &&
                        d.statut === 'approuvee' && 
                        !d.utilisee
                      );
                      if (demandeApprouvee) {
                        e.target.style.backgroundColor = '#007bff';
                        e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }
                  }}
                >
                  Modifier ({getEditCountForConv(selectedConv.numConv)}/2)
                </button>
                {(() => {
                  const countForConv = getEditCountForConv(selectedConv.numConv);
                  if (countForConv >= 2) {
                    const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                    const demandeApprouvee = demandes.find(d => 
                      d.convention === selectedConv.numConv &&
                      d.statut === 'approuvee' && 
                      !d.utilisee
                    );
                    if (!demandeApprouvee) {
                      return (
                        <button
                          onClick={() => {
                            setEditingConv(selectedConv);
                            setShowEditRequestModal(true);
                            setEditRequestReason('');
                          }}
                          style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
                            e.target.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.4)';
                            e.target.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                            e.target.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          <i className="fas fa-exclamation-triangle"></i>
                          Demander autorisation
                        </button>
                      );
                    }
                  }
                  return null;
                })()}
                <button
                  onClick={() => {
                    onCancelConv(selectedConv.numConv);
                    setSelectedConv(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
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
                  <i className="fas fa-trash-alt"></i>
                  Supprimer
                </button>
                <button
                  onClick={() => printConvention(selectedConv)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    border: `1px solid ${currentTheme.colors.border}`,
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.colors.backgroundTertiary;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = currentTheme.colors.cardBackground;
                  }}
                >
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Détails Bâtiment (complet comme AdminDash) */}
        {showBatimentDetail && batimentForDetail && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 9999,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
            onClick={closeBatimentDetail}
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
                  <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textTertiary }}>Bâtiment n° {batimentForDetail.numBat}</p>
                  <h2 style={{ margin: '4px 0 0', fontSize: '28px', color: currentTheme.colors.primary }}>
                    {batimentForDetail.adresse || 'Adresse non renseignée'}
                  </h2>
                </div>
                <button
                  onClick={closeBatimentDetail}
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
                            Bâtiment n° {batimentForDetail.numBat}
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
                    {batimentForDetail.image ? (
                      <img
                        src={`data:image/jpeg;base64,${batimentForDetail.image}`}
                        alt={`Bâtiment ${batimentForDetail.numBat}`}
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
                        {typeof batimentForDetail.montant === 'number'
                          ? `${batimentForDetail.montant.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} Ar`
                          : (batimentForDetail.montant ?? 'Non renseigné')}
                      </p>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                      <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Superficie</p>
                      <p style={{ margin: '6px 0 0', fontSize: '18px', color: currentTheme.colors.text, fontWeight: 600 }}>
                        {batimentForDetail.superficie 
                          ? `${batimentForDetail.superficie.toLocaleString('fr-FR', {
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
                          color: batimentForDetail.statut ? '#0d6b3a' : '#dc3545'
                        }}
                      >
                        {batimentForDetail.statut ? 'Actif' : 'Inactif'}
                      </p>
                      {!batimentForDetail.statut && batimentForDetail.motifInactivite && (
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: currentTheme.colors.textTertiary, fontStyle: 'italic' }}>
                          Motif: {batimentForDetail.motifInactivite}
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
                          color: batimentForDetail.statutUtilisation === 'indisponible' || batimentForDetail.estIndisponible 
                            ? '#991b1b' 
                            : (batimentForDetail.statutUtilisation === 'libre' || batimentForDetail.estLibre) 
                              ? '#0369a1' 
                              : '#b45309'
                        }}
                      >
                        {batimentForDetail.statutUtilisation === 'indisponible' || batimentForDetail.estIndisponible 
                          ? '⛔ Indisponible' 
                          : (batimentForDetail.statutUtilisation === 'libre' || batimentForDetail.estLibre) 
                            ? '🟢 Libre' 
                            : '🔴 Déjà alloué'}
                      </p>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                      <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Ville</p>
                      <p style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text }}>
                        {batimentForDetail.ville || ''}
                      </p>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: currentTheme.colors.backgroundTertiary }}>
                      <p style={{ margin: 0, fontSize: '12px', color: currentTheme.colors.textTertiary }}>Quartier</p>
                      <p style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.text }}>
                        {batimentForDetail.quartier || ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${currentTheme.colors.border}`, backgroundColor: currentTheme.colors.backgroundSecondary }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: currentTheme.colors.text }}>Informations complémentaires</p>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                      Numéro du bâtiment : {batimentForDetail.numBat}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                      Adresse : {batimentForDetail.adresse || 'Non renseignée'}
                    </p>
                  </div>

                  {(() => {
                    // Trouver une convention liée à ce bâtiment (priorité à la convention sélectionnée)
                    const conventionForBatiment = (() => {
                      if (selectedConv && selectedConv.numBat === batimentForDetail.numBat) return selectedConv;
                      return conventions.find(c => c.numBat === batimentForDetail.numBat) || null;
                    })();

                    if (!conventionForBatiment) return null;

                    const countForConv = getEditCountForConv(conventionForBatiment.numConv);
                    const demandesForConv = demandesModification.filter(d => d.convention === conventionForBatiment.numConv);
                    const demandeApprouvee = demandesForConv.find(d => d.statut === 'approuvee' && !d.utilisee);
                    const demandeEnAttente = demandesForConv.find(d => d.statut === 'en_attente' && !d.utilisee);
                    const demandeRefusee = demandesForConv.find(d => d.statut === 'refusee' && !d.utilisee);
                    const limitReached = countForConv >= 2;

                    if (!limitReached && demandesForConv.length === 0) return null;

                    const statusBadge = (label, color) => (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: color.bg,
                        color: color.text
                      }}>
                        <i className="fas fa-info-circle"></i>
                        {label}
                      </span>
                    );

                    return (
                      <div style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `1px dashed ${currentTheme.colors.border}`,
                        background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }} />
                          <div style={{ fontWeight: 700, color: currentTheme.colors.text }}>
                            Limite de modifications atteinte pour la convention {formatConventionNumber(conventionForBatiment)} ({countForConv}/2)
                          </div>
                          {limitReached && demandeApprouvee && statusBadge('Demande approuvée', { bg: '#dcfce7', text: '#166534' })}
                          {limitReached && demandeEnAttente && statusBadge('Demande en attente', { bg: '#fef3c7', text: '#92400e' })}
                          {limitReached && demandeRefusee && statusBadge('Demande refusée', { bg: '#fee2e2', text: '#991b1b' })}
                        </div>

                        {demandesForConv.length > 0 && (
                          <div style={{ fontSize: 13, color: currentTheme.colors.textSecondary, display: 'grid', gap: 6 }}>
                            {demandesForConv.map(d => (
                              <div key={d.id} style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                background: isDark ? 'rgba(0,0,0,0.08)' : '#f8fafc',
                                border: `1px dashed ${currentTheme.colors.border}`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontWeight: 600, color: currentTheme.colors.text }}>
                                    Demande du {new Date(d.date || d.id).toLocaleDateString('fr-FR')}
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: (() => {
                                    if (d.statut === 'approuvee') return '#166534';
                                    if (d.statut === 'refusee') return '#b91c1c';
                                    return '#92400e';
                                  })() }}>
                                    {d.statut === 'approuvee' ? 'Approuvée' : d.statut === 'refusee' ? 'Refusée' : 'En attente'}
                                  </span>
                                </div>
                                <div style={{ color: currentTheme.colors.textSecondary, lineHeight: 1.4 }}>
                                  Raison : {d.raison || '—'}
                                </div>
                                {d.utilisee && (
                                  <div style={{ marginTop: 6, fontSize: 12, color: currentTheme.colors.textTertiary }}>
                                    (Autorisation déjà utilisée)
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {limitReached && !demandeApprouvee && (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            {demandeEnAttente ? (
                              <span style={{ fontSize: 13, color: currentTheme.colors.text }}>
                                Une demande est déjà en attente d'approbation.
                              </span>
                            ) : (
                              <>
                                <span style={{ fontSize: 13, color: currentTheme.colors.text }}>
                                  Envoyez une demande d'autorisation pour continuer la modification.
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingConv(conventionForBatiment);
                                    setShowEditRequestModal(true);
                                    setEditRequestReason('');
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)'
                                  }}
                                >
                                  Demander une autorisation
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={closeBatimentDetail}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: `1px solid ${currentTheme.colors.border}`,
                        backgroundColor: currentTheme.colors.backgroundSecondary,
                        color: currentTheme.colors.text,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
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
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2100
            }}
            onClick={() => {
              setShowFullscreenMap(false);
              closeBatimentDetail();
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '980px',
                height: '90%',
                borderRadius: '18px',
                backgroundColor: currentTheme.colors.cardBackground,
                padding: '16px',
                boxShadow: currentTheme.shadows.xl,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: currentTheme.colors.primary }}>
                  Carte plein écran - Bâtiment {batimentForDetail?.numBat}
                </h3>
                <button
                  onClick={() => {
              setShowFullscreenMap(false);
              closeBatimentDetail();
            }}
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
                    Bâtiment n° {batimentForDetail?.numBat}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}


        {/* Wizard */}
        {showWizard && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16,
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{ 
              width: 'min(920px, 95vw)', 
              background: currentTheme.colors.cardBackground,
              border: `1px solid ${currentTheme.colors.border}`,
              transition: 'all 0.3s ease', 
              borderRadius: '16px', 
              padding: 0, 
              maxHeight: '90vh', 
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header du modal */}
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid #e5e7eb',
                background: isDark 
                  ? `linear-gradient(135deg, ${currentTheme.colors.backgroundTertiary} 0%, ${currentTheme.colors.cardBackground} 100%)`
                  : 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '24px', 
                    fontWeight: 700, 
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {editingConv ? 'Modifier une convention' : 'Nouvelle convention'}
                  </h2>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    color: '#6b7280' 
                  }}>
                    {step === 1 && 'Sélectionnez le bâtiment'}
                    {step === 2 && 'Informations du locataire'}
                    {step === 3 && 'Aperçu de la convention'}
                  </p>
                </div>
                <button
                  onClick={() => { setShowWizard(false); resetWizard(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#1f2937';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Contenu scrollable */}
              <div style={{ 
                padding: '32px', 
                overflowY: 'auto',
                flex: 1
              }}>

                {/* Fil d'Ariane moderne */}
              <div
                ref={breadcrumbRef}
                style={{
                  display: 'flex',
                    gap: 12,
                    marginBottom: 32,
                  alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}
              >
                {[
                    { id: 1, label: 'Bâtiment', icon: 'fa-building' },
                    { id: 2, label: 'Locataire', icon: 'fa-user' },
                    { id: 3, label: 'Aperçu', icon: 'fa-eye' },
                  ].map((s, index) => (
                    <React.Fragment key={s.id}>
                      <div
                        data-step={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                          padding: '12px 20px',
                          borderRadius: '12px',
                          background: step === s.id 
                            ? 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)' 
                            : step > s.id 
                            ? '#e7f3ff' 
                            : '#f3f4f6',
                          border: step === s.id 
                            ? '2px solid #007bff' 
                            : step > s.id 
                            ? '2px solid #007bff' 
                            : '2px solid #e5e7eb',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          boxShadow: step === s.id 
                            ? '0 4px 12px rgba(0, 123, 255, 0.3)' 
                            : '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                      >
                    <div
                      style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: step >= s.id ? currentTheme.colors.primary : currentTheme.colors.border,
                            color: step >= s.id ? '#007bff' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                            fontSize: '16px',
                        flexShrink: 0,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {step > s.id ? (
                            <i className="fas fa-check" style={{ fontSize: '14px' }}></i>
                          ) : (
                            <i className={`fas ${s.icon}`} style={{ fontSize: '14px' }}></i>
                          )}
                    </div>
                    <span
                      style={{
                            fontWeight: step === s.id ? 700 : step > s.id ? 600 : 500,
                            fontSize: '14px',
                            color: step >= s.id ? (step === s.id ? '#ffffff' : '#007bff') : '#6b7280',
                        whiteSpace: 'nowrap',
                            transition: 'all 0.3s ease'
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                      {index < 2 && (
                        <div style={{
                          width: '40px',
                          height: '2px',
                          background: step > s.id ? '#007bff' : '#e5e7eb',
                          transition: 'all 0.3s ease',
                          flexShrink: 0
                        }}></div>
                      )}
                    </React.Fragment>
                ))}
              </div>
              {step === 1 && (
                  <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: 24 }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                      gap: 20 
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Numéro Bâtiment <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select 
                          className="form-control" 
                          value={step1.numBat} 
                          onChange={onSelectBatiment} 
                          required 
                          style={{
                            ...inputStyle,
                            background: currentTheme.colors.cardBackground,
          border: `1px solid ${currentTheme.colors.border}`,
          transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">— Choisir un bâtiment —</option>
                        {batiments.map(b => (
                          <option key={b.numBat} value={String(b.numBat)}>Cité n°{b.numBat} — {b.adresse}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Adresse <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={step1.adresse} 
                          readOnly 
                          maxLength={20} 
                          required 
                          style={{ 
                            ...inputStyle, 
                            backgroundColor: '#f9fafb',
                            cursor: 'not-allowed',
                            color: '#6b7280'
                          }} 
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Montant (Ar) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={step1.montant} 
                          readOnly 
                          step="0.01" 
                          min={0} 
                          required 
                          style={{ 
                            ...inputStyle, 
                            backgroundColor: '#f9fafb',
                            cursor: 'not-allowed',
                            color: '#6b7280'
                          }} 
                        />
                    </div>
                  </div>
                </form>
              )}

              {step === 2 && (
                  <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: 24 }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                      gap: 20 
                    }}>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Nom du locataire <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          value={step2.nomcli} 
                          onChange={e => setStep2({ ...step2, nomcli: e.target.value })} 
                          required 
                          style={inputStyle}
                          placeholder="Entrez le nom complet"
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Date de naissance <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          type="date" 
                          value={step2.datenais} 
                          onChange={e => setStep2({ ...step2, datenais: e.target.value })} 
                          min={minDateNaissance}
                          max={maxDateNaissance}
                          required 
                          style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Lieu de naissance <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          value={step2.lieunais} 
                          onChange={e => setStep2({ ...step2, lieunais: e.target.value })} 
                          required 
                          style={inputStyle}
                          placeholder="Ville de naissance"
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Nom du père <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          value={step2.pere} 
                          onChange={e => {
                            // Ne garder que les lettres, espaces, apostrophes et tirets
                            const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
                            setStep2({ ...step2, pere: value });
                          }} 
                          required 
                          style={inputStyle}
                          placeholder="Nom complet du père (lettres uniquement)"
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Nom de la mère <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          value={step2.mere} 
                          onChange={e => {
                            // Ne garder que les lettres, espaces, apostrophes et tirets
                            const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
                            setStep2({ ...step2, mere: value });
                          }} 
                          required 
                          style={inputStyle}
                          placeholder="Nom complet de la mère (lettres uniquement)"
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          CIN <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={step2.cin} 
                          onChange={e => {
                            // Ne garder que les chiffres
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            // Formater avec des espaces tous les 3 chiffres
                            const formatted = digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ');
                            setStep2({ ...step2, cin: formatted });
                          }} 
                          required 
                          style={inputStyle}
                          placeholder="123 456 789 012"
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Date de délivrance CIN <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          type="date" 
                          value={step2.delivcin} 
                          onChange={e => {
                            const selectedDate = e.target.value;
                            // Validation : la date ne doit pas être dans le futur
                            if (selectedDate > maxDateDelivrance) {
                              alert('La date de délivrance CIN ne peut pas être dans le futur');
                              return;
                            }
                            setStep2({ ...step2, delivcin: selectedDate });
                          }} 
                          min={minDateDelivrance}
                          max={maxDateDelivrance}
                          required 
                          disabled={!step2.datenais}
                          style={{
                            ...inputStyle,
                            ...(!step2.datenais && { 
                              backgroundColor: currentTheme.colors.backgroundTertiary,
                              cursor: 'not-allowed',
                              opacity: 0.6
                            })
                          }}
                          title={!step2.datenais ? 'Veuillez d\'abord saisir la date de naissance' : 'Date de délivrance CIN'}
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Adresse du locataire <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          value={step2.adressecli} 
                          onChange={e => setStep2({ ...step2, adressecli: e.target.value })} 
                          required 
                          style={inputStyle}
                          placeholder="Adresse complète"
                        />
                    </div>
                    <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#374151'
                        }}>
                          Activité <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input 
                          className="form-control" 
                          value={step2.activite} 
                          onChange={e => setStep2({ ...step2, activite: e.target.value })} 
                          required 
                          style={inputStyle}
                          placeholder="Profession ou activité"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                          Contact
                        </label>
                        <input 
                          className="form-control" 
                          type="text"
                          value={step2.contact} 
                          onChange={e => {
                            // Ne garder que les chiffres, espaces, + et -
                            const value = e.target.value.replace(/[^0-9+\-\s]/g, '');
                            setStep2({ ...step2, contact: value });
                          }}
                          style={inputStyle}
                          placeholder="Ex: +261 34 12 345 67"
                        />
                    </div>
                  </div>
                </form>
              )}

              {step === 3 && (
                  <div style={{ 
                    display: 'grid', 
                    gap: 24,
                    background: currentTheme.colors.background,
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {/* Alerte limite atteinte */}
                    {editingConv && (() => {
                      const countForConv = getEditCountForConv(editingConv.numConv);
                      const limitReached = countForConv >= 2;
                      if (limitReached) {
                        const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                        const demandeApprouvee = demandes.find(d => 
                          d.convention === editingConv.numConv &&
                          d.statut === 'approuvee' && 
                          !d.utilisee
                        );
                        if (!demandeApprouvee) {
                          return (
                            <div style={{
                              padding: '16px',
                              background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                              border: `2px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7'}`,
                              borderRadius: '12px',
                              marginBottom: '16px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px'
                            }}>
                              <i className="fas fa-exclamation-triangle" style={{ 
                                color: '#f59e0b', 
                                fontSize: '24px',
                                marginTop: '2px',
                                flexShrink: 0
                              }}></i>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ 
                                  margin: '0 0 8px', 
                                  fontSize: '16px', 
                                  fontWeight: 600, 
                                  color: currentTheme.colors.text 
                                }}>
                                  Limite de modifications atteinte
                                </h4>
                                <p style={{ 
                                  margin: 0, 
                                  fontSize: '14px', 
                                  color: currentTheme.colors.textSecondary,
                                  lineHeight: '1.5'
                                }}>
                                  Vous avez atteint la limite de 2 modifications pour cette convention ({countForConv}/2). 
                                  Pour effectuer une modification supplémentaire, veuillez demander une autorisation à l'administrateur en cliquant sur le bouton "Demander autorisation" ci-dessous.
                                </p>
                              </div>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                    <div style={{
                      marginBottom: '16px',
                      padding: '16px',
                      background: currentTheme.colors.cardBackground,
                      border: `1px solid ${currentTheme.colors.border}`,
                      transition: 'all 0.3s ease',
                      borderRadius: '8px'
                    }}>
                      <h3 style={{ 
                        margin: '0 0 12px', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: '#1f2937' 
                      }}>
                        Aperçu de la convention
                      </h3>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: '#6b7280' 
                      }}>
                        Vérifiez les informations avant de valider
                      </p>
                    </div>
                  <style>{docCss}</style>
                    <div className="doc" style={{
                      background: currentTheme.colors.cardBackground,
          border: `1px solid ${currentTheme.colors.border}`,
          transition: 'all 0.3s ease',
                      padding: '24px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}>
                    <div className="page">
                      <div className="header">
                        <div>
                          <div style={{ fontWeight: 700 }}>LA DIRECTION DE LA F.C.E.</div>
                          <div>FIANARANTSOA</div>
                        </div>
                        <div className="muted">CONVENTION N° <span className="hl">..../TER/{new Date().getFullYear()}</span></div>
                      </div>
                      <div className="title">D'UN BÂTIMENT SIS À <span className="hl">{(step1.adresse || '').toUpperCase() || '................'}</span></div>
                      <div className="sep"></div>
                      <div className="article"><strong>Article 1 :</strong> La Société d'Etat Ligne FCE donne en location à titre temporaire à <span className="hl">{step2.nomcli || '................................'}</span> un bâtiment sis à <span className="hl">{step1.adresse || '....................'}</span>.</div>
                      <div className="article"><strong>Article 2 :</strong> La location est consentie pour permettre à <span className="hl">{step2.nomcli || '................................'}</span>.</div>
                      <div className="article">
                        <div>Né(e) le <span className="hl">{step2.datenais || '.......'}</span> à <span className="hl">{step2.lieunais || '................'}</span>,</div>
                        <div>Fils de <span className="hl">{step2.pere || '................'}</span> et de <span className="hl">{step2.mere || '................'}</span>.</div>
                        <div>CIN n° <span className="hl">{step2.cin || '................'}</span> délivrée le <span className="hl">{step2.delivcin || '........'}</span>.</div>
                        <div>Adresse : <span className="hl">{step2.adressecli || '................................'}</span>.</div>
                        <div>Activité : <span className="hl">{step2.activite || '................................'}</span>.</div>
                      </div>
                      <div className="article"><strong>Article 3 :</strong> Le locataire doit se conformer aux prescriptions légales et réglementaires relatives aux Chemins de Fer.</div>
                      <div className="article"><strong>Article 4 :</strong> Aucune modification ou extension sans accord écrit de la ligne FCE.</div>
                      <div className="article"><strong>Article 5 :</strong> Le locataire déclare prendre à sa charge tous les risques d'incendie.</div>
                      <div className="article"><strong>Article 6 :</strong> Les taxes et impôts de toute nature restent à la charge du locataire.</div>
                      <div className="article"><strong>Article 7 :</strong> La présente location est strictement personnelle, sans cession ni sous-location.</div>
                      <div className="article"><strong>Article 8 :</strong> Le prix du loyer est fixé à <span className="hl">{step1.montant ? Number(step1.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '........'} Ar</span>.</div>
                    </div>
                    <div className="page">
                      <div className="article"><strong>Article 9 :</strong> Durée d'un (01) an renouvelable avec augmentation de <span className="hl">5%</span> après notification.</div>
                      <div className="article"><strong>Article 10 :</strong> Résiliation possible avant échéance par simple préavis.</div>
                      <div className="article"><strong>Article 11 :</strong> Pour les points non prévus, se référer aux articles du Code Civil.</div>
                      <div className="article"><strong>Article 12 :</strong> Tout différend sera porté devant le tribunal Administratif de FIANARANTSOA.</div>
                      <div className="article"><strong>Article 13 :</strong> Cette convention annule la convention antérieure.</div>
                      <div className="article"><strong>Article 14 :</strong> Exécution de la présente aux lieux ci-après : FIANARANTSOA pour <strong>LA SOCIETE D'ETAT/ RNCFM/FCE</strong> et FIANARANTSOA pour <span className="hl">{step2.nomcli || '................................'}</span>. La date d'effet est fixée le <span className="hl">{new Date().getFullYear()}-01-01</span>.</div>
                      <div className="sig muted">
                        <div>FIANARANTSOA, le</div>
                        <div>Le Directeur de la FCE</div>
                        <div>LE LOCATAIRE</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Footer du modal */}
              <WizardFooter />
            </div>
          </div>
        )}
      </main>

      {/* Modal Demande de Modification */}
      {showEditRequestModal && (
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
            setShowEditRequestModal(false);
            setEditRequestReason('');
          }}
        >
          <div
            style={{
              background: currentTheme.colors.cardBackground,
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${currentTheme.colors.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: currentTheme.colors.primary, fontSize: '24px', fontWeight: 600 }}>
              Demande d'Autorisation de Modification
            </h2>
            
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="fas fa-info-circle" style={{ color: '#f59e0b', fontSize: '18px' }}></i>
                <strong style={{ color: currentTheme.colors.text }}>Limite atteinte</strong>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textSecondary }}>
                Vous avez atteint la limite de 2 modifications pour cette convention. Veuillez demander une autorisation à l'administrateur pour effectuer une modification supplémentaire.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                Raison de la demande <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={editRequestReason}
                onChange={(e) => setEditRequestReason(e.target.value)}
                placeholder="Expliquez pourquoi vous avez besoin d'une modification supplémentaire..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: currentTheme.colors.cardBackground,
                  color: currentTheme.colors.text
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEditRequestModal(false);
                  setEditRequestReason('');
                }}
                style={{
                  padding: '12px 24px',
                  background: currentTheme.colors.cardBackground,
                  color: currentTheme.colors.text,
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = currentTheme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = currentTheme.colors.cardBackground;
                }}
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!editRequestReason.trim()) {
                    setMsg('Veuillez indiquer la raison de la demande');
                    setTimeout(() => setMsg(''), 2000);
                    return;
                  }

                  setLoading(true);
                  try {
                    const token = localStorage.getItem('token');
                    const userData = JSON.parse(localStorage.getItem('user') || '{}');
                    
                    // Créer une demande de modification
                    const API_DEMANDES = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/demandes-modification`;
                    try {
                      await fetch(API_DEMANDES, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          type: 'modification',
                          raison: editRequestReason.trim(),
                          demandeur: userData.matricule || userData.nom || 'Rédacteur',
                          convention: editingConv ? editingConv.numConv : null
                        })
                      });
                    } catch (apiError) {
                      // Si l'API n'existe pas encore, stocker localement
                    }
                    
                    // Stocker localement
                    const demandes = JSON.parse(localStorage.getItem('demandesModification') || '[]');
                    demandes.push({
                      id: Date.now(),
                      type: 'modification',
                      raison: editRequestReason.trim(),
                      demandeur: userData.nom || 'Rédacteur',
                      matricule: userData.matricule || 'N/A',
                      convention: editingConv ? editingConv.numConv : null,
                      statut: 'en_attente',
                      date: new Date().toISOString(),
                      utilisee: false
                    });
                    localStorage.setItem('demandesModification', JSON.stringify(demandes));
                    
                    // Enregistrer dans l'historique
                    const historique = JSON.parse(localStorage.getItem('historiqueActivites') || '[]');
                    historique.push({
                      id: Date.now(),
                      utilisateur: userData.nom || 'Rédacteur',
                      matricule: userData.matricule || 'N/A',
                      action: 'Demande de modification',
                      type: 'Convention',
                      description: `Demande d'autorisation pour modification supplémentaire${editingConv ? ` de la convention ${editingConv.numConv}` : ''}`,
                      date: new Date().toISOString(),
                      details: {
                        raison: editRequestReason.trim(),
                        convention: editingConv ? editingConv.numConv : null
                      },
                      statut: 'En attente'
                    });
                    localStorage.setItem('historiqueActivites', JSON.stringify(historique));
                    
                    setMsg('Demande envoyée. En attente d\'approbation de l\'administrateur.');
                    setShowEditRequestModal(false);
                    setEditRequestReason('');
                    setDemandesModification(JSON.parse(localStorage.getItem('demandesModification') || '[]'));
                    
                    // Si on est dans le wizard, on peut fermer le wizard ou le laisser ouvert
                    // L'utilisateur devra attendre l'approbation avant de pouvoir modifier
                    if (showWizard && editingConv) {
                      // Optionnel : fermer le wizard après la demande
                      // setShowWizard(false);
                      // resetWizard();
                    }
                  } catch (error) {
                    console.error('Erreur:', error);
                    setMsg('Erreur lors de l\'envoi de la demande');
                  } finally {
                    setLoading(false);
                    setTimeout(() => setMsg(''), 3000);
                  }
                }}
                disabled={loading || !editRequestReason.trim()}
                style={{
                  padding: '12px 24px',
                  background: currentTheme.colors.primary,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || !editRequestReason.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: '14px',
                  opacity: loading || !editRequestReason.trim() ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loading && editRequestReason.trim()) {
                    e.target.style.background = currentTheme.colors.primaryDark;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && editRequestReason.trim()) {
                    e.target.style.background = currentTheme.colors.primary;
                  }
                }}
              >
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </div>
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
    </div>
    </>
  );
}

const btnIcon = {
  width: 36,
  height: 36,
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontSize: 15,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
// Styles simples réutilisables
const inputStyle = { 
  width: '100%', 
  padding: '12px 16px', 
  borderRadius: '10px', 
  border: '1px solid #d1d5db',
  fontSize: '14px',
  color: '#1f2937',
  transition: 'all 0.2s ease',
  outline: 'none'
};
const btnPrimary = { padding: '10px 14px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 };
const btnSecondary = { padding: '10px 14px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 };
const btnLight = { padding: '10px 14px', background: '#f1f3f5', color: '#333', border: '1px solid #ddd', borderRadius: 8, fontWeight: 600 };
const btnDanger = { padding: '10px 14px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 };
