require('dotenv').config();
const express = require("express");
const cors = require("cors");
const dbConn = require("./connection/db");

const PORT = process.env.PORT || 3000;
const app = express();

// CORS simple
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Route de test
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend fonctionne!" });
});

// Test connexion DB
dbConn.authenticate()
  .then(() => {
    console.log("✅ Connexion DB réussie");
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur de test démarré sur http://localhost:${PORT}`);
      console.log(`✅ Testez: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error("❌ Erreur DB:", err.message);
    console.error("⚠️ Le serveur démarre quand même sans DB pour tester");
    
    // Démarrer quand même pour tester
    app.listen(PORT, () => {
      console.log(`🚀 Serveur de test démarré sur http://localhost:${PORT} (SANS DB)`);
      console.log(`✅ Testez: http://localhost:${PORT}/health`);
    });
  });

