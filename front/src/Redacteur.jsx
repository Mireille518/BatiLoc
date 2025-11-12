import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImage from './images/fcee.gif';

// Etats initiaux
const initialStep1 = { numBat: '', adresse: '', montant: '' };
const initialStep2 = { nomcli: '', datenais: '', lieunais: '', pere: '', mere: '', cin: '', delivcin: '', adressecli: '', activite: '' };

function ConventionRow({ c, selectedConv, setSelectedConv, editCountById, onEditConv, onCancelConv, printConvention }) {
  const isPaid = c.statutConv;
  const disabledEdit = (editCountById[c.numConv] || 0) >= 2;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={`convention-row ${selectedConv?.numConv === c.numConv ? 'selected' : ''}`}
      onClick={() => setSelectedConv(selectedConv?.numConv === c.numConv ? null : c)}
    >
      <div>{c.numConv}</div>
      <div>{new Date(c.dateConv).getFullYear()}</div>
      <div>{c.numBat} - {c.batiment?.adresse}</div>
      <div className="convention-locataire">{c.locataire?.nomcli}</div>
      <div>{c.locataire?.cin}</div>
      <div className="convention-status">
        <span
          className="status-icon"
          style={{ color: isPaid ? '#28a745' : '#6c757d' }}
        >
          {isPaid ? '✓' : '—'}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <button
          className="more-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          ⋮
        </button>
        {showMenu && (
          <div ref={menuRef} className="actions-menu">
            <button
              onClick={() => { onEditConv(c); setShowMenu(false); }}
              className={disabledEdit ? 'disabled' : ''}
              disabled={disabledEdit}
            >
              Modifier
            </button>
            <button onClick={() => { onCancelConv(c.numConv); setShowMenu(false); }}>
              Annuler
            </button>
            <button onClick={() => { printConvention(c); setShowMenu(false); }}>
              Imprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RedacteurHome() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('conventions'); // 'batiments' | 'conventions'
  const [batiments, setBatiments] = useState([]);
  const [conventions, setConventions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Form wizard
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState(initialStep1);
  const [step2, setStep2] = useState(initialStep2);
  const [editingConv, setEditingConv] = useState(null); // object or null
  const [editCountById, setEditCountById] = useState({}); // client-only limit (2)
  const [search, setSearch] = useState('');
  const [selectedConv, setSelectedConv] = useState(null);

  const API_BATS = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/batiments`, []);
  const API_CONVS = useMemo(() => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/conventions`, []);
  const todayStr = useMemo(() => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }), []);

  useEffect(() => {
    if (activeSection === 'batiments') {
      loadBatiments();
    } else {
      loadConventions();
    }
  }, [activeSection]);

  // Load bâtiments when the wizard opens (even if we are in conventions section)
  useEffect(() => {
    if (showWizard && batiments.length === 0) {
      loadBatiments();
    }
  }, [showWizard]);

  const resetWizard = () => {
    setStep(1);
    setStep1(initialStep1);
    setStep2(initialStep2);
    setEditingConv(null);
  };

  const loadBatiments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(API_BATS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }
      const j = await r.json();
      if (j.status === 200) setBatiments(j.data || []);
    } catch (e) {
      console.error(e);
      setMsg("Erreur chargement bâtiments");
    } finally {
      setLoading(false);
    }
  };

  const loadConventions = async (q = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = q ? `${API_CONVS}?q=${encodeURIComponent(q)}` : API_CONVS;
      const r = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }
      const j = await r.json();
      if (j.status === 200) setConventions(j.data || []);
    } catch (e) {
      console.error(e);
      setMsg("Erreur chargement conventions");
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

  const onSubmitWizard = async () => {
    setLoading(true);
    try {
      const payload = { ...step1, ...step2, statutConv: false };
      let method = 'POST';
      let url = API_CONVS;
      if (editingConv) {
        // simple client limit: max 2 edits
        const count = editCountById[editingConv.numConv] || 0;
        if (count >= 2) {
          setMsg('Limite de 2 modifications atteinte');
          setTimeout(() => setMsg(''), 2500);
          setLoading(false);
          return;
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
          setEditCountById(prev => ({ ...prev, [editingConv.numConv]: (prev[editingConv.numConv] || 0) + 1 }));
        }
        setMsg(editingConv ? 'Convention mise à jour' : 'Convention créée');
        await loadConventions();
        setShowWizard(false);
        resetWizard();
      } else {
        setMsg(j.message || 'Erreur enregistrement convention');
      }
    } catch (e) {
      console.error(e);
      setMsg('Erreur enregistrement convention');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 2500);
    }
  };

  const onCancelConv = async (numConv) => {
    if (!confirm('Annuler cette convention ?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_CONVS}/${numConv}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
        return;
      }

      const j = await r.json();
      if (j.status === 200) {
        setMsg('Convention annulée');
        await loadConventions(search);
      }
    } catch (e) {
      console.error(e);
      setMsg('Erreur annulation');
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const onEditConv = (c) => {
    const count = editCountById[c.numConv] || 0;
    if (count >= 2) return; // désactivé
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
      cin: c.locataire?.cin || '',
      delivcin: c.locataire?.delivcin || '',
      adressecli: c.locataire?.adressecli || '',
      activite: c.locataire?.activite || ''
    });
    setShowWizard(true);
    setStep(1);
  };

  const printConvention = (c) => {
    const data = {
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
    const html = buildConventionHTML(data);
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
      `CONVENTION N° ....../BAT/${year}\n\n` +
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
      body, html { margin: 0; padding: 0; }
      .page { width: 210mm; min-height: 297mm; page-break-after: always; padding: 15mm 18mm; }
      .page:last-child { page-break-after: auto; }
      .doc { padding: 0; background: transparent; }
    }
    .hl { color: #0ea5e9; font-weight: 600; }
    .title { text-align: center; font-weight: 700; text-transform: uppercase; }
    .subtitle { text-align: center; margin-top: 2px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
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
                        <div className="muted">CONVENTION N° <span className="hl">{step1.numBat ? `${step1.numBat}/005/BAT/${new Date().getFullYear()}` : '..../BAT/2024'}</span></div>
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

  const buildConventionHTML = (data) => {
    const y = new Date().getFullYear();
    const f = (v, d = '........') => (v ? String(v) : d);
    const money = (v) => (v != null && v !== '' ? Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '........');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Convention</title><style>${docCss}</style></head><body>
      <div class="doc">
        <div class="page">
          <div class="header">
            <div>
              <div style="font-weight:700">LA DIRECTION DE LA F.C.E.</div>
              <div>FIANARANTSOA</div>
            </div>
            <div class="muted">CONVENTION N° <span class="hl">..../BAT/${y}</span></div>
          </div>
          <div class="title">D'UN BÂTIMENT SIS À <span class="hl">${f(data.lieuVille, '................')}</span></div>
          <div class="sep"></div>
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
    </body></html>`;
    return html;
  };

  const WizardFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 12 }}>
      <button type="button" onClick={() => { setShowWizard(false); resetWizard(); }} disabled={loading} style={btnSecondary}>Annuler</button>
      <div style={{ display: 'flex', gap: 8 }}>
        {step > 1 && (
          <button type="button" onClick={() => setStep(step - 1)} disabled={loading} style={btnLight}>Précédent</button>
        )}
        {step < 3 && (
          <button type="button" onClick={() => setStep(step + 1)} disabled={loading || (step === 1 ? !canNextFromStep1() : !canNextFromStep2())} style={{ ...btnPrimary, opacity: (step === 1 ? canNextFromStep1() : canNextFromStep2()) ? 1 : .5, cursor: (step === 1 ? canNextFromStep1() : canNextFromStep2()) ? 'pointer' : 'not-allowed' }}>Suivant</button>
        )}
        {step === 3 && (
          <button type="button" onClick={onSubmitWizard} disabled={loading} style={btnPrimary}>{loading ? 'Enregistrement...' : (editingConv ? 'Mettre à jour' : 'Valider')}</button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
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
              { icon: 'fa-file-contract', label: 'Conventions', section: 'conventions', active: activeSection === 'conventions' },
              { icon: 'fa-cog', label: 'Paramètres', section: 'parametres', active: false },
              { icon: 'fa-sign-out-alt', label: 'Déconnexion', section: 'logout', active: false },
            ].map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.section === 'batiments' || item.section === 'conventions') {
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
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 18 }}></i>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Contenu principal */}
      <main style={{ flex: 1, padding: '24px', position: 'relative' }}>
        {activeSection === 'batiments' && (
          <div>
            {/* Ton code pour bâtiments reste inchangé */}
          </div>
        )}
        {activeSection === 'conventions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '45px', color: '#020cdb', fontWeight: '603' }}>Gestion des Conventions</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="search"
                  placeholder="Rechercher par nom, CIN..."
                  value={search}
                  onChange={(e) => {
                    const q = e.target.value;
                    setSearch(q);
                    loadConventions(q);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    width: 250,
                    backgroundColor: '#dbdbdb96',
                    color: 'black'
                  }}
                />
                <button onClick={() => { setShowWizard(true); resetWizard(); }} style={{ ...btnPrimary, background: '#3d9757' }}>+ Ajouter</button>
              </div>
            </div>
            {msg && (
              <div style={{ background: '#d4edda', color: '#155724', padding: '8px 16px', borderRadius: 4, marginBottom: 16, display: 'inline-flex' }}>
                {msg}
              </div>
            )}

            {/* === NOUVELLE INTERFACE DE LISTE DES CONVENTIONS (STYLE MEETINGS TABLE) === */}
            <div style={{
              maxWidth: '100%',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              background: 'rgb(217, 231, 233)',
              padding: '32px',
              borderRadius: '20px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            }}>
              <style>{`
                .conventions-header {
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr 2fr 1fr 1fr auto;
                  gap: 16px;
                  align-items: center;
                  padding: 14px 20px;
                  background: #020cdb;
                  border-radius: 12px;
                  margin-bottom: 8px;
                  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
                }
                .conventions-header-item {
                  color: white;
                  font-weight: 600;
                  font-size: 13px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  text-align: left;
                }
                .conventions-list { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
                .convention-row {
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr 2fr 1fr 1fr auto;
                  gap: 16px;
                  align-items: center;
                  padding: 16px 20px;
                  background: white;
                  border-radius: 16px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                  transition: all 0.25s ease;
                  cursor: pointer;
                }
                .convention-row:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }
                .convention-row.selected {
                  box-shadow: 0 0 0 3px #90cdf4;
                }
                .convention-locataire { font-weight: 500; }
                .status-icon {
                  font-weight: bold;
                  font-size: 18px;
                }
                .more-btn {
                  background: none;
                  border: none;
                  font-size: 20px;
                  cursor: pointer;
                  color: #a0aec0;
                  padding: 0;
                  width: 32px;
                  height: 32px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 8px;
                  transition: all 0.2s;
                }
                .more-btn:hover {
                  background: #e2e8f0;
                  color: #4a5568;
                }
                .actions-menu {
                  position: absolute;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  padding: 8px 0;
                  z-index: 10;
                  min-width: 120px;
                }
                .actions-menu button {
                  display: block;
                  width: 100%;
                  padding: 8px 16px;
                  background: none;
                  border: none;
                  text-align: left;
                  cursor: pointer;
                  transition: background 0.2s;
                }
                .actions-menu button:hover {
                  background: #f1f3f5;
                }
                .actions-menu button.disabled {
                  color: #ccc;
                  cursor: not-allowed;
                }
              `}</style>

              {/* En-tête des colonnes */}
              {conventions.length > 0 && (
                <div className="conventions-header">
                  <div className="conventions-header-item">N° Convention</div>
                  <div className="conventions-header-item">Année</div>
                  <div className="conventions-header-item">Bâtiment</div>
                  <div className="conventions-header-item">Locataire</div>
                  <div className="conventions-header-item">CIN</div>
                  <div className="conventions-header-item">Statut</div>
                  <div className="conventions-header-item" style={{ textAlign: 'center' }}>Actions</div>
                </div>
              )}

              {loading && conventions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
                  <div style={{ marginTop: 12, fontSize: 15 }}>Chargement des conventions...</div>
                </div>
              ) : conventions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#888',
                  background: '#fafafa',
                  borderRadius: 12,
                  border: '2px dashed #ddd'
                }}>
                  <i className="fas fa-file-contract" style={{ fontSize: 42, color: '#ccc' }}></i>
                  <p style={{ margin: '16px 0 0', fontSize: 16 }}>Aucune convention trouvée</p>
                  <small>Cliquez sur "+ Ajouter" pour commencer</small>
                </div>
              ) : (
                <div className="conventions-list">
                  {conventions.map((c) => (
                    <ConventionRow
                      key={c.numConv}
                      c={c}
                      selectedConv={selectedConv}
                      setSelectedConv={setSelectedConv}
                      editCountById={editCountById}
                      onEditConv={onEditConv}
                      onCancelConv={onCancelConv}
                      printConvention={printConvention}
                    />
                  ))}
                </div>
              )}

              {/* Détail sélectionné (style doux, inchangé fonctionnellement) */}
              {selectedConv && (
                <div style={{
                  marginTop: 24,
                  padding: 20,
                  background: '#f8fbff',
                  border: '1px solid #bee5eb',
                  borderRadius: 14,
                  animation: 'fadeIn 0.3s ease'
                }}>
                  <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, color: '#1a1a1a' }}>
                      Convention {selectedConv.numConv} — {new Date(selectedConv.dateConv).getFullYear()}
                    </h3>
                    <button style={btnLight} onClick={() => setSelectedConv(null)}>
                      Fermer
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, fontSize: 15 }}>
                    <div>
                      <strong style={{ color: '#007bff' }}>Bâtiment</strong>
                      <div style={{ marginTop: 8 }}>
                        <div><strong>N° :</strong> {selectedConv.numBat}</div>
                        <div><strong>Adresse :</strong> {selectedConv.batiment?.adresse}</div>
                        <div><strong>Loyer :</strong> {Number(selectedConv.batiment?.montant || 0).toLocaleString('fr-FR')} Ar</div>
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: '#007bff' }}>Locataire</strong>
                      <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                        <div><strong>Nom :</strong> {selectedConv.locataire?.nomcli}</div>
                        <div><strong>Né(e) :</strong> {selectedConv.locataire?.datenais} à {selectedConv.locataire?.lieunais}</div>
                        <div><strong>CIN :</strong> {selectedConv.locataire?.cin} (délivrée le {selectedConv.locataire?.delivcin})</div>
                        <div><strong>Activité :</strong> {selectedConv.locataire?.activite}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, textAlign: 'right', display:'flex' }}>
                    <button onClick={() => onEditConv(selectedConv)} disabled={(editCountById[selectedConv.numConv] || 0) >= 2} style={btnPrimary}>
                      Modifier
                    </button>
                    <button onClick={() => onCancelConv(selectedConv.numConv)} style={{ ...btnDanger, marginLeft: 8 }}>
                      Annuler
                    </button>
                    <button onClick={() => printConvention(selectedConv)} style={{ ...btnLight, marginLeft: 8 }}>
                      Imprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard */}
        {showWizard && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ width: 'min(920px, 95vw)', background: '#fff', borderRadius: 12, padding: 20, maxHeight: '90vh', overflow: 'auto' }}>
              <h2 style={{ marginTop: 0 }}>{editingConv ? 'Modifier une convention' : 'Nouvelle convention'}</h2>

              {/* Fil d'Ariane - Version Pro, Arrondi & Disproportionné */}
              <div
                ref={breadcrumbRef}
                style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 24,
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  padding: '12px 175px',
                  scrollbarWidth: 'none', // Cache la barre sur Firefox
                  msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': { display: 'none' } // Cache sur Chrome/Safari
                }}
              >
                {[
                  { id: 1, label: 'Bâtiment' },
                  { id: 2, label: 'Locataire' },
                  { id: 3, label: 'Aperçu' },
                ].map((s) => (
                  <div
                    key={s.id}
                    data-step={s.id} // Pour le scroll auto
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flex: '0 0 180px', // LARGEUR FIXE → plus jamais écrasé
                      justifyContent: 'center',
                    }}
                  >
                    {/* CERCLE FIXE & PARFAIT */}
                    <div
                      style={{
                        width: 50,
                        height: 30,
                        borderRadius: 20,
                        background: step >= s.id ? '#007bff' : '#e9ecef',
                        color: step >= s.id ? 'white' : '#495057',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        flexShrink: 0,
                        boxShadow: step === s.id ? '0 0 0 3px rgba(0,123,255,0.3)' : 'none',
                      }}
                    >
                      {s.id}
                    </div>

                    <span
                      style={{
                        fontWeight: step === s.id ? 700 : 500,
                        fontSize: 15,
                        color: step >= s.id ? '#1a1a1a' : '#666',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.label}
                    </span>

                    {s.id < 3 && (
                      <span style={{ color: '#aaa', fontSize: 20, flexShrink: 0 }}>›</span>
                    )}
                  </div>
                ))}
              </div>
              {step === 1 && (
                <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }} class="form-row">
                    <div class="col">
                      <label>Numéro Bâtiment *</label>
                      <select className="form-control" value={step1.numBat} onChange={onSelectBatiment} required style={inputStyle}>
                        <option value="">— Choisir —</option>
                        {batiments.map(b => (
                          <option key={b.numBat} value={String(b.numBat)}>Cité n°{b.numBat} — {b.adresse}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Adresse *</label>
                      <input type="text" class="form-control" value={step1.adresse} readOnly maxLength={20} required style={{ ...inputStyle, backgroundColor: '#f8f9fa' }} />
                    </div>
                    <div>
                      <label>Montant *</label>
                      <input type="number" class="form-control" value={step1.montant} readOnly step="0.01" min={0} required style={{ ...inputStyle, backgroundColor: '#f8f9fa' }} />
                    </div>
                  </div>
                  <WizardFooter />
                </form>
              )}

              {step === 2 && (
                <form onSubmit={(e) => e.preventDefault()} style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                      <label>Nom du locataire *</label>
                      <input class="form-control" value={step2.nomcli} onChange={e => setStep2({ ...step2, nomcli: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Date de naissance *</label>
                      <input class="form-control" type="date" value={step2.datenais} onChange={e => setStep2({ ...step2, datenais: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Lieu de naissance *</label>
                      <input class="form-control" value={step2.lieunais} onChange={e => setStep2({ ...step2, lieunais: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Nom du père *</label>
                      <input class="form-control" value={step2.pere} onChange={e => setStep2({ ...step2, pere: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Nom de la mère *</label>
                      <input class="form-control" value={step2.mere} onChange={e => setStep2({ ...step2, mere: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>CIN *</label>
                      <input class="form-control" value={step2.cin} onChange={e => setStep2({ ...step2, cin: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Date de délivrance CIN *</label>
                      <input class="form-control" type="date" value={step2.delivcin} onChange={e => setStep2({ ...step2, delivcin: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Adresse du locataire *</label>
                      <input class="form-control" value={step2.adressecli} onChange={e => setStep2({ ...step2, adressecli: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                      <label>Activité *</label>
                      <input class="form-control" value={step2.activite} onChange={e => setStep2({ ...step2, activite: e.target.value })} required style={inputStyle} />
                    </div>
                  </div>
                  <WizardFooter />
                </form>
              )}

              {step === 3 && (
                <div style={{ display: 'grid', gap: 16 }}>
                  <style>{docCss}</style>
                  <div className="doc">
                    <div className="page">
                      <div className="header">
                        <div>
                          <div style={{ fontWeight: 700 }}>LA DIRECTION DE LA F.C.E.</div>
                          <div>FIANARANTSOA</div>
                        </div>
                        <div className="muted">CONVENTION N° <span className="hl">..../BAT/{new Date().getFullYear()}</span></div>
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
                  <WizardFooter />
                </div>
              )}
            </div>
          </div>
        )}
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
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
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
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' };
const btnPrimary = { padding: '10px 14px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 };
const btnSecondary = { padding: '10px 14px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 };
const btnLight = { padding: '10px 14px', background: '#f1f3f5', color: '#333', border: '1px solid #ddd', borderRadius: 8, fontWeight: 600 };
const btnDanger = { padding: '10px 14px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 };
