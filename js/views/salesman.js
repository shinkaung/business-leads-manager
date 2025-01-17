import { fetchAirtableData } from '../shared/airtable.js';

const leadsList = document.querySelector('.leads-list');
const tableBody = document.querySelector('.table tbody');

function editLead(id) {
    const returnTo = 'salesman';
    window.location.href = `edit.html?id=${id}&returnTo=${returnTo}`;
}

async function loadLeads() {
    if (!tableBody || !leadsList) {
        console.error('Required containers not found');
        return;
    }

    try {
        const leads = await fetchAirtableData();
        if (!leads || leads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">No leads found</td></tr>';
            leadsList.innerHTML = '<div class="no-leads">No leads found</div>';
            return;
        }

        // Clear existing content
        tableBody.innerHTML = '';
        leadsList.innerHTML = '';

        // Populate both views
        leads.forEach(lead => {
            // Add table row for desktop view
            tableBody.innerHTML += createTableRow(lead);
            
            // Add card for mobile view
            const card = createLeadCard(lead);
            leadsList.appendChild(card);
        });

        // Setup search functionality
        setupSearch();

    } catch (error) {
        console.error('Error loading leads:', error);
        tableBody.innerHTML = '<tr><td colspan="7">Failed to load leads</td></tr>';
        leadsList.innerHTML = '<div class="error">Failed to load leads</div>';
    }
}

function createTableRow(lead) {
    return `
        <tr>
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
                <button class="btn btn-sm btn-outline-primary" 
                        onclick="editLead('${lead.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            </td>
        </tr>
    `;
}

function createLeadCard(lead) {
    const div = document.createElement('div');
    div.className = 'lead-card';
    div.innerHTML = `
        <div class="lead-card-header">
            <h4>${lead.fields['Name of outlet'] || 'Unnamed Outlet'}</h4>
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

    searchInput.addEventListener('input', (e) => {
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
    });
}

// Make editLead available globally
window.editLead = editLead;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadLeads); 