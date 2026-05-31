const express = require("express")
const router = express.Router()
const sequelize = require("../connection/db");
const { Op } = require("sequelize");
const UserModel = require("../models/utilisateur")(sequelize, require("sequelize").DataTypes);
const bcrypt = require("bcryptjs")
const webToken = require("jsonwebtoken")
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireRole } = require("../middleware/auth");
require("dotenv").config()

// Liste des postes autorisés
const POSTES_AUTORISES = ['caissier', 'administrateur', 'opérateur de saisie'];
const ensureAdmin = [authenticateToken, requireRole('administrateur')];

// Vérifier que la clé secrète existe
const SECRET_KEY = process.env.secret_key || process.env.SECRET_KEY || 'your_secret_key_change_me';

if (!process.env.secret_key && !process.env.SECRET_KEY) {
    console.warn('⚠️ ATTENTION: Aucune clé secrète trouvée dans les variables d\'environnement');
    console.warn('Veuillez définir SECRET_KEY ou secret_key dans votre fichier .env');
}

// READ - Obtenir tous les utilisateurs (sans mot de passe) avec recherche
router.get("/", ...ensureAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    const where = {};
    
    // Recherche - Recherche dans Matricule, Nom, Email, Contact et Poste
    if (q) {
      const qTrimmed = q.trim();
      const isNumeric = !isNaN(qTrimmed) && qTrimmed !== '';
      const searchConditions = [];
      
      // Recherche par Matricule
      searchConditions.push({ matricule: { [Op.like]: `%${qTrimmed}%` } });
      
      // Recherche par Nom
      searchConditions.push({ nom: { [Op.like]: `%${qTrimmed}%` } });
      
      // Recherche par Email
      searchConditions.push({ email: { [Op.like]: `%${qTrimmed}%` } });
      
      // Recherche par Contact
      searchConditions.push({ contact: { [Op.like]: `%${qTrimmed}%` } });
      
      // Recherche par Poste
      searchConditions.push({ poste: { [Op.like]: `%${qTrimmed}%` } });
      
      where[Op.or] = searchConditions;
    }
    
    const users = await UserModel.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      attributes: ['matricule', 'nom', 'contact', 'email', 'poste', 'numConv'],
      order: [['nom', 'ASC']]
    });

    res.status(200).json({
      message: "Utilisateurs récupérés avec succès",
      status: 200,
      data: users
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs",
      status: 500,
      error: error.message
    });
  }
});

