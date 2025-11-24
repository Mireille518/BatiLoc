require('dotenv').config();
const express = require("express");
const bodyParse = require("body-parser");
const dbConn = require("./connection/db");
const path = require("path");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const { authenticateToken } = require("./middleware/auth");

// Configuration
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Connexion base de données
dbConn.authenticate()
  .then(() => {
    console.log("✅ Connexion à la base de données réussie");
  })
  .catch((err) => {
    console.error("❌ Erreur de connexion à la base de données:", err);
    process.exit(1);
  });

const app = express();

// CORS sécurisé
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

// Middleware
app.use(express.static(path.join(__dirname, "../front/src/App")));
app.use(bodyParse.json({ limit: '10mb' }));
app.use(bodyParse.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes (pour debug)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body).substring(0, 100) : '');
    next();
  });
}

// Routes publiques (sans authentification)
app.use("/api/user", require("./api/user"));

// Routes protégées (avec authentification)
app.use("/api/batiments", authenticateToken, require("./api/batiment"));
app.use("/api/conventions", authenticateToken, require("./api/mconvention"));
app.use("/api/factures", authenticateToken, require("./api/facture"));

// Route de santé
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Route principale
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../front/src/App")));

// Gestion des erreurs (doit être le dernier middleware)
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});