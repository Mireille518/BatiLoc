require('dotenv').config();
const express = require("express");
const bodyParse = require("body-parser");
const dbConn = require("./connection/db");
const path = require("path");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const { authenticateToken } = require("./middleware/auth");

// Configuration
// Utiliser un port élevé pour éviter les problèmes de permissions Windows
let PORT = parseInt(process.env.PORT) || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connexion base de données - Ne pas bloquer le démarrage si DB échoue
dbConn.authenticate()
  .then(async () => {
    console.log("✅ Connexion à la base de données réussie");
    
    // Vérifier et mettre à jour automatiquement les statuts des conventions
    // en fonction du dernier paiement mensuel (synchronisation automatique)
    try {
      const factureRouter = require("./api/facture");
      if (factureRouter.checkAndUpdateConventionStatuses) {
        // Exécuter la vérification après un court délai pour s'assurer que la DB est prête
        setTimeout(async () => {
          try {
            console.log("🔄 Synchronisation automatique des statuts au démarrage...");
            await factureRouter.checkAndUpdateConventionStatuses();
            console.log("✅ Synchronisation automatique terminée");
          } catch (err) {
            console.error("⚠️ Erreur lors de la synchronisation automatique des statuts au démarrage:", err.message);
            // Ne pas bloquer le démarrage du serveur en cas d'erreur
          }
        }, 2000); // Attendre 2 secondes après la connexion DB
        
        // Programmer une synchronisation périodique toutes les heures
        setInterval(async () => {
          try {
            console.log("🔄 Synchronisation périodique des statuts...");
            await factureRouter.checkAndUpdateConventionStatuses();
            console.log("✅ Synchronisation périodique terminée");
          } catch (err) {
            console.error("⚠️ Erreur lors de la synchronisation périodique:", err.message);
          }
        }, 60 * 60 * 1000); // Toutes les heures (3600000 ms)
      }
    } catch (err) {
      console.error("⚠️ Impossible de charger la fonction de synchronisation automatique:", err.message);
      // Ne pas bloquer le démarrage du serveur
    }
  })
  .catch((err) => {
    console.error("⚠️ ATTENTION: Erreur de connexion à la base de données:", err.message);
    console.error("⚠️ Le serveur démarre quand même - vérifiez MySQL/WAMP");
    // Ne pas arrêter le serveur - permettre de tester l'API même sans DB
  });

const app = express();

// CORS - Configuration simple pour développement
app.use(cors({
  origin: true, // Accepter toutes les origines en développement
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
  const madagascarDate = require("./utils/madagascarDate");
  res.json({ 
    status: "OK", 
    timestamp: madagascarDate.getMadagascarDate().toISOString(),
    timezone: "Africa/Nairobi (UTC+3)"
  });
});

// Route principale
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../front/src/App")));

// Gestion des erreurs (doit être le dernier middleware)
app.use(errorHandler);

// Démarrage du serveur avec gestion automatique du port
function startServer(port) {
  // Forcer l'écoute sur 127.0.0.1 pour éviter les problèmes de permissions Windows
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`🚀 Serveur démarré sur http://127.0.0.1:${port}`);
    console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Le serveur est prêt à recevoir des requêtes`);
    console.log(`📝 Testez: http://localhost:${port}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
      // Essayer plusieurs ports jusqu'à trouver un disponible
      const ports = [8000, 8001, 9000, 9001, 5000, 5001, 3000, 3001];
      const currentIndex = ports.indexOf(port);
      
      if (currentIndex < ports.length - 1) {
        const nextPort = ports[currentIndex + 1];
        console.log(`⚠️ Le port ${port} est occupé ou bloqué, tentative sur le port ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error(`❌ Impossible de démarrer le serveur. Tous les ports ont été essayés.`);
        console.error(`   Dernière erreur: ${err.message}`);
        console.error(`   Essayez de changer le PORT dans le fichier .env`);
        process.exit(1);
      }
    } else {
      console.error('❌ Erreur serveur:', err);
      process.exit(1);
    }
  });

  return server;
}

startServer(PORT);