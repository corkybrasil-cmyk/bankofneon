// js/firebase-init.js
// Inicialização do Firebase para o Bank of Neon

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHU6yFDCKp9jm9tPGyRqQJFS3amewuuQY",
  authDomain: "crmdaneon.firebaseapp.com",
  projectId: "crmdaneon",
  storageBucket: "crmdaneon.firebasestorage.app",
  messagingSenderId: "564595832938",
  appId: "1:564595832938:web:16fb660d8d433ae5f3f213",
  measurementId: "G-D3G4M9F17R"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Teste: Verifique se o Firebase foi inicializado
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
console.log('Firebase inicializado:', app);
