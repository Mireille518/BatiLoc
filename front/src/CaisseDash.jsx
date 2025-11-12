import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, API_ENDPOINTS } from './config/api';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import logoImage from './images/fcee.gif';
import theme from './theme';

export default function CaissierHome() {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error, info } = useToast();
  const [activeSection, setActiveSection] = useState('factures');
  const [factures, setFactures] = useState([]);
  const [conventions, setConventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [selectedConvention, setSelectedConvention] = useState(null);
  const [stats, setStats] = useState({
    totalFactures: 0,
    facturesPayees: 0,
    facturesEnAttente: 0,
    montantTotal: 0
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Formulaire facture
  const [factureForm, setFactureForm] = useState({
    numConv: '',
    mois: new Date().toISOString().slice(0, 7),
    libelles: ''
  });

  useEffect(() => {
    if (activeSection === 'factures') {
      loadFactures();
      loadStats();
    } else if (activeSection === 'conventions') {
      loadConventions();
    }
  }, [activeSection, page, search]);

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

  const loadConventions = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`${API_ENDPOINTS.CONVENTIONS}?limit=100`);
      setConventions(response.data || []);
    } catch (err) {
      error(err.message || 'Erreur lors du chargement des conventions');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.FACTURES_STATS);
      setStats(response.data || stats);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const handleCreateFacture = async () => {
    if (!factureForm.numConv || !factureForm.mois) {
      error('Veuillez remplir tous les champs obligatoires (Convention et Mois)');
      return;
    }

    setLoading(true);
    try {
      await apiRequest(API_ENDPOINTS.FACTURES, {
        method: 'POST',
        body: JSON.stringify(factureForm)
      });
      success('Facture créée avec succès');
      setShowFactureModal(false);
      setFactureForm({
        numConv: '',
        mois: new Date().toISOString().slice(0, 7),
        libelles: ''
      });
      loadFactures();
      loadStats();
    } catch (err) {
      error(err.message || 'Erreur lors de la création de la facture');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogoutModal(false);
    navigate('/');
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src={logoImage}
            alt="Logo FCE"
            style={{ width: '160px', height: 'auto', margin: '0 auto 8px', display: 'block' }}
          />
        </div>

        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
            {[
              { icon: 'fa-file-invoice-dollar', label: 'Factures', section: 'factures' },
              { icon: 'fa-file-contract', label: 'Conventions', section: 'conventions' },
              { icon: 'fa-chart-line', label: 'Statistiques', section: 'stats' },
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
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    color: activeSection === item.section ? theme.colors.primary : '#333',
                    backgroundColor: activeSection === item.section ? '#e7f3ff' : 'transparent',
                    fontWeight: activeSection === item.section ? '600' : '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    border: activeSection === item.section ? `1px solid ${theme.colors.primary}` : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 18 }}></i>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px', backgroundColor: '#f5f7fa' }}>
        <h1 style={{ ...theme.typography.h1, color: theme.colors.primary, marginBottom: '32px' }}>
          {activeSection === 'factures' ? 'Gestion des Factures' : 
           activeSection === 'conventions' ? 'Conventions' : 
           'Statistiques'}
        </h1>

        {/* Section Factures */}
        {activeSection === 'factures' && (
          <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: theme.shadows.md }}>
                <div style={{ color: theme.colors.gray, fontSize: '14px', marginBottom: '8px' }}>Total Factures</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.primary }}>{stats.totalFactures}</div>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: theme.shadows.md }}>
                <div style={{ color: theme.colors.gray, fontSize: '14px', marginBottom: '8px' }}>Factures Payées</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.success }}>{stats.facturesPayees}</div>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: theme.shadows.md }}>
                <div style={{ color: theme.colors.gray, fontSize: '14px', marginBottom: '8px' }}>En Attente</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.warning }}>{stats.facturesEnAttente}</div>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <input
                type="search"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  width: '300px',
                  backgroundColor: '#dbdbdb96',
                  color: 'black'
                }}
              />
              <button
                onClick={() => setShowFactureModal(true)}
                style={{
                  padding: '12px 24px',
                  background: theme.colors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                + Nouvelle Facture
              </button>
            </div>

            {/* Liste des Factures */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px', color: theme.colors.gray }}></i>
              </div>
            ) : factures.length === 0 ? (
              <div style={{ background: 'white', padding: '48px', borderRadius: '12px', textAlign: 'center', boxShadow: theme.shadows.md }}>
                <i className="fas fa-file-invoice" style={{ fontSize: '48px', color: theme.colors.grayLight, marginBottom: '16px' }}></i>
                <p style={{ color: theme.colors.gray }}>Aucune facture trouvée</p>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: theme.shadows.md }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: theme.colors.primary, color: 'white' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>N° Facture</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Convention</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Mois</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Libellé</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600 }}>Montant</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map((facture) => (
                      <tr key={facture.numFact} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '16px' }}>#{facture.numFact}</td>
                        <td style={{ padding: '16px' }}>Conv. {facture.numConv}</td>
                        <td style={{ padding: '16px' }}>{formatDate(facture.mois)}</td>
                        <td style={{ padding: '16px' }}>{facture.libelles}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600 }}>
                          {facture.batiment ? formatCurrency(facture.batiment.montant || 0) : 'N/A'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            style={{
                              padding: '6px 12px',
                              background: theme.colors.secondary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            onClick={() => window.print()}
                          >
                            Imprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #ddd',
                        background: page === 1 ? '#f5f5f5' : 'white',
                        borderRadius: '6px',
                        cursor: page === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Précédent
                    </button>
                    <span style={{ padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
                      Page {page} sur {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #ddd',
                        background: page === totalPages ? '#f5f5f5' : 'white',
                        borderRadius: '6px',
                        cursor: page === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section Conventions */}
        {activeSection === 'conventions' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '28px' }}></i>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {conventions.map((conv) => (
                  <div
                    key={conv.numConv}
                    style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      boxShadow: theme.shadows.md,
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    onClick={() => {
                      setSelectedConvention(conv);
                      setFactureForm({
                        ...factureForm,
                        numConv: conv.numConv
                      });
                      setShowFactureModal(true);
                    }}
                  >
                    <h3 style={{ margin: '0 0 12px', color: theme.colors.primary }}>
                      Convention {conv.numConv}
                    </h3>
                    <p style={{ margin: '4px 0', color: theme.colors.gray }}>
                      <strong>Locataire:</strong> {conv.locataire?.nomcli}
                    </p>
                    <p style={{ margin: '4px 0', color: theme.colors.gray }}>
                      <strong>Bâtiment:</strong> {conv.batiment?.adresse}
                    </p>
                    <p style={{ margin: '4px 0', color: theme.colors.gray }}>
                      <strong>Montant:</strong> {formatCurrency(conv.batiment?.montant || 0)}
                    </p>
                  </div>
                ))}
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
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: theme.shadows.xl
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: theme.colors.primary }}>
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
                    border: '1px solid #ddd'
                  }}
                >
                  <option value="">Sélectionner une convention</option>
                  {conventions.map(c => (
                    <option key={c.numConv} value={c.numConv}>
                      Conv. {c.numConv} - {c.locataire?.nomcli}
                    </option>
                  ))}
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
                    border: '1px solid #ddd'
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
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowFactureModal(false)}
                style={{
                  padding: '10px 20px',
                  background: theme.colors.gray,
                  color: 'white',
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
                  background: theme.colors.success,
                  color: 'white',
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

      {/* Modal Déconnexion */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '420px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: theme.colors.primary, height: '80px', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70px',
                height: '70px',
                background: theme.colors.primary,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}>
                <i className="fas fa-sign-out-alt" style={{ fontSize: '32px', color: 'white' }}></i>
              </div>
            </div>
            <div style={{ padding: '50px 24px 24px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600 }}>
                Voulez-vous vraiment vous déconnecter ?
              </h3>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '12px 32px',
                    background: theme.colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Oui
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  style={{
                    padding: '12px 32px',
                    background: 'white',
                    color: theme.colors.primary,
                    border: `2px solid ${theme.colors.primary}`,
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Non
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
