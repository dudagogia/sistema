// js/auth.js
function protegerPagina() {
  auth.onAuthStateChanged((user) => {
    if (!user) window.location.href = 'login.html';
  });
}

function fazerLogin(email, senha) {
  return auth.signInWithEmailAndPassword(email, senha);
}

function fazerLogout() {
  return auth.signOut().then(() => {
    window.location.href = 'login.html';
  });
}