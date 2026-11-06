// js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyBJbKiwRRfx9aP2Tj_ktdGaRVCCzx_e8z4",
  authDomain: "dudagogia.firebaseapp.com",
  projectId: "dudagogia",
  storageBucket: "dudagogia.firebasestorage.app",
  messagingSenderId: "1798384267",
  appId: "1:1798384267:web:62a0b970d87be2f787828e"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Expõe os serviços globalmente para os outros scripts
const auth = firebase.auth();
const db = firebase.firestore();