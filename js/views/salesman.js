import { fetchAirtableData } from '../shared/airtable.js';

// Global variables
let records = [];
let currentPage = 1;
let recordsPerPage = 10;
let filteredRecords = [];

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

        records = await fetchAirtableData(forceRefresh);
        
        // Filter leads based on exact match with assigned_to field
        filteredRecords = records.filter(lead => {
            const leadRegion = lead.fields.assigned_to;
            return leadRegion === userRegion;  // Exact match comparison
        });

        if (!filteredRecords || filteredRecords.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="20">No leads found for your region</td></tr>';
            leadsList.innerHTML = '<div class="no-leads">No leads found for your region</div>';
            hideLoading();
            return;
        }

        // First render records
        renderRecords();
        
        // Then initialize UI components once - this is the key fix
        initializePagination();
        setupSearch();

    } catch (error) {
        console.error('Error loading leads:', error);
        tableBody.innerHTML = '<tr><td colspan="20">Failed to load leads</td></tr>';
        leadsList.innerHTML = '<div class="error">Failed to load leads</div>';
    } finally {
        hideLoading();
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

    // Get upcoming visits
    const upcomingVisits = getUpcomingVisits();
    
    // Update the reminder section if it exists
    const reminderSection = document.querySelector('.reminder-section');
    if (reminderSection) {
        // Split visits into overdue and upcoming
        const overdueVisits = upcomingVisits.filter(v => v.visitInfo.status === 'overdue');
        const upcomingAndTodayVisits = upcomingVisits.filter(v => v.visitInfo.status !== 'overdue');

        reminderSection.innerHTML = `
            <div class="d-flex gap-4">
                <!-- Overdue Visits -->
                <div class="flex-grow-1">
                    <div class="reminder-header">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center">
                                <h5 class="mb-0"><i class="bi bi-exclamation-circle text-danger"></i> Overdue Visits</h5>
                                ${overdueVisits.length > 0 ? `
                                    <span class="ms-2 badge rounded-pill bg-danger" style="font-size: 0.8rem; position: relative; top: -8px;">
                                        ${overdueVisits.length}
                                    </span>
                                ` : ''}
                            </div>
                            ${overdueVisits.length > 3 ? `
                                <small class="text-muted">Scroll to see ${overdueVisits.length - 3} more</small>
                            ` : ''}
                        </div>
                    </div>
                    <div class="reminder-list">
                        ${overdueVisits.map(({ lead, visitInfo }) => `
                            <div class="reminder-item ${visitInfo.status}">
                                <span class="${getVisitBadgeClass(visitInfo.status)}">${visitInfo.message}</span>
                                <strong>${lead.fields['Name of outlet'] || 'Unnamed Outlet'}</strong>
                                <span>${lead.fields['Contact Person'] || 'No contact'}</span>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="editLead('${lead.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            </div>
                        `).join('')}
                        ${overdueVisits.length === 0 ? '<p class="text-muted">No overdue visits</p>' : ''}
                    </div>
                </div>

                <!-- Upcoming Visits -->
                <div class="flex-grow-1">
                    <div class="reminder-header">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center">
                                <h5 class="mb-0"><i class="bi bi-calendar-check text-primary"></i> Upcoming Visits</h5>
                                ${upcomingAndTodayVisits.length > 0 ? `
                                    <span class="ms-2 badge rounded-pill bg-primary" style="font-size: 0.8rem; position: relative; top: -8px;">
                                        ${upcomingAndTodayVisits.length}
                                    </span>
                                ` : ''}
                            </div>
                            <div class="d-flex align-items-center">
                                <small class="text-muted me-2">Next 7 days</small>
                                ${upcomingAndTodayVisits.length > 3 ? `
                                    <small class="text-muted">Scroll to see ${upcomingAndTodayVisits.length - 3} more</small>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="reminder-list">
                        ${upcomingAndTodayVisits.map(({ lead, visitInfo }) => `
                            <div class="reminder-item ${visitInfo.status}">
                                <span class="${getVisitBadgeClass(visitInfo.status)}">${visitInfo.message}</span>
                                <strong>${lead.fields['Name of outlet'] || 'Unnamed Outlet'}</strong>
                                <span>${lead.fields['Contact Person'] || 'No contact'}</span>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="editLead('${lead.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                            </div>
                        `).join('')}
                        ${upcomingAndTodayVisits.length === 0 ? '<p class="text-muted">No upcoming visits this week</p>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

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
        
        // Add event listener to the new button
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
        
        // Add event listener to the new button
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
        
        // Add event listener to the new select
        newRecordsPerPageSelect.addEventListener('change', (e) => {
            recordsPerPage = parseInt(e.target.value);
            currentPage = 1; // Reset to first page when changing records per page
            renderRecords();
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    let debounceTimer;

    function handleSearch(e) {
        showLoading();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase();
            // Update filteredRecords based on search and user region
            const userRegion = JSON.parse(localStorage.getItem('user'))?.region;
            
            filteredRecords = records.filter(record => {
                const leadRegion = record.fields.assigned_to;
                
                if (leadRegion !== userRegion) return false;
                
                const contactPerson = record.fields['Contact Person']?.toLowerCase() || '';
                const businessName = record.fields['Name of outlet']?.toLowerCase() || '';
                const address = record.fields['Address']?.toLowerCase() || '';
                
                return contactPerson.includes(searchTerm) ||
                       businessName.includes(searchTerm) ||
                       address.includes(searchTerm);
            });
            
            currentPage = 1; // Reset to first page when searching
            renderRecords(); // This will use the updated filteredRecords
            hideLoading();
        }, 300);
    }

    if (searchInput) {
        // Clear existing listeners
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        newSearchInput.addEventListener('input', handleSearch);
    }

    // Add clear search functionality
    if (clearSearchBtn) {
        // Clear existing listeners
        const newClearSearchBtn = clearSearchBtn.cloneNode(true);
        clearSearchBtn.parentNode.replaceChild(newClearSearchBtn, clearSearchBtn);
        
        newClearSearchBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
                handleSearch({ target: searchInput });
            }
        });
    }

    // Setup desktop sort dropdowns
    const sortToggles = document.querySelectorAll('.sort-toggle');
    const sortOptions = document.querySelectorAll('.sort-option');
    
    // Close all dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.sort-dropdown')) {
            document.querySelectorAll('.sort-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });

    // Toggle dropdown on button click
    sortToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = toggle.closest('.sort-dropdown');
            
            // Close all other dropdowns
            document.querySelectorAll('.sort-dropdown').forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('active');
        });
    });

    // Handle sort option selection
    sortOptions.forEach(option => {
        option.addEventListener('click', handleSortOption);
    });

    // Setup mobile sort functionality
    const mobileSortBtn = document.getElementById('mobileSortBtn');
    const mobileSortMenu = document.getElementById('mobileSortMenu');
    const closeMobileSort = document.getElementById('closeMobileSort');
    const mobileBackdrop = document.createElement('div');
    mobileBackdrop.className = 'mobile-sort-backdrop';
    document.body.appendChild(mobileBackdrop);

    function showMobileSort() {
        mobileSortMenu.style.display = 'block';
        mobileBackdrop.classList.add('active');
        setTimeout(() => {
            mobileSortMenu.classList.add('active');
        }, 10);
    }

    function hideMobileSort() {
        mobileSortMenu.classList.remove('active');
        mobileBackdrop.classList.remove('active');
        setTimeout(() => {
            mobileSortMenu.style.display = 'none';
        }, 300);
    }

    if (mobileSortBtn) {
        mobileSortBtn.addEventListener('click', showMobileSort);
    }

    if (closeMobileSort) {
        closeMobileSort.addEventListener('click', hideMobileSort);
    }

    mobileBackdrop.addEventListener('click', hideMobileSort);

    // Handle mobile sort options
    const mobileSortOptions = document.querySelectorAll('.mobile-sort-option');
    mobileSortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            handleSortOption(e);
            hideMobileSort();
        });
    });

    // Shared sort handling function
    function handleSortOption(e) {
        e.stopPropagation();
        const field = e.target.getAttribute('data-field');
        const order = e.target.getAttribute('data-order');
        
        showLoading();
        
        // Sort the records
        filteredRecords.sort((a, b) => {
            const valueA = a.fields[field] || '';
            const valueB = b.fields[field] || '';
            
            // Special handling for different field types
            switch(field) {
                case 'Rating':
                    const ratingOrder = { 'Gold': 3, 'Silver': 2, 'Bronze': 1, '': 0 };
                    const ratingA = ratingOrder[valueA] || 0;
                    const ratingB = ratingOrder[valueB] || 0;
                    return order === 'asc' ? ratingA - ratingB : ratingB - ratingA;
                    
                case 'Last Visit Date':
                case 'Next Visit Date':
                    const dateA = valueA ? new Date(valueA).getTime() : 0;
                    const dateB = valueB ? new Date(valueB).getTime() : 0;
                    return order === 'asc' ? dateA - dateB : dateB - dateA;
                    
                case 'Closing Probability':
                    const probA = parseFloat(valueA) || 0;
                    const probB = parseFloat(valueB) || 0;
                    return order === 'asc' ? probA - probB : probB - probA;
                    
                default:
                    // Text fields (Contact Person, Name of outlet)
                    const textA = valueA.toString().toLowerCase();
                    const textB = valueB.toString().toLowerCase();
                    if (order === 'asc') {
                        return textA.localeCompare(textB);
                    } else {
                        return textB.localeCompare(textA);
                    }
            }
        });
        
        currentPage = 1; // Reset to first page when sorting
        renderRecords();
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
                ${lead.fields['Rating'] ? 
                    `<span class="rating-badge rating-${lead.fields['Rating'].toLowerCase()}">${lead.fields['Rating']}</span>` 
                    : '-'}
            </td>
            <td>${lead.fields['Last Visit Date'] || '-'}</td>
            <td>${lead.fields['Next Visit Date'] || '-'}</td>
            <td>${lead.fields['Closing Probability'] ? Math.round(lead.fields['Closing Probability'] * 100) + '%' : '-'}</td>
            <td>
                <span class="status-badge ${getStatusBadgeClass(status)}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td>
                <button class="btn btn-outline-primary" onclick="editLead('${lead.id}')">
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
    const visitInfo = getVisitStatus(lead.fields['Last Visit Date'], lead.fields['Next Visit Date']);
    const visitBadgeClass = getVisitBadgeClass(visitInfo.status);

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
                <p><i class="bi bi-telephone"></i> ${lead.fields['Tel'] || 'No phone'}</p>
                <p><i class="bi bi-envelope"></i> ${lead.fields['Email'] || '-'}</p>
                <p><strong>Rating:</strong> ${lead.fields['Rating'] ? 
                    `<span class="rating-badge rating-${lead.fields['Rating'].toLowerCase()}">${lead.fields['Rating']}</span>` 
                    : '-'}</p>
                <p><strong>Last Visit:</strong> ${lead.fields['Last Visit Date'] || '-'}</p>
                <p class="visit-status">
                    <strong>Next Visit:</strong> ${lead.fields['Next Visit Date'] || '-'}
                    ${lead.fields['Next Visit Date'] ? 
                        `<span class="${visitBadgeClass}">${visitInfo.message}</span>` 
                        : ''}
                </p>
                <p><strong>Closing Probability:</strong> ${lead.fields['Closing Probability'] ? Math.round(lead.fields['Closing Probability'] * 100) + '%' : '-'}</p>
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

function getVisitStatus(lastVisitDate, nextVisitDate) {
    const today = new Date();
    const next = nextVisitDate ? new Date(nextVisitDate) : null;

    if (!next) return { status: 'no-visit', message: 'No visit scheduled' };

    const daysUntilNext = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNext < 0) {
        return { 
            status: 'overdue', 
            message: `Overdue by ${Math.abs(daysUntilNext)} days`,
            daysUntil: daysUntilNext
        };
    } else if (daysUntilNext === 0) {
        return { 
            status: 'today', 
            message: 'Visit scheduled for today',
            daysUntil: 0
        };
    } else if (daysUntilNext <= 7) {
        return { 
            status: 'upcoming', 
            message: `Visit in ${daysUntilNext} days`,
            daysUntil: daysUntilNext
        };
    } else {
        return { 
            status: 'scheduled', 
            message: `Visit in ${daysUntilNext} days`,
            daysUntil: daysUntilNext
        };
    }
}

