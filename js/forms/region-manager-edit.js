import { fetchAirtableData, updateAirtableRecord, VALID_STATUSES } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

// Constants for visit scheduling
const VISIT_INTERVALS = {
    'Gold': 30,   // 1 month
    'Silver': 45, // 1.5 months
    'Bronze': 60  // 2 months
};

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

    // Set the assigned region field based on the user's region
    const assignedToField = document.getElementById('assigned_to');
    if (assignedToField && user.region) {
        assignedToField.value = user.region;
        assignedToField.disabled = true; // Region managers can only edit leads in their region
    }

    await initializeAutocomplete();
    await loadRecord();
    initializeStatusDropdown();
    setupVisitDateLogic();
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

        // Check if region manager is trying to edit a record not in their region
        if (record.fields.assigned_to !== userRegion) {
            alert('You do not have permission to edit this record');
            goBack();
            return;
        }

        // Get the form
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
            'Status',
            'assigned_to'
        ];

        // Add console logging for debugging
        console.log('Record data:', record.fields);
        console.log('Assigned to value:', record.fields.assigned_to);

        // Populate each field
        fields.forEach(fieldName => {
            const element = form.querySelector(`[name="${fieldName}"]`);
            if (element) {
                let value = record.fields[fieldName] || '';
                
                // Special handling for Closing Probability
                if (fieldName === 'Closing Probability' && value !== undefined) {
                    // Convert from decimal (0.4) to percentage (40)
                    value = Math.round(value * 100);
                }
                
                if (element.tagName.toLowerCase() === 'select') {
                    // For select elements, set the value after a small delay to ensure options are loaded
                    setTimeout(() => {
                        element.value = value;
                        // Add debug logging for assigned_to field
                        if (fieldName === 'assigned_to') {
                            console.log('Setting assigned_to value:', value);
                            console.log('Current assigned_to element value:', element.value);
                        }
                    }, 0);
                } else {
                    element.value = value;
                }
            } else {
                // Log if element not found
                console.log(`Element not found for field: ${fieldName}`);
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

    try {
        if (record.Status && !VALID_STATUSES.includes(record.Status)) {
            throw new Error(`Invalid Status value. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        await updateAirtableRecord(recordId, record);
        alert('Record updated successfully!');
        
        // Clear cache but preserve auth
        const userData = JSON.parse(localStorage.getItem('user'));
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('user', JSON.stringify(userData));
        
        const timestamp = new Date().getTime();
        window.location.href = `./region-manager.html?forceRefresh=true&t=${timestamp}`;
    } catch (error) {
        alert('Error updating record: ' + error.message);
    }
});

function setupVisitDateLogic() {
    const ratingSelect = document.getElementById('Rating');
    const nextVisitDateInput = document.getElementById('Next Visit Date');
    const lastVisitDateInput = document.getElementById('Last Visit Date');

    function updateNextVisitDate() {
        if (!lastVisitDateInput.value || !ratingSelect.value) return;

        const rating = ratingSelect.value;
        const interval = VISIT_INTERVALS[rating] || VISIT_INTERVALS.default;

        const lastVisitDate = new Date(lastVisitDateInput.value);
        const nextVisitDate = new Date(lastVisitDate);
        nextVisitDate.setDate(nextVisitDate.getDate() + interval);

        // Format the date as YYYY-MM-DD for the input
        const nextVisitDateStr = nextVisitDate.toISOString().split('T')[0];
        nextVisitDateInput.value = nextVisitDateStr;
    }

    // Update next visit date when rating changes
    ratingSelect.addEventListener('change', updateNextVisitDate);

    // Update next visit date when last visit date changes
    lastVisitDateInput.addEventListener('change', updateNextVisitDate);
} 