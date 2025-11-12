// Script de test de l'API
require('dotenv').config();
const express = require("express");
const bodyParse = require("body-parser");
const dbConn = require("./connection/db");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test connexion DB
dbConn.authenticate()
  .then(() => {
    console.log("✅ Connexion DB OK");
  })
  .catch((err) => {
    console.error("❌ Erreur DB:", err.message);
  });

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(bodyParse.json());
app.use(bodyParse.urlencoded({ extended: true }));

// Route de test simple
app.post("/api/user/login", (req, res) => {
  console.log("📥 Requête reçue:", req.body);
  res.json({ 
    status: 200, 
    message: "Route accessible",
    received: req.body 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de test démarré sur ${PORT}`);
  console.log(`📡 Testez avec: POST http://localhost:${PORT}/api/user/login`);
});


