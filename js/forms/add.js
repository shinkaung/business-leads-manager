import { createAirtableRecord } from '../shared/airtable.js';
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

        try {
            await createAirtableRecord(record);
            alert('Record added successfully!');
            
            // Get user role and redirect accordingly
            const userRole = getUserRole();
            if (userRole === 'admin') {
                window.location.href = '../index.html';
            } else if (userRole === 'salesman') {
                window.location.href = './salesman.html';
            }
        } catch (error) {
            alert('Error adding record: ' + error.message);
        }
    });
} 