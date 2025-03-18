import { fetchAirtableData, updateAirtableRecord, VALID_STATUSES } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';
import { getUserRole } from '../shared/auth.js';

// Constants for visit scheduling
const VISIT_INTERVALS = {
    'Gold': 30,   // 1 month
    'Silver': 45, // 1.5 months
    'Bronze': 60  // 2 months
};

document.addEventListener('DOMContentLoaded', async () => {
    await initializeAutocomplete();
    await loadRecord();
    initializeStatusDropdown();
    setupVisitDateCalculation();
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
    const userData = JSON.parse(localStorage.getItem('user'));
    const userRegion = userData?.region;
    const userRole = userData?.role?.toLowerCase();
    
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

        // Check if salesman is trying to edit a record not in their region
        if (userRole === 'salesman' && record.fields.assigned_to !== userRegion) {
            alert('You do not have permission to edit this record');
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
            'Rating',
            'Last Visit Date',
            'Next Visit Date',
            'Closing Probability',
            'Proposed Products & HL Target',
            'Follow Up Actions',
            'Remarks',
            'Status',
            'assigned_to'
        ];

        // Populate each field
        fields.forEach(fieldName => {
            const element = form.querySelector(`[name="${fieldName}"]`);
            if (element) {
                let value = record.fields[fieldName] || '';
                
                // Special handling for Closing Probability
                if (fieldName === 'Closing Probability' && value !== undefined) {
                    // Convert from decimal (0.4) to percentage (40)
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        value = Math.round(numValue * 100).toString();
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

// Update form submit handler
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
                // Convert percentage value to decimal for Airtable (40 -> 0.4)
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                    record[key] = numValue / 100;
                }
            } else {
                record[key] = value;
            }
        }
    });

    // Preserve the assigned_to field for salespeople
    const userData = JSON.parse(localStorage.getItem('user'));
    const userRole = userData?.role?.toLowerCase();
    const userRegion = userData?.region;

    if (userRole === 'salesman') {
        // Ensure the assigned_to field stays the same for salespeople
        record.assigned_to = userRegion;
    }

    try {
        if (record.Status && !VALID_STATUSES.includes(record.Status)) {
            throw new Error(`Invalid Status value. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        await updateAirtableRecord(recordId, record);
        alert('Record updated successfully!');
        
        // Clear cache but preserve auth
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('user', JSON.stringify(userData));
        
        const timestamp = new Date().getTime();
        const returnTo = urlParams.get('returnTo') || 'index';
        let redirectUrl;

        if (returnTo === 'visits') {
            redirectUrl = './visits.html';
        } else if (returnTo === 'salesman') {
            redirectUrl = './salesman.html';
        } else {
            redirectUrl = '../index.html';
        }
        
        window.location.href = `${redirectUrl}?forceRefresh=true&t=${timestamp}`;
    } catch (error) {
        alert('Error updating record: ' + error.message);
    }
});

function goBack() {
    const userData = JSON.parse(localStorage.getItem('user'));
    const userRole = userData.role;
    
    switch(userRole) {
        case 'admin':
            window.location.href = '../index.html';
            break;
        case 'salesman':
            window.location.href = './salesman.html';
            break;
        case 'region_manager':
            window.location.href = './region-manager.html';
            break;
        default:
            window.location.href = './login.html';
    }
}

// Add the visit date calculation setup
function setupVisitDateCalculation() {
    const ratingSelect = document.getElementById('Rating');
    const nextVisitDateInput = document.getElementById('Next Visit Date');
    const lastVisitDateInput = document.getElementById('Last Visit Date');

    if (ratingSelect && nextVisitDateInput && lastVisitDateInput) {
        // Update next visit date when rating changes
        ratingSelect.addEventListener('change', () => {
            if (lastVisitDateInput.value) {
                const rating = ratingSelect.value;
                if (rating) {
                    const interval = VISIT_INTERVALS[rating];
                    const lastVisitDate = new Date(lastVisitDateInput.value);
                    const nextVisitDate = new Date(lastVisitDate);
                    nextVisitDate.setDate(lastVisitDate.getDate() + interval);
                    nextVisitDateInput.value = nextVisitDate.toISOString().split('T')[0];
                }
            }
        });

        // Update next visit date when last visit date changes
        lastVisitDateInput.addEventListener('change', () => {
            if (lastVisitDateInput.value && ratingSelect.value) {
                const rating = ratingSelect.value;
                const interval = VISIT_INTERVALS[rating];
                const lastVisitDate = new Date(lastVisitDateInput.value);
                const nextVisitDate = new Date(lastVisitDate);
                nextVisitDate.setDate(lastVisitDate.getDate() + interval);
                nextVisitDateInput.value = nextVisitDate.toISOString().split('T')[0];
            }
        });
    }
}