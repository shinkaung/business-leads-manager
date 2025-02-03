import { createAirtableRecord, VALID_STATUSES } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';
import { getUserRole } from '../shared/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeAutocomplete();
    setupFormSubmission();
});

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
            record['Status'] = VALID_STATUSES[0];
        }

        try {
            await createAirtableRecord(record);
            alert('Record added successfully!');
            
            // Preserve user authentication data
            const userData = JSON.parse(localStorage.getItem('user'));
            
            // Clear ALL cache to force fresh data fetch
            localStorage.clear();
            sessionStorage.clear();
            
            // Restore user authentication data
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Add timestamp for cache busting
            const timestamp = new Date().getTime();
            
            // Redirect based on user role with cache busting parameters
            const userRole = getUserRole();
            if (userRole === 'admin') {
                window.location.href = `../index.html?forceRefresh=true&t=${timestamp}`;
            } else if (userRole === 'salesman') {
                window.location.href = `./salesman.html?forceRefresh=true&t=${timestamp}`;
            }
        } catch (error) {
            alert('Error adding record: ' + error.message);
        }
    });
} 