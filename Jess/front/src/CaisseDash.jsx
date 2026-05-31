import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, API_ENDPOINTS } from './config/api';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import logoImage from './images/fcee.gif';
import { useTheme } from './contexts/ThemeContext';
import { lightTheme, darkTheme } from './theme';
import ThemeToggle from './components/ThemeToggle';
import { useConfirm } from './hooks/useConfirm';
import ConfirmModal from './components/ConfirmModal';
import * as XLSX from 'xlsx';

export default function CaissierHome() {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error, info } = useToast();
  const { theme: themeContext, isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;
  const { confirm, close, confirmState } = useConfirm();
  const [activeSection, setActiveSection] = useState('factures'); // 'factures', 'paiements', 'conventions', 'statuts'
  const [factures, setFactures] = useState([]);
  const [conventions, setConventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLoginLoader, setShowLoginLoader] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedConvention, setSelectedConvention] = useState(null);
  const [showConventionModal, setShowConventionModal] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [showFactureDetailModal, setShowFactureDetailModal] = useState(false);
  const [factureDetails, setFactureDetails] = useState(null);
  const [loadingFactureDetails, setLoadingFactureDetails] = useState(false);
  const [paiements, setPaiements] = useState([]);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [showPaiementDetailModal, setShowPaiementDetailModal] = useState(false);
  const [stats, setStats] = useState({
    totalFactures: 0,
    facturesPayees: 0,
    facturesEnAttente: 0,
    montantTotal: 0
  });

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

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  
  // Filtre de période pour les statistiques
  const [statsPeriodFilter, setStatsPeriodFilter] = useState('Toutes les données');
  const [allFactures, setAllFactures] = useState([]); // Pour calculer les stats filtrées
  
  // Filtre de période pour le graphique d'évolution
  const [evolutionPeriod, setEvolutionPeriod] = useState('mois'); // 'mois', 'semaine', 'jour', 'trimestre', 'annee'
  
  // États pour les changements de statut
  const [statusChanges, setStatusChanges] = useState(null);
  const [loadingStatusChanges, setLoadingStatusChanges] = useState(false);

  // Fonction pour charger les données du formulaire depuis localStorage
  const loadFormFromStorage = (key, defaultValues) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Vérifier que les données ne sont pas trop anciennes (7 jours)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (err) {
      console.warn(`Erreur lors du chargement de ${key} depuis localStorage:`, err);
    }
    return defaultValues;
  };

  // Fonction pour sauvegarder les données du formulaire dans localStorage
  const saveFormToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, err);
    }
  };

  // Formulaire facture avec logique de mémoire
  const [factureForm, setFactureForm] = useState(() => 
    loadFormFromStorage('factureForm', {
      numConv: '',
      mois: new Date().toISOString().slice(0, 7),
      libelles: ''
    })
  );

  // Sauvegarder automatiquement le formulaire de facture dans localStorage
  useEffect(() => {
    saveFormToStorage('factureForm', factureForm);
  }, [factureForm]);

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

  // Formulaire paiement avec logique de mémoire
  const [paymentForm, setPaymentForm] = useState(() => 
    loadFormFromStorage('paymentForm', {
      numFact: '',
      nomClient: '',
      montant: '',
      datePaiement: new Date().toISOString().split('T')[0],
      methodePaiement: 'Carte bancaire',
      notes: '',
      dateArrivee: new Date().toISOString().split('T')[0] // Pour le calcul proportionnel
    })
  );

  // Sauvegarder automatiquement le formulaire de paiement dans localStorage
  useEffect(() => {
    saveFormToStorage('paymentForm', paymentForm);
  }, [paymentForm]);
  const [paymentLoyerResult, setPaymentLoyerResult] = useState(null);

  // Formulaire calculateur de loyer
  const [loyerForm, setLoyerForm] = useState({
    dateArrivee: new Date().toISOString().split('T')[0],
    loyerMensuel: ''
  });
  const [loyerResult, setLoyerResult] = useState(null);

  useEffect(() => {
    if (activeSection === 'factures') {
      loadFactures();
      loadStats();
    } else if (activeSection === 'conventions') {
      loadConventions(search);
    } else if (activeSection === 'paiements') {
      loadPaiements();
      loadStats();
    } else if (activeSection === 'statuts') {
      loadStatusChanges();
    }
  }, [activeSection, page, evolutionPeriod]);

  // Debounce pour la recherche de conventions
  useEffect(() => {
    if (activeSection === 'conventions') {
      const timeoutId = setTimeout(() => {
        loadConventions(search);
      }, 300); // Debounce de 300ms
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Charger toutes les factures quand le modal de paiement s'ouvre
  useEffect(() => {
    if (showPaymentModal) {
      loadAllFacturesForStats();
    }
  }, [showPaymentModal]);

  // Charger les conventions disponibles pour création de facture
  const [availableConventions, setAvailableConventions] = useState([]);

  // Charger les conventions disponibles quand le modal de facture s'ouvre
  useEffect(() => {
    if (showFactureModal) {
      loadAvailableConventions();
    }
  }, [showFactureModal]);

  const loadAvailableConventions = async () => {
    try {
      // Charger uniquement les conventions "En attente" qui n'ont pas encore de facture
      const response = await apiRequest(API_ENDPOINTS.CONVENTIONS_AVAILABLE_FOR_INVOICE);
      const conventionsData = response.data || [];
      setAvailableConventions(conventionsData);
      console.log(`✅ ${conventionsData.length} conventions disponibles pour création de facture`);
    } catch (err) {
      console.error('Erreur chargement conventions disponibles:', err);
      error(err.message || 'Erreur lors du chargement des conventions disponibles');
      setAvailableConventions([]);
    }
  };

  const loadFactures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { q: search })
      });
      const response = await apiRequest(`${API_ENDPOINTS.FACTURES}?${params}`);
      setFactures(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err) {
      error(err.message || 'Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  // Charger toutes les factures pour les statistiques et le formulaire de paiement
  const loadAllFacturesForStats = async () => {
    try {
      // Charger toutes les factures existantes sans limite
      const response = await apiRequest(`${API_ENDPOINTS.FACTURES}?limit=10000`);
      const facturesData = response.data || [];
      setAllFactures(facturesData);
      console.log(`✅ ${facturesData.length} factures chargées pour paiement`);
    } catch (err) {
      console.error('Erreur chargement factures pour stats:', err);
      // Ne pas vider les factures en cas d'erreur
    }
  };

  const loadConventions = async (searchQuery = '') => {
    try {
      // Charger les conventions avec recherche si fournie
      const params = new URLSearchParams({
        limit: '1000',
        ...(searchQuery && { q: searchQuery })
      });
      const response = await apiRequest(`${API_ENDPOINTS.CONVENTIONS}?${params}`);
      const conventionsData = response.data || [];
      setConventions(conventionsData);
      console.log(`✅ ${conventionsData.length} conventions chargées${searchQuery ? ` (recherche: "${searchQuery}")` : ''}`);
    } catch (err) {
      console.error('Erreur chargement conventions:', err);
      error(err.message || 'Erreur lors du chargement des conventions');
      // Ne pas vider les conventions en cas d'erreur, garder les données existantes
    }
  };

  // Charger les paiements (factures payées)
  const loadPaiements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '1000',
        statut: 'true', // Uniquement les factures payées
        ...(search && { q: search }) // Recherche si présente
      });
      const response = await apiRequest(`${API_ENDPOINTS.FACTURES}?${params}`);
      // Filtrer uniquement les factures payées (double vérification)
      const facturesPayees = (response.data || []).filter(
        f => f.statutPaiement === true || f.paye === true
      );
      setPaiements(facturesPayees);
    } catch (err) {
      error(err.message || 'Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.FACTURES_STATS);
      setStats(response.data || stats);
      // Charger aussi toutes les factures pour le filtrage
      await loadAllFacturesForStats();
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  // Fonction pour charger les changements de statut (lecture seule pour Caissier)
  const loadStatusChanges = async () => {
    setLoadingStatusChanges(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.FACTURES_STATUS_CHANGES, {
        method: 'GET'
      });
      
      if (response.status === 200) {
        setStatusChanges(response);
        console.log('✅ Changements de statut chargés:', response.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des changements de statut:', err);
      error(err.message || 'Erreur lors du chargement des changements de statut');
    } finally {
      setLoadingStatusChanges(false);
    }
  };

  // Fonction pour filtrer les factures par période
  const filterFacturesByPeriod = (factures, period) => {
    if (period === 'Toutes les données') {
      return factures;
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
        return factures;
    }

    return factures.filter(facture => {
      let factureDate;
      
      // Si mois est au format "YYYY-MM", le convertir en date
      if (facture.mois && typeof facture.mois === 'string' && facture.mois.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = facture.mois.split('-');
        factureDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      } else {
        factureDate = new Date(facture.mois || facture.dateFact || facture.createdAt || facture.date);
      }
      
      return factureDate >= startDate && factureDate <= now;
    });
  };

  // Calculer les statistiques filtrées
  const getFilteredStats = useMemo(() => {
    const filtered = filterFacturesByPeriod(allFactures, statsPeriodFilter);
    
    const totalFactures = filtered.length;
    const facturesPayees = filtered.filter(f => f.statutPaiement === true || f.paye === true).length;
    const facturesEnAttente = totalFactures - facturesPayees;
    const montantTotal = filtered.reduce((sum, f) => {
      return sum + (f.batiment?.montant || f.montant || 0);
    }, 0);

    return {
      totalFactures,
      facturesPayees,
      facturesEnAttente,
      montantTotal
    };
  }, [allFactures, statsPeriodFilter]);

  const handleCreateFacture = async () => {
    if (!factureForm.numConv || !factureForm.mois) {
      error('Veuillez remplir tous les champs obligatoires (Convention et Mois)');
      return;
    }

    setLoading(true);
    try {
      console.log('✅ Création de facture avec les données:', factureForm);
      
      const response = await apiRequest(API_ENDPOINTS.FACTURES, {
        method: 'POST',
        body: JSON.stringify({
          numConv: parseInt(factureForm.numConv),
          mois: factureForm.mois,
          libelles: factureForm.libelles || ''
        })
      });
      
      console.log('✅ Réponse du serveur:', response);
      
      // Succès - vider le formulaire et sauvegarder
      success('Facture créée avec succès');
      setShowFactureModal(false);
      
      // Réinitialiser le formulaire mais garder le mois actuel
      const newForm = {
        numConv: '',
        mois: factureForm.mois, // Garder le même mois pour faciliter la création de plusieurs factures
        libelles: ''
      };
      setFactureForm(newForm);
      saveFormToStorage('factureForm', newForm);
      
      // Recharger toutes les données pour synchroniser l'interface
      await Promise.all([
        loadFactures(),
        loadAllFacturesForStats(),
        loadStats(),
        loadAvailableConventions() // Recharger les conventions disponibles
      ]);
    } catch (err) {
      console.error('❌ Erreur lors de la création de la facture:', err);
      error(err.message || 'Erreur lors de la création de la facture. Vérifiez que la convention existe et que le mois est valide.');
      // Ne pas vider le formulaire en cas d'erreur - les données sont sauvegardées dans localStorage
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Nettoyer toutes les données de session
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('factureForm');
    localStorage.removeItem('paymentForm');
    setShowLogoutModal(false);
    navigate('/');
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.numFact || !paymentForm.datePaiement) {
      error('Veuillez remplir tous les champs obligatoires (Numéro de facture et Date de paiement)');
      return;
    }

    // S'assurer que numFact est un nombre
    const numFact = parseInt(paymentForm.numFact);
    if (isNaN(numFact)) {
      error('Numéro de facture invalide');
      return;
    }

    setLoading(true);
    try {
      console.log('✅ Enregistrement du paiement pour la facture:', numFact);
      
      // Mettre à jour le statut de paiement de la facture
      const response = await apiRequest(API_ENDPOINTS.FACTURE(numFact), {
        method: 'PUT',
        body: JSON.stringify({
          statutPaiement: true,
          datePaiement: paymentForm.datePaiement
        })
      });
      
      console.log('✅ Paiement enregistré avec succès:', response);
      
      // Succès - réinitialiser le formulaire mais garder la date de paiement
      success('Paiement enregistré avec succès');
      setShowPaymentModal(false);
      
      const newPaymentForm = {
        numFact: '',
        nomClient: '',
        montant: '',
        datePaiement: paymentForm.datePaiement, // Garder la même date
        methodePaiement: 'Carte bancaire',
        notes: '',
        dateArrivee: new Date().toISOString().split('T')[0]
      };
      setPaymentForm(newPaymentForm);
      saveFormToStorage('paymentForm', newPaymentForm);
      
      // Recharger toutes les données
      await Promise.all([
        loadFactures(),
        loadPaiements(),
        loadAllFacturesForStats(),
        loadStats(),
        loadConventions(), // Recharger toutes les conventions pour voir le changement de statut
        loadAvailableConventions() // Recharger les conventions disponibles (la convention payée ne devrait plus apparaître)
      ]);
      
      // Si on est sur la page des conventions, forcer un rechargement pour mettre à jour l'affichage
      if (activeSection === 'conventions') {
        await loadConventions();
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'enregistrement du paiement:', err);
      error(err.message || 'Erreur lors de l\'enregistrement du paiement. Vérifiez que la facture existe.');
      // Ne pas vider le formulaire en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour marquer une facture comme payée directement
  const handleMarkAsPaid = async (facture) => {
    const confirmed = await confirm({
      title: 'Confirmation de paiement',
      message: `Marquer la facture #${facture.numFact} comme payée ?`,
      type: 'info',
      confirmText: 'Confirmer',
      cancelText: 'Annuler'
    });

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      // Utiliser la date d'aujourd'hui pour le paiement
      const aujourdhui = new Date().toISOString().split('T')[0];
      await apiRequest(API_ENDPOINTS.FACTURE(facture.numFact), {
        method: 'PUT',
        body: JSON.stringify({
          statutPaiement: true,
          datePaiement: aujourdhui
        })
      });
      
      success('Facture marquée comme payée. Le statut de la convention a été mis à jour automatiquement.');
      loadFactures();
      if (activeSection === 'paiements') {
        loadPaiements();
      }
      // Recharger les conventions pour voir le changement de statut automatique
      await Promise.all([
        loadConventions(),
        loadAvailableConventions(), // Recharger aussi les conventions disponibles
        loadStats()
      ]);
      
      // Si on est sur la page des conventions, recharger aussi pour mettre à jour l'affichage
      if (activeSection === 'conventions') {
        await loadConventions();
      }
    } catch (err) {
      error(err.message || 'Erreur lors de la mise à jour de la facture');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 Ar';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' Ar';
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

  // Fonction pour formater le numéro de facture au format 1125/SPDC
  const formatFactureNumber = (numFact) => {
    if (!numFact) return '..../SPDC';
    return `${numFact}/SPDC`;
  };

  // Fonction de calcul du loyer proportionnel pour le paiement
  const calculerLoyerProportionnelPaiement = () => {
    if (!paymentForm.dateArrivee || !paymentForm.montant) {
      error('Veuillez remplir la date d\'arrivée et le loyer mensuel');
      return;
    }

    const loyerMensuel = parseFloat(paymentForm.montant);
    if (isNaN(loyerMensuel) || loyerMensuel <= 0) {
      error('Le loyer mensuel doit être un nombre positif');
      return;
    }

    const dateArrivee = new Date(paymentForm.dateArrivee);
    const jourArrivee = dateArrivee.getDate();
    const moisArrivee = dateArrivee.getMonth() + 1; // 1-12
    const anneeArrivee = dateArrivee.getFullYear();

    let montantAPayer;
    let prochaineDatePaiement;

    // Cas 1 : le client arrive le 1er du mois
    if (jourArrivee === 1) {
      montantAPayer = loyerMensuel;
    } else {
      // Cas 2 : arrivée un autre jour (paiement proportionnel)
      // Calculer le nombre de jours dans le mois
      const joursDuMois = new Date(anneeArrivee, moisArrivee, 0).getDate();
      
      // Calculer les jours restants (du jour d'arrivée jusqu'à la fin du mois)
      const joursRestants = joursDuMois - jourArrivee + 1;
      
      // Calculer le prix par jour
      const prixParJour = loyerMensuel / joursDuMois;
      
      // Calculer le montant à payer
      montantAPayer = prixParJour * joursRestants;
    }

    // Calcul de la prochaine date de paiement (1er du mois suivant)
    if (moisArrivee === 12) {
      prochaineDatePaiement = new Date(anneeArrivee + 1, 0, 1); // 1er janvier de l'année suivante
    } else {
      prochaineDatePaiement = new Date(anneeArrivee, moisArrivee, 1); // 1er du mois suivant
    }

    // Arrondir le montant à payer
    montantAPayer = Math.round(montantAPayer);

    setPaymentLoyerResult({
      montantAPayer,
      prochaineDatePaiement: prochaineDatePaiement.toISOString().split('T')[0],
      joursRestants: jourArrivee === 1 ? null : (new Date(anneeArrivee, moisArrivee, 0).getDate() - jourArrivee + 1),
      joursDuMois: jourArrivee === 1 ? null : new Date(anneeArrivee, moisArrivee, 0).getDate()
    });

    // Appliquer automatiquement le montant calculé
    setPaymentForm({ ...paymentForm, montant: montantAPayer.toString() });
    
    // Mettre à jour la date de paiement si elle est vide ou antérieure
    const datePaiementActuelle = new Date(paymentForm.datePaiement);
    const nouvelleDatePaiement = new Date(prochaineDatePaiement);
    if (!paymentForm.datePaiement || datePaiementActuelle < nouvelleDatePaiement) {
      setPaymentForm(prev => ({ ...prev, datePaiement: nouvelleDatePaiement.toISOString().split('T')[0] }));
    }

    success('Calcul effectué avec succès. Le montant a été appliqué automatiquement.');
  };

  // Fonction de calcul du loyer proportionnel
  const calculerLoyerProportionnel = () => {
    if (!loyerForm.dateArrivee || !loyerForm.loyerMensuel) {
      error('Veuillez remplir tous les champs');
      return;
    }

    const loyerMensuel = parseFloat(loyerForm.loyerMensuel);
    if (isNaN(loyerMensuel) || loyerMensuel <= 0) {
      error('Le loyer mensuel doit être un nombre positif');
      return;
    }

    const dateArrivee = new Date(loyerForm.dateArrivee);
    const jourArrivee = dateArrivee.getDate();
    const moisArrivee = dateArrivee.getMonth() + 1; // 1-12
    const anneeArrivee = dateArrivee.getFullYear();

    let montantAPayer;
    let prochaineDatePaiement;

    // Cas 1 : le client arrive le 1er du mois
    if (jourArrivee === 1) {
      montantAPayer = loyerMensuel;
    } else {
      // Cas 2 : arrivée un autre jour (paiement proportionnel)
      // Calculer le nombre de jours dans le mois
      const joursDuMois = new Date(anneeArrivee, moisArrivee, 0).getDate();
      
      // Calculer les jours restants (du jour d'arrivée jusqu'à la fin du mois)
      const joursRestants = joursDuMois - jourArrivee + 1;
      
      // Calculer le prix par jour
      const prixParJour = loyerMensuel / joursDuMois;
      
      // Calculer le montant à payer
      montantAPayer = prixParJour * joursRestants;
    }

    // Calcul de la prochaine date de paiement (1er du mois suivant)
    if (moisArrivee === 12) {
      prochaineDatePaiement = new Date(anneeArrivee + 1, 0, 1); // 1er janvier de l'année suivante
    } else {
      prochaineDatePaiement = new Date(anneeArrivee, moisArrivee, 1); // 1er du mois suivant
    }

    // Arrondir le montant à payer
    montantAPayer = Math.round(montantAPayer);

    setLoyerResult({
      montantAPayer,
      prochaineDatePaiement: prochaineDatePaiement.toISOString().split('T')[0],
      joursRestants: jourArrivee === 1 ? null : (new Date(anneeArrivee, moisArrivee, 0).getDate() - jourArrivee + 1),
      joursDuMois: jourArrivee === 1 ? null : new Date(anneeArrivee, moisArrivee, 0).getDate()
    });

    success('Calcul effectué avec succès');
  };

  // Fonctions d'exportation Excel
  const exportToExcel = (data, filename, sheetName = 'Données') => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}.xlsx`);
      success(`Export Excel réussi : ${filename}.xlsx`);
    } catch (err) {
      error('Erreur lors de l\'export Excel : ' + err.message);
    }
  };

  const exportFactures = () => {
    if (factures.length === 0) {
      error('Aucune facture à exporter');
      return;
    }
    const data = factures.map(facture => ({
      'N° Facture': formatFactureNumber(facture.numFact),
      'Convention': facture.convention ? formatConventionNumber(facture.convention) : `Conv. ${facture.numConv}`,
      'Mois': formatDate(facture.mois),
      'Libellé': facture.libelles || '',
      'Montant': facture.batiment?.montant || 0,
      'Montant (Ar)': formatCurrency(facture.batiment?.montant || 0)
    }));
    exportToExcel(data, `Factures_${new Date().toISOString().split('T')[0]}`, 'Factures');
  };

  const exportFactureDetail = (facture) => {
    const data = [{
      'N° Facture': formatFactureNumber(facture.numFact),
      'Convention': facture.convention ? formatConventionNumber(facture.convention) : `Conv. ${facture.numConv}`,
      'Mois': formatDate(facture.mois),
      'Libellé': facture.libelles || '',
      'Montant': facture.batiment?.montant || 0,
      'Montant (Ar)': formatCurrency(facture.batiment?.montant || 0)
    }];
    exportToExcel(data, `Facture_${facture.numFact}`, 'Facture');
  };

  // Fonction pour convertir un nombre en lettres (français)
  const nombreEnLettres = (nombre) => {
    const unites = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF', 'DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const dizaines = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE', 'QUATRE-VINGT', 'QUATRE-VINGT'];
    
    if (nombre === 0) return 'ZÉRO';
    if (nombre < 20) return unites[nombre];
    if (nombre < 100) {
      const d = Math.floor(nombre / 10);
      const u = nombre % 10;
      if (d === 7 || d === 9) {
        const base = d === 7 ? 60 : 80;
        const reste = nombre - base;
        if (reste === 0) return dizaines[d];
        if (reste < 20) return dizaines[d] + '-' + unites[reste];
        return dizaines[d] + '-' + nombreEnLettres(reste);
      }
      if (u === 0) return dizaines[d];
      if (u === 1 && d !== 8) return dizaines[d] + ' ET ' + unites[u];
      return dizaines[d] + '-' + unites[u];
    }
    if (nombre < 1000) {
      const c = Math.floor(nombre / 100);
      const reste = nombre % 100;
      let result = c === 1 ? 'CENT' : unites[c] + ' CENT';
      if (reste === 0 && c > 1) result += 'S';
      if (reste > 0) result += ' ' + nombreEnLettres(reste);
      return result;
    }
    if (nombre < 1000000) {
      const m = Math.floor(nombre / 1000);
      const reste = nombre % 1000;
      let result = m === 1 ? 'MILLE' : nombreEnLettres(m) + ' MILLE';
      if (reste > 0) result += ' ' + nombreEnLettres(reste);
      return result;
    }
    return nombre.toString();
  };

  // Fonction pour imprimer une facture
  const printFacture = async (facture) => {
    const factureData = factureDetails || facture;
    const convention = factureData.convention || factureData;
    const locataire = convention.locataire || factureData.locataire;
    const batiment = factureData.batiment || convention.batiment;
    
    // Préparer les données
    // Utiliser le mois de la date de paiement si elle existe, sinon le mois actuel
    const datePaiement = factureData.datePaiement ? new Date(factureData.datePaiement) : new Date();
    const moisDate = datePaiement;
    const moisNom = moisDate.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const dateEmission = new Date();
    const anneeActuelle = dateEmission.getFullYear(); // Année actuelle pour l'exercice
    const jourSemaine = dateEmission.toLocaleDateString('fr-FR', { weekday: 'long' });
    const dateEmissionStr = `Fianarantsoa, le ${jourSemaine} ${dateEmission.getDate()} ${dateEmission.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    
    const montant = factureData.montant || batiment?.montant || 0;
    const montantEnLettres = nombreEnLettres(Math.floor(montant)).toUpperCase() + ' ARIARY';
    
    // Convertir le logo en base64
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
      logoBase64 = logoImage;
    }
    
    // Formater le numéro de convention (format: 480 052/TER/2024)
    const conventionNumFormatted = convention.numConv || factureData.numConv || '';
    const codeGare = '480';
    const conventionNumDisplay = conventionNumFormatted ? `${codeGare} ${String(conventionNumFormatted).padStart(3, '0')}/TER/${anneeActuelle}` : '';
    
    const html = buildFactureHTML({
      logoBase64,
      numFacture: factureData.numFact || '',
      exercice: anneeActuelle,
      mois: moisNom,
      nomClient: locataire?.nomcli || '',
      adresseClient: locataire?.adressecli || 'N/A',
      ville: 'FIANARANTSOA',
      conventionNum: conventionNumDisplay,
      depart: 'FIANARANTSOA',
      destination: 'FIANARANTSOA',
      codeGare: '480',
      libelles: factureData.libelles || `Location terrain ${batiment?.adresse || ''}`,
      montant: montant,
      montantEnLettres: montantEnLettres,
      dateEmission: dateEmissionStr
    });
    
    // Attendre que le document soit complètement chargé avant d'imprimer
    const w = window.open('', '_blank');
    if (!w) {
      error('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les popups.');
      return;
    }
    
    w.document.write(html);
    w.document.close();
    
    // Attendre que toutes les images soient chargées avant d'imprimer
    w.onload = () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 500);
    };
    
    // Fallback si onload ne se déclenche pas
    setTimeout(() => {
      if (w.document.readyState === 'complete') {
        w.focus();
        w.print();
      }
    }, 1000);
  };

  // Fonction pour construire le HTML de la facture
  const buildFactureHTML = (data) => {
    const f = (v, d = '') => (v ? String(v) : d);
    const money = (v) => {
      if (v == null || v === '') return '0,00';
      const num = Number(v);
      return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
    };
    
    // Générer le numéro de facture au format SPDC
    const numFactFormatted = data.numFacture ? `${data.numFacture}/SPDC` : '....../SPDC';
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.numFacture}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .page { page-break-after: always; }
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11px;
      margin: 0;
      padding: 0;
      color: #000;
      background: #fff;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 10mm 12mm;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .logo-container {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .logo {
      width: 75px;
      height: 75px;
      border-radius: 50%;
      border: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 8px;
      text-align: center;
      font-size: 7px;
      line-height: 1.1;
      flex-shrink: 0;
      background: #fff;
    }
    .logo img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      margin-bottom: 2px;
    }
    .logo-fce {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 1px;
    }
    .logo-text {
      font-size: 5.5px;
      margin-top: 1px;
      line-height: 1.0;
    }
    .header-right {
      text-align: right;
      font-size: 9px;
      line-height: 1.3;
    }
    .header-right .dm {
      font-weight: bold;
      margin-bottom: 3px;
      font-size: 10px;
    }
    .header-right .facture-num {
      font-weight: bold;
      font-size: 11px;
      margin: 3px 0;
    }
    .header-right .montant-header {
      margin-top: 8px;
      font-size: 9px;
    }
    .header-right .montant-value {
      font-size: 12px;
      font-weight: bold;
      margin-top: 2px;
    }
    .issuer-name {
      font-weight: bold;
      font-size: 9px;
      text-align: center;
      margin: 6px 0 10px 0;
      line-height: 1.3;
      text-transform: uppercase;
    }
    .client-section {
      margin: 10px 0;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
    }
    .client-info {
      flex: 1;
      font-size: 9px;
      line-height: 1.4;
    }
    .client-row {
      margin-bottom: 4px;
    }
    .client-label {
      font-weight: bold;
    }
    .table-container {
      margin: 10px 0;
      clear: both;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      margin-bottom: 6px;
    }
    table td, table th {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: left;
      vertical-align: middle;
    }
    table th {
      background-color: #f5f5f5;
      font-weight: bold;
      text-align: center;
    }
    table td {
      text-align: left;
    }
    .description-section {
      margin: 10px 0;
      font-size: 8.5px;
    }
    .description-label {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .description-content {
      border: 1px solid #000;
      padding: 5px;
      margin-bottom: 6px;
    }
    .description-content table {
      margin: 0;
      border: none;
    }
    .description-content table td {
      border: none;
      padding: 2px 4px;
    }
    .payment-terms {
      margin: 10px 0;
      font-size: 8.5px;
      text-align: justify;
      line-height: 1.3;
    }
    .amount-words {
      margin: 10px 0;
      font-size: 8.5px;
      font-weight: bold;
      line-height: 1.3;
    }
    .date-section {
      margin: 10px 0;
      font-size: 8.5px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      font-size: 8.5px;
    }
    .signature-box {
      text-align: center;
      width: 48%;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 45px;
      padding-top: 4px;
      line-height: 1.3;
    }
    .signature-title {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 8.5px;
    }
    .signature-name {
      margin-top: 4px;
      font-size: 8.5px;
    }
    .footer {
      margin-top: 25px;
      font-size: 7.5px;
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 5px;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-container">
        <div class="logo">
          ${data.logoBase64 ? `<img src="${data.logoBase64}" alt="Logo FCE" />` : '<div class="logo-fce">FCE</div>'}
          <div class="logo-text">Efa Ela Nitatarana...<br/>Sady Mbole Hianteherane</div>
        </div>
      </div>
      <div class="header-right">
        <div class="dm">DM 04</div>
        <div class="facture-num">Facture N°: ${numFactFormatted}</div>
        <div>Exercice: ${data.exercice}</div>
        <div>Mois: ${data.mois}</div>
        <div class="montant-header">Montant(Ar)</div>
        <div class="montant-value">${money(data.montant)}</div>
      </div>
    </div>
    
    <!-- Issuer Name -->
    <div class="issuer-name">
      RESEAU NATIONAL DES CHEMINS DE FER MALAGASY<br/>
      DIRECTION DE LA F.C.E<br/>
      LIGNE FERROVIAIRE FIANARANTSOA COTE-EST
    </div>
    
    <!-- Client Info -->
    <div class="client-section">
      <div class="client-info">
        <div class="client-row">
          <span class="client-label">Nom:</span>
          <span>${f(data.nomClient, '................................')}</span>
        </div>
        <div class="client-row">
          <span class="client-label">Lot/Adresse:</span>
          <span>${f(data.adresseClient, '................................')}</span>
        </div>
        <div class="client-row">
          <span class="client-label">Ville:</span>
          <span>${f(data.ville, '................................')}</span>
        </div>
      </div>
    </div>
    
    <!-- Tables -->
    <div class="table-container">
      <table>
        <tr>
          <th style="width: 20%;">Compte à débuter</th>
          <th style="width: 20%;">Convention N°</th>
          <th style="width: 12%;">Code_gare</th>
          <th style="width: 24%;">Départ</th>
          <th style="width: 24%;">Destination</th>
        </tr>
        <tr>
          <td>41 580 024</td>
          <td>${f(data.conventionNum, '........')}</td>
          <td>${f(data.codeGare, '480')}</td>
          <td>${f(data.depart, 'FIANARANTSOA')}</td>
          <td>${f(data.destination, 'FIANARANTSOA')}</td>
        </tr>
      </table>
      <table>
        <tr>
          <th style="width: 25%;">Montant hors taxe</th>
          <th style="width: 25%;">TVA 20%</th>
          <th style="width: 25%;">FRAIS BANCAIRE</th>
          <th style="width: 25%;">Montant(Ar)</th>
        </tr>
        <tr>
          <td>0</td>
          <td>0</td>
          <td>0</td>
          <td>${money(data.montant)}</td>
        </tr>
      </table>
    </div>
    
    <!-- Description -->
    <div class="description-section">
      <div class="description-label">LIBELLES:</div>
      <div class="description-content">
        <table>
          <tr>
            <td style="width: 15%;">REFERENCE:</td>
            <td></td>
          </tr>
          <tr>
            <td>LIBELLES:</td>
            <td>${f(data.libelles, 'Location terrain')}</td>
          </tr>
          <tr>
            <td>Période:</td>
            <td>mois de ${data.mois} ${data.exercice}</td>
          </tr>
        </table>
      </div>
    </div>
    
    <!-- Payment Terms -->
    <div class="payment-terms">
      <strong>A régulariser avant dix (10) jours après la réception de la présente facture.</strong>
    </div>
    
    <!-- Amount in Words -->
    <div class="amount-words">
      Arrêtée la présente facture à la somme de "<strong>${data.montantEnLettres}</strong>"
    </div>
    
    <!-- Date -->
    <div class="date-section">
      ${data.dateEmission}
    </div>
    
    <!-- Signatures -->
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-title">Le Directeur Adjoint de la F.C.E</div>
          <div class="signature-name">RAJAOBELISON</div>
          <div class="signature-name">Rova</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-title">Le Chef de Service Patrimoine</div>
          <div class="signature-name">RAZAFINDRABENJA</div>
          <div class="signature-name">Livaniaina Lucie</div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div>1 Avenue du General LECLERC, Ampasambazaha</div>
      <div>N° d'identification 711 101210015623 B.P. 1003 - BOA 0009 02000 1 294564 000 0 – 88</div>
      <div>Web. www.fce-madagascar.net fb:FCE-madagascar</div>
    </div>
  </div>
</body>
</html>`;
  };

  const exportConventions = () => {
    if (conventions.length === 0) {
      error('Aucune convention à exporter');
      return;
    }
    const data = conventions.map(conv => ({
      'N° Convention': formatConventionNumber(conv),
      'Client': conv.locataire?.nomcli || 'N/A',
      'Montant': conv.batiment?.montant || 0,
      'Montant (Ar)': formatCurrency(conv.batiment?.montant || 0),
      'Statut': conv.statutConv ? 'Confirmé' : 'En attente',
      'Date': new Date(conv.dateConv).toLocaleDateString('fr-FR')
    }));
    exportToExcel(data, `Conventions_${new Date().toISOString().split('T')[0]}`, 'Conventions');
  };

  const exportConventionDetail = (convention) => {
    const data = [{
      'N° Convention': formatConventionNumber(convention),
      'Client': convention.locataire?.nomcli || 'N/A',
      'Né(e)': convention.locataire?.datenais || 'N/A',
      'Lieu de naissance': convention.locataire?.lieunais || 'N/A',
      'CIN': convention.locataire?.cin || 'N/A',
      'Activité': convention.locataire?.activite || 'N/A',
      'N° Bâtiment': convention.numBat,
      'Adresse': convention.batiment?.adresse || 'N/A',
      'Loyer': convention.batiment?.montant || 0,
      'Loyer (Ar)': formatCurrency(convention.batiment?.montant || 0),
      'Statut': convention.statutConv ? 'Confirmé' : 'En attente',
      'Date': new Date(convention.dateConv).toLocaleDateString('fr-FR')
    }];
    exportToExcel(data, `Convention_${convention.numConv}`, 'Convention');
  };

  const exportStats = () => {
    const data = [
      { 'Métrique': 'Total Factures', 'Valeur': stats.totalFactures },
      { 'Métrique': 'Factures Payées', 'Valeur': stats.facturesPayees },
      { 'Métrique': 'Factures En Attente', 'Valeur': stats.facturesEnAttente },
      { 'Métrique': 'Montant Total', 'Valeur': stats.montantTotal },
      { 'Métrique': 'Montant Total (Ar)', 'Valeur': formatCurrency(stats.montantTotal) }
    ];
    exportToExcel(data, `Statistiques_${new Date().toISOString().split('T')[0]}`, 'Statistiques');
  };

    const exportPaiementDetail = (paiement) => {
    const data = [{
      'N° Facture': formatFactureNumber(paiement.numFact),
      'Numéro': paiement.numFact,
      'Convention': paiement.numConv,
      'Date': formatDate(paiement.mois),
      'Libellé': paiement.libelles || 'N/A',
      'Montant': paiement.batiment?.montant || 0,
      'Montant (Ar)': formatCurrency(paiement.batiment?.montant || 0),
      'Statut': 'Confirmé',
      'Client': paiement.locataire?.nomcli || 'N/A'
    }];
    exportToExcel(data, `Paiement_${paiement.numFact}`, 'Paiement');
  };

  // Charger les détails complets d'une facture
  const loadFactureDetails = async (numFact) => {
    setLoadingFactureDetails(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.FACTURE(numFact));
      setFactureDetails(response.data || null);
    } catch (err) {
      console.error('Erreur chargement détails facture:', err);
      // Si l'API ne retourne pas de détails, utiliser les données de base
      setFactureDetails(null);
    } finally {
      setLoadingFactureDetails(false);
    }
  };

  // Gérer l'ouverture du modal de détails
  const handleShowFactureDetails = (facture) => {
    setSelectedFacture(facture);
    setShowFactureDetailModal(true);
    // Charger les détails complets si nécessaire
    if (facture.numFact) {
      loadFactureDetails(facture.numFact);
    }
  };

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
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Sidebar */}
      <aside style={{
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
      }}>
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
              alt="Logo FCE"
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

        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
            {[
              { icon: 'fa-file-invoice-dollar', label: 'Factures', section: 'factures' },
              { icon: 'fa-credit-card', label: 'Paiements', section: 'paiements' },
              { icon: 'fa-file-contract', label: 'Conventions', section: 'conventions' },
              { icon: 'fa-sync-alt', label: 'Changements de statut', section: 'statuts', badge: statusChanges?.data?.needsUpdate || 0 },
              { icon: 'fa-sign-out-alt', label: 'Déconnexion', section: 'logout' },
            ].map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.section === 'logout') {
                      setShowLogoutModal(true);
                    } else {
                      setActiveSection(item.section);
                      if (item.section === 'statuts') {
                        loadStatusChanges();
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    color: activeSection === item.section ? currentTheme.colors.primary : currentTheme.colors.text,
                    backgroundColor: activeSection === item.section ? (isDark ? 'rgba(77, 124, 254, 0.2)' : currentTheme.colors.backgroundTertiary) : 'transparent',
                    fontWeight: activeSection === item.section ? '600' : '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    border: activeSection === item.section ? `1px solid ${currentTheme.colors.primary}` : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center' }}></i>
                  <span style={{ lineHeight: 1, flex: 1 }}>{item.label}</span>
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
                      title={`${item.badge} convention(s) nécessitant une mise à jour`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
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
        transition: 'background-color 0.3s ease'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            margin: '0 0 8px', 
            fontSize: '28px', 
            fontWeight: 700, 
            color: currentTheme.colors.text,
            lineHeight: 1.2
          }}>
          {activeSection === 'factures' ? 'Gestion des Factures' : 
             activeSection === 'paiements' ? 'Gestion des Paiements' :
           activeSection === 'conventions' ? 'Conventions' :
           activeSection === 'statuts' ? 'Changements de Statut' :
           'Statistiques'}
        </h1>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: currentTheme.colors.textTertiary,
            fontWeight: 400
          }}>
            {activeSection === 'factures' ? 'Gérez et suivez toutes vos factures' :
             activeSection === 'paiements' ? 'Enregistrez et suivez les paiements' :
             activeSection === 'conventions' ? 'Consultez les conventions' :
             activeSection === 'statuts' ? 'Visualisation des changements de statut (lecture seule)' :
             'Analyse détaillée de vos données'}
          </p>
        </div>

        {/* Section Changements de Statut (Lecture seule) */}
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
                Visualisation des changements de statut basés sur la date Madagascar (UTC+3) - Mode lecture seule
              </p>
            </div>

            {/* Bouton Actualiser - Lecture seule pour Caissier */}
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

        {/* Section Factures */}
        {activeSection === 'factures' && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ 
                background: currentTheme.colors.cardBackground, 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: currentTheme.shadows.md, 
                border: `1px solid ${currentTheme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(77, 124, 254, 0.2)' : 'rgba(77, 124, 254, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-file-invoice-dollar" style={{ fontSize: '24px', color: currentTheme.colors.primary }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Factures totales</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentTheme.colors.text }}>{stats.totalFactures}</div>
                </div>
              </div>
              <div style={{ 
                background: currentTheme.colors.cardBackground, 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: currentTheme.shadows.md, 
                border: `1px solid ${currentTheme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '24px', color: currentTheme.colors.success }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Factures payées</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentTheme.colors.text }}>{stats.facturesPayees}</div>
                </div>
              </div>
              <div style={{ 
                background: currentTheme.colors.cardBackground, 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: currentTheme.shadows.md, 
                border: `1px solid ${currentTheme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-clock" style={{ fontSize: '24px', color: currentTheme.colors.warning }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>En attente</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentTheme.colors.text }}>{stats.facturesEnAttente}</div>
                </div>
              </div>
              <div style={{ 
                background: currentTheme.colors.cardBackground, 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: currentTheme.shadows.md, 
                border: `1px solid ${currentTheme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-coins" style={{ fontSize: '24px', color: '#9c27b0' }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Montant total</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentTheme.colors.text }}>{formatCurrency(stats.montantTotal)}</div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowFactureModal(true)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: currentTheme.colors.primary,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 123, 255, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  minWidth: '180px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.primaryDark;
                  e.target.style.boxShadow = `0 4px 12px ${isDark ? 'rgba(77, 124, 254, 0.4)' : 'rgba(0, 123, 255, 0.35)'}`;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.25)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <i className="fas fa-plus"></i>
                Nouvelle Facture
              </button>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  exportFactures();
                }}
                style={{
                  padding: '14px 20px',
                  color: currentTheme.colors.text,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = currentTheme.colors.text;
                }}
              >
                <i className="fas fa-download"></i>
                Télécharger un rapport
              </a>
              <button
                onClick={() => {
                  exportFactures();
                }}
                style={{
                  padding: '14px 20px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  color: currentTheme.colors.text,
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '10px',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.backgroundTertiary;
                  e.target.style.borderColor = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.cardBackground;
                  e.target.style.borderColor = currentTheme.colors.border;
                }}
              >
                Exporter les données
              </button>
            </div>

            {/* Factures récentes Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: currentTheme.colors.text }}>
                  Factures récentes
                </h2>
                <div style={{ position: 'relative' }}>
                  <input
                    type="search"
                    placeholder="Rechercher par N° Facture, Convention ou Période..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    style={{
                      padding: '10px 12px',
                      paddingLeft: '40px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      width: '300px',
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px'
                    }}
                  />
                  <i className="fas fa-search" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: currentTheme.colors.textTertiary,
                    pointerEvents: 'none'
                  }}></i>
                </div>
              </div>

              {/* Liste des Factures */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: currentTheme.colors.textTertiary }}></i>
                </div>
              ) : factures.length === 0 ? (
                <div style={{ background: currentTheme.colors.cardBackground, padding: '48px', borderRadius: '12px', textAlign: 'center', boxShadow: currentTheme.shadows.md, border: `1px solid ${currentTheme.colors.border}` }}>
                  <i className="fas fa-file-invoice" style={{ fontSize: '48px', color: currentTheme.colors.textTertiary, marginBottom: '16px' }}></i>
                  <p style={{ color: currentTheme.colors.textTertiary }}>Aucune facture trouvée</p>
                </div>
              ) : (
                <div style={{ background: currentTheme.colors.cardBackground, borderRadius: '12px', overflow: 'hidden', boxShadow: currentTheme.shadows.md, border: `1px solid ${currentTheme.colors.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ 
                        background: currentTheme.colors.backgroundTertiary,
                        borderBottom: `1px solid ${currentTheme.colors.border}`
                      }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>N° FACTURE</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>CONVENTION</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '18%' }}>PÉRIODE</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>LIBELLÉ</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>MONTANT</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>STATUT</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '22%' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factures.map((facture, index) => (
                        <tr 
                          key={facture.numFact} 
                          onClick={() => {
                            handleShowFactureDetails(facture);
                          }}
                          style={{ 
                            borderBottom: index < factures.length - 1 ? `1px solid ${currentTheme.colors.border}` : 'none',
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
                        >
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                            {formatFactureNumber(facture.numFact)}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {facture.convention ? formatConventionNumber(facture.convention) : `Conv. ${facture.numConv}`}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {facture.dateDebut && facture.dateFin ? (
                              <span>
                                du {new Date(facture.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au {new Date(facture.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            ) : facture.datePaiement ? (
                              <span>
                                {new Date(facture.datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - fin du mois
                              </span>
                            ) : (
                              formatDate(facture.mois)
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                            {facture.libelles || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                            {facture.batiment ? formatCurrency(facture.batiment.montant || 0) : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: (facture.statutPaiement || facture.paye) 
                                ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7') 
                                : (isDark ? 'rgba(255, 193, 7, 0.2)' : '#fef3c7'),
                              color: (facture.statutPaiement || facture.paye) 
                                ? (isDark ? currentTheme.colors.success : '#166534') 
                                : (isDark ? currentTheme.colors.warning : '#92400e')
                            }}>
                              {(facture.statutPaiement || facture.paye) ? 'Payée' : 'En attente'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowFactureDetails(facture);
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
                                  e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                                  e.currentTarget.style.color = currentTheme.colors.primary;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.color = currentTheme.colors.textTertiary;
                                }}
                                title="Voir les détails"
                              >
                                <i className="fas fa-eye" style={{ fontSize: '16px' }}></i>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportFactureDetail(facture);
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
                                  e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                                  e.currentTarget.style.color = currentTheme.colors.primary;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.color = currentTheme.colors.textTertiary;
                                }}
                                title="Télécharger en Excel"
                              >
                                <i className="fas fa-download" style={{ fontSize: '16px' }}></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px', borderTop: `1px solid ${currentTheme.colors.border}` }}>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                          padding: '8px 16px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          background: page === 1 ? currentTheme.colors.backgroundTertiary : currentTheme.colors.cardBackground,
                          borderRadius: '6px',
                          cursor: page === 1 ? 'not-allowed' : 'pointer',
                          color: currentTheme.colors.text,
                          fontSize: '14px'
                        }}
                      >
                        Précédent
                      </button>
                      <span style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', color: currentTheme.colors.text, fontSize: '14px' }}>
                        Page {page} sur {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={{
                          padding: '8px 16px',
                          border: `1px solid ${currentTheme.colors.border}`,
                          background: page === totalPages ? currentTheme.colors.backgroundTertiary : currentTheme.colors.cardBackground,
                          borderRadius: '6px',
                          cursor: page === totalPages ? 'not-allowed' : 'pointer',
                          color: currentTheme.colors.text,
                          fontSize: '14px'
                        }}
                      >
                        Suivant
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Paiements */}
        {activeSection === 'paiements' && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ 
                background: currentTheme.colors.cardBackground, 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: currentTheme.shadows.md, 
                border: `1px solid ${currentTheme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '24px', color: currentTheme.colors.success }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Paiements</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentTheme.colors.text }}>{paiements.length}</div>
                </div>
              </div>
              <div style={{ 
                background: currentTheme.colors.cardBackground, 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: currentTheme.shadows.md, 
                border: `1px solid ${currentTheme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: isDark ? 'rgba(77, 124, 254, 0.2)' : 'rgba(77, 124, 254, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="fas fa-euro-sign" style={{ fontSize: '24px', color: currentTheme.colors.primary }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: currentTheme.colors.textTertiary, fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Montant total</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: currentTheme.colors.text }}>
                    {formatCurrency(paiements.reduce((sum, p) => sum + (p.batiment?.montant || 0), 0))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section - Réorganisée */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '32px',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Barre de recherche */}
              <div style={{ position: 'relative', flex: '1', minWidth: '300px', maxWidth: '400px' }}>
                <input
                  type="search"
                  placeholder="Rechercher par N° Facture, Convention ou Période..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '12px 16px',
                    paddingLeft: '44px',
                    borderRadius: '10px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    width: '100%',
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text,
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = currentTheme.colors.primary;
                    e.target.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(77, 124, 254, 0.1)' : 'rgba(0, 123, 255, 0.1)'}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = currentTheme.colors.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <i className="fas fa-search" style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: currentTheme.colors.textTertiary,
                  pointerEvents: 'none',
                  fontSize: '14px'
                }}></i>
              </div>

              {/* Bouton principal - Enregistrer un paiement */}
              <button
                onClick={() => setShowPaymentModal(true)}
                style={{
                  padding: '14px 28px',
                  backgroundColor: currentTheme.colors.primary,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 123, 255, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.primaryDark;
                  e.target.style.boxShadow = `0 4px 12px ${isDark ? 'rgba(77, 124, 254, 0.4)' : 'rgba(0, 123, 255, 0.35)'}`;
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.25)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <i className="fas fa-plus" style={{ fontSize: '16px' }}></i>
                Enregistrer un paiement
              </button>
            </div>

            {/* Table des paiements */}
            <div style={{ background: currentTheme.colors.cardBackground, borderRadius: '12px', overflow: 'hidden', boxShadow: currentTheme.shadows.md, border: `1px solid ${currentTheme.colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ 
                    background: currentTheme.colors.backgroundTertiary,
                    borderBottom: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>RÉFÉRENCE</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>DATE</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>STATUT</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: currentTheme.colors.textTertiary }}></i>
                      </td>
                    </tr>
                  ) : paiements.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: currentTheme.colors.textTertiary }}>
                        <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
                        Aucun paiement enregistré
                      </td>
                    </tr>
                  ) : (
                    paiements.map((paiement, index) => (
                      <tr 
                        key={paiement.numFact}
                        onClick={() => {
                          setSelectedPaiement(paiement);
                          setShowPaiementDetailModal(true);
                        }}
                        style={{ 
                          borderBottom: index < paiements.length - 1 ? `1px solid ${currentTheme.colors.border}` : 'none',
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
                      >
                        <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                          {formatFactureNumber(paiement.numFact)}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {formatDate(paiement.mois)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            background: isDark ? 'rgba(76, 175, 80, 0.2)' : '#d4edda',
                            color: isDark ? currentTheme.colors.success : '#155724',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>Confirmé</span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPaiement(paiement);
                                setShowPaiementDetailModal(true);
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
                                e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                                e.currentTarget.style.color = currentTheme.colors.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = currentTheme.colors.textTertiary;
                              }}
                              title="Voir les détails"
                            >
                              <i className="fas fa-eye" style={{ fontSize: '16px' }}></i>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                exportPaiementDetail(paiement);
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
                                e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                                e.currentTarget.style.color = currentTheme.colors.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = currentTheme.colors.textTertiary;
                              }}
                              title="Télécharger"
                            >
                              <i className="fas fa-download" style={{ fontSize: '16px' }}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {false && activeSection === 'stats' && (
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
                  Statistiques des Factures et Paiements
                </h1>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: currentTheme.colors.textTertiary,
                  fontWeight: 400
                }}>
                  Analyse détaillée de vos factures et paiements
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
                  onClick={() => {
                    exportStats();
                  }}
                  style={{
                    padding: '10px 20px',
                    background: currentTheme.colors.primary,
                    color: currentTheme.colors.white,
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
                    e.target.style.background = currentTheme.colors.primaryDark;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = currentTheme.colors.primary;
                  }}
                >
                  <i className="fas fa-file-excel"></i>
                  Exporter en Excel
                </button>
              </div>
            </div>

            {/* Cartes de métriques clés - Design Ultra Moderne */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px', 
              marginBottom: '40px' 
            }}>
              {/* Carte Total Factures */}
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '28px',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                color: 'white',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(102, 126, 234, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <i className="fas fa-file-invoice-dollar" style={{ fontSize: '22px' }}></i>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      opacity: 0.9,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      Total
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 800, 
                    marginBottom: '8px',
                    lineHeight: 1,
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {getFilteredStats.totalFactures}
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>
                    Factures enregistrées
                  </div>
                </div>
              </div>

              {/* Carte Factures Payées */}
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                padding: '28px',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(17, 153, 142, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                color: 'white',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(17, 153, 142, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(17, 153, 142, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <i className="fas fa-check-circle" style={{ fontSize: '22px' }}></i>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      opacity: 0.9,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      Payées
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 800, 
                    marginBottom: '8px',
                    lineHeight: 1,
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {getFilteredStats.facturesPayees}
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>
                    {getFilteredStats.totalFactures > 0 ? Math.round((getFilteredStats.facturesPayees / getFilteredStats.totalFactures) * 100) : 0}% du total
                  </div>
                </div>
              </div>

              {/* Carte En Attente */}
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                padding: '28px',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(240, 147, 251, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                color: 'white',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(240, 147, 251, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(240, 147, 251, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <i className="fas fa-clock" style={{ fontSize: '22px' }}></i>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      opacity: 0.9,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      En Attente
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 800, 
                    marginBottom: '8px',
                    lineHeight: 1,
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {getFilteredStats.facturesEnAttente}
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>
                    {getFilteredStats.totalFactures > 0 ? Math.round((getFilteredStats.facturesEnAttente / getFilteredStats.totalFactures) * 100) : 0}% du total
                  </div>
                </div>
              </div>

              {/* Carte Montant Total */}
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                padding: '28px',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(250, 112, 154, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                color: 'white',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(250, 112, 154, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(250, 112, 154, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <i className="fas fa-coins" style={{ fontSize: '22px' }}></i>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      opacity: 0.9,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      Montant
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '36px', 
                    fontWeight: 800, 
                    marginBottom: '8px',
                    lineHeight: 1,
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {(getFilteredStats.montantTotal / 1000000).toFixed(1)}M Ar
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>
                    {formatCurrency(getFilteredStats.montantTotal)}
                  </div>
                </div>
              </div>

              {/* Carte Taux de Paiement */}
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                padding: '28px',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(79, 172, 254, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                color: 'white',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(79, 172, 254, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(79, 172, 254, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <i className="fas fa-chart-line" style={{ fontSize: '22px' }}></i>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      opacity: 0.9,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      Taux
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '48px', 
                    fontWeight: 800, 
                    marginBottom: '8px',
                    lineHeight: 1,
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {getFilteredStats.totalFactures > 0 ? Math.round((getFilteredStats.facturesPayees / getFilteredStats.totalFactures) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 500 }}>
                    {getFilteredStats.facturesPayees >= getFilteredStats.facturesEnAttente ? (
                      <span><i className="fas fa-arrow-up" style={{ marginRight: '6px' }}></i>Excellent</span>
                    ) : (
                      <span><i className="fas fa-arrow-down" style={{ marginRight: '6px' }}></i>À améliorer</span>
                    )}
                  </div>
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
              {/* Graphique de répartition - Design Ultra Moderne */}
              <div style={{
                position: 'relative',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 255, 0.95) 100%)',
                padding: '32px',
                borderRadius: '24px',
                boxShadow: isDark 
                  ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                  : '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05) inset',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  borderRadius: '24px 24px 0 0'
                }}></div>
                <h3 style={{ 
                  margin: '0 0 28px', 
                  fontSize: '22px', 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.5px'
                }}>
                  Répartition par Statut
                </h3>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '240px',
                  position: 'relative',
                  marginBottom: '24px'
                }}>
                  {/* Graphique donut moderne avec animation - Chiffres à l'extérieur */}
                  <div style={{
                    position: 'relative',
                    width: '200px',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Graphique donut */}
                    <div style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '50%',
                      background: `conic-gradient(
                        #11998e 0% ${getFilteredStats.totalFactures > 0 ? (getFilteredStats.facturesPayees / getFilteredStats.totalFactures) * 100 : 0}%,
                        #f5576c ${getFilteredStats.totalFactures > 0 ? (getFilteredStats.facturesPayees / getFilteredStats.totalFactures) * 100 : 0}% 100%
                      )`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                      transition: 'transform 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    >
                      <div style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        background: isDark 
                          ? 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 30, 40, 0.95) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 255, 0.95) 100%)',
                        boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.1)',
                        border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`
                      }}></div>
                    </div>
                    
                    {/* Chiffre Total à l'extérieur - En haut */}
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                      zIndex: 10
                    }}>
                      <div style={{ 
                        fontSize: '42px', 
                        fontWeight: 800, 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: 1,
                        marginBottom: '4px'
                      }}>
                        {getFilteredStats.totalFactures}
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: currentTheme.colors.textTertiary,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                      }}>
                        Total
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '32px', 
                  justifyContent: 'center', 
                  marginBottom: '24px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '12px 20px',
                    background: isDark ? 'rgba(17, 153, 142, 0.15)' : 'rgba(17, 153, 142, 0.1)',
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? 'rgba(17, 153, 142, 0.3)' : 'rgba(17, 153, 142, 0.2)'}`
                  }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                      boxShadow: '0 2px 8px rgba(17, 153, 142, 0.4)'
                    }}></div>
                    <span style={{ 
                      fontSize: '14px', 
                      color: currentTheme.colors.text,
                      fontWeight: 600
                    }}>
                      Payées ({getFilteredStats.facturesPayees})
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '12px 20px',
                    background: isDark ? 'rgba(245, 87, 108, 0.15)' : 'rgba(245, 87, 108, 0.1)',
                    borderRadius: '12px',
                    border: `1px solid ${isDark ? 'rgba(245, 87, 108, 0.3)' : 'rgba(245, 87, 108, 0.2)'}`
                  }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      boxShadow: '0 2px 8px rgba(245, 87, 108, 0.4)'
                    }}></div>
                    <span style={{ 
                      fontSize: '14px', 
                      color: currentTheme.colors.text,
                      fontWeight: 600
                    }}>
                      En attente ({getFilteredStats.facturesEnAttente})
                    </span>
                  </div>
                </div>
                <div style={{
                  marginTop: '24px',
                  padding: '18px 20px',
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                    : 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
                  borderRadius: '16px',
                  border: `1px solid ${isDark ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.2)'}`,
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-lightbulb" style={{ fontSize: '16px' }}></i>
                    Recommandation
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: currentTheme.colors.textSecondary,
                    lineHeight: 1.6
                  }}>
                    {getFilteredStats.facturesEnAttente > 0 
                      ? `Il y a ${getFilteredStats.facturesEnAttente} facture(s) en attente de paiement. Assurez-vous de les suivre régulièrement.`
                      : 'Excellent ! Toutes les factures sont payées.'}
                  </div>
                </div>
              </div>

              {/* Graphique de tendance - Design Ultra Moderne */}
              <div style={{
                position: 'relative',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 255, 0.95) 100%)',
                padding: '32px',
                borderRadius: '24px',
                boxShadow: isDark 
                  ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                  : '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05) inset',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 50%, #11998e 100%)',
                  borderRadius: '24px 24px 0 0'
                }}></div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '28px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '22px', 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.5px'
                  }}>
                    Évolution
                  </h3>
                  <select
                    value={evolutionPeriod}
                    onChange={(e) => setEvolutionPeriod(e.target.value)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: `2px solid ${isDark ? 'rgba(79, 172, 254, 0.3)' : 'rgba(79, 172, 254, 0.2)'}`,
                      background: isDark 
                        ? 'rgba(79, 172, 254, 0.1)'
                        : 'rgba(79, 172, 254, 0.05)',
                      color: currentTheme.colors.text,
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = isDark ? 'rgba(79, 172, 254, 0.6)' : 'rgba(79, 172, 254, 0.4)';
                      e.target.style.boxShadow = `0 0 0 4px ${isDark ? 'rgba(79, 172, 254, 0.1)' : 'rgba(79, 172, 254, 0.05)'}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDark ? 'rgba(79, 172, 254, 0.3)' : 'rgba(79, 172, 254, 0.2)';
                      e.target.style.boxShadow = 'none';
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
                          // 7 derniers jours
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date(now);
                            date.setDate(date.getDate() - i);
                            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                            
                            const facturesDuJour = allFactures.filter(f => {
                              let factureDate;
                              if (f.datePaiement) {
                                factureDate = new Date(f.datePaiement);
                              } else if (f.mois && typeof f.mois === 'string' && f.mois.match(/^\d{4}-\d{2}$/)) {
                                factureDate = new Date(f.mois + '-01');
                              } else if (f.dateCreation) {
                                factureDate = new Date(f.dateCreation);
                              } else if (f.createdAt) {
                                factureDate = new Date(f.createdAt);
                              } else {
                                return false;
                              }
                              factureDate.setHours(0, 0, 0, 0);
                              return factureDate >= dayStart && factureDate <= dayEnd;
                            });
                            
                            const montant = facturesDuJour.reduce((sum, f) => sum + (Number(f.batiment?.montant) || Number(f.montant) || 0), 0);
                            labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
                            data.push(montant);
                          }
                          break;

                        case 'semaine':
                          // 6 dernières semaines
                          for (let i = 5; i >= 0; i--) {
                            const date = new Date(now);
                            date.setDate(date.getDate() - (i * 7));
                            const weekStart = new Date(date);
                            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                            weekStart.setHours(0, 0, 0, 0);
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekEnd.getDate() + 6);
                            weekEnd.setHours(23, 59, 59, 999);
                            
                            const facturesDeLaSemaine = allFactures.filter(f => {
                              let factureDate;
                              if (f.datePaiement) {
                                factureDate = new Date(f.datePaiement);
                              } else if (f.mois && typeof f.mois === 'string' && f.mois.match(/^\d{4}-\d{2}$/)) {
                                factureDate = new Date(f.mois + '-01');
                              } else if (f.dateCreation) {
                                factureDate = new Date(f.dateCreation);
                              } else if (f.createdAt) {
                                factureDate = new Date(f.createdAt);
                              } else {
                                return false;
                              }
                              return factureDate >= weekStart && factureDate <= weekEnd;
                            });
                            
                            const montant = facturesDeLaSemaine.reduce((sum, f) => sum + (Number(f.batiment?.montant) || Number(f.montant) || 0), 0);
                            const weekNum = Math.floor((now.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
                            labels.push(`S${weekNum - i}`);
                            data.push(montant);
                          }
                          break;

                        case 'mois':
                          // 6 derniers mois
                          for (let i = 5; i >= 0; i--) {
                            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
                            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
                            
                            const facturesDuMois = allFactures.filter(f => {
                              let factureDate;
                              if (f.datePaiement) {
                                factureDate = new Date(f.datePaiement);
                              } else if (f.mois && typeof f.mois === 'string' && f.mois.match(/^\d{4}-\d{2}$/)) {
                                factureDate = new Date(f.mois + '-01');
                              } else if (f.dateCreation) {
                                factureDate = new Date(f.dateCreation);
                              } else if (f.createdAt) {
                                factureDate = new Date(f.createdAt);
                              } else {
                                return false;
                              }
                              return factureDate >= monthStart && factureDate <= monthEnd;
                            });
                            
                            const montant = facturesDuMois.reduce((sum, f) => sum + (Number(f.batiment?.montant) || Number(f.montant) || 0), 0);
                            labels.push(date.toLocaleDateString('fr-FR', { month: 'short' }));
                            data.push(montant);
                          }
                          break;

                        case 'trimestre':
                          // 4 derniers trimestres
                          for (let i = 3; i >= 0; i--) {
                            const date = new Date(now.getFullYear(), now.getMonth() - (i * 3), 1);
                            const quarter = Math.floor(date.getMonth() / 3);
                            const quarterStart = new Date(date.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
                            const quarterEnd = new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
                            
                            const facturesDuTrimestre = allFactures.filter(f => {
                              let factureDate;
                              if (f.datePaiement) {
                                factureDate = new Date(f.datePaiement);
                              } else if (f.mois && typeof f.mois === 'string' && f.mois.match(/^\d{4}-\d{2}$/)) {
                                factureDate = new Date(f.mois + '-01');
                              } else if (f.dateCreation) {
                                factureDate = new Date(f.dateCreation);
                              } else if (f.createdAt) {
                                factureDate = new Date(f.createdAt);
                              } else {
                                return false;
                              }
                              return factureDate >= quarterStart && factureDate <= quarterEnd;
                            });
                            
                            const montant = facturesDuTrimestre.reduce((sum, f) => sum + (Number(f.batiment?.montant) || Number(f.montant) || 0), 0);
                            labels.push(`T${quarter + 1} ${date.getFullYear()}`);
                            data.push(montant);
                          }
                          break;

                        case 'annee':
                          // 5 dernières années
                          for (let i = 4; i >= 0; i--) {
                            const year = now.getFullYear() - i;
                            const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
                            const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
                            
                            const facturesDeLAnnee = allFactures.filter(f => {
                              let factureDate;
                              if (f.datePaiement) {
                                factureDate = new Date(f.datePaiement);
                              } else if (f.mois && typeof f.mois === 'string' && f.mois.match(/^\d{4}-\d{2}$/)) {
                                factureDate = new Date(f.mois + '-01');
                              } else if (f.dateCreation) {
                                factureDate = new Date(f.dateCreation);
                              } else if (f.createdAt) {
                                factureDate = new Date(f.createdAt);
                              } else {
                                return false;
                              }
                              return factureDate >= yearStart && factureDate <= yearEnd;
                            });
                            
                            const montant = facturesDeLAnnee.reduce((sum, f) => sum + (Number(f.batiment?.montant) || Number(f.montant) || 0), 0);
                            labels.push(year.toString());
                            data.push(montant);
                          }
                          break;
                      }

                      return { labels, data };
                    };

                    const { labels, data } = getEvolutionData();
                    const maxValue = Math.max(...data.filter(d => d > 0), 1);
                    const minValue = Math.min(...data.filter(d => d > 0), 0);
                    const range = maxValue - minValue || 1;
                    
                    if (allFactures.length === 0) {
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

                    // Calculer les positions pour le graphique en ligne
                    const chartHeight = 240;
                    const chartWidth = labels.length > 0 ? 100 : 0;
                    const pointRadius = 5;
                    const points = data.map((value, idx) => {
                      const x = (idx / (labels.length - 1 || 1)) * 100;
                      const y = range > 0 ? 100 - ((value - minValue) / range) * 100 : 50;
                      return { x, y, value, label: labels[idx] };
                    });

                    // Créer le path SVG pour la ligne
                    const pathData = points.map((p, idx) => {
                      return `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
                    }).join(' ');

                    // Créer le path pour la zone remplie
                    const areaPath = points.length > 0 
                      ? `${pathData} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
                      : '';

                    return (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {/* Axe Y avec valeurs */}
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
                          <span>{formatCurrency(maxValue)}</span>
                          <span>{formatCurrency(Math.round(maxValue * 0.5))}</span>
                          <span>0</span>
                        </div>

                        {/* Graphique SVG */}
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
                          {/* Zone remplie sous la ligne */}
                          {areaPath && (
                            <path
                              d={areaPath}
                              fill="url(#gradientArea)"
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
                                r={pointRadius}
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
                              {/* Tooltip */}
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
                                  {formatCurrency(point.value)}
                                </text>
                              </g>
                            </g>
                          ))}

                          {/* Gradient pour la zone remplie */}
                          <defs>
                            <linearGradient id="gradientArea" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#007bff" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#007bff" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                        </svg>

                        {/* Labels en bas */}
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

            {/* Tableau récapitulatif */}
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
                Résumé des Statistiques
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div style={{
                  padding: '16px',
                  background: currentTheme.colors.backgroundTertiary,
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '8px' }}>
                    Taux de paiement moyen
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: currentTheme.colors.text }}>
                    {getFilteredStats.totalFactures > 0 ? Math.round((getFilteredStats.facturesPayees / getFilteredStats.totalFactures) * 100) : 0}%
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: currentTheme.colors.backgroundTertiary,
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '8px' }}>
                    Montant moyen par facture
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: currentTheme.colors.text }}>
                    {getFilteredStats.totalFactures > 0 ? formatCurrency(Math.round(getFilteredStats.montantTotal / getFilteredStats.totalFactures)) : '0 Ar'}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: currentTheme.colors.backgroundTertiary,
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.colors.border}`
                }}>
                  <div style={{ fontSize: '12px', color: currentTheme.colors.textTertiary, marginBottom: '8px' }}>
                    Factures en retard
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: currentTheme.colors.warning }}>
                    {getFilteredStats.facturesEnAttente}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Conventions */}
        {activeSection === 'conventions' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: currentTheme.colors.text }}>
                  Conventions récentes
                </h2>
              </div>
              <input
                type="search"
                placeholder="Rechercher par N° Convention, Client, Date ou Montant..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '10px 12px',
                  paddingLeft: '40px',
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  width: '300px',
                  backgroundColor: currentTheme.colors.cardBackground,
                  color: currentTheme.colors.text,
                  fontSize: '14px'
                }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: currentTheme.colors.textTertiary }}></i>
              </div>
            ) : conventions.length === 0 ? (
              <div style={{ background: currentTheme.colors.cardBackground, padding: '48px', borderRadius: '12px', textAlign: 'center', boxShadow: currentTheme.shadows.md, border: `1px solid ${currentTheme.colors.border}` }}>
                <i className="fas fa-file-contract" style={{ fontSize: '48px', color: currentTheme.colors.textTertiary, marginBottom: '16px' }}></i>
                <p style={{ color: currentTheme.colors.textTertiary }}>Aucune convention trouvée</p>
              </div>
            ) : (
              <div style={{ background: currentTheme.colors.cardBackground, borderRadius: '12px', overflow: 'hidden', boxShadow: currentTheme.shadows.md, border: `1px solid ${currentTheme.colors.border}` }}>
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
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Statut</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: currentTheme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px', width: '26%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conventions.map((conv, index) => (
                      <tr 
                        key={conv.numConv}
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
                        onClick={() => {
                          setSelectedConvention(conv);
                          setShowConventionModal(true);
                        }}
                      >
                        <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                          {formatConventionNumber(conv)}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {conv.locataire?.nomcli || 'N/A'}
                        </td>
                        {hasContactData && <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {conv.contact && conv.contact.trim() !== '' && conv.contact !== 'N/A' ? conv.contact : '-'}
                        </td>}
                        {hasVilleData && <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {conv.batiment?.ville && conv.batiment.ville.trim() !== '' && conv.batiment.ville !== 'Non renseignée' ? conv.batiment.ville : '-'}
                        </td>}
                        {hasQuartierData && <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.text }}>
                          {conv.batiment?.quartier && conv.batiment.quartier.trim() !== '' && conv.batiment.quartier !== 'Non renseigné' ? conv.batiment.quartier : '-'}
                        </td>}
                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '14px', color: currentTheme.colors.text, fontWeight: 600 }}>
                          {Number(conv.batiment?.montant || 0).toLocaleString('fr-FR')} Ar
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: conv.statutConv ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7') : (isDark ? 'rgba(255, 193, 7, 0.2)' : '#fef3c7'),
                            color: conv.statutConv ? (isDark ? currentTheme.colors.success : '#166534') : (isDark ? currentTheme.colors.warning : '#92400e')
                          }}>
                            {conv.statutConv ? 'Confirmé' : 'En attente'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                          {new Date(conv.dateConv).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConvention(conv);
                                setShowConventionModal(true);
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
                                e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                                e.currentTarget.style.color = currentTheme.colors.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = currentTheme.colors.textTertiary;
                              }}
                              title="Voir"
                            >
                              <i className="fas fa-eye" style={{ fontSize: '16px' }}></i>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                exportConventionDetail(conv);
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
                                e.currentTarget.style.background = currentTheme.colors.backgroundTertiary;
                                e.currentTarget.style.color = currentTheme.colors.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'none';
                                e.currentTarget.style.color = currentTheme.colors.textTertiary;
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
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal Nouvelle Facture */}
      {showFactureModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowFactureModal(false)}
        >
          <div
            style={{
              background: currentTheme.colors.cardBackground,
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: currentTheme.shadows.xl,
              border: `1px solid ${currentTheme.colors.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: currentTheme.colors.primary }}>
              Nouvelle Facture
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Convention *
                </label>
                <select
                  value={factureForm.numConv}
                  onChange={(e) => setFactureForm({ ...factureForm, numConv: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text
                  }}
                >
                  <option value="">Sélectionner une convention</option>
                  {loading && availableConventions.length === 0 ? (
                    <option value="" disabled>Chargement des conventions...</option>
                  ) : availableConventions.length === 0 ? (
                    <option value="" disabled>Aucune convention "En attente" disponible (toutes ont déjà une facture)</option>
                  ) : (
                    availableConventions.map(c => (
                      <option key={c.numConv} value={c.numConv}>
                        Conv. {c.numConv} - {c.locataire?.nomcli || 'N/A'} (En attente)
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Mois *
                </label>
                <input
                  type="month"
                  value={factureForm.mois}
                  onChange={(e) => setFactureForm({ ...factureForm, mois: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Libellé
                </label>
                <input
                  type="text"
                  value={factureForm.libelles}
                  onChange={(e) => setFactureForm({ ...factureForm, libelles: e.target.value })}
                  placeholder="Ex: Loyer janvier 2024"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    backgroundColor: currentTheme.colors.cardBackground,
                    color: currentTheme.colors.text
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowFactureModal(false)}
                style={{
                  padding: '10px 20px',
                  background: currentTheme.colors.border,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFacture}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  background: currentTheme.colors.success,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enregistrer un paiement */}
      {showPaymentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => {
            setShowPaymentModal(false);
            setPaymentForm({
              numFact: '',
              nomClient: '',
              montant: '',
              datePaiement: new Date().toISOString().split('T')[0],
              methodePaiement: 'Carte bancaire',
              notes: '',
              dateArrivee: new Date().toISOString().split('T')[0]
            });
            setPaymentLoyerResult(null);
          }}
        >
          <div
            style={{
              background: currentTheme.colors.cardBackground,
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '600px',
              boxShadow: currentTheme.shadows.xl,
              border: `1px solid ${currentTheme.colors.border}`,
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentForm({
                  numFact: '',
                  nomClient: '',
                  montant: '',
                  datePaiement: new Date().toISOString().split('T')[0],
                  methodePaiement: 'Carte bancaire',
                  notes: '',
                  dateArrivee: new Date().toISOString().split('T')[0]
                });
                setPaymentLoyerResult(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: currentTheme.colors.textTertiary,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = currentTheme.colors.backgroundTertiary;
                e.target.style.color = currentTheme.colors.text;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = currentTheme.colors.textTertiary;
              }}
            >
              ×
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '24px', color: currentTheme.colors.primary, fontSize: '24px', fontWeight: 600 }}>
              Enregistrer un paiement
            </h2>

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Facture associée */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                  Facture associée <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={paymentForm.numFact}
                  onChange={(e) => {
                    const selectedFacture = allFactures.find(f => f.numFact === parseInt(e.target.value));
                    if (selectedFacture) {
                      setPaymentForm({
                        ...paymentForm,
                        numFact: selectedFacture.numFact.toString(),
                        nomClient: selectedFacture.locataire?.nomcli || '',
                        montant: selectedFacture.batiment?.montant?.toString() || ''
                      });
                      console.log('Facture sélectionnée:', {
                        numFact: selectedFacture.numFact,
                        numFactString: selectedFacture.numFact.toString(),
                        nomClient: selectedFacture.locataire?.nomcli,
                        montant: selectedFacture.batiment?.montant
                      });
                    } else {
                      setPaymentForm({ ...paymentForm, numFact: e.target.value });
                    }
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
                  <option value="">Sélectionnez une facture</option>
                  {allFactures.length === 0 ? (
                    <option value="" disabled>Chargement des factures...</option>
                  ) : allFactures.filter(f => !f.statutPaiement && !f.paye).length === 0 ? (
                    <option value="" disabled>Aucune facture en attente de paiement</option>
                  ) : (
                    allFactures
                      .filter(f => !f.statutPaiement && !f.paye)
                      .map(facture => (
                        <option key={facture.numFact} value={facture.numFact}>
                          {formatFactureNumber(facture.numFact)} - {facture.locataire?.nomcli || 'N/A'} - {facture.batiment?.montant ? formatCurrency(facture.batiment.montant) : 'N/A'} - {facture.libelles || 'Sans libellé'}
                        </option>
                      ))
                  )}
                </select>
              </div>

              {/* Numéro de facture (affichage) */}
              {paymentForm.numFact && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                    Numéro de facture
                  </label>
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.primary}`,
                    backgroundColor: currentTheme.colors.backgroundTertiary,
                    color: currentTheme.colors.primary,
                    fontSize: '14px',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    {formatFactureNumber(parseInt(paymentForm.numFact))}
                  </div>
                </div>
              )}

              {/* Client */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                  Client
                </label>
                <input
                  type="text"
                  value={paymentForm.nomClient}
                  onChange={(e) => setPaymentForm({ ...paymentForm, nomClient: e.target.value })}
                  placeholder="Nom du client"
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    backgroundColor: currentTheme.colors.backgroundTertiary,
                    color: currentTheme.colors.text,
                    fontSize: '14px',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              {/* Montant */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                  Montant (Ar) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={paymentForm.montant}
                    readOnly
                    placeholder="0"
                    step="1"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px 50px 12px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      fontSize: '14px',
                      backgroundColor: currentTheme.colors.backgroundTertiary,
                      color: currentTheme.colors.text,
                      cursor: 'not-allowed',
                      opacity: 0.8
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: currentTheme.colors.textTertiary,
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}>Ar</span>
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, montant: String(parseInt(paymentForm.montant || 0) + 1) })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '10px',
                        color: currentTheme.colors.textTertiary,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = currentTheme.colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = currentTheme.colors.textTertiary;
                      }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, montant: String(Math.max(0, parseInt(paymentForm.montant || 0) - 1)) })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        fontSize: '10px',
                        color: currentTheme.colors.textTertiary,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = currentTheme.colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = currentTheme.colors.textTertiary;
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              {/* Section Calcul Loyer Proportionnel */}
              <div style={{
                padding: '20px',
                background: isDark ? 'rgba(77, 124, 254, 0.05)' : '#f8f9fa',
                borderRadius: '12px',
                border: `1px solid ${currentTheme.colors.border}`,
                marginTop: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <i className="fas fa-calculator" style={{ color: currentTheme.colors.primary, fontSize: '18px' }}></i>
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: currentTheme.colors.text
                  }}>
                    Calcul du loyer proportionnel
                  </h3>
                </div>
                <p style={{
                  margin: '0 0 16px',
                  fontSize: '13px',
                  color: currentTheme.colors.textTertiary,
                  lineHeight: 1.5
                }}>
                  Si le client arrive en cours de mois, calculez automatiquement le montant proportionnel à payer.
                </p>

                {/* Champ Date d'arrivée */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: currentTheme.colors.text
                  }}>
                    <i className="fas fa-calendar-alt" style={{ marginRight: '6px', color: currentTheme.colors.primary }}></i>
                    Date d'arrivée du client
                  </label>
                  <input
                    type="date"
                    value={paymentForm.dateArrivee}
                    onChange={(e) => setPaymentForm({ ...paymentForm, dateArrivee: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      backgroundColor: currentTheme.colors.cardBackground,
                      color: currentTheme.colors.text,
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = currentTheme.colors.primary;
                      e.target.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(77, 124, 254, 0.1)' : 'rgba(0, 123, 255, 0.1)'}`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = currentTheme.colors.border;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Bouton Calculer */}
                <button
                  type="button"
                  onClick={calculerLoyerProportionnelPaiement}
                  disabled={!paymentForm.montant || !paymentForm.dateArrivee}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: paymentForm.montant && paymentForm.dateArrivee ? currentTheme.colors.primary : currentTheme.colors.backgroundTertiary,
                    color: paymentForm.montant && paymentForm.dateArrivee ? currentTheme.colors.white : currentTheme.colors.textTertiary,
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: paymentForm.montant && paymentForm.dateArrivee ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: paymentForm.montant && paymentForm.dateArrivee ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (paymentForm.montant && paymentForm.dateArrivee) {
                      e.target.style.backgroundColor = currentTheme.colors.primaryDark;
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paymentForm.montant && paymentForm.dateArrivee) {
                      e.target.style.backgroundColor = currentTheme.colors.primary;
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <i className="fas fa-calculator"></i>
                  Calculer le loyer proportionnel
                </button>

                {/* Résultats du calcul */}
                {paymentLoyerResult && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: isDark ? 'rgba(77, 124, 254, 0.1)' : '#e3f2fd',
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? 'rgba(77, 124, 254, 0.3)' : '#90caf9'}`
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: currentTheme.colors.primary,
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <i className="fas fa-check-circle"></i>
                      Calcul effectué
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: currentTheme.colors.primary,
                      marginBottom: '8px'
                    }}>
                      {formatCurrency(paymentLoyerResult.montantAPayer)}
                    </div>
                    {paymentLoyerResult.joursRestants && (
                      <div style={{
                        fontSize: '12px',
                        color: currentTheme.colors.textTertiary,
                        marginBottom: '8px',
                        fontStyle: 'italic'
                      }}>
                        Pour {paymentLoyerResult.joursRestants} jour(s) sur {paymentLoyerResult.joursDuMois} jour(s) du mois
                      </div>
                    )}
                    <div style={{
                      fontSize: '12px',
                      color: currentTheme.colors.textSecondary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <i className="fas fa-calendar-check" style={{ color: currentTheme.colors.success }}></i>
                      Prochaine date: {new Date(paymentLoyerResult.prochaineDatePaiement).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      background: currentTheme.colors.cardBackground,
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: currentTheme.colors.textTertiary,
                      fontStyle: 'italic'
                    }}>
                      ✓ Le montant a été appliqué automatiquement dans le champ "Montant"
                    </div>
                  </div>
                )}
              </div>

              {/* Date de paiement */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                  Date de paiement
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={paymentForm.datePaiement}
                    onChange={(e) => setPaymentForm({ ...paymentForm, datePaiement: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${currentTheme.colors.border}`,
                      fontSize: '14px'
                    }}
                  />
                  <i className="fas fa-calendar-alt" style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: currentTheme.colors.textTertiary,
                    pointerEvents: 'none'
                  }}></i>
                </div>
              </div>

              {/* Méthode de paiement */}
              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 500, color: currentTheme.colors.text }}>
                  Méthode de paiement
                </label>
                <button
                  type="button"
                  onClick={() => setPaymentForm({ ...paymentForm, methodePaiement: 'Carte bancaire' })}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '10px',
                    border: `2px solid ${paymentForm.methodePaiement === 'Carte bancaire' ? currentTheme.colors.primary : currentTheme.colors.border}`,
                    background: paymentForm.methodePaiement === 'Carte bancaire' ? currentTheme.colors.primary : currentTheme.colors.cardBackground,
                    color: paymentForm.methodePaiement === 'Carte bancaire' ? currentTheme.colors.white : currentTheme.colors.text,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => {
                    if (paymentForm.methodePaiement !== 'Carte bancaire') {
                      e.target.style.borderColor = currentTheme.colors.primary;
                      e.target.style.background = currentTheme.colors.backgroundTertiary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paymentForm.methodePaiement !== 'Carte bancaire') {
                      e.target.style.borderColor = currentTheme.colors.border;
                      e.target.style.background = currentTheme.colors.cardBackground;
                    }
                  }}
                >
                  <i className="fas fa-credit-card" style={{ fontSize: '16px' }}></i>
                  Carte bancaire
                </button>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: currentTheme.colors.text }}>
                  Notes <span style={{ color: currentTheme.colors.textTertiary, fontWeight: 400 }}>(optionnel)</span>
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentForm({
                    numFact: '',
                    nomClient: '',
                    montant: '',
                    datePaiement: new Date().toISOString().split('T')[0],
                    methodePaiement: 'Carte bancaire',
                    notes: '',
                    dateArrivee: new Date().toISOString().split('T')[0]
                  });
                  setPaymentLoyerResult(null);
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
                onClick={handleCreatePayment}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: currentTheme.colors.primary,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: '14px',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = currentTheme.colors.primaryDark;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.background = currentTheme.colors.primary;
                  }
                }}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails Convention */}
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
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={() => {
            setShowConventionModal(false);
            setSelectedConvention(null);
          }}
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
                Convention {selectedConvention.numConv} — {new Date(selectedConvention.dateConv).getFullYear()}
              </h2>
              <button
                onClick={() => {
                  setShowConventionModal(false);
                  setSelectedConvention(null);
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
                    <span style={{ color: currentTheme.colors.text }}>{selectedConvention.numBat}</span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text }}>{selectedConvention.batiment?.adresse || 'N/A'}</span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Loyer :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                      {Number(selectedConvention.batiment?.montant || 0).toLocaleString('fr-FR')} Ar
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
                      {selectedConvention.locataire?.cin || 'N/A'} {selectedConvention.locataire?.delivcin ? `(délivrée le ${selectedConvention.locataire.delivcin})` : ''}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Activité :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text }}>{selectedConvention.locataire?.activite || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails Facture */}
      {showFactureDetailModal && selectedFacture && (
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
          onClick={() => {
            setShowFactureDetailModal(false);
            setSelectedFacture(null);
            setFactureDetails(null);
          }}
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
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: currentTheme.colors.text }}>
                  Facture {formatFactureNumber(selectedFacture.numFact)}
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: currentTheme.colors.textTertiary }}>
                  Détails de la facture
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFactureDetailModal(false);
                  setSelectedFacture(null);
                  setFactureDetails(null);
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

            {loadingFactureDetails ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: currentTheme.colors.textTertiary }}></i>
                <p style={{ marginTop: '16px', color: currentTheme.colors.textTertiary }}>Chargement des détails...</p>
              </div>
            ) : (
              <>
                {/* Détails */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px' }}>
                  {/* Informations Facture */}
                  <div style={{
                    padding: '20px',
                    background: currentTheme.colors.backgroundTertiary,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.primary }}>
                      Informations Facture
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: currentTheme.colors.text, lineHeight: 1.6 }}>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>N° Facture :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>{formatFactureNumber(selectedFacture.numFact)}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Convention :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {selectedFacture.convention ? formatConventionNumber(selectedFacture.convention) : `Conv. ${selectedFacture.numConv}`}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Période :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {(selectedFacture.dateDebut || factureDetails?.dateDebut) && (selectedFacture.dateFin || factureDetails?.dateFin) ? (
                            `du ${new Date(selectedFacture.dateDebut || factureDetails.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au ${new Date(selectedFacture.dateFin || factureDetails.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                          ) : selectedFacture.datePaiement || factureDetails?.datePaiement ? (
                            `du ${new Date(selectedFacture.datePaiement || factureDetails.datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à la fin du mois`
                          ) : (
                            formatDate(selectedFacture.mois || factureDetails?.mois)
                          )}
                        </span>
                      </div>
                      {(selectedFacture.datePaiement || factureDetails?.datePaiement) && (
                        <div>
                          <strong style={{ color: currentTheme.colors.textSecondary }}>Date de paiement :</strong>{' '}
                          <span style={{ color: currentTheme.colors.text }}>
                            {new Date(selectedFacture.datePaiement || factureDetails.datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Libellé :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedFacture.libelles || 'N/A'}</span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Statut :</strong>{' '}
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: (selectedFacture.statutPaiement || selectedFacture.paye || factureDetails?.statutPaiement || factureDetails?.paye) 
                            ? (isDark ? 'rgba(76, 175, 80, 0.2)' : '#dcfce7') 
                            : (isDark ? 'rgba(255, 193, 7, 0.2)' : '#fef3c7'),
                          color: (selectedFacture.statutPaiement || selectedFacture.paye || factureDetails?.statutPaiement || factureDetails?.paye) 
                            ? (isDark ? currentTheme.colors.success : '#166534') 
                            : (isDark ? currentTheme.colors.warning : '#92400e')
                        }}>
                          {(selectedFacture.statutPaiement || selectedFacture.paye || factureDetails?.statutPaiement || factureDetails?.paye) ? 'Payée' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informations Bâtiment */}
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
                        <strong style={{ color: currentTheme.colors.textSecondary }}>N° Bâtiment :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {(factureDetails?.batiment?.numBat || selectedFacture.batiment?.numBat || selectedFacture.numBat || 'N/A')}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {(factureDetails?.batiment?.adresse || selectedFacture.batiment?.adresse || 'N/A')}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Montant :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text, fontWeight: 600, fontSize: '16px' }}>
                          {formatCurrency(
                            factureDetails?.batiment?.montant || 
                            factureDetails?.montant || 
                            selectedFacture.batiment?.montant || 
                            selectedFacture.montant || 
                            0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations Locataire si disponible */}
                {(factureDetails?.convention?.locataire || factureDetails?.locataire || selectedFacture.convention?.locataire) && (
                  <div style={{
                    padding: '20px',
                    background: currentTheme.colors.backgroundTertiary,
                    borderRadius: '12px',
                    border: `1px solid ${currentTheme.colors.border}`,
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.primary }}>
                      Locataire
                    </h3>
                    <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: currentTheme.colors.text, lineHeight: 1.6 }}>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Nom :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {(factureDetails?.convention?.locataire?.nomcli || factureDetails?.locataire?.nomcli || selectedFacture.convention?.locataire?.nomcli || 'N/A')}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>CIN :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {(factureDetails?.convention?.locataire?.cin || factureDetails?.locataire?.cin || selectedFacture.convention?.locataire?.cin || 'N/A')}
                        </span>
                      </div>
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Contact :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>
                          {(factureDetails?.convention?.contact || selectedFacture.convention?.contact || factureDetails?.convention?.locataire?.contact || factureDetails?.locataire?.contact || selectedFacture.convention?.locataire?.contact || 'N/A')}
                        </span>
                      </div>
                      {(factureDetails?.convention?.locataire?.adressecli || factureDetails?.locataire?.adressecli || selectedFacture.convention?.locataire?.adressecli) && (
                        <div>
                          <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                          <span style={{ color: currentTheme.colors.text }}>
                            {(factureDetails?.convention?.locataire?.adressecli || factureDetails?.locataire?.adressecli || selectedFacture.convention?.locataire?.adressecli)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: `1px solid ${currentTheme.colors.border}` }}>
              <button
                onClick={() => {
                  exportFactureDetail(selectedFacture);
                }}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.backgroundTertiary;
                  e.target.style.borderColor = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.cardBackground;
                  e.target.style.borderColor = currentTheme.colors.border;
                }}
              >
                <i className="fas fa-download"></i>
                Télécharger en Excel
              </button>
              <button
                onClick={() => printFacture(selectedFacture)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: currentTheme.colors.primary,
                  color: currentTheme.colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.primaryDark;
                  e.target.style.boxShadow = `0 4px 8px ${isDark ? 'rgba(77, 124, 254, 0.4)' : 'rgba(0, 123, 255, 0.3)'}`;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <i className="fas fa-print"></i>
                Imprimer
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Détails Paiement */}
      {showPaiementDetailModal && selectedPaiement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setShowPaiementDetailModal(false);
            setSelectedPaiement(null);
          }}
        >
          <div
            style={{
              background: currentTheme.colors.cardBackground,
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: currentTheme.shadows.xl,
              border: `1px solid ${currentTheme.colors.border}`,
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              onClick={() => {
                setShowPaiementDetailModal(false);
                setSelectedPaiement(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: currentTheme.colors.textTertiary,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = currentTheme.colors.backgroundTertiary;
                e.target.style.color = currentTheme.colors.text;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = currentTheme.colors.textTertiary;
              }}
            >
              ×
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '24px', color: currentTheme.colors.primary, fontSize: '24px', fontWeight: 600 }}>
              Détails du Paiement
            </h2>

            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Informations Paiement */}
              <div style={{
                padding: '20px',
                background: currentTheme.colors.backgroundTertiary,
                borderRadius: '12px',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: currentTheme.colors.primary }}>
                  Informations du Paiement
                </h3>
                <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: currentTheme.colors.text, lineHeight: 1.6 }}>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>N° Facture :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                      {formatFactureNumber(selectedPaiement.numFact)}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Convention :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text }}>
                      {selectedPaiement.convention ? formatConventionNumber(selectedPaiement.convention) : `Conv. ${selectedPaiement.numConv}`}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Date :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text }}>{formatDate(selectedPaiement.mois)}</span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Libellé :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.libelles || 'N/A'}</span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Montant :</strong>{' '}
                    <span style={{ color: currentTheme.colors.text, fontWeight: 600, fontSize: '16px' }}>
                      {formatCurrency(selectedPaiement.batiment?.montant || 0)}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: currentTheme.colors.textSecondary }}>Statut :</strong>{' '}
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: isDark ? 'rgba(76, 175, 80, 0.2)' : '#d4edda',
                      color: isDark ? currentTheme.colors.success : '#155724',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>Confirmé</span>
                  </div>
                </div>
              </div>

              {/* Informations Bâtiment */}
              {selectedPaiement.batiment && (
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
                      <strong style={{ color: currentTheme.colors.textSecondary }}>N° Bâtiment :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.batiment.numBat || 'N/A'}</span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.batiment.adresse || 'N/A'}</span>
                    </div>
                    <div>
                      <strong style={{ color: currentTheme.colors.textSecondary }}>Montant du loyer :</strong>{' '}
                      <span style={{ color: currentTheme.colors.text, fontWeight: 600 }}>
                        {formatCurrency(selectedPaiement.batiment.montant || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informations Locataire */}
              {selectedPaiement.locataire && (
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
                      <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.locataire.nomcli || 'N/A'}</span>
                    </div>
                    {selectedPaiement.locataire.cin && (
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>CIN :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.locataire.cin}</span>
                      </div>
                    )}
                    {selectedPaiement.locataire.adressecli && (
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Adresse :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.locataire.adressecli}</span>
                      </div>
                    )}
                    {selectedPaiement.locataire.activite && (
                      <div>
                        <strong style={{ color: currentTheme.colors.textSecondary }}>Activité :</strong>{' '}
                        <span style={{ color: currentTheme.colors.text }}>{selectedPaiement.locataire.activite}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: `1px solid ${currentTheme.colors.border}` }}>
                <button
                  onClick={() => {
                    exportPaiementDetail(selectedPaiement);
                  }}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.colors.backgroundTertiary;
                    e.target.style.borderColor = currentTheme.colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = currentTheme.colors.cardBackground;
                    e.target.style.borderColor = currentTheme.colors.border;
                  }}
                >
                  <i className="fas fa-download"></i>
                  Télécharger en Excel
                </button>
                <button
                  onClick={() => {
                    setShowPaiementDetailModal(false);
                    setSelectedPaiement(null);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: currentTheme.colors.primary,
                    color: currentTheme.colors.white,
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.colors.primaryDark;
                    e.target.style.boxShadow = `0 4px 8px ${isDark ? 'rgba(77, 124, 254, 0.4)' : 'rgba(0, 123, 255, 0.3)'}`;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = currentTheme.colors.primary;
                    e.target.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Déconnexion */}
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