//S'INSCRIRE (réservé à l'administrateur)
router.post("/register", ...ensureAdmin, async (req, res) => {
    try {
        const { matricule, nom, contact, email, mdp, poste, numConv } = req.body;
        
        console.log('📝 Tentative d\'inscription:', { matricule, nom, email, poste, mdpPresent: !!mdp });

        // Validation améliorée
        if (!matricule || !nom || !contact || !email || !mdp || !poste) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires",
                status: 400
            });
        }

        // Vérifier si le poste est valide
        if (!POSTES_AUTORISES.includes(poste.toLowerCase())) {
            return res.status(400).json({
                message: "Poste invalide. Les postes autorisés sont : caissier, administrateur, opérateur de saisie",
                status: 400
            });
        }

        // Vérifier si l'email ou le matricule existe déjà 
        const existingUser = await UserModel.findOne({
            where: { 
                [Op.or]: [
                    { email: email },
                    { matricule: matricule }
                ]
            }
        });

        if (existingUser) {
            console.log('❌ Email ou matricule déjà utilisé');
            return res.status(409).json({
                message: "Email déjà utilisé ou matricule",
                status: 409
            });
        }

        // Hasher le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(mdp, salt);

        // Créer l'utilisateur
        const user = await UserModel.create({
            matricule,
            nom,
            contact,
            email,
            mdp: hash,
            poste: poste.toLowerCase(), // Stocker en minuscule
            numConv: numConv || null
        });

        console.log('✅ Inscription réussie pour:', user.matricule);
        return res.status(201).json({
            message: "Compte créé avec succès",
            status: 201,
            matricule: user.matricule // Renvoyer le matricule
        });

    } catch (err) {
        console.error('❌ Erreur inscription:', err);
        return res.status(500).json({ 
            message: "Erreur serveur",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

//SE CONNECTER
router.post("/login", async (req, res) => {
    try {
        const { matricule, poste, mdp } = req.body;
        
        console.log('🔐 Tentative de connexion:', { matricule, poste, mdpPresent: !!mdp });

        // Validation améliorée
        if (!matricule || !poste || !mdp) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires (matricule, poste, mdp)",
                status: 400
            });
        }

        // Vérifier si le poste est valide
        if (!POSTES_AUTORISES.includes(poste.toLowerCase())) {
            return res.status(400).json({
                message: "Poste invalide. Les postes autorisés sont : caissier, administrateur, opérateur de saisie",
                status: 400
            });
        }

        // Vérifier si l'utilisateur existe avec matricule ET poste
        const value = await UserModel.findOne({
            where: {
                matricule: matricule,
                poste: poste.toLowerCase()
            }
        });
        
        console.log('👤 Utilisateur trouvé:', value ? 'Oui' : 'Non');
        
        if (!value) {
            console.log('❌ Utilisateur non trouvé - Création d\'une demande de compte');
            
            // Créer une demande de création de compte
            // On va utiliser un système de stockage simple (fichier JSON)
            const demandesPath = path.join(__dirname, '../data/demandes-creation-compte.json');
            
            // Créer le dossier data s'il n'existe pas
            const dataDir = path.join(__dirname, '../data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Lire les demandes existantes
            let demandes = [];
            if (fs.existsSync(demandesPath)) {
                try {
                    const fileContent = fs.readFileSync(demandesPath, 'utf8');
                    demandes = JSON.parse(fileContent);
                } catch (err) {
                    console.error('Erreur lecture demandes:', err);
                    demandes = [];
                }
            }
            
            // Vérifier si une demande existe déjà pour ce matricule et poste
            const demandeExistante = demandes.find(d => 
                d.matricule === matricule && 
                d.poste.toLowerCase() === poste.toLowerCase() && 
                d.statut === 'en_attente'
            );
            
            if (demandeExistante) {
                return res.status(401).json({
                    message: "Votre demande de création de compte est en attente d'approbation par l'administrateur. Veuillez patienter.",
                    status: 401,
                    token: "",
                    demandeEnAttente: true
                });
            }
            
            // Créer une nouvelle demande
            const nouvelleDemande = {
                id: Date.now().toString(),
                matricule: matricule,
                poste: poste.toLowerCase(),
                mdp: mdp, // Stocker temporairement le mot de passe (sera hashé lors de l'approbation)
                statut: 'en_attente',
                dateCreation: new Date().toISOString(),
                dateApprobation: null,
                dateRejet: null,
                approuvePar: null,
                rejetePar: null
            };
            
            demandes.push(nouvelleDemande);
            
            // Sauvegarder les demandes
            try {
                fs.writeFileSync(demandesPath, JSON.stringify(demandes, null, 2), 'utf8');
                console.log('✅ Demande de création de compte créée:', nouvelleDemande.id);
            } catch (err) {
                console.error('❌ Erreur sauvegarde demande:', err);
            }
            
            return res.status(401).json({
                message: "Votre demande de création de compte a été envoyée à l'administrateur. Vous recevrez une notification une fois approuvée.",
                status: 401,
                token: "",
                demandeCreee: true
            });
        }

        // Vérifier le mot de passe
        const dbUserPwd = value.getDataValue('mdp');
        const passwordMatch = await bcrypt.compare(mdp, dbUserPwd);
        console.log('🔑 Mot de passe:', passwordMatch ? 'Correct' : 'Incorrect');

        if (!passwordMatch) {
            console.log('❌ Mot de passe incorrect');
            return res.status(401).json({
                message: "Mot de passe invalide",
                status: 401,
                token: ""
            });
        }

        // Mot de passe correct - générer le token
        // Normaliser le poste (enlever espaces, convertir en minuscule)
        const posteFromDb = value.getDataValue("poste") || '';
        const posteNormalized = posteFromDb.trim().toLowerCase();
        
        const userdetail = {
            nom: value.getDataValue("nom"),
            matricule: value.getDataValue("matricule"),
            poste: posteNormalized,
            email: value.getDataValue("email")
        };

        const token = webToken.sign(userdetail, SECRET_KEY, {
            expiresIn: "48h"
        });

        console.log('✅ Connexion réussie pour:', userdetail.matricule, 'Poste:', posteNormalized);
        return res.status(200).json({
            message: "Connecté avec succès",
            status: 200,
            token,
            user: {
                matricule: userdetail.matricule,
                nom: userdetail.nom,
                poste: posteNormalized,
                email: userdetail.email
            }
        });

    } catch (err) {
        console.error('❌ Erreur login:', err);
        return res.status(500).json({ 
            message: "Erreur serveur",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

//PROFIL UTILISATEUR (avec vérification du token)
router.get("/profile", (req, res) => {
    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(401).json({
            message: "Veuillez vous connecter (token manquant)",
            status: 401
        })
    }

    // Extraire le token (format: "Bearer TOKEN")
    const token = authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({
            message: "Token invalide",
            status: 401
        })
    }

    // Vérifier le token
    webToken.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('Erreur vérification token:', err);
            return res.status(401).json({
                message: "Token expiré ou invalide",
                status: 401
            })
        }

        // Token valide, renvoyer les infos de l'utilisateur
        UserModel.findOne({
            where: { matricule: decoded.matricule },
            attributes: ['matricule', 'nom', 'email', 'poste', 'contact']
        }).then((user) => {
            if (!user) {
                return res.status(404).json({
                    message: "Utilisateur non trouvé",
                    status: 404
                })
            }

            res.status(200).json({
                message: "Profil récupéré avec succès",
                status: 200,
                user: {
                    matricule: user.matricule,
                    nom: user.nom,
                    email: user.email,
                    poste: user.poste,
                    contact: user.contact
                }
            })
        }).catch(err => {
            console.error('Erreur récupération profil:', err);
            res.status(500).json({ message: "Erreur serveur" })
        })
    })
})

// UPDATE - Mettre à jour un utilisateur (admin seulement)
router.put("/:matricule", ...ensureAdmin, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { matricule } = req.params;
        const { matricule: newMatricule, nom, contact, email, poste, mdp, numConv } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await UserModel.findByPk(matricule, { transaction });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({
                message: "Utilisateur non trouvé",
                status: 404
            });
        }

        // Si le matricule change, vérifier qu'il n'existe pas déjà
        const matriculeChange = newMatricule && newMatricule !== matricule;
        if (matriculeChange) {
            const existingMatricule = await UserModel.findByPk(newMatricule, { transaction });
            if (existingMatricule) {
                await transaction.rollback();
                return res.status(409).json({
                    message: "Ce matricule est déjà utilisé par un autre utilisateur",
                    status: 409
                });
            }
        }

        // Validation du poste si fourni
        if (poste && !POSTES_AUTORISES.includes(poste.toLowerCase())) {
            await transaction.rollback();
            return res.status(400).json({
                message: "Poste invalide. Les postes autorisés sont : caissier, administrateur, opérateur de saisie",
                status: 400
            });
        }

        // Vérifier si l'email existe déjà pour un autre utilisateur
        if (email && email !== user.email) {
            const existingUser = await UserModel.findOne({
                where: { 
                    email: email,
                    matricule: { [Op.ne]: matricule }
                },
                transaction
            });
            if (existingUser) {
                await transaction.rollback();
                return res.status(409).json({
                    message: "Cet email est déjà utilisé par un autre utilisateur",
                    status: 409
                });
            }
        }

        // Vérifier si le contact existe déjà pour un autre utilisateur
        if (contact && contact !== user.contact) {
            const existingUser = await UserModel.findOne({
                where: { 
                    contact: contact,
                    matricule: { [Op.ne]: matricule }
                },
                transaction
            });
            if (existingUser) {
                await transaction.rollback();
                return res.status(409).json({
                    message: "Ce contact est déjà utilisé par un autre utilisateur",
                    status: 409
                });
            }
        }

        // Si le matricule change, créer un nouvel utilisateur et supprimer l'ancien
        if (matriculeChange) {
            // Préparer les données pour le nouvel utilisateur
            const newUserData = {
                matricule: newMatricule,
                nom: nom || user.nom,
                contact: contact || user.contact,
                email: email || user.email,
                poste: poste ? poste.toLowerCase() : user.poste,
                numConv: numConv !== undefined ? (numConv || null) : user.numConv,
                mdp: mdp ? (await bcrypt.hash(mdp, await bcrypt.genSalt(10))) : user.mdp
            };

            // Créer le nouvel utilisateur
            const newUser = await UserModel.create(newUserData, { transaction });

            // Supprimer l'ancien utilisateur
            await user.destroy({ transaction });

            await transaction.commit();

            // Récupérer l'utilisateur créé (sans mot de passe)
            const createdUser = await UserModel.findByPk(newMatricule, {
                attributes: ['matricule', 'nom', 'contact', 'email', 'poste', 'numConv']
            });

            console.log('✅ Utilisateur mis à jour avec nouveau matricule:', newMatricule);
            return res.status(200).json({
                message: "Utilisateur mis à jour avec succès",
                status: 200,
                data: createdUser
            });
        } else {
            // Matricule inchangé, mise à jour normale
            const updateData = {};
            if (nom) updateData.nom = nom;
            if (contact) updateData.contact = contact;
            if (email) updateData.email = email;
            if (poste) updateData.poste = poste.toLowerCase();
            if (numConv !== undefined) updateData.numConv = numConv || null;
            
            // Hasher le mot de passe si fourni
            if (mdp) {
                const salt = await bcrypt.genSalt(10);
                updateData.mdp = await bcrypt.hash(mdp, salt);
            }

            // Mettre à jour l'utilisateur
            await user.update(updateData, { transaction });
            await transaction.commit();

            // Récupérer l'utilisateur mis à jour (sans mot de passe)
            const updatedUser = await UserModel.findByPk(matricule, {
                attributes: ['matricule', 'nom', 'contact', 'email', 'poste', 'numConv']
            });

            console.log('✅ Utilisateur mis à jour:', matricule);
            return res.status(200).json({
                message: "Utilisateur mis à jour avec succès",
                status: 200,
                data: updatedUser
            });
        }

    } catch (err) {
        await transaction.rollback();
        console.error('❌ Erreur mise à jour utilisateur:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// DELETE - Supprimer un utilisateur (admin seulement)
router.delete("/:matricule", ...ensureAdmin, async (req, res) => {
    try {
        const { matricule } = req.params;

        // Vérifier si l'utilisateur existe
        const user = await UserModel.findByPk(matricule);
        if (!user) {
            return res.status(404).json({
                message: "Utilisateur non trouvé",
                status: 404
            });
        }

        // Supprimer l'utilisateur
        await user.destroy();

        console.log('✅ Utilisateur supprimé:', matricule);
        return res.status(200).json({
            message: "Utilisateur supprimé avec succès",
            status: 200
        });

    } catch (err) {
        console.error('❌ Erreur suppression utilisateur:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ============================================
// GESTION DES DEMANDES DE CRÉATION DE COMPTE
// ============================================

// Fonction helper pour lire les demandes
const lireDemandes = () => {
    const demandesPath = path.join(__dirname, '../data/demandes-creation-compte.json');
    const dataDir = path.join(__dirname, '../data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(demandesPath)) {
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(demandesPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (err) {
        console.error('Erreur lecture demandes:', err);
        return [];
    }
};

// Fonction helper pour sauvegarder les demandes
const sauvegarderDemandes = (demandes) => {
    const demandesPath = path.join(__dirname, '../data/demandes-creation-compte.json');
    try {
        fs.writeFileSync(demandesPath, JSON.stringify(demandes, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Erreur sauvegarde demandes:', err);
        return false;
    }
};

// GET - Obtenir toutes les demandes de création de compte (admin seulement)
router.get("/demandes-creation", ...ensureAdmin, async (req, res) => {
    try {
        const demandes = lireDemandes();
        
        // Ne pas renvoyer les mots de passe en clair
        const demandesSecurisees = demandes.map(d => ({
            id: d.id,
            matricule: d.matricule,
            poste: d.poste,
            statut: d.statut,
            dateCreation: d.dateCreation,
            dateApprobation: d.dateApprobation,
            dateRejet: d.dateRejet,
            approuvePar: d.approuvePar,
            rejetePar: d.rejetePar
        }));
        
        return res.status(200).json({
            message: "Demandes récupérées avec succès",
            status: 200,
            data: demandesSecurisees
        });
    } catch (err) {
        console.error('❌ Erreur récupération demandes:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// PUT - Approuver ou rejeter une demande de création de compte (admin seulement)
router.put("/demandes-creation/:id", ...ensureAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, nom, contact, email } = req.body; // nom, contact, email requis pour l'approbation
        
        if (!action || (action !== 'approuver' && action !== 'rejeter')) {
            return res.status(400).json({
                message: "Action invalide. Utilisez 'approuver' ou 'rejeter'",
                status: 400
            });
        }
        
        const demandes = lireDemandes();
        const demandeIndex = demandes.findIndex(d => d.id === id);
        
        if (demandeIndex === -1) {
            return res.status(404).json({
                message: "Demande non trouvée",
                status: 404
            });
        }
        
        const demande = demandes[demandeIndex];
        
        if (demande.statut !== 'en_attente') {
            return res.status(400).json({
                message: "Cette demande a déjà été traitée",
                status: 400
            });
        }
        
        // Récupérer les infos de l'admin depuis le token
        const authHeader = req.headers["authorization"];
        let adminMatricule = 'ADMIN';
        let adminNom = 'Administrateur';
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                try {
                    const decoded = webToken.verify(token, SECRET_KEY);
                    adminMatricule = decoded.matricule || 'ADMIN';
                    adminNom = decoded.nom || 'Administrateur';
                } catch (err) {
                    console.error('Erreur décodage token:', err);
                }
            }
        }
        
        if (action === 'approuver') {
            // Validation des champs requis pour l'approbation
            if (!nom || !contact || !email) {
                return res.status(400).json({
                    message: "Pour approuver une demande, vous devez fournir: nom, contact, email",
                    status: 400
                });
            }
            
            // Vérifier si le matricule ou l'email existe déjà
            const existingUser = await UserModel.findOne({
                where: {
                    [Op.or]: [
                        { email: email },
                        { matricule: demande.matricule }
                    ]
                }
            });
            
            if (existingUser) {
                return res.status(409).json({
                    message: "Un utilisateur avec ce matricule ou cet email existe déjà",
                    status: 409
                });
            }

            // Hasher le mot de passe
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(demande.mdp, salt);
            
            // Créer l'utilisateur
            const user = await UserModel.create({
                matricule: demande.matricule,
                nom: nom,
                contact: contact,
                email: email,
                mdp: hash,
                poste: demande.poste,
                numConv: null
            });
            
            // Mettre à jour la demande
            demande.statut = 'approuvee';
            demande.dateApprobation = new Date().toISOString();
            demande.approuvePar = adminMatricule;
            demande.nom = nom;
            demande.contact = contact;
            demande.email = email;
            
            demandes[demandeIndex] = demande;
            sauvegarderDemandes(demandes);
            
            console.log('✅ Demande approuvée et utilisateur créé:', demande.matricule);
            
            return res.status(200).json({
                message: "Demande approuvée et compte créé avec succès",
                status: 200,
                data: {
                    demande: {
                        id: demande.id,
                        matricule: demande.matricule,
                        poste: demande.poste,
                        statut: demande.statut,
                        dateApprobation: demande.dateApprobation
                    },
                    user: {
                        matricule: user.matricule,
                        nom: user.nom,
                        email: user.email,
                        poste: user.poste
                    }
                }
            });
        } else if (action === 'rejeter') {
            // Mettre à jour la demande
            demande.statut = 'rejetee';
            demande.dateRejet = new Date().toISOString();
            demande.rejetePar = adminMatricule;
            
            demandes[demandeIndex] = demande;
            sauvegarderDemandes(demandes);
            
            console.log('❌ Demande rejetée:', demande.matricule);
            
            return res.status(200).json({
                message: "Demande rejetée",
                status: 200,
                data: {
                    id: demande.id,
                    matricule: demande.matricule,
                    poste: demande.poste,
                    statut: demande.statut,
                    dateRejet: demande.dateRejet
                }
            });
        }
        
    } catch (err) {
        console.error('❌ Erreur traitement demande:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ============================================
// RÉINITIALISATION DE MOT DE PASSE
// ============================================

// Clé de récupération d'urgence pour l'admin (à définir dans .env)
const ADMIN_RECOVERY_KEY = process.env.ADMIN_RECOVERY_KEY || 'CHANGEZ_MOI_EN_PRODUCTION_2024';

// POST - Demander une réinitialisation de mot de passe
router.post("/reset-password/request", async (req, res) => {
    try {
        const { matricule, poste, email } = req.body;
        
        if (!matricule || !poste) {
            return res.status(400).json({
                message: "Veuillez fournir le matricule et le poste",
                status: 400
            });
        }

        // Vérifier si l'utilisateur existe
        const user = await UserModel.findOne({
            where: {
                matricule: matricule,
                poste: poste.toLowerCase()
            },
            attributes: ['matricule', 'nom', 'email', 'contact', 'poste']
        });

        if (!user) {
            // Ne pas révéler si l'utilisateur existe ou non pour la sécurité
            return res.status(200).json({
                message: "Si ce compte existe, un code de réinitialisation sera généré",
                status: 200,
                // En production, vous pourriez envoyer un email ici
            });
        }

        // Générer un code de réinitialisation (6 chiffres)
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Stocker le code dans un fichier JSON (en production, utilisez une base de données ou Redis)
        const resetCodesPath = path.join(__dirname, '../data/reset-codes.json');
        const dataDir = path.join(__dirname, '../data');
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        let resetCodes = [];
        if (fs.existsSync(resetCodesPath)) {
            try {
                const fileContent = fs.readFileSync(resetCodesPath, 'utf8');
                resetCodes = JSON.parse(fileContent);
            } catch (err) {
                resetCodes = [];
            }
        }

        // Supprimer les anciens codes pour cet utilisateur
        resetCodes = resetCodes.filter(rc => 
            !(rc.matricule === matricule && rc.poste === poste.toLowerCase())
        );

        // Ajouter le nouveau code
        resetCodes.push({
            matricule: matricule,
            poste: poste.toLowerCase(),
            code: resetCode,
            expiresAt: expiresAt.toISOString(),
            used: false,
            createdAt: new Date().toISOString()
        });

        fs.writeFileSync(resetCodesPath, JSON.stringify(resetCodes, null, 2), 'utf8');

        console.log(`🔑 Code de réinitialisation généré pour ${matricule}: ${resetCode}`);
        console.log(`⚠️ EN DÉVELOPPEMENT - Le code est affiché dans les logs. En production, envoyez-le par email/SMS`);

        // En développement, renvoyer le code (à ne pas faire en production)
        if (process.env.NODE_ENV === 'development') {
            return res.status(200).json({
                message: "Code de réinitialisation généré",
                status: 200,
                code: resetCode, // SEULEMENT EN DÉVELOPPEMENT
                expiresIn: 15 // minutes
            });
        }

        // En production, ne pas renvoyer le code
        return res.status(200).json({
            message: "Si ce compte existe, un code de réinitialisation a été envoyé à votre email",
            status: 200
        });

    } catch (err) {
        console.error('❌ Erreur demande réinitialisation:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// POST - Réinitialiser le mot de passe avec un code
router.post("/reset-password/verify", async (req, res) => {
    try {
        const { matricule, poste, code, newPassword, recoveryKey } = req.body;

        if (!matricule || !poste || !newPassword) {
            return res.status(400).json({
                message: "Veuillez fournir le matricule, le poste et le nouveau mot de passe",
                status: 400
            });
        }

        // Vérifier si l'utilisateur existe
        const user = await UserModel.findOne({
            where: {
                matricule: matricule,
                poste: poste.toLowerCase()
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "Utilisateur non trouvé",
                status: 404
            });
        }

        // Vérifier si c'est une réinitialisation d'urgence pour admin
        if (recoveryKey && poste.toLowerCase() === 'administrateur') {
            if (recoveryKey === ADMIN_RECOVERY_KEY) {
                // Clé de récupération valide - permettre la réinitialisation
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(newPassword, salt);
                
                await user.update({ mdp: hash });
                
                console.log(`🔑 Mot de passe réinitialisé pour admin ${matricule} avec clé de récupération`);
                
                return res.status(200).json({
                    message: "Mot de passe réinitialisé avec succès",
                    status: 200
                });
            } else {
                return res.status(401).json({
                    message: "Clé de récupération invalide",
                    status: 401
                });
            }
        }

        // Réinitialisation normale avec code
        if (!code) {
            return res.status(400).json({
                message: "Code de réinitialisation requis (ou utilisez la clé de récupération pour admin)",
                status: 400
            });
        }

        const resetCodesPath = path.join(__dirname, '../data/reset-codes.json');
        
        if (!fs.existsSync(resetCodesPath)) {
            return res.status(400).json({
                message: "Aucun code de réinitialisation trouvé",
                status: 400
            });
        }

        let resetCodes = [];
        try {
            const fileContent = fs.readFileSync(resetCodesPath, 'utf8');
            resetCodes = JSON.parse(fileContent);
        } catch (err) {
            return res.status(400).json({
                message: "Erreur lors de la lecture des codes",
                status: 400
            });
        }

        // Trouver le code valide
        const validCode = resetCodes.find(rc => 
            rc.matricule === matricule &&
            rc.poste === poste.toLowerCase() &&
            rc.code === code &&
            !rc.used &&
            new Date(rc.expiresAt) > new Date()
        );

        if (!validCode) {
            return res.status(401).json({
                message: "Code invalide ou expiré",
                status: 401
            });
        }

        // Marquer le code comme utilisé
        validCode.used = true;
        fs.writeFileSync(resetCodesPath, JSON.stringify(resetCodes, null, 2), 'utf8');

        // Hasher et mettre à jour le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        
        await user.update({ mdp: hash });
        
        console.log(`✅ Mot de passe réinitialisé pour ${matricule}`);

        return res.status(200).json({
            message: "Mot de passe réinitialisé avec succès",
            status: 200
        });

    } catch (err) {
        console.error('❌ Erreur réinitialisation:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// POST - Vérifier si un utilisateur peut créer un compte (réservé à l'administrateur)
router.post("/check-user-limit", ...ensureAdmin, async (req, res) => {
    try {
        const { poste } = req.body;

        if (!poste) {
            return res.status(400).json({
                message: "Poste requis",
                status: 400
            });
        }

        // Compter le nombre d'utilisateurs pour ce poste
        const userCount = await UserModel.count({
            where: {
                poste: poste.toLowerCase()
            }
        });

        return res.status(200).json({
            message: "Création de compte autorisée",
            status: 200,
            canCreate: true,
            currentCount: userCount,
            maxAllowed: null,
            remaining: null
        });

    } catch (err) {
        console.error('❌ Erreur vérification limite:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ============================================
// GESTION DES DEMANDES DE RÉINITIALISATION DE MOT DE PASSE
// ============================================

// Fonction helper pour lire les demandes de réinitialisation
const lireDemandesReset = () => {
    const demandesPath = path.join(__dirname, '../data/demandes-reset-password.json');
    const dataDir = path.join(__dirname, '../data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(demandesPath)) {
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(demandesPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (err) {
        console.error('Erreur lecture demandes reset:', err);
        return [];
    }
};

// Fonction helper pour sauvegarder les demandes de réinitialisation
const sauvegarderDemandesReset = (demandes) => {
    const demandesPath = path.join(__dirname, '../data/demandes-reset-password.json');
    try {
        fs.writeFileSync(demandesPath, JSON.stringify(demandes, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Erreur sauvegarde demandes reset:', err);
        return false;
    }
};

// POST - Créer une demande de réinitialisation de mot de passe (pour non-admin)
router.post("/reset-password/request-demand", async (req, res) => {
    try {
        const { matricule, poste } = req.body;
        
        if (!matricule || !poste) {
            return res.status(400).json({
                message: "Veuillez fournir le matricule et le poste",
                status: 400
            });
        }

        // Vérifier que ce n'est pas un admin (les admins ne doivent pas utiliser cet endpoint)
        if (poste.toLowerCase() === 'administrateur') {
            return res.status(400).json({
                message: "Les administrateurs doivent utiliser la réinitialisation directe",
                status: 400
            });
        }

        // Vérifier si l'utilisateur existe
        const user = await UserModel.findOne({
            where: {
                matricule: matricule,
                poste: poste.toLowerCase()
            },
            attributes: ['matricule', 'nom', 'email', 'contact', 'poste']
        });

        if (!user) {
            // Ne pas révéler si l'utilisateur existe ou non pour la sécurité
            return res.status(200).json({
                message: "Si ce compte existe, une demande de réinitialisation sera créée",
                status: 200
            });
        }

        // Lire les demandes existantes
        const demandes = lireDemandesReset();
        
        // Vérifier si une demande existe déjà pour ce matricule et poste
        const demandeExistante = demandes.find(d => 
            d.matricule === matricule && 
            d.poste.toLowerCase() === poste.toLowerCase() && 
            d.statut === 'en_attente'
        );
        
        if (demandeExistante) {
            return res.status(200).json({
                message: "Une demande de réinitialisation est déjà en attente pour ce compte",
                status: 200,
                demandeExistante: true
            });
        }
        
        // Créer une nouvelle demande
        const nouvelleDemande = {
            id: Date.now().toString(),
            matricule: matricule,
            poste: poste.toLowerCase(),
            nom: user.nom,
            email: user.email,
            contact: user.contact,
            statut: 'en_attente',
            dateCreation: new Date().toISOString(),
            dateApprobation: null,
            dateRejet: null,
            approuvePar: null,
            rejetePar: null
        };
        
        demandes.push(nouvelleDemande);
        sauvegarderDemandesReset(demandes);
        
        console.log('✅ Demande de réinitialisation créée:', nouvelleDemande.id);
        
        return res.status(200).json({
            message: "Demande de réinitialisation créée avec succès. L'administrateur sera notifié.",
            status: 200,
            data: {
                id: nouvelleDemande.id,
                matricule: nouvelleDemande.matricule,
                poste: nouvelleDemande.poste
            }
        });
        
    } catch (err) {
        console.error('❌ Erreur création demande reset:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// GET - Obtenir toutes les demandes de réinitialisation (admin seulement)
router.get("/reset-password/demandes", ...ensureAdmin, async (req, res) => {
    try {
        const demandes = lireDemandesReset();
        
        return res.status(200).json({
            message: "Demandes de réinitialisation récupérées avec succès",
            status: 200,
            data: demandes
        });
    } catch (err) {
        console.error('❌ Erreur récupération demandes reset:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// PUT - Approuver ou rejeter une demande de réinitialisation (admin seulement)
router.put("/reset-password/demandes/:id", ...ensureAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, newPassword } = req.body;
        
        if (!action || (action !== 'approuver' && action !== 'rejeter')) {
            return res.status(400).json({
                message: "Action invalide. Utilisez 'approuver' ou 'rejeter'",
                status: 400
            });
        }
        
        const demandes = lireDemandesReset();
        const demandeIndex = demandes.findIndex(d => d.id === id);
        
        if (demandeIndex === -1) {
            return res.status(404).json({
                message: "Demande non trouvée",
                status: 404
            });
        }
        
        const demande = demandes[demandeIndex];
        
        if (demande.statut !== 'en_attente') {
            return res.status(400).json({
                message: "Cette demande a déjà été traitée",
                status: 400
            });
        }
        
        // Récupérer les infos de l'admin depuis le token
        const authHeader = req.headers["authorization"];
        let adminMatricule = 'ADMIN';
        let adminNom = 'Administrateur';
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
                try {
                    const decoded = webToken.verify(token, SECRET_KEY);
                    adminMatricule = decoded.matricule || 'ADMIN';
                    adminNom = decoded.nom || 'Administrateur';
                } catch (err) {
                    console.error('Erreur décodage token:', err);
                }
            }
        }
        
        if (action === 'approuver') {
            // Validation du nouveau mot de passe
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({
                    message: "Le nouveau mot de passe doit contenir au moins 6 caractères",
                    status: 400
                });
            }
            
            // Vérifier si l'utilisateur existe toujours
            const user = await UserModel.findOne({
                where: {
                    matricule: demande.matricule,
                    poste: demande.poste
                }
            });
            
            if (!user) {
                return res.status(404).json({
                    message: "Utilisateur non trouvé",
                    status: 404
                });
            }
            
            // Hasher le nouveau mot de passe
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(newPassword, salt);
            
            // Mettre à jour le mot de passe
            await user.update({ mdp: hash });
            
            // Mettre à jour la demande
            demande.statut = 'approuvee';
            demande.dateApprobation = new Date().toISOString();
            demande.approuvePar = adminMatricule;
            
            demandes[demandeIndex] = demande;
            sauvegarderDemandesReset(demandes);
            
            console.log('✅ Demande de réinitialisation approuvée:', demande.id);
            
            return res.status(200).json({
                message: "Demande approuvée et mot de passe réinitialisé avec succès",
                status: 200,
                data: {
                    id: demande.id,
                    matricule: demande.matricule,
                    poste: demande.poste,
                    statut: demande.statut,
                    dateApprobation: demande.dateApprobation
                }
            });
        } else if (action === 'rejeter') {
            // Mettre à jour la demande
            demande.statut = 'rejetee';
            demande.dateRejet = new Date().toISOString();
            demande.rejetePar = adminMatricule;
            
            demandes[demandeIndex] = demande;
            sauvegarderDemandesReset(demandes);
            
            console.log('❌ Demande de réinitialisation rejetée:', demande.id);
            
            return res.status(200).json({
                message: "Demande rejetée",
                status: 200,
                data: {
                    id: demande.id,
                    matricule: demande.matricule,
                    poste: demande.poste,
                    statut: demande.statut,
                    dateRejet: demande.dateRejet
                }
            });
        }
        
    } catch (err) {
        console.error('❌ Erreur traitement demande reset:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router
