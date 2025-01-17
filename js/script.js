import { fetchAirtableData, deleteAirtableRecord } from './shared/airtable.js';

// Global variables
let records = [];

// Function declarations that will be exported
export function renderRecords(records) {
    const tbody = document.querySelector('#dataTable tbody');
    const mobileCards = document.querySelector('.mobile-cards');
    
    // Clear existing content
    tbody.innerHTML = '';
    mobileCards.innerHTML = '';
    
    records.forEach(record => {
        // Render table row
        tbody.innerHTML += createTableRow(record);
        
        // Render mobile card
        mobileCards.innerHTML += createMobileCard(record);
    });

    // Setup mobile card listeners after rendering
    setupMobileCardListeners();
    
    // Update record count
    updateRecordCount(records.length);
}

async function initializeApp() {
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        // Fetch data from Airtable
        records = await fetchAirtableData();
        console.log('Fetched records:', records);
        
        // Render the records
        renderRecords(records);
        
        // Update total records count
        updateRecordCount(records.length);
        
        // Setup search functionality
        setupSearch();
    } catch (error) {
        console.error('Error initializing app:', error);
    } finally {
        // Hide loading overlay
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

function createTableRow(record) {
    return `
        <tr>
            <td>${record.fields['Contact Person'] || ''}</td>
            <td>${record.fields['Position'] || ''}</td>
            <td>${record.fields['Tel'] || ''}</td>
            <td>${record.fields['Email'] || ''}</td>
            <td>${record.fields['Name of outlet'] || ''}</td>
            <td>${record.fields['Address'] || ''}</td>
            <td>${record.fields['Postal Code'] || ''}</td>
            <td>${record.fields['Category'] || ''}</td>
            <td>${record.fields['Style/Type of Cuisine'] || ''}</td>
            <td>${record.fields['Size of Establishment'] || ''}</td>
            <td>${record.fields['Products on Tap'] || ''}</td>
            <td>${record.fields['Estimated Monthly Consumption (HL)'] || ''}</td>
            <td>${record.fields['Beer Bottle Products'] || ''}</td>
            <td>${record.fields['Estimated Monthly Consumption (Cartons)'] || ''}</td>
            <td>${record.fields['Soju Products'] || ''}</td>
            <td>${record.fields['Proposed Products & HL Target'] || ''}</td>
            <td>${record.fields['Follow Up Actions'] || ''}</td>
            <td>${record.fields['Remarks'] || ''}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="editRecord('${record.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function createMobileCard(record) {
    return `
        <div class="mobile-card">
            <div class="lead-card-header">
                <h4>${record.fields['Name of outlet'] || 'Unnamed Outlet'}</h4>
                <div class="lead-card-basic-info">
                    <p><strong>Contact:</strong> ${record.fields['Contact Person'] || 'No contact person'}</p>
                    <p><strong>Position:</strong> ${record.fields['Position'] || '-'}</p>
                    <p><strong>Tel:</strong> ${record.fields['Tel'] || '-'}</p>
                    <p><strong>Email:</strong> ${record.fields['Email'] || '-'}</p>
                </div>
            </div>
            
            <div class="lead-card-details" style="display: none;">
                <hr>
                <div class="details-grid">
                    <p><strong>Address:</strong> ${record.fields['Address'] || '-'}</p>
                    <p><strong>Postal Code:</strong> ${record.fields['Postal Code'] || '-'}</p>
                    <p><strong>Category:</strong> ${record.fields['Category'] || '-'}</p>
                    <p><strong>Style/Cuisine:</strong> ${record.fields['Style/Type of Cuisine'] || '-'}</p>
                    <p><strong>Size:</strong> ${record.fields['Size of Establishment'] || '-'}</p>
                    <p><strong>Products on Tap:</strong> ${record.fields['Products on Tap'] || '-'}</p>
                    <p><strong>Monthly HL:</strong> ${record.fields['Estimated Monthly Consumption (HL)'] || '-'}</p>
                    <p><strong>Bottle Products:</strong> ${record.fields['Beer Bottle Products'] || '-'}</p>
                    <p><strong>Monthly Cartons:</strong> ${record.fields['Estimated Monthly Consumption (Cartons)'] || '-'}</p>
                    <p><strong>Soju Products:</strong> ${record.fields['Soju Products'] || '-'}</p>
                    <p><strong>Target:</strong> ${record.fields['Proposed Products & HL Target'] || '-'}</p>
                    <p><strong>Follow Up:</strong> ${record.fields['Follow Up Actions'] || '-'}</p>
                    <p><strong>Remarks:</strong> ${record.fields['Remarks'] || '-'}</p>
                </div>
            </div>
            
            <div class="lead-card-actions">
                <button class="btn btn-sm btn-outline-secondary toggle-details">
                    <i class="bi bi-chevron-down"></i> View Details
                </button>
                <button class="btn btn-sm btn-outline-primary" onclick="editRecord('${record.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteRecord('${record.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// Add this function to handle the toggle functionality
function setupMobileCardListeners() {
    document.querySelectorAll('.mobile-card').forEach(card => {
        const toggleBtn = card.querySelector('.toggle-details');
        const details = card.querySelector('.lead-card-details');
        const icon = toggleBtn.querySelector('i');
        
        toggleBtn.addEventListener('click', () => {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? 'block' : 'none';
            icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            toggleBtn.innerHTML = `${icon.outerHTML} ${isHidden ? 'Hide Details' : 'View Details'}`;
        });
    });
}

function updateRecordCount(count) {
    const countElement = document.querySelector('.records-counter strong');
    if (countElement) {
        countElement.textContent = count;
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredRecords = records.filter(record => 
                record.fields['Contact Person']?.toLowerCase().includes(searchTerm) ||
                record.fields['Name of outlet']?.toLowerCase().includes(searchTerm) ||
                record.fields['Address']?.toLowerCase().includes(searchTerm)
            );
            renderRecords(filteredRecords);
            updateRecordCount(filteredRecords.length);
        });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Make functions available globally
window.showDetails = function(recordId) {
    const record = records.find(r => r.id === recordId);
    if (record) {
        console.log('Full record details:', record);
    }
};

function editRecord(id) {
    const returnTo = 'index';
    window.location.href = `pages/edit.html?id=${id}&returnTo=${returnTo}`;
}

// Make it globally available
window.editRecord = editRecord;

// Add delete function
async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) {
        return;
    }

    try {
        await deleteAirtableRecord(id);
        // Remove from local records array
        records = records.filter(r => r.id !== id);
        // Re-render the table
        renderRecords(records);
        alert('Record deleted successfully');
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
    }
}

// Make delete function globally available
window.deleteRecord = deleteRecord;