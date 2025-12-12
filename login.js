// login.js - handles form submit and redirects back to index.html
window.addEventListener('DOMContentLoaded', () => {
const form = document.getElementById('loginForm');


form.addEventListener('submit', function(e) {
e.preventDefault();


// TODO: Replace with real authentication. For now: simulate success.
localStorage.setItem('loggedIn', 'true');


// Add fade out then redirect back to index
document.body.classList.add('fade-out');
setTimeout(() => {
window.location.href = 'index.html';
}, 450);
});
});