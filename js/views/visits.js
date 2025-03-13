import { fetchAirtableData, updateAirtableRecord } from '../shared/airtable.js';

// Global variables
let visits = [];
let filteredVisits = [];

// Constants for visit scheduling
const VISIT_INTERVALS = {
    'Gold': 30,   // 1 month
    'Silver': 45, // 1.5 months
    'Bronze': 60  // 2 months
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '../pages/login.html';
        return;
    }

    initializeFilters();
    loadVisits();

    // Add event listeners for visit completion steps
    const confirmCompletionBtn = document.getElementById('confirmCompletion');
    const skipNextVisitBtn = document.getElementById('skipNextVisit');
    const scheduleNextVisitBtn = document.getElementById('scheduleNextVisit');

    if (confirmCompletionBtn) {
        confirmCompletionBtn.addEventListener('click', handleVisitCompletion);
    }
    if (skipNextVisitBtn) {
        skipNextVisitBtn.addEventListener('click', handleSkipNextVisit);
    }
    if (scheduleNextVisitBtn) {
        scheduleNextVisitBtn.addEventListener('click', handleScheduleNextVisit);
    }
});

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'block';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function initializeFilters() {
    // Search input handler
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            applyFilters();
        });
    }

    // Date range filter change handler
    document.getElementById('dateRangeFilter').addEventListener('change', (e) => {
        const customDateRange = document.getElementById('customDateRange');
        if (e.target.value === 'custom') {
            customDateRange.style.display = 'block';
        } else {
            customDateRange.style.display = 'none';
            applyFilters();
        }
    });

    // Visit status filter change handler
    document.getElementById('visitStatusFilter').addEventListener('change', applyFilters);

    // Custom date range inputs
    document.getElementById('dateFrom').addEventListener('change', applyFilters);
    document.getElementById('dateTo').addEventListener('change', applyFilters);
}

