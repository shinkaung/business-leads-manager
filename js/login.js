import { authenticateUser } from '../js/shared/auth.js';

// Only redirect if already logged in and role exists
const userData = localStorage.getItem('user');
if (userData) {
    const user = JSON.parse(userData);
    const currentPath = window.location.pathname;
    
    // Only redirect if we're on the login page
    if (currentPath.includes('login.html')) {
        if (user.role === 'admin') {
            window.location.href = '../index.html';
        } else if (user.role.toLowerCase() === 'salesman') {
            window.location.href = './salesman.html';
        } else if (user.role.toLowerCase() === 'region_manager') {
            window.location.href = './region-manager.html';
        }
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const authResult = await authenticateUser(username, password);
        
        if (authResult.success) {
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify({
                username: authResult.username,
                role: authResult.role.toLowerCase(),
                region: authResult.region
            }));

            // Redirect based on role
            if (authResult.role === 'admin') {
                window.location.href = '../index.html';
            } else if (authResult.role === 'salesman') {
                window.location.href = './salesman.html';
            } else if (authResult.role === 'region_manager') {
                window.location.href = './region-manager.html';
            }
        } else {
            // Show specific error message if provided
            const errorMessage = authResult.error || 'Authentication failed';
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

window.logout = () => {
    import('./shared/auth.js').then(({ logout }) => logout());
};