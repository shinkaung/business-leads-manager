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
    
    // Apply area filter if selected
    const areaFilter = document.getElementById('areaFilter');
    if (areaFilter && areaFilter.value) {
        records = filterByPostalDistrict(records, areaFilter.value);
    }
    
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
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        // Check URL parameters for force refresh
        const urlParams = new URLSearchParams(window.location.search);
        const forceRefresh = urlParams.has('forceRefresh');

        // Clear cache if force refresh is requested
        if (forceRefresh) {
            localStorage.removeItem('airtableCache');
        }

        // Fetch fresh data
        records = await fetchAirtableData(forceRefresh);
        
        // Render the records
        renderRecords(records);
        
        // Update total records count
        updateRecordCount(records.length);
        
        // Initialize other components
        setupSearch();
        initializeAreaFilter();

        // Clean up URL parameters without refreshing the page
        if (forceRefresh) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        const tbody = document.querySelector('#dataTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="20" class="text-center text-danger">Failed to load records</td></tr>';
        }
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

function createTableRow(record) {
    const status = record.fields['Status'] || 'New Lead';
    const statusClass = getStatusClass(status);
    return `
        <tr class="${statusClass}">
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
                <span class="status-badge ${getStatusBadgeClass(status)}">
                    ${status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editRecord('${record.id}')">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        </tr>
    `;
}

