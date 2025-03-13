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
            'Rating',
            'Last Visit Date',
            'Next Visit Date',
            'Closing Probability',
            'Proposed Products & HL Target',
            'Follow Up Actions',
            'Remarks',
            'Status'
        ];

        // Populate each field
        fields.forEach(fieldName => {
            const element = form.querySelector(`[name="${fieldName}"]`);
            if (element) {
                let value = record.fields[fieldName] || '';
                
                // Special handling for Closing Probability
                if (fieldName === 'Closing Probability' && value) {
                    // Convert percentage value to decimal for Airtable (40 -> 0.4)
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        value = numValue / 100;
                    }
                }
                
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

// Update form submit handler with absolute path
document.getElementById('editRecordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('id');
    
    const formData = new FormData(e.target);
    const record = {};
    
    formData.forEach((value, key) => {
        if (value) {
            // Special handling for Closing Probability
            if (key === 'Closing Probability') {
                // Convert to number and validate
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                    // Store the number as is
                    record[key] = numValue / 100; // Convert percentage to decimal for Airtable
                }
            } else {
                record[key] = value;
            }
        }
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