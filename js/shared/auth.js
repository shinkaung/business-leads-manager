const AIRTABLE_API_KEY = 'pataBu2eaV0V5tEHx.2fde3b7ffdc42d856e167a7551f74f8770a41af956087fa09a2df831fd632c3c';
const AIRTABLE_BASE_ID = 'app5GPyIEcYQTRgST';
const USERS_TABLE_NAME = 'User';

export async function authenticateUser(username, password) {
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${USERS_TABLE_NAME}?filterByFormula=AND({username}='${username}',{password}='${password}')`;
        
        console.log('Auth URL:', url);
        console.log('Attempting authentication...');
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Auth response:', data);
        
        if (data.records && data.records.length > 0) {
            const user = data.records[0];
            console.log('Found user:', user);
            const userRole = user.fields.Role || user.fields.role;
            
            if (!userRole) {
                console.error('Role not found in user data:', user.fields);
                return { success: false };
            }

            // Normalize role names
            let normalizedRole = userRole.toLowerCase();
            if (normalizedRole === 'regionmanager') {
                normalizedRole = 'region_manager';
            } else if (normalizedRole === 'salesperson') {
                normalizedRole = 'salesman';
            }

            return {
                success: true,
                role: normalizedRole,
                username: user.fields.username,
                region: user.fields.Region || user.fields.region // Also capture region information
            };
        }
        
        return { success: false };
    } catch (error) {
        console.error('Auth error:', error);
        return { success: false };
    }
}

function getUserRole() {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    try {
        return JSON.parse(userData).role;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

function checkAuth() {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = './pages/login.html';
        return false;
    }
    return true;
}

export function isAuthenticated() {
    return localStorage.getItem('user') !== null;
}

export function logout() {
    localStorage.clear();
    window.location.href = './pages/login.html';
}

export { getUserRole, checkAuth };