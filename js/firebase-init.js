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

function logInitEnvironmentDiagnostics() {
  try {
    const isFileProtocol = window.location?.protocol === 'file:';
    const origin = window.location?.origin;
    if (isFileProtocol) {
      console.warn('[Firebase Init] Rodando via file://. Prefira servir via http/https (ex.: GitHub Pages ou um servidor local) para evitar limitações do navegador.');
    }
    console.log('[Firebase Init] Origin:', origin);
  } catch (_) {
    // ignora erros de ambiente
  }
}

let app;
let analytics;

try {
  logInitEnvironmentDiagnostics();
  app = initializeApp(firebaseConfig);
  console.log('[Firebase Init] App inicializado com sucesso');
  try {
    analytics = getAnalytics(app);
    console.log('[Firebase Init] Analytics inicializado');
  } catch (analyticsError) {
    console.warn('[Firebase Init] Falha ao inicializar Analytics (ok continuar sem):', analyticsError?.message || analyticsError);
  }
} catch (initError) {
  console.error('[Firebase Init] Erro ao inicializar Firebase App:', initError?.message || initError);
}

// Expor no window para facilitar debug no console
window.firebaseApp = app;
window.firebaseAnalytics = analytics;
