import { fetchAirtableData } from '../shared/airtable.js';

const leadsList = document.querySelector('.leads-list');
const tableBody = document.querySelector('.table tbody');

function editLead(id) {
    const returnTo = 'salesman';
    window.location.href = `../pages/edit.html?id=${id}&returnTo=${returnTo}`;
}

// Add these helper functions at the top
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'block';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

async function loadLeads() {
    showLoading();

    if (!tableBody || !leadsList) {
        console.error('Required containers not found');
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const forceRefresh = urlParams.has('forceRefresh');
        const userData = JSON.parse(localStorage.getItem('user'));
        const userRegion = userData?.region;

        if (!userRegion) {
            tableBody.innerHTML = '<tr><td colspan="20">No region assigned to your account</td></tr>';
            leadsList.innerHTML = '<div class="error">No region assigned to your account</div>';
            hideLoading();
            return;
        }

        const leads = await fetchAirtableData(forceRefresh);
        
        // Filter leads based on exact match with assigned_to field
        const filteredLeads = leads.filter(lead => {
            const leadRegion = lead.fields.assigned_to;
            return leadRegion === userRegion;  // Exact match comparison
        });

        if (!filteredLeads || filteredLeads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="20">No leads found for your region</td></tr>';
            leadsList.innerHTML = '<div class="no-leads">No leads found for your region</div>';
            hideLoading();
            return;
        }

        tableBody.innerHTML = '';
        leadsList.innerHTML = '';

        filteredLeads.forEach(lead => {
            tableBody.innerHTML += createTableRow(lead);
            const card = createLeadCard(lead);
            leadsList.appendChild(card);
        });

        updateRecordCount(filteredLeads.length);
        setupSearch();

    } catch (error) {
        console.error('Error loading leads:', error);
        tableBody.innerHTML = '<tr><td colspan="20">Failed to load leads</td></tr>';
        leadsList.innerHTML = '<div class="error">Failed to load leads</div>';
    } finally {
        hideLoading();
    }
}

// Add function to update record count
function updateRecordCount(count) {
    const countElement = document.querySelector('.records-counter strong');
    if (countElement) {
        countElement.textContent = count;
    }
}

function createTableRow(lead) {
    const status = lead.fields['Status'] || 'new lead';
    const statusClass = getStatusClass(status);
    return `
        <tr class="${statusClass}">
            <td>${lead.fields['Contact Person'] || '-'}</td>
            <td>${lead.fields['Position'] || '-'}</td>
            <td>${lead.fields['Tel'] || '-'}</td>
            <td>${lead.fields['Email'] || '-'}</td>
            <td>${lead.fields['Name of outlet'] || '-'}</td>
            <td>${lead.fields['Address'] || '-'}</td>
            <td>${lead.fields['Postal Code'] || '-'}</td>
            <td>${lead.fields['Category'] || '-'}</td>
            <td>${lead.fields['Style/Type of Cuisine'] || '-'}</td>
            <td>${lead.fields['Size of Establishment'] || '-'}</td>
            <td>${lead.fields['Products on Tap'] || '-'}</td>
            <td>${lead.fields['Estimated Monthly Consumption (HL)'] || '-'}</td>
            <td>${lead.fields['Beer Bottle Products'] || '-'}</td>
            <td>${lead.fields['Estimated Monthly Consumption (Cartons)'] || '-'}</td>
            <td>${lead.fields['Soju Products'] || '-'}</td>
            <td>${lead.fields['Proposed Products & HL Target'] || '-'}</td>
            <td>${lead.fields['Follow Up Actions'] || '-'}</td>
            <td>${lead.fields['Remarks'] || '-'}</td>
            <td>
                <span class="status-badge ${getStatusBadgeClass(status)}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" 
                        onclick="editLead('${lead.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            </td>
        </tr>
    `;
}