function createMobileCard(record) {
    const status = record.fields['Status'] || 'New Lead';
    const statusClass = getStatusClass(status);
    return `
        <div class="mobile-card ${statusClass}">
            <div class="lead-card-header">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h4>${record.fields['Name of outlet'] || 'Unnamed Outlet'}</h4>
                    <span class="status-badge ${getStatusBadgeClass(status)}">
                        ${status}
                    </span>
                </div>
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
            return 'status-new'; // Default to new lead styling if status is unknown
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

function getPostalInfo(postalCode) {
    if (!postalCode) return { district: '', sector: '', isValid: false };
    
    // Convert to string and clean up
    const code = postalCode.toString().trim();
    
    // Validate Singapore postal code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
        return { district: '', sector: '', isValid: false };
    }
    
    const sector = code.substring(0, 2);
    
    // Map sectors to their correct districts
    const sectorToDistrict = {
        // MOT1/K1 sectors
        '01': 'D01', '02': 'D01', '03': 'D01', '04': 'D01', '05': 'D01', 
        '06': 'D06', '17': 'D07', '18': 'D07', '19': 'D08', '20': 'D08', '21': 'D08',
        
        // MOT2/K2 sectors
        '07': 'D02', '08': 'D02', '10': 'D03', '14': 'D03', '15': 'D03', 
        '16': 'D04', '24': 'D10', '25': 'D10', '26': 'D10', '27': 'D10',
        
        // MOT3/K3 sectors
        '38': 'D14', '39': 'D14', '40': 'D14', '41': 'D14',
        '42': 'D15', '43': 'D15', '44': 'D15', '45': 'D15',
        '46': 'D16', '47': 'D16', '48': 'D16', '49': 'D17',
        '50': 'D17', '51': 'D17', '52': 'D18', '53': 'D19',
        '54': 'D19', '55': 'D19', '81': 'D17', '82': 'D19',
        
        // MOT4/K4 sectors
        '11': 'D05', '12': 'D05', '13': 'D05', '22': 'D09',
        '28': 'D11', '29': 'D11', '30': 'D11',
        '58': 'D21', '59': 'D21', '60': 'D22', '61': 'D22',
        '62': 'D22', '63': 'D22', '64': 'D22', '65': 'D23',
        '66': 'D23', '67': 'D23', '68': 'D23', '69': 'D24',
        '70': 'D24', '71': 'D24',
        
        // MOT5/K5 sectors
        '31': 'D12', '32': 'D12', '33': 'D13', '34': 'D13',
        '35': 'D13', '36': 'D13', '37': 'D13', '56': 'D20',
        '57': 'D20', '72': 'D25', '73': 'D25', '75': 'D25',
        '76': 'D26', '77': 'D26', '78': 'D26', '79': 'D27',
        '80': 'D27'
    };

    // Special handling for sector 09
    if (sector === '09') {
        const thirdDigit = parseInt(code.charAt(2));
        const district = thirdDigit < 5 ? '09A' : '09B';
        return { district, sector, isValid: true };
    }

    // Special handling for sector 23
    if (sector === '23') {
        const thirdDigit = code.charAt(2).toUpperCase();
        if (thirdDigit === 'A') {
            return { district: 'D10', sector: '23', isValid: true };
        } else if (thirdDigit === 'B') {
            return { district: 'D09', sector: '23', isValid: true };
        }
    }

    // Get district from mapping
    const district = sectorToDistrict[sector];
    if (!district) {
        return { district: '', sector, isValid: false };
    }
    
    return { 
        district,
        sector,
        isValid: true
    };
}

function isAddressInSingapore(address) {
    if (!address) return false;
    const lowercaseAddress = address.toLowerCase();
    
    // Check if address contains foreign country names
    const foreignIndicators = ['italy', 'germany', 'malaysia', 'china', 'japan', 
                             'korea', 'thailand', 'vietnam', 'indonesia'];
    
    return !foreignIndicators.some(country => lowercaseAddress.includes(country));
}

function isPostalCodeInArea(postalInfo, areaConfig) {
    const { district, sector, isValid } = postalInfo;
    
    if (!isValid) return false;
    
    // Special handling for sector 06
    if (sector === '06') {
        // Only include 06 if it's explicitly in the districts list
        return areaConfig.districts.includes('D06');
    }
    
    // Check if the district matches
    if (areaConfig.districts.includes(district)) {
        return true;
    }
    
    // Check if the sector matches
    if (areaConfig.sectors.includes(sector)) {
        return true;
    }
    
    return false;
}

function filterByPostalDistrict(records, selectedArea) {
    if (!selectedArea) return records;
    
    const areaMapping = {
        'MOT1/K1': {
            districts: ['D01', 'D06', 'D07', 'D08', '09A'],
            sectors: ['01', '02', '03', '04', '05', '06', '17', '18', '19', '20', '21']
        },
        'MOT2/K2': {
            districts: ['D02', 'D03', 'D04', '09B', 'D10'],
            sectors: ['07', '08', '09', '10', '14', '15', '16', '23', '24', '25', '26', '27']
        },
        'MOT3/K3': {
            districts: ['D14', 'D15', 'D16', 'D17', 'D18', 'D19'],
            sectors: ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', 
                     '49', '50', '51', '52', '53', '54', '55', '81', '82']
        },
        'MOT4/K4': {
            districts: ['D05', 'D09', 'D11', 'D21', 'D22', 'D23', 'D24'],
            sectors: ['11', '12', '13', '22', '28', '29', '30', '58', '59', '60', 
                     '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71']
        },
        'MOT5/K5': {
            districts: ['09B', 'D12', 'D13', 'D20', 'D25', 'D26', 'D27'],
            sectors: ['31', '32', '33', '34', '35', '36', '37', '56', '57', 
                     '72', '73', '75', '76', '77', '78', '79', '80']
        }
    };

    return records.filter(record => {
        const postalCode = record.fields['Postal Code'];
        const address = record.fields['Address'];

        // Skip records with non-Singapore addresses
        if (!isAddressInSingapore(address)) {
            return false;
        }

        const postalInfo = getPostalInfo(postalCode);
        const areaConfig = areaMapping[selectedArea];
        
        if (!areaConfig) return false;
        
        return isPostalCodeInArea(postalInfo, areaConfig);
    });
}

function initializeAreaFilter() {
    const areaFilter = document.getElementById('areaFilter');
    if (!areaFilter) return;
    
    const areaOptions = [
        { value: '', label: 'All Areas' },
        { value: 'MOT1/K1', label: 'MOT1/K1 - York Hsiung (D1, D6-D8, 09A) [Sectors: 01-06, 17-21]' },
        { value: 'MOT2/K2', label: 'MOT2/K2 - Steven Lee (D2-D4, 09B, D10) [Sectors: 07-10, 14-16, 24-27]' },
        { value: 'MOT3/K3', label: 'MOT3/K3 - Gordon Foo/Wyman (D14-D19) [Sectors: 38-55, 81-82]' },
        { value: 'MOT4/K4', label: 'MOT4/K4 - Ivan (D5, D9, D11, D21-24) [Sectors: 11-13, 22, 28-30, 58-71]' },
        { value: 'MOT5/K5', label: 'MOT5/K5 - Vacant (09B, D12-D13, D20, D25-27) [Sectors: 31-37, 56-57, 72-80]' }
    ];
    
    areaFilter.innerHTML = areaOptions.map(option => 
        `<option value="${option.value}">${option.label}</option>`
    ).join('');

    // Add event listener for area filter
    areaFilter.addEventListener('change', () => {
        renderRecords(records);
    });
}

// Make sure to call initializeApp when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);

// Make logout function globally available
window.logout = function() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('./pages/login.html');
};