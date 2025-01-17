// Configuration
const APOLLO_API_KEY = 'w1SuSVuqa5GlbseiD-S1bA';
const AIRTABLE_API_KEY = 'pataBu2eaV0V5tEHx.2fde3b7ffdc42d856e167a7551f74f8770a41af956087fa09a2df831fd632c3c';
const AIRTABLE_BASE_ID = 'app5GPyIEcYQTRgST';
const AIRTABLE_TABLE_NAME = 'tblIL5ZHWNkMDM0sV';

// Apollo API endpoints
const APOLLO_SEARCH_URL = 'https://api.apollo.io/api/v1/people/search';
const APOLLO_BULK_ENRICH_URL = 'https://api.apollo.io/api/v1/people/bulk_match';

// Add a function to update the status on the page
function updateStatus(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.innerHTML += `<div>${message}</div>`;
    }
    console.log(message); // Also log to console
}

async function searchApollo() {
    updateStatus('🔍 Starting Apollo search...');
    const searchParams = {
        api_key: APOLLO_API_KEY,
        q: {
            titles: ["F&B director", "beverage director", "beverage manager", "purchaser"],
            current_location: ["Singapore"],
            industry_tag_ids: ["5567ce9d7369643bc19c0000"]
        },
        page: 1,
        per_page: 25
    };

    try {
        updateStatus('📤 Sending request to Apollo API...');
        const response = await fetch('https://api.apollo.io/api/v1/people/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(searchParams)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Apollo API Error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        updateStatus(`✅ Found ${data.contacts?.length || 0} people in Apollo`);
        
        // Log the raw response to help debug
        console.log('Apollo API Response:', data);
        
        return transformApolloData(data.contacts || []);
    } catch (error) {
        updateStatus(`❌ Error searching Apollo: ${error.message}`);
        console.error('Full error:', error);
        return [];
    }
}

function transformApolloData(apolloPeople) {
    return apolloPeople.map(person => {
        // Combine all possible phone numbers into an array and filter out empty ones
        const phoneNumbers = [
            person.work_direct_phone,
            person.home_phone,
            person.mobile_phone,
            person.corporate_phone,
            person.other_phone,
            person.company_phone,
            person.phone
        ].filter(phone => phone); // Filter out null/undefined/empty values

        // Get the first available phone number, or empty string if none exists
        const primaryPhone = phoneNumbers.length > 0 ? phoneNumbers[0] : '';

        // Map company size to your establishment size categories
        let sizeCategory = '';
        const employeeCount = person.organization?.employee_count || 0;
        if (employeeCount <= 50) {
            sizeCategory = 'Small (<100 pax)';
        } else if (employeeCount <= 200) {
            sizeCategory = 'Medium (100-200 pax)';
        } else {
            sizeCategory = 'Large (200+ pax)';
        }

        return {
            fields: {
                'Contact Person': `${person.first_name || ''} ${person.last_name || ''}`.trim(),
                'Position': person.title || '',
                'Tel': primaryPhone,
                'Email': person.email || '',
                'Name of outlet': person.organization?.name || '',
                'Address': person.organization?.street_address || '',
                'Postal Code': person.organization?.postal_code || '',
                'Size of Establishment': sizeCategory,
                'Category (MOT - Club, Restaurant, Pub, Bistro, Cocktail Bar) (TOT - Coffeeshop, KTV)': 
                    person.organization?.industry || '',
                // Initialize other fields as empty strings
                'Style/Type of Cuisine': '',
                'Products on Tap': '',
                'Estimated Monthly Consumption (HL)': '',
                'Beer Bottle Products': '',
                'Estimated Monthly Consumption (Cartons)': '',
                'Soju Products': '',
                'Proposed Products & HL Target': '',
                'Follow Up Actions': '',
                'Remarks': ''
            }
        };
    });
}

async function importToAirtable(records) {
    updateStatus(`📥 Starting import of ${records.length} records to Airtable...`);
    const batchSize = 10; // Airtable's limit
    const batches = [];
    
    // Split records into batches of 10
    for (let i = 0; i < records.length; i += batchSize) {
        batches.push(records.slice(i, i + batchSize));
    }
    
    updateStatus(`🔄 Processing ${batches.length} batches...`);
    let totalImported = 0;
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        try {
            updateStatus(`📦 Importing batch ${i + 1} of ${batches.length} (${batch.length} records)...`);
            
            const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records: batch })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Batch ${i + 1} failed: ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            totalImported += result.records.length;
            updateStatus(`✅ Batch ${i + 1} complete - ${result.records.length} records imported`);
            
            // Add a small delay between batches to avoid rate limits
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) {
            updateStatus(`❌ Error in batch ${i + 1}: ${error.message}`);
            console.error('Batch error:', error);
            // Continue with next batch despite errors
        }
    }
    
    updateStatus(`🎉 Import complete! Total records imported: ${totalImported}`);
    return totalImported;
}

async function runExportImport() {
    try {
        updateStatus('🚀 Starting Apollo data export process...');
        const apolloData = await searchApollo();
        
        if (apolloData.length > 0) {
            updateStatus(`📊 Transformed ${apolloData.length} records, preparing for Airtable import...`);
            const result = await importToAirtable(apolloData);
            updateStatus('✨ Export/Import process completed successfully!');
            // Log the first record as an example
            console.log('Example record:', apolloData[0]);
        } else {
            updateStatus('⚠️ No records found in Apollo');
        }
    } catch (error) {
        updateStatus(`❌ Export/Import process failed: ${error.message}`);
        console.error('Full error:', error);
    }
}