function createLeadCard(lead) {
    const status = lead.fields['Status'] || 'new lead';
    const statusClass = getStatusClass(status);
    const div = document.createElement('div');
    div.className = `lead-card ${statusClass}`;
    div.innerHTML = `
        <div class="lead-card-header">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h4>${lead.fields['Name of outlet'] || 'Unnamed Outlet'}</h4>
                <span class="status-badge ${getStatusBadgeClass(status)}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>
            <div class="lead-card-basic-info">
                <p><strong>Contact:</strong> ${lead.fields['Contact Person'] || 'No contact person'}</p>
                <p><strong>Position:</strong> ${lead.fields['Position'] || '-'}</p>
                <p><i class="bi bi-telephone"></i> ${lead.fields['Tel'] || 'No phone'}</p>
                <p><i class="bi bi-envelope"></i> ${lead.fields['Email'] || '-'}</p>
            </div>
        </div>
        
        <div class="lead-card-details" style="display: none;">
            <hr>
            <div class="details-grid">
                <p><strong>Address:</strong> ${lead.fields['Address'] || '-'}</p>
                <p><strong>Postal Code:</strong> ${lead.fields['Postal Code'] || '-'}</p>
                <p><strong>Category:</strong> ${lead.fields['Category'] || '-'}</p>
                <p><strong>Style/Cuisine:</strong> ${lead.fields['Style/Type of Cuisine'] || '-'}</p>
                <p><strong>Size:</strong> ${lead.fields['Size of Establishment'] || '-'}</p>
                <p><strong>Products on Tap:</strong> ${lead.fields['Products on Tap'] || '-'}</p>
                <p><strong>Monthly HL:</strong> ${lead.fields['Estimated Monthly Consumption (HL)'] || '-'}</p>
                <p><strong>Bottle Products:</strong> ${lead.fields['Beer Bottle Products'] || '-'}</p>
                <p><strong>Monthly Cartons:</strong> ${lead.fields['Estimated Monthly Consumption (Cartons)'] || '-'}</p>
                <p><strong>Soju Products:</strong> ${lead.fields['Soju Products'] || '-'}</p>
                <p><strong>Target:</strong> ${lead.fields['Proposed Products & HL Target'] || '-'}</p>
                <p><strong>Follow Up:</strong> ${lead.fields['Follow Up Actions'] || '-'}</p>
                <p><strong>Remarks:</strong> ${lead.fields['Remarks'] || '-'}</p>
            </div>
        </div>
        
        <div class="lead-card-actions">
            <button class="btn btn-sm btn-outline-secondary toggle-details">
                <i class="bi bi-chevron-down"></i> View Details
            </button>
            <button class="btn btn-sm btn-outline-primary" 
                    onclick="editLead('${lead.id}')">
                <i class="bi bi-pencil"></i> Edit
            </button>
        </div>
    `;

    // Add toggle functionality
    const toggleBtn = div.querySelector('.toggle-details');
    const details = div.querySelector('.lead-card-details');
    const icon = toggleBtn.querySelector('i');
    
    toggleBtn.addEventListener('click', () => {
        const isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
        icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        toggleBtn.innerHTML = `${icon.outerHTML} ${isHidden ? 'Hide Details' : 'View Details'}`;
    });

    return div;
}

function setupSearch() {
    const searchInput = document.querySelector('#searchInput');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        showLoading(); // Show loading when search starts
        clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = document.querySelectorAll('.table tbody tr');
            const mobileCards = document.querySelectorAll('.lead-card');

            // Filter table rows
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });

            // Filter mobile cards
            mobileCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(searchTerm) ? '' : 'none';
            });

            // Update visible record count
            const visibleRows = document.querySelectorAll('.table tbody tr:not([style*="display: none"])').length;
            updateRecordCount(visibleRows);
            
            hideLoading(); // Hide loading after search completes
        }, 300);
    });
}

// Add these helper functions
function getStatusClass(status) {
    const normalizedStatus = (status || '').toLowerCase().trim();
    
    switch(normalizedStatus) {
        case 'qualified':
            return 'status-qualified';
        case 'existing customer':
            return 'status-existing';
        case 'new lead':
            return 'status-new';
        default:
            return ''; // No special styling for unknown status
    }
}

function getStatusBadgeClass(status) {
    const normalizedStatus = (status || '').toLowerCase().trim();
    
    switch(normalizedStatus) {
        case 'qualified':
            return 'status-badge-qualified';
        case 'existing customer':
            return 'status-badge-existing';
        case 'new lead':
            return 'status-badge-new';
        default:
            return 'status-badge-new'; // Default to new lead if status is unknown
    }
}

// Make editLead available globally
window.editLead = editLead;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '../pages/login.html';
        return;
    }

    const user = JSON.parse(userData);
    const userRole = user.role.toLowerCase();
    
    // Only redirect if not a salesman
    if (userRole !== 'salesman' && userRole !== 'salesperson') {
        window.location.href = '../pages/login.html';
        return;
    }

    // Display username and region without redirecting
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && user.username) {
        userDisplay.textContent = `Welcome, ${user.username} (${user.region || 'No Region'})`;
    }

    loadLeads();
}); 