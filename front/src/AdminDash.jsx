import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from './images/fcee.gif';

const initialForm = { numBat: '', adresse: '', montant: '', statut: true };
const initialImage = null;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [batiments, setBatiments] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [activeSection, setActiveSection] = useState('batiments'); // 'batiments' ou 'utilisateurs'
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(initialImage);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const API_URL = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/batiments`, []);
  const API_USERS_URL = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/user`, []);

  useEffect(() => {
    if (activeSection === 'batiments') {
      loadBatiments();
    } else if (activeSection === 'utilisateurs') {
      loadUtilisateurs();
    }
  }, [activeSection]);

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

  const loadUtilisateurs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_USERS_URL, {
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
      setMsg('Erreur lors de l\'enregistrement');
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
      statut: b.statut
    });
    if (b.image) {
      setImagePreview(`data:image/jpeg;base64,${b.image}`);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
  };

  const onDelete = async (numBat) => {
    if (!confirm('Supprimer ce bâtiment ?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${numBat}`, {
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
        setMsg('Bâtiment supprimé avec succès');
        await loadBatiments();
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogoutModal(false);
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* NAVBAR LATÉRALE GAUCHE */}
      <aside
        style={{
          width: '280px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {/* Logo avec ton image */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src={logoImage}
            alt="Logo Gestion Bâtiment Fianarantsoa"
            style={{
              width: '160px',
              height: 'auto',
              margin: '0 auto 8px',
              display: 'block',
            }}
          />
        </div>

        {/* Menu */}
        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
            {[
              { icon: 'fa-home', label: 'Accueil', section: 'home', active: false },
              { icon: 'fa-building', label: 'Bâtiments', section: 'batiments', active: activeSection === 'batiments' },
              { icon: 'fa-users', label: 'Utilisateurs', section: 'utilisateurs', active: activeSection === 'utilisateurs' },
              { icon: 'fa-chart-bar', label: 'Statistiques', section: 'statistiques', active: false },
              { icon: 'fa-cog', label: 'Paramètres', section: 'parametres', active: false },
              { icon: 'fa-sign-out-alt', label: 'Déconnexion', section: 'logout', active: false },
            ].map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.section === 'batiments' || item.section === 'utilisateurs') {
                      setActiveSection(item.section);
                      setMsg('');
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
                    color: item.active ? '#007bff' : '#333',
                    backgroundColor: item.active ? '#e7f3ff' : 'transparent',
                    fontWeight: item.active ? '600' : '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    border: item.active ? '1px solid #007bff' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.backgroundColor = '#f0f8ff';
                      e.currentTarget.style.color = '#007bff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#333';
                    }
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: '18px', color: item.active ? '#007bff' : '#555' }}></i>
                  <span style={{ fontSize: '15px' }}>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Profil Admin */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: 'auto',
            border: '1px solid #e9ecef',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#007bff',
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
            <div style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '14px' }}>Admin</div>
            <div style={{ fontSize: '12px', color: '#666' }}>admin@batiment.mg</div>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main style={{ flex: 1, padding: '32px', backgroundColor: '#f5f7fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 24px', fontSize: '45px', color: '#020cdb', fontWeight: '603' }}>
            {activeSection === 'batiments' ? 'Gestion des Bâtiments' : 'Liste des Utilisateurs'}
          </h1>

          {msg && (
            <div
              style={{
                margin: '0 0 20px',
                padding: '12px 16px',
                backgroundColor: msg.includes('Erreur') ? '#fee' : '#d1f3e0',
                color: msg.includes('Erreur') ? '#c00' : '#0d6b3a',
                border: msg.includes('Erreur') ? '1px solid #fcc' : '1px solid #a3e6c3',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              {msg}
            </div>
          )}

          {/* Section Bâtiments */}
          {activeSection === 'batiments' && (
            <>
              {/* Formulaire */}
              <div
                style={{
                  backgroundColor: '#fff',
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  marginBottom: '32px',
                }}
              >
                <h2 style={{ margin: '0 0 20px', fontSize: '25px', color: '#020cdb', fontWeight: 'bold' }}>
                  {editingId ? 'Modifier le bâtiment' : 'Ajouter un bâtiment'}
                </h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr 1fr' }}>

                    {/* Numéro Bâtiment */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#444', fontSize: '14px' }}>
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
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#444', fontSize: '14px' }}>
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
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#444', fontSize: '14px' }}>
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
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
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

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
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
                          padding: '10px 16px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: loading ? 'not-allowed' : 'pointer',
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
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ color: '#666', fontSize: '16px' }}>Chargement...</div>
                </div>
              ) : batiments.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ color: '#666', fontSize: '16px' }}>Aucun bâtiment enregistré</div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {batiments.map(b => (
                    <div
                      key={b.numBat}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer',
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
                            color: '#999',
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
                            color: '#1a1a1a',
                          }}
                        >
                          Cité n° {b.numBat}
                        </h5>

                        {/* Adresse */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: '#666',
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
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fas fa-dollar-sign" style={{ color: '#28a745' }}></i>
                          <span style={{ fontWeight: '600', color: '#333' }}>
                            {b.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ar
                          </span>
                        </p>

                        {/* Statut */}
                        <div style={{ marginBottom: '16px' }}>
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
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          <button
                            onClick={() => onEdit(b)}
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
                            onClick={() => onDelete(b.numBat)}
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
              {loading && utilisateurs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ color: '#666', fontSize: '16px' }}>Chargement...</div>
                </div>
              ) : utilisateurs.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ color: '#666', fontSize: '16px' }}>Aucun utilisateur enregistré</div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {utilisateurs.map(u => (
                    <div
                      key={u.matricule}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
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
                            color: '#1a1a1a',
                          }}
                        >
                          {u.nom}
                        </h5>

                        {/* Matricule */}
                        <p
                          style={{
                            margin: '0 0 12px',
                            fontSize: '14px',
                            color: '#666',
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
                            color: '#666',
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
                            color: '#666',
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
                              color: '#007bff',
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
                              margin: '0 0 0',
                              fontSize: '14px',
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <i className="fas fa-file-contract" style={{ color: '#ffc107', width: '20px' }}></i>
                            <span><strong>Conv.:</strong> {u.numConv}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal de confirmation de déconnexion */}
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
            {/* Header avec gradient bleu */}
            <div
              style={{
                background: '#020cdb',
                height: '80px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Icône circulaire avec flèche */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-30px',
                  width: '70px',
                  height: '70px',
                  background: '#020cdb',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                </svg>
              </div>
            </div>

            {/* Contenu */}
            <div style={{ padding: '50px 24px 24px', textAlign: 'center' }}>
              <h3
                style={{
                  margin: '0 0 24px',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#1a1a1a',
                  lineHeight: 1.4,
                }}
              >
                Voulez-vous vraiment
                <br />
                vous déconnecter ?
              </h3>

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
                    padding: '12px 32px',
                    background: '#020cdb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(2, 12, 219, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(2, 12, 219, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(2, 12, 219, 0.3)';
                  }}
                >
                  Oui
                </button>
                <button
                  onClick={() => setShowLogoutModal(false)}
                  style={{
                    padding: '12px 32px',
                    background: 'white',
                    color: '#020cdb',
                    border: '2px solid #020cdb',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f0f0ff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
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