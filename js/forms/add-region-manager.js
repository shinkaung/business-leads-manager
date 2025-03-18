import { createAirtableRecord } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';

// Constants for visit scheduling
const VISIT_INTERVALS = {
    'Gold': 30,   // 1 month
    'Silver': 45, // 1.5 months
    'Bronze': 60  // 2 months
};

function setupVisitDateLogic() {
    const ratingSelect = document.getElementById('Rating');
    const nextVisitDateInput = document.getElementById('Next Visit Date');
    const lastVisitDateInput = document.getElementById('Last Visit Date');

    function updateNextVisitDate() {
        if (!lastVisitDateInput.value || !ratingSelect.value) return;

        const rating = ratingSelect.value;
        const lastVisitDate = new Date(lastVisitDateInput.value);
        const interval = VISIT_INTERVALS[rating] || VISIT_INTERVALS.default;

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

function setupFormSubmission() {
    const form = document.getElementById('addRecordForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const record = {};
        
        formData.forEach((value, key) => {
            // Only add non-empty values to the record
            if (value) {
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

        // Set default status if not provided
        if (!record['Status']) {
            record['Status'] = 'new lead';
        }

        // Add the user's assigned region to the record
        const userRegion = getUserRegion();
        if (userRegion) {
            record['assigned_to'] = userRegion;
        }

        // Calculate next visit date if last visit date is set but next visit date isn't
        if (record['Last Visit Date'] && !record['Next Visit Date'] && record['Rating']) {
            const lastVisitDate = new Date(record['Last Visit Date']);
            const rating = record['Rating'];
            const interval = VISIT_INTERVALS[rating] || VISIT_INTERVALS.default;
            
            const nextVisitDate = new Date(lastVisitDate);
            nextVisitDate.setDate(nextVisitDate.getDate() + interval);
            
            // Format as YYYY-MM-DD
            record['Next Visit Date'] = nextVisitDate.toISOString().split('T')[0];
        }

        try {
            await createAirtableRecord(record);
            alert('Lead added successfully!');
            
            // Preserve user authentication data
            const userData = JSON.parse(localStorage.getItem('user'));
            
            // Clear cache but preserve auth
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Redirect with cache busting
            const timestamp = new Date().getTime();
            window.location.href = `./region-manager.html?forceRefresh=true&t=${timestamp}`;
        } catch (error) {
            alert('Error adding lead: ' + error.message);
        }
    });
}

function getUserRegion() {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        return user.region || null;
    }
    return null;
}

// Check authentication and role on load
document.addEventListener('DOMContentLoaded', () => {
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

    // Set the assigned region field
    const assignedToField = document.getElementById('assigned_to');
    if (assignedToField && user.region) {
        assignedToField.value = user.region;
        assignedToField.disabled = true; // Disable the select since region manager should only add to their region
    }

    initializeAutocomplete();
    setupFormSubmission();
    setupVisitDateLogic(); // Initialize visit date logic
});