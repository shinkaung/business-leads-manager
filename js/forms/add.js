// Constants for visit scheduling
const VISIT_INTERVALS = {
    'Gold': 30,   // 1 month
    'Silver': 45, // 1.5 months
    'Bronze': 60  // 2 months
};

import { createAirtableRecord, VALID_STATUSES } from '../shared/airtable.js';
import { initializeAutocomplete } from '../shared/autocomplete.js';
import { getUserRole } from '../shared/auth.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeAutocomplete();
    setupFormSubmission();
    setupVisitDateLogic();
});

function setupVisitDateLogic() {
    const ratingSelect = document.getElementById('Rating');
    const nextVisitDateInput = document.getElementById('Next Visit Date');
    const lastVisitDateInput = document.getElementById('Last Visit Date');

    if (ratingSelect && nextVisitDateInput && lastVisitDateInput) {
        ratingSelect.addEventListener('change', () => {
            // Only update next visit date if last visit date is set
            if (lastVisitDateInput.value) {
                const rating = ratingSelect.value || 'Bronze';
                const interval = VISIT_INTERVALS[rating] || 60;
                
                const lastVisitDate = new Date(lastVisitDateInput.value);
                const nextVisitDate = new Date(lastVisitDate);
                nextVisitDate.setDate(lastVisitDate.getDate() + interval);
                
                nextVisitDateInput.value = nextVisitDate.toISOString().split('T')[0];
            }
        });

        // Also update next visit date when last visit date changes
        lastVisitDateInput.addEventListener('change', () => {
            if (lastVisitDateInput.value) {
                const rating = ratingSelect.value || 'Bronze';
                const interval = VISIT_INTERVALS[rating] || 60;
                
                const lastVisitDate = new Date(lastVisitDateInput.value);
                const nextVisitDate = new Date(lastVisitDate);
                nextVisitDate.setDate(lastVisitDate.getDate() + interval);
                
                nextVisitDateInput.value = nextVisitDate.toISOString().split('T')[0];
            }
        });
    }
}

function setupFormSubmission() {
    const form = document.getElementById('addRecordForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const record = {};
        
        formData.forEach((value, key) => {
            if (value) {
                // Special handling for Closing Probability
                if (key === 'Closing Probability') {
                    record[key] = parseInt(value) / 100;
                } else {
                    record[key] = value;
                }
            }
        });

        // Validate assigned region is selected
        if (!record['assigned_to']) {
            alert('Please select an assigned region');
            return;
        }

        // Set default status if not provided
        if (!record['Status']) {
            record['Status'] = VALID_STATUSES[0];
        }

        // If Last Visit Date is set but Next Visit Date is not, calculate Next Visit Date based on rating
        if (record['Last Visit Date'] && !record['Next Visit Date']) {
            const rating = record['Rating'] || 'Bronze';
            const interval = VISIT_INTERVALS[rating] || 60;
            
            const lastVisitDate = new Date(record['Last Visit Date']);
            const nextVisitDate = new Date(lastVisitDate);
            nextVisitDate.setDate(lastVisitDate.getDate() + interval);
            
            record['Next Visit Date'] = nextVisitDate.toISOString().split('T')[0];
        }

        try {
            await createAirtableRecord(record);
            alert('Record added successfully!');
            
            // Preserve user authentication data
            const userData = JSON.parse(localStorage.getItem('user'));
            
            // Clear ALL cache to force fresh data fetch
            localStorage.clear();
            sessionStorage.clear();
            
            // Restore user authentication data
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Add timestamp for cache busting
            const timestamp = new Date().getTime();
            
            // Redirect based on user role with cache busting parameters
            const userRole = getUserRole();
            if (userRole === 'admin') {
                window.location.href = `../index.html?forceRefresh=true&t=${timestamp}`;
            } else if (userRole === 'salesman') {
                window.location.href = `./salesman.html?forceRefresh=true&t=${timestamp}`;
            }
        } catch (error) {
            alert('Error adding record: ' + error.message);
        }
    });
} 