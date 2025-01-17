import { authenticateUser } from '../js/shared/auth.js';

// Only redirect if already logged in and role exists
const userData = localStorage.getItem('user');
if (userData) {
    const user = JSON.parse(userData);
    if (user.role === 'admin') {
        window.location.href = '../index.html';
    } else if (user.role === 'salesman') {
        window.location.href = './salesman.html';
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
                role: authResult.role.toLowerCase()
            }));

            // Handle redirects based on role
            const role = authResult.role.toLowerCase();
            if (role === 'admin') {
                window.location.replace('/index.html');
            } else if (role === 'salesperson') {
                window.location.replace('/pages/salesman.html');
            } else {
                alert('Invalid user role: ' + authResult.role);
                localStorage.clear();
            }
        } else {
            alert('Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

window.logout = () => {
    import('./shared/auth.js').then(({ logout }) => logout());
};