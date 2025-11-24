const express = require("express")
const router = express.Router()
const sequelize = require("../connection/db");
const { Op } = require("sequelize");
const UserModel = require("../models/utilisateur")(sequelize, require("sequelize").DataTypes);
const bcrypt = require("bcryptjs")
const webToken = require("jsonwebtoken")
require("dotenv").config()

// Liste des postes autorisés
const POSTES_AUTORISES = ['caissier', 'administrateur', 'opérateur de saisie'];

// Vérifier que la clé secrète existe
const SECRET_KEY = process.env.secret_key || process.env.SECRET_KEY || 'your_secret_key_change_me';

if (!process.env.secret_key && !process.env.SECRET_KEY) {
    console.warn('⚠️ ATTENTION: Aucune clé secrète trouvée dans les variables d\'environnement');
    console.warn('Veuillez définir SECRET_KEY ou secret_key dans votre fichier .env');
}

// READ - Obtenir tous les utilisateurs (sans mot de passe)
router.get("/", async (req, res) => {
  try {
    const users = await UserModel.findAll({
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

//S'INSCRIRE
router.post("/register", async (req, res) => {
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
            console.log('❌ Utilisateur non trouvé');
            return res.status(401).json({
                message: "Matricule ou poste incorrect, veuillez vérifier vos informations",
                status: 401,
                token: ""
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
router.put("/:matricule", async (req, res) => {
    try {
        const { matricule } = req.params;
        const { nom, contact, email, poste, mdp, numConv } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await UserModel.findByPk(matricule);
        if (!user) {
            return res.status(404).json({
                message: "Utilisateur non trouvé",
                status: 404
            });
        }

        // Validation du poste si fourni
        if (poste && !POSTES_AUTORISES.includes(poste.toLowerCase())) {
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
                }
            });
            if (existingUser) {
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
                }
            });
            if (existingUser) {
                return res.status(409).json({
                    message: "Ce contact est déjà utilisé par un autre utilisateur",
                    status: 409
                });
            }
        }

        // Préparer les données de mise à jour
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
        await user.update(updateData);

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

    } catch (err) {
        console.error('❌ Erreur mise à jour utilisateur:', err);
        return res.status(500).json({
            message: "Erreur serveur",
            status: 500,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// DELETE - Supprimer un utilisateur (admin seulement)
router.delete("/:matricule", async (req, res) => {
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

module.exports = router
