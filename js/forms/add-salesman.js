import { createAirtableRecord } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

// Check if user is authorized
const userData = localStorage.getItem('user');
if (!userData || JSON.parse(userData).role.toLowerCase() !== 'salesperson') {
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

// Add the missing setupInputListener function
function setupInputListener(fieldId, listId, input) {
    const datalist = document.getElementById(listId);
    if (!datalist) return;

    input.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        const options = datalist.querySelectorAll('option');
        
        options.forEach(option => {
            const optionValue = option.value.toLowerCase();
            if (optionValue.includes(value)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    });
}

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
            
            // Preserve user authentication data
            const userData = JSON.parse(localStorage.getItem('user'));
            
            // Clear ALL cache to force fresh data fetch
            localStorage.clear();
            sessionStorage.clear();
            
            // Restore user authentication data
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Add timestamp for cache busting
            const timestamp = new Date().getTime();
            
            // Redirect with cache busting parameters
            window.location.href = `salesman.html?forceRefresh=true&t=${timestamp}`;
        } catch (error) {
            alert('Error adding lead: ' + error.message);
        }
    });
} 