function getVisitBadgeClass(visitStatus) {
    switch(visitStatus) {
        case 'overdue':
            return 'badge bg-danger';
        case 'today':
            return 'badge bg-warning';
        case 'upcoming':
            return 'badge bg-info';
        case 'scheduled':
            return 'badge bg-success';
        default:
            return 'badge bg-secondary';
    }
}

// Update the getUpcomingVisits function to also get overdue visits
function getUpcomingVisits() {
    const today = new Date();
    return filteredRecords
        .map(lead => {
            const nextVisit = lead.fields['Next Visit Date'] ? new Date(lead.fields['Next Visit Date']) : null;
            if (!nextVisit) return null;
            
            return {
                lead,
                visitInfo: getVisitStatus(lead.fields['Last Visit Date'], lead.fields['Next Visit Date'])
            };
        })
        .filter(item => 
            item !== null && 
            (item.visitInfo.status === 'today' || 
             item.visitInfo.status === 'upcoming' ||
             item.visitInfo.status === 'overdue')
        )
        .sort((a, b) => {
            // Sort overdue visits first, then today, then upcoming
            if (a.visitInfo.status === 'overdue' && b.visitInfo.status !== 'overdue') return -1;
            if (b.visitInfo.status === 'overdue' && a.visitInfo.status !== 'overdue') return 1;
            return a.visitInfo.daysUntil - b.visitInfo.daysUntil;
        });
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

    // Load leads - this will call all other initialization functions
    loadLeads();
    
    // REMOVED: setupSearch(); - now called from loadLeads to avoid duplicate initializations
});