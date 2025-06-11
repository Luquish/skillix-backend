// src/config/firebaseAdmin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDataConnect } from 'firebase-admin/data-connect';
import { getConfig } from './index';

const config = getConfig();

// --- INICIALIZACIÓN DE FIREBASE ---
if (!getApps().length) {
  // Asegúrate de que la ruta al service account no esté vacía
  if (config.firebaseServiceAccountPath) {
    const serviceAccount = require(config.firebaseServiceAccountPath);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: config.firebaseProjectId,
    });
  } else if (config.nodeEnv !== 'test') {
    console.warn('ADVERTENCIA: La ruta al archivo de credenciales de Firebase no está configurada (FIREBASE_SERVICE_ACCOUNT_PATH). Algunas funciones pueden no estar disponibles.');
    // Inicializar sin credenciales (útil para emuladores si no se requiere acceso a servicios en la nube)
    initializeApp({
      projectId: config.firebaseProjectId,
    });
  }
}


// --- CONSTANTES DERIVADAS DE LA CONFIGURACIÓN ---
const IS_EMULATOR = !!config.dataConnectEmulatorHost || !!config.firebaseAuthEmulatorHost;

// --- SERVICIOS DE FIREBASE ---
const auth = getAuth();
const firestore = getFirestore();
const dataConnect = getDataConnect({
  serviceId: config.dataConnectServiceId,
  location: config.dataConnectLocation,
});

if (IS_EMULATOR) {
  // Conectar al emulador de Auth si está definido
  if (config.firebaseAuthEmulatorHost) {
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = config.firebaseAuthEmulatorHost;
    console.log(`Conectando al emulador de Firebase Auth en ${config.firebaseAuthEmulatorHost}`);
  }
  // Conectar al emulador de Data Connect si está definido
  if (config.dataConnectEmulatorHost) {
    process.env['DATA_CONNECT_EMULATOR_HOST'] = config.dataConnectEmulatorHost;
    console.log(`Conectando al emulador de Data Connect en ${config.dataConnectEmulatorHost}`);
  }
}

export { auth, firestore, dataConnect };