async function handleCSVImport(csvFile) {
    updateStatus('📑 Processing CSV file...');
    
    try {
        const text = await csvFile.text();
        const rows = text.split('\n');
        const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const records = rows.slice(1)
            .filter(row => row.trim()) // Skip empty rows
            .map(row => {
                const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                const record = {};
                
                headers.forEach((header, index) => {
                    record[header] = values[index] || '';
                });
                
                return transformApolloCSVData(record);
            });

        updateStatus(`✅ Processed ${records.length} records from CSV`);
        return records;
    } catch (error) {
        updateStatus(`❌ Error processing CSV: ${error.message}`);
        throw error;
    }
}

// Field mappings configuration
const fieldMappings = {
    "Title": "Position",
    "Work Direct Phone": "Tel",
    "Home Phone": "Tel",
    "Mobile Phone": "Tel",
    "Corporate Phone": "Tel",
    "Other Phone": "Tel",
    "Company Phone": "Tel",
    "Phone": "Tel",
    "Email": "Email",
    "Company": "Name of outlet",
    "Company Address": "Address",
    "# Employees": "Size of Establishment",
    "Industry": "Category"
};

function transformApolloCSVData(csvRecord) {
    // Build index of available fields in the CSV record
    const availableFields = Object.keys(csvRecord);
    
    // Helper function to get value from mapped fields
    const getMappedValue = (targetField) => {
        const sourceFields = Object.entries(fieldMappings)
            .filter(([_, target]) => target === targetField)
            .map(([source, _]) => source);

        for (const field of sourceFields) {
            if (csvRecord[field] && csvRecord[field].trim()) {
                return csvRecord[field].trim();
            }
        }
        return '';
    };

    // Handle Contact Person
    const contactPerson = csvRecord['Contact Person'] || 
        `${csvRecord['First Name'] || ''} ${csvRecord['Last Name'] || ''}`.trim();

    // Handle Phone Numbers
    let phoneNumber = getMappedValue('Tel');
    if (phoneNumber) {
        // Clean phone number format
        phoneNumber = phoneNumber
            .replace(/'/g, '')  // Remove single quotes
            .replace(/\s+/g, '') // Remove spaces
            .trim();

        // Add +65 prefix if missing for Singapore numbers
        if (phoneNumber.match(/^[6|8|9]\d{7}$/)) {
            phoneNumber = '+65' + phoneNumber;
        }
        // Format existing Singapore numbers
        else if (phoneNumber.match(/^\+65[6|8|9]\d{7}$/)) {
            // Already correctly formatted
        }
        // Remove international numbers that aren't Singapore format
        else if (phoneNumber.match(/^\+(?!65)/)) {
            phoneNumber = '';
        }
    }

    // Handle Address and Postal Code
    let address = getMappedValue('Address');
    let postalCode = '';
    
    if (address) {
        // Skip if address is a URL or LinkedIn
        if (address.includes('http') || address.toLowerCase().includes('linkedin')) {
            address = '';
        } 
        // Skip if address is just a generic location
        else if (['singapore', 'milan', 'culinary', 'bars'].includes(address.toLowerCase().trim())) {
            address = '';
        }
        // Process valid address
        else {
            // Extract postal code
            const postalMatch = address.match(/(\d{6}|\d{5})/);
            if (postalMatch) {
                postalCode = postalMatch[1];
                // Remove postal code from address
                address = address.replace(postalMatch[1], '');
            }
            
            // Clean up address format
            address = address
                .replace(/,\s*Singapore\s*,\s*Singapore/i, ', Singapore')
                .replace(/,\s*Singapore$/i, '')
                .replace(/\s+/g, ' ')
                .trim();
        }
    }

    // Handle Size of Establishment
    let sizeCategory = '';
    const employeeCount = parseInt(csvRecord['# Employees'] || '0');
    if (employeeCount <= 50) {
        sizeCategory = 'Small (<100 pax)';
    } else if (employeeCount <= 200) {
        sizeCategory = 'Medium (100-200 pax)';
    } else {
        sizeCategory = 'Large (200+ pax)';
    }

    // Construct the final record
    return {
        fields: {
            'Contact Person': contactPerson,
            'Position': getMappedValue('Position'),
            'Tel': phoneNumber,
            'Email': getMappedValue('Email'),
            'Name of outlet': getMappedValue('Name of outlet'),
            'Address': address,
            'Postal Code': postalCode,
            'Size of Establishment': sizeCategory,
            'Category': getMappedValue('Category'),
            'Style/Type of Cuisine': '',
            'Products on Tap': '',
            'Estimated Monthly Consumption (HL)': '',
            'Beer Bottle Products': '',
            'Estimated Monthly Consumption (Cartons)': '',
            'Soju Products': '',
            'Proposed Products & HL Target': '',
            'Follow Up Actions': '',
            'Remarks': ''
        }
    };
}

// Export functions for use in other files if needed
export {
    runExportImport,
    searchApollo,
    importToAirtable,
    handleCSVImport,
    transformApolloCSVData
}; 