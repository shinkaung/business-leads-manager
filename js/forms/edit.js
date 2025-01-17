import { fetchAirtableData, updateAirtableRecord } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';
import { getUserRole } from '../shared/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initializeAutocomplete();
    await loadRecord();
});

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
            'Remarks'
        ];

        // Populate each field
        fields.forEach(fieldName => {
            const element = form.querySelector(`[name="${fieldName}"]`);
            if (element && record.fields[fieldName]) {
                element.value = record.fields[fieldName];
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
    
    const formData = new FormData(e.target);
    const record = {};
    
    formData.forEach((value, key) => {
        if (value) record[key] = value;
    });

    try {
        await updateAirtableRecord(recordId, record);
        alert('Record updated successfully!');
        
        // Get user role and redirect accordingly
        const userRole = getUserRole();
        if (userRole === 'admin') {
            window.location.href = '../index.html';
        } else if (userRole === 'salesman') {
            window.location.href = './salesman.html';
        }
    } catch (error) {
        alert('Error updating record: ' + error.message);
    }
});

function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo') || 'index';
    window.location.href = returnTo === 'salesman' ? './salesman.html' : '../index.html';
} 