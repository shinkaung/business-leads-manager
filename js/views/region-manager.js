import { fetchAirtableData } from '../shared/airtable.js';

// Global variables
let records = [];
let currentPage = 1;
let recordsPerPage = 10;
let filteredRecords = [];

const leadsList = document.querySelector('.leads-list');
const tableBody = document.querySelector('.table tbody');

function editLead(id) {
    const returnTo = 'region-manager';
    window.location.href = `../pages/edit.html?id=${id}&returnTo=${returnTo}`;
}

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

        if (forceRefresh) {
            localStorage.removeItem('airtableCache');
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }

        records = await fetchAirtableData(forceRefresh);
        filteredRecords = [...records];
        
        if (!records || records.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="20">No leads found</td></tr>';
            leadsList.innerHTML = '<div class="no-leads">No leads found</div>';
            return;
        }

        // Render the records first
        renderRecords();
        
        // Then initialize components ONCE
        // This is the key fix - only initialize pagination once
        initializePagination();
        setupSearch();

    } catch (error) {
        console.error('Error loading leads:', error);
        tableBody.innerHTML = '<tr><td colspan="20">Failed to load leads</td></tr>';
        leadsList.innerHTML = '<div class="error">Failed to load leads</div>';
    } finally {
        setTimeout(() => hideLoading(), 300);
    }
}

function renderRecords() {
    // Calculate pagination
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }
    
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    // Update pagination UI
    updatePaginationUI(currentPage, totalPages);

    // Clear existing content
    tableBody.innerHTML = '';
    leadsList.innerHTML = '';

    // Render paginated records
    paginatedRecords.forEach(lead => {
        tableBody.innerHTML += createTableRow(lead);
        const card = createLeadCard(lead);
        leadsList.appendChild(card);
    });

    updateRecordCount(totalRecords);
}

function updatePaginationUI(currentPage, totalPages) {
    // Update page info
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;

    // Update button states
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
    }
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
    }
}

function initializePagination() {
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const recordsPerPageSelect = document.getElementById('recordsPerPage');

    if (prevButton) {
        // Remove existing listeners by cloning and replacing the button
        const newPrevButton = prevButton.cloneNode(true);
        prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        
        // Add the event listener to the new button
        newPrevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderRecords();
            }
        });
    }

    if (nextButton) {
        // Remove existing listeners by cloning and replacing the button
        const newNextButton = nextButton.cloneNode(true);
        nextButton.parentNode.replaceChild(newNextButton, nextButton);
        
        // Add the event listener to the new button
        newNextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderRecords();
            }
        });
    }

    if (recordsPerPageSelect) {
        // Remove existing listeners by cloning and replacing the select
        const newRecordsPerPageSelect = recordsPerPageSelect.cloneNode(true);
        recordsPerPageSelect.parentNode.replaceChild(newRecordsPerPageSelect, recordsPerPageSelect);
        
        // Add the event listener to the new select
        newRecordsPerPageSelect.addEventListener('change', (e) => {
            recordsPerPage = parseInt(e.target.value);
            currentPage = 1; // Reset to first page when changing records per page
            renderRecords();
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Clear existing listeners
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        let debounceTimer;
        newSearchInput.addEventListener('input', (e) => {
            showLoading();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const searchTerm = e.target.value.toLowerCase();
                // Update filteredRecords based on search
                filteredRecords = records.filter(record => 
                    record.fields['Contact Person']?.toLowerCase().includes(searchTerm) ||
                    record.fields['Name of outlet']?.toLowerCase().includes(searchTerm) ||
                    record.fields['Address']?.toLowerCase().includes(searchTerm)
                );
                currentPage = 1; // Reset to first page when searching
                renderRecords(); // This will use the updated filteredRecords
                hideLoading();
            }, 300);
        });
    }
}

function updateRecordCount(count) {
    const countElement = document.querySelector('.records-counter strong');
    if (countElement) {
        countElement.textContent = count;
    }
}

function createTableRow(lead) {
    const status = lead.fields['Status'] || 'new lead';
    const statusClass = getStatusClass(status);
    const statusBadgeClass = getStatusBadgeClass(status);
    
    return `
        <tr class="${statusClass}">
            <td>${lead.fields['Contact Person'] || ''}</td>
            <td>${lead.fields['Position'] || ''}</td>
            <td>${lead.fields['Tel'] || ''}</td>
            <td>${lead.fields['Email'] || ''}</td>
            <td>${lead.fields['Name of outlet'] || ''}</td>
            <td>${lead.fields['Address'] || ''}</td>
            <td>${lead.fields['Postal Code'] || ''}</td>
            <td>${lead.fields['Category'] || ''}</td>
            <td>${lead.fields['Style/Type of Cuisine'] || ''}</td>
            <td>${lead.fields['Size of Establishment'] || ''}</td>
            <td>${lead.fields['Products on Tap'] || ''}</td>
            <td>${lead.fields['Estimated Monthly Consumption (HL)'] || ''}</td>
            <td>${lead.fields['Beer Bottle Products'] || ''}</td>
            <td>${lead.fields['Estimated Monthly Consumption (Cartons)'] || ''}</td>
            <td>${lead.fields['Soju Products'] || ''}</td>
            <td>${lead.fields['Proposed Products & HL Target'] || ''}</td>
            <td>${lead.fields['Follow Up Actions'] || ''}</td>
            <td>${lead.fields['Remarks'] || ''}</td>
            <td>
                <span class="status-badge ${statusBadgeClass}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td>
                <button onclick="editLead('${lead.id}')" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            </td>
        </tr>
    `;
}

function createLeadCard(lead) {
    const status = lead.fields['Status'] || 'new lead';
    const statusClass = getStatusClass(status);
    const statusBadgeClass = getStatusBadgeClass(status);
    
    const div = document.createElement('div');
    div.className = `lead-card ${statusClass}`;
    
    div.innerHTML = `
        <div class="lead-card-header">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h4>${lead.fields['Name of outlet'] || 'Unnamed Outlet'}</h4>
                <span class="status-badge ${statusBadgeClass}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>
            <div class="lead-card-basic-info">
                <p><strong>Contact:</strong> ${lead.fields['Contact Person'] || 'No contact person'}</p>
                <p><strong>Position:</strong> ${lead.fields['Position'] || '-'}</p>
                <p><strong>Tel:</strong> ${lead.fields['Tel'] || '-'}</p>
                <p><strong>Email:</strong> ${lead.fields['Email'] || '-'}</p>
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
            <button class="btn btn-sm btn-outline-primary" onclick="editLead('${lead.id}')">
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

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'qualified': return 'status-qualified';
        case 'existing customer': return 'status-existing';
        default: return 'status-new';
    }
}

function getStatusBadgeClass(status) {
    switch (status.toLowerCase()) {
        case 'qualified': return 'status-badge-qualified';
        case 'existing customer': return 'status-badge-existing';
        default: return 'status-badge-new';
    }
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

    // Display username
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && user.username) {
        userDisplay.textContent = `Welcome, ${user.username}`;
    }

    // Make edit function globally available
    window.editLead = editLead;

    // Load leads - this will call other initialization functions in the correct order
    loadLeads();
    
    // REMOVED: setupSearch(); - now called from loadLeads to avoid duplicate initializations
});