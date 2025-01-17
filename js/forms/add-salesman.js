import { createAirtableRecord } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

// Check if user is authorized
const userData = localStorage.getItem('user');
if (!userData || JSON.parse(userData).role !== 'salesman') {
    window.location.href = '../pages/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize autocomplete for specific fields
    const autocompleteFields = {
        'Name of outlet': 'outletList',
        'Products on Tap': 'productsOnTapList',
        'Beer Bottle Products': 'beerBottleProductsList',
        'Soju Products': 'sojuProductsList'
    };

    // Initialize autocomplete
    await initializeAutocomplete();

    // Initialize autocomplete for each field
    Object.entries(autocompleteFields).forEach(([fieldId, listId]) => {
        const input = document.querySelector(`input[name="${fieldId}"]`);
        if (input) {
            setupInputListener(fieldId, listId, input);
        }
    });

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
            alert('Lead added successfully!');
            window.location.href = 'salesman.html';
        } catch (error) {
            alert('Error adding lead: ' + error.message);
        }
    });
} 