// js/auth.js

// Fica "ouvindo" o estado de login. Se não estiver logado, manda para login.html
function protegerPagina() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });
}

// Login
function fazerLogin(email, senha) {
  return auth.signInWithEmailAndPassword(email, senha);
}

// Logout
function fazerLogout() {
  return auth.signOut().then(() => {
    window.location.href = 'login.html';
  });
}