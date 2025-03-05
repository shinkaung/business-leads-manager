import { createAirtableRecord } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

// Check if user is authorized
const userData = localStorage.getItem('user');
if (!userData) {
    window.location.href = '../pages/login.html';
}

const user = JSON.parse(userData);
if (user.role.toLowerCase() !== 'salesman') {
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

    // Set the assigned region field
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const assignedToField = document.getElementById('assigned_to');
    if (assignedToField && userData.region) {
        assignedToField.value = userData.region;
    }

    await initializeAutocomplete();

    Object.entries(autocompleteFields).forEach(([fieldId, listId]) => {
        const input = document.querySelector(`input[name="${fieldId}"]`);
        if (input) {
            setupInputListener(fieldId, listId, input);
        }
    });

    setupFormSubmission();
});

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

        // Get user's region and ensure it's set
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData?.region) {
            alert('Error: No region assigned to your account');
            return;
        }

        // Always set the assigned_to field to the user's region
        record.assigned_to = userData.region;
        
        // Set default status for new leads if not specified
        if (!record.Status) {
            record.Status = 'new lead';
        }

        try {
            await createAirtableRecord(record);
            alert('Lead added successfully!');
            
            // Preserve user authentication data
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('user', JSON.stringify(userData));
            
            const timestamp = new Date().getTime();
            window.location.href = `salesman.html?forceRefresh=true&t=${timestamp}`;
        } catch (error) {
            alert('Error adding lead: ' + error.message);
        }
    });
} 