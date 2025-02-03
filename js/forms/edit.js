import { fetchAirtableData, updateAirtableRecord, VALID_STATUSES } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';
import { getUserRole } from '../shared/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initializeAutocomplete();
    await loadRecord();
    initializeStatusDropdown();
});

function initializeStatusDropdown() {
    const statusSelect = document.querySelector('select[name="Status"]');
    if (statusSelect) {
        statusSelect.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Status';
        statusSelect.appendChild(defaultOption);
        
        VALID_STATUSES.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });
    }
}

async function loadRecord() {
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');
    
    if (!recordId) {
        alert('No record ID provided');
        goBack();
        return;
    }

    try {
        const records = await fetchAirtableData();
        const record = records.find(r => r.id === recordId);
        
        if (!record) {
            alert('Record not found');
            goBack();
            return;
        }

        console.log('Found record:', record); // Debug log

        // Get the form
        const form = document.getElementById('editRecordForm');
        if (!form) {
            console.error('Form not found');
            return;
        }

        // Define all fields that should be populated
        const fields = [
            'Contact Person',
            'Position',
            'Tel',
            'Email',
            'Name of outlet',
            'Address',
            'Postal Code',
            'Category',
            'Style/Type of Cuisine',
            'Size of Establishment',
            'Products on Tap',
            'Estimated Monthly Consumption (HL)',
            'Beer Bottle Products',
            'Estimated Monthly Consumption (Cartons)',
            'Soju Products',
            'Proposed Products & HL Target',
            'Follow Up Actions',
            'Remarks',
            'Status'
        ];

        // Populate each field
        fields.forEach(fieldName => {
            const element = form.querySelector(`[name="${fieldName}"]`);
            if (element) {
                const value = record.fields[fieldName] || '';
                if (element.tagName.toLowerCase() === 'select') {
                    setTimeout(() => {
                        element.value = value;
                    }, 0);
                } else {
                    element.value = value;
                }
            }
        });

    } catch (error) {
        console.error('Error loading record:', error);
        alert('Error loading record: ' + error.message);
        goBack();
    }
}

// Add form submit handler
document.getElementById('editRecordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');
    const returnTo = urlParams.get('returnTo') || 'index'; // Get the return path
    
    const formData = new FormData(e.target);
    const record = {};
    
    formData.forEach((value, key) => {
        if (value) record[key] = value;
    });

    try {
        if (record.Status && !VALID_STATUSES.includes(record.Status)) {
            throw new Error(`Invalid Status value. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        await updateAirtableRecord(recordId, record);
        alert('Record updated successfully!');
        
        // Clear ALL cache
        localStorage.clear();
        sessionStorage.clear();
        
        // Force reload with cache busting
        const timestamp = new Date().getTime();
        
        // Determine redirect URL based on returnTo parameter
        let redirectUrl;
        if (returnTo === 'salesman') {
            redirectUrl = './salesman.html';
        } else {
            redirectUrl = '../index.html'; // Default to admin page
        }
        
        // Preserve user authentication data before clearing cache
        const userData = JSON.parse(localStorage.getItem('user'));
        
        // Clear cache
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore user authentication data
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Redirect with cache busting
        window.location.href = `${redirectUrl}?forceRefresh=true&t=${timestamp}`;
    } catch (error) {
        alert('Error updating record: ' + error.message);
    }
});

function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo') || 'index';
    window.location.href = returnTo === 'salesman' ? './salesman.html' : '../index.html';
} 