async function loadVisits() {
    showLoading();

    try {
        // Always force a refresh when loading visits
        const records = await fetchAirtableData(true);
        const userData = JSON.parse(localStorage.getItem('user'));
        const userRegion = userData?.region;

        // Filter records for the current user's region
        visits = records.filter(record => record.fields.assigned_to === userRegion);
        
        applyFilters();
    } catch (error) {
        console.error('Error loading visits:', error);
        document.querySelector('.visits-list').innerHTML = '<div class="alert alert-danger">Failed to load visits</div>';
    } finally {
        hideLoading();
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('visitStatusFilter').value;
    const dateRangeFilter = document.getElementById('dateRangeFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

    filteredVisits = visits.filter(visit => {
        // Apply search filter
        if (searchQuery) {
            const businessName = (visit.fields['Name of outlet'] || '').toLowerCase();
            const contactPerson = (visit.fields['Contact Person'] || '').toLowerCase();
            const address = (visit.fields['Address'] || '').toLowerCase();
            const phone = (visit.fields['Tel'] || '').toLowerCase();

            const matchesSearch = businessName.includes(searchQuery) ||
                                contactPerson.includes(searchQuery) ||
                                address.includes(searchQuery) ||
                                phone.includes(searchQuery);

            if (!matchesSearch) return false;
        }

        const nextVisitDate = visit.fields['Next Visit Date'] ? new Date(visit.fields['Next Visit Date']) : null;
        const lastVisitDate = visit.fields['Last Visit Date'] ? new Date(visit.fields['Last Visit Date']) : null;
        const today = new Date();

        const visitStatus = getVisitStatus(lastVisitDate, nextVisitDate);

        // Apply status filter
        if (statusFilter !== 'all') {
            switch (statusFilter) {
                case 'upcoming':
                    if (visitStatus.status !== 'upcoming' && visitStatus.status !== 'today') return false;
                    break;
                case 'completed':
                    if (visitStatus.status !== 'completed') return false;
                    break;
                case 'overdue':
                    if (visitStatus.status !== 'overdue') return false;
                    break;
            }
        }

        // Apply date range filter
        if (dateRangeFilter !== 'all' && nextVisitDate) {
            const visitDate = nextVisitDate;
            switch (dateRangeFilter) {
                case 'today':
                    if (!isSameDay(visitDate, today)) return false;
                    break;
                case 'week':
                    if (!isThisWeek(visitDate)) return false;
                    break;
                case 'month':
                    if (!isThisMonth(visitDate)) return false;
                    break;
                case 'custom':
                    if (dateFrom && visitDate < new Date(dateFrom)) return false;
                    if (dateTo && visitDate > new Date(dateTo)) return false;
                    break;
            }
        }

        return true;
    });

    renderVisits();
}

function renderVisits() {
    const visitsList = document.querySelector('.visits-list');
    document.getElementById('totalVisits').textContent = filteredVisits.length;

    if (filteredVisits.length === 0) {
        visitsList.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="bi bi-info-circle me-2"></i>
                No visits found matching the filters
            </div>`;
        return;
    }

    // Sort visits by date
    filteredVisits.sort((a, b) => {
        const dateA = new Date(a.fields['Next Visit Date']);
        const dateB = new Date(b.fields['Next Visit Date']);
        return dateA - dateB;
    });

    // Create both desktop and mobile views
    visitsList.innerHTML = `
        <!-- Desktop View -->
        <div class="table-responsive desktop-view">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th style="min-width: 200px;">Business & Contact</th>
                        <th style="min-width: 180px;">Contact Details</th>
                        <th style="min-width: 200px;">Visit Schedule</th>
                        <th style="min-width: 120px;">Status</th>
                        <th style="min-width: 160px;">Actions</th>
                    </tr>
                </thead>
                <tbody class="table-group-divider">
                    ${filteredVisits.map(visit => createVisitCard(visit)).join('')}
                </tbody>
            </table>
        </div>

        <!-- Mobile View -->
        <div class="mobile-view">
            <div class="mobile-cards">
                ${filteredVisits.map(visit => createMobileVisitCard(visit)).join('')}
            </div>
        </div>
    `;

    initializeTooltips();
}

function createVisitCard(visit) {
    const nextVisitDate = visit.fields['Next Visit Date'] ? new Date(visit.fields['Next Visit Date']) : null;
    const lastVisitDate = visit.fields['Last Visit Date'] ? new Date(visit.fields['Last Visit Date']) : null;
    const today = new Date();
    
    const visitStatus = getVisitStatus(lastVisitDate, nextVisitDate);
    const statusClass = getStatusClass(visitStatus.status);
    const rating = visit.fields['Rating'] || 'Bronze';
    
    return `
        <tr class="visit-row ${statusClass}">
            <td>
                <div class="d-flex flex-column">
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-semibold text-dark">${visit.fields['Name of outlet'] || 'Unnamed Outlet'}</span>
                        <span class="badge ${getRatingBadgeClass(rating)}">${rating}</span>
                    </div>
                    <small class="text-muted">${visit.fields['Contact Person'] || 'No contact'}</small>
                </div>
            </td>
            <td>
                <div class="d-flex flex-column">
                    <div class="text-secondary">
                        <i class="bi bi-geo-alt-fill me-1"></i>
                        ${visit.fields['Address'] || 'No address'}
                    </div>
                    <div class="text-secondary">
                        <i class="bi bi-telephone-fill me-1"></i>
                        ${visit.fields['Tel'] || 'No phone'}
                    </div>
                </div>
            </td>
            <td>
                <div class="d-flex flex-column">
                    ${nextVisitDate ? `
                        <div class="mb-1">
                            <i class="bi bi-calendar-check-fill me-1 text-primary"></i>
                            <span class="fw-medium">Next: ${formatDate(nextVisitDate)}</span>
                        </div>
                    ` : ''}
                    ${lastVisitDate ? `
                        <div class="text-muted small">
                            <i class="bi bi-calendar-x-fill me-1"></i>
                            Last: ${formatDate(lastVisitDate)}
                        </div>
                    ` : ''}
                </div>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(visitStatus.status)} d-inline-flex align-items-center gap-1">
                    ${getStatusIcon(visitStatus.status)}
                    ${visitStatus.message}
                </span>
            </td>
            <td>
                <div class="d-flex gap-2">
                    ${visitStatus.status === 'completed' ? `
                        <button class="btn btn-info btn-sm" onclick="markVisitComplete('${visit.id}')" data-bs-toggle="tooltip" title="Schedule Next Visit">
                            <i class="bi bi-calendar-plus"></i>
                        </button>
                    ` : nextVisitDate <= today ? `
                        <button class="btn btn-success btn-sm" onclick="markVisitComplete('${visit.id}')" data-bs-toggle="tooltip" title="Mark as Visited">
                            <i class="bi bi-check-circle-fill"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-primary btn-sm" onclick="editLead('${visit.id}')" data-bs-toggle="tooltip" title="Edit Lead">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function createMobileVisitCard(visit) {
    const nextVisitDate = new Date(visit.fields['Next Visit Date']);
    const lastVisitDate = visit.fields['Last Visit Date'] ? new Date(visit.fields['Last Visit Date']) : null;
    const visitStatus = getVisitStatus(lastVisitDate, nextVisitDate);
    const rating = visit.fields['Rating'] || 'Bronze';

    return `
        <div class="mobile-card status-${visitStatus.status}">
            <div class="mobile-card-header">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0">${visit.fields['Name of outlet'] || 'Unnamed Outlet'}</h5>
                    <span class="badge ${getRatingBadgeClass(rating)}">${rating}</span>
                </div>
                <div class="text-muted small">${visit.fields['Contact Person'] || 'No contact'}</div>
            </div>

            <div class="mobile-card-field">
                <div class="mobile-card-label"><i class="bi bi-geo-alt-fill"></i> Address</div>
                <div class="mobile-card-value">${visit.fields['Address'] || 'No address'}</div>
            </div>

            <div class="mobile-card-field">
                <div class="mobile-card-label"><i class="bi bi-telephone-fill"></i> Phone</div>
                <div class="mobile-card-value">${visit.fields['Tel'] || 'No phone'}</div>
            </div>

            <div class="mobile-card-field">
                <div class="mobile-card-label"><i class="bi bi-calendar-check-fill"></i> Next Visit</div>
                <div class="mobile-card-value">${formatDate(nextVisitDate)}</div>
            </div>

            ${lastVisitDate ? `
                <div class="mobile-card-field">
                    <div class="mobile-card-label"><i class="bi bi-calendar-x-fill"></i> Last Visit</div>
                    <div class="mobile-card-value">${formatDate(lastVisitDate)}</div>
                </div>
            ` : ''}

            <div class="mobile-card-field">
                <div class="mobile-card-label"><i class="bi bi-info-circle-fill"></i> Status</div>
                <div class="mobile-card-value">
                    <span class="badge ${getStatusBadgeClass(visitStatus.status)}">
                        ${getStatusIcon(visitStatus.status)}
                        ${visitStatus.message}
                    </span>
                </div>
            </div>

            <div class="mobile-card-actions">
                ${visitStatus.status === 'completed' ? `
                    <button class="btn btn-info btn-sm" onclick="markVisitComplete('${visit.id}')" data-bs-toggle="tooltip" title="Schedule Next Visit">
                        <i class="bi bi-calendar-plus"></i>
                    </button>
                ` : nextVisitDate <= new Date() ? `
                    <button class="btn btn-success btn-sm" onclick="markVisitComplete('${visit.id}')" data-bs-toggle="tooltip" title="Mark as Visited">
                        <i class="bi bi-check-circle-fill"></i> Complete
                    </button>
                ` : ''}
                <button class="btn btn-primary btn-sm" onclick="editLead('${visit.id}')" data-bs-toggle="tooltip" title="Edit Lead">
                    <i class="bi bi-pencil-fill"></i> Edit
                </button>
            </div>
        </div>
    `;
}

function getVisitStatus(lastVisitDate, nextVisitDate) {
    const today = new Date();
    const next = nextVisitDate ? new Date(nextVisitDate) : null;
    const last = lastVisitDate ? new Date(lastVisitDate) : null;

    // If there's a last visit date but no next visit date, it's completed
    if (last && !next) {
        return { 
            status: 'completed', 
            message: `Completed on ${formatDate(last)}`,
            daysUntil: null,
            lastVisitDate: last
        };
    }

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

function getStatusClass(status) {
    switch(status) {
        case 'overdue': return 'visit-overdue';
        case 'today': return 'visit-today';
        case 'upcoming': return 'visit-upcoming';
        case 'scheduled': return 'visit-scheduled';
        default: return '';
    }
}

function getStatusBadgeClass(visitStatus) {
    switch(visitStatus) {
        case 'overdue':
            return 'badge bg-danger';
        case 'today':
            return 'badge bg-warning';
        case 'upcoming':
            return 'badge bg-info';
        case 'scheduled':
            return 'badge bg-success';
        case 'completed':
            return 'badge bg-secondary';
        default:
            return 'badge bg-secondary';
    }
}

function getStatusIcon(status) {
    switch(status) {
        case 'overdue':
            return '<i class="bi bi-exclamation-circle-fill"></i>';
        case 'today':
            return '<i class="bi bi-calendar-event-fill"></i>';
        case 'upcoming':
            return '<i class="bi bi-calendar-check-fill"></i>';
        case 'scheduled':
            return '<i class="bi bi-calendar-fill"></i>';
        case 'completed':
            return '<i class="bi bi-check-circle-fill"></i>';
        default:
            return '<i class="bi bi-dash-circle-fill"></i>';
    }
}

function suggestNextVisitDate(lead) {
    const rating = lead.fields['Rating'] || 'Bronze'; // Default to Bronze if no rating
    const interval = VISIT_INTERVALS[rating] || 60; // Default to 60 days if rating not found
    
    const today = new Date();
    const nextVisit = new Date(today);
    nextVisit.setDate(today.getDate() + interval);
    
    return nextVisit;
}

// Split the visit completion into two steps
async function handleVisitCompletion(event) {
    event.preventDefault();
    
    const visitId = document.getElementById('visitId').value;
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    try {
        showLoading();
        
        // Step 1: Just mark the visit as completed
        const updatedFields = {
            'Last Visit Date': new Date().toISOString().split('T')[0],
            'Next Visit Date': null  // Clear the next visit date
        };

        // Update Airtable record
        await updateAirtableRecord(visitId, updatedFields);
        
        // Hide step 1 and show step 2
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        
        // Set suggested next visit date
        const suggestedDate = suggestNextVisitDate(visit);
        document.getElementById('nextVisitDate').value = suggestedDate.toISOString().split('T')[0];
        
        hideLoading();
        
    } catch (error) {
        console.error('Error completing visit:', error);
        alert('Failed to complete visit. Please try again.');
        hideLoading();
    }
}

async function handleSkipNextVisit(event) {
    event.preventDefault();
    
    // Just close the modal and refresh the page
    const modal = bootstrap.Modal.getInstance(document.getElementById('visitCompletionModal'));
    modal.hide();
    
    // Force a refresh
    const timestamp = new Date().getTime();
    window.location.href = `./visits.html?forceRefresh=true&t=${timestamp}`;
}

async function handleScheduleNextVisit(event) {
    event.preventDefault();
    
    const visitId = document.getElementById('visitId').value;
    const nextVisitDate = document.getElementById('nextVisitDate').value;
    
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    try {
        showLoading();
        
        // Update only the Next Visit Date
        const updatedFields = {
            'Next Visit Date': nextVisitDate
        };

        // Update Airtable record
        await updateAirtableRecord(visitId, updatedFields);
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('visitCompletionModal'));
        modal.hide();

        // Force a refresh
        const timestamp = new Date().getTime();
        window.location.href = `./visits.html?forceRefresh=true&t=${timestamp}`;
        
    } catch (error) {
        console.error('Error scheduling next visit:', error);
        alert('Failed to schedule next visit. Please try again.');
    } finally {
        hideLoading();
    }
}

// Helper functions for date comparison
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function isThisWeek(date) {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 6);
    
    return date >= firstDay && date <= lastDay;
}

function isThisMonth(date) {
    const today = new Date();
    return date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Update the markVisitComplete function
window.markVisitComplete = function(visitId) {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    // Set up the completion modal
    document.getElementById('visitId').value = visitId;
    
    // Check if the visit is already completed
    const lastVisitDate = visit.fields['Last Visit Date'] ? new Date(visit.fields['Last Visit Date']) : null;
    const nextVisitDate = visit.fields['Next Visit Date'] ? new Date(visit.fields['Next Visit Date']) : null;
    const visitStatus = getVisitStatus(lastVisitDate, nextVisitDate);
    
    if (visitStatus.status === 'completed') {
        // For completed visits, show step 2 directly
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        document.getElementById('modalTitle').textContent = 'Schedule Next Visit';
        
        // Set suggested next visit date
        const suggestedDate = suggestNextVisitDate(visit);
        document.getElementById('nextVisitDate').value = suggestedDate.toISOString().split('T')[0];
    } else {
        // For non-completed visits, show step 1
        document.getElementById('step1').style.display = 'block';
        document.getElementById('step2').style.display = 'none';
        document.getElementById('modalTitle').textContent = 'Complete Visit';
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('visitCompletionModal'));
    modal.show();
};

window.editLead = function(id) {
    window.location.href = `../pages/edit.html?id=${id}&returnTo=visits`;
};

window.viewVisitHistory = function(visitId) {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    const visitNotes = visit.fields['Visit Notes'] || [];
    const visitOutcomes = visit.fields['Visit Outcomes'] || [];
    const visitDates = visit.fields['Visit Dates'] || [];

    const historyContent = document.getElementById('visitHistoryContent');
    
    if (visitNotes.length === 0) {
        historyContent.innerHTML = '<div class="alert alert-info">No visit history available</div>';
    } else {
        const historyHTML = visitNotes.map((note, index) => `
            <div class="visit-history-item">
                <div class="visit-history-date">
                    <i class="bi bi-calendar"></i> ${formatDate(new Date(visitDates[index]))}
                </div>
                <div class="visit-history-notes">
                    <i class="bi bi-chat-text"></i> ${note}
                </div>
                <div class="visit-history-outcome">
                    <i class="bi bi-check-circle"></i> Outcome: ${visitOutcomes[index] || 'Not specified'}
                </div>
            </div>
        `).join('');
        
        historyContent.innerHTML = historyHTML;
    }

    const modal = new bootstrap.Modal(document.getElementById('visitHistoryModal'));
    modal.show();
};

function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
}

// Add this new function for rating badge classes
function getRatingBadgeClass(rating) {
    switch(rating.toLowerCase()) {
        case 'gold':
            return 'rating-gold';
        case 'silver':
            return 'rating-silver';
        case 'bronze':
            return 'rating-bronze';
        default:
            return 'rating-bronze';
    }
} 