import { authenticateUser } from '../js/shared/auth.js';

// Only redirect if already logged in and role exists
const userData = localStorage.getItem('user');
if (userData) {
    const user = JSON.parse(userData);
    if (user.role === 'admin') {
        window.location.href = '../index.html';
    } else if (user.role === 'salesman') {
        window.location.href = './salesman.html';
    } else if (user.role === 'region_manager') {
        window.location.href = './region-manager.html';
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        console.log('Attempting login for:', username);
        const authResult = await authenticateUser(username, password);
        console.log('Auth result:', authResult);
        
        if (authResult.success && authResult.role) {
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify({
                username: authResult.username,
                role: authResult.role.toLowerCase(),
                region: authResult.region
            }));

            // Redirect based on role with correct paths
            if (authResult.role.toLowerCase() === 'admin') {
                window.location.href = '../index.html';
            } else if (authResult.role.toLowerCase() === 'salesman') {
                window.location.href = './salesman.html';
            } else if (authResult.role.toLowerCase() === 'region_manager') {
                window.location.href = './region-manager.html';
            } else {
                throw new Error('Invalid role assigned');
            }
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

window.logout = () => {
    import('./shared/auth.js').then(({ logout }) => logout());
};