import { createAirtableRecord } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

function setupFormSubmission() {
    const form = document.getElementById('addRecordForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const record = {};
        
        formData.forEach((value, key) => {
            if (value) record[key] = value;
        });

        // Set default status if not provided
        if (!record['Status']) {
            record['Status'] = 'new lead';
        }

        // Add the user's assigned region to the record
        const userRegion = getUserRegion();
        if (userRegion) {
            record['assigned_to'] = userRegion;
        }

        try {
            await createAirtableRecord(record);
            alert('Lead added successfully!');
            
            // Preserve user authentication data
            const userData = JSON.parse(localStorage.getItem('user'));
            
            // Clear cache but preserve auth
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Redirect with cache busting
            const timestamp = new Date().getTime();
            window.location.href = `./region-manager.html?forceRefresh=true&t=${timestamp}`;
        } catch (error) {
            alert('Error adding lead: ' + error.message);
        }
    });
}

function getUserRegion() {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        return user.region || null;
    }
    return null;
}

// Check authentication and role on load
document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.replace('../pages/login.html');
        return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'region_manager') {
        window.location.replace('../pages/login.html');
        return;
    }

    initializeAutocomplete();
    setupFormSubmission();
});