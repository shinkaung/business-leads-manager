// Airtable configuration for main database (outlets)
const AIRTABLE_API_KEY = 'pataBu2eaV0V5tEHx.2fde3b7ffdc42d856e167a7551f74f8770a41af956087fa09a2df831fd632c3c';
const AIRTABLE_BASE_ID = 'app5GPyIEcYQTRgST';
const AIRTABLE_TABLE_NAME = 'tblIL5ZHWNkMDM0sV';

// Configuration for products database
const PRODUCTS_BASE_ID = 'appipp8LFUGElp3Di'; 
const PRODUCTS_TABLE_NAME = 'tblUam9MjP8LeLfgf'; 

// Add these constants at the top
const PAGE_SIZE = 100; // Number of records per page
let cachedRecords = null;
let isLoadingRecords = false;
let loadingPromise = null;

// Add at the top with other constants
const CACHE_KEY = 'airtableCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Export functions and constants
export { 
    AIRTABLE_API_KEY, 
    AIRTABLE_BASE_ID, 
    AIRTABLE_TABLE_NAME,
    createAirtableRecord,
    updateAirtableRecord,
    fetchAirtableData,
    fetchProductsData,
    deleteAirtableRecord
};

// Fetch data from Airtable (outlets)
async function fetchAirtableData(forceRefresh = false) {
    // Try to get from localStorage first
    if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
        }
    }

    // If already loading, return existing promise
    if (isLoadingRecords && loadingPromise) {
        return loadingPromise;
    }

    isLoadingRecords = true;
    loadingPromise = (async () => {
        try {
            const records = [];
            let offset = null;
            
            do {
                const params = new URLSearchParams({
                    'pageSize': PAGE_SIZE,
                    'view': 'Grid view'
                });
                
                if (offset) params.append('offset', offset);

                const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?${params}`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch data');

                const data = await response.json();
                records.push(...data.records);
                offset = data.offset;

                // Cache progressively
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: records,
                    timestamp: Date.now()
                }));

            } while (offset);

            return records;
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        } finally {
            isLoadingRecords = false;
            loadingPromise = null;
        }
    })();

    return loadingPromise;
}

// Fetch products from separate base
async function fetchProductsData() {
    try {
        const url = `https://api.airtable.com/v0/${PRODUCTS_BASE_ID}/${PRODUCTS_TABLE_NAME}?view=Grid%20view`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products from Airtable');
        }

        const data = await response.json();
        return data.records;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

async function createAirtableRecord(record) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [{
                    fields: record
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create record');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating record:', error);
        throw error;
    }
}

async function updateAirtableRecord(recordId, fields) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: fields
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update record');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating record:', error);
        throw error;
    }
}

// Delete record function
async function deleteAirtableRecord(recordId) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete record');
    }

    return await response.json();
} 