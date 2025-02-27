import { fetchAirtableData, updateAirtableRecord, VALID_STATUSES } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and role
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

        // Populate form fields
        const form = document.getElementById('editRecordForm');
        if (!form) return;

        Object.entries(record.fields).forEach(([key, value]) => {
            const element = form.querySelector(`[name="${key}"]`);
            if (element) {
                element.value = value || '';
            }
        });

    } catch (error) {
        console.error('Error loading record:', error);
        alert('Error loading record: ' + error.message);
        goBack();
    }
}

// Update form submit handler with absolute path
document.getElementById('editRecordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');
    
    const formData = new FormData(e.target);
    const record = {};
    
    formData.forEach((value, key) => {
        if (value) record[key] = value;
    });

    try {
        await updateAirtableRecord(recordId, record);
        alert('Record updated successfully!');
        
        // Preserve user authentication data
        const userData = JSON.parse(localStorage.getItem('user'));
        
        // Clear cache but preserve auth
        localStorage.clear();
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Use absolute path to region-manager.html
        const timestamp = new Date().getTime();
        window.location.replace('/pages/region-manager.html?forceRefresh=true&t=${timestamp}');
    } catch (error) {
        alert('Error updating record: ' + error.message);
    }
}); 