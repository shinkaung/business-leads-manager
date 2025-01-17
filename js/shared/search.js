import { fetchAirtableData } from './airtable.js';
import { renderRecords } from '../script.js';

// Cache management
let records = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;
let searchTimeout;
const DEBOUNCE_DELAY = 250; // Reduced from 250ms
let searchWorker = null;

// Pre-filter fields for better performance
const SEARCHABLE_FIELDS = ['Contact Person', 'Name of outlet', 'Category', 'Address'];

async function getRecords() {
    const now = Date.now();
    if (records.length && (now - lastFetchTime) < CACHE_DURATION) {
        return records;
    }

    // Start fetching records
    records = await fetchAirtableData();
    lastFetchTime = now;
    buildSearchIndex(records);

    // Listen for record updates
    window.addEventListener('recordsUpdate', (event) => {
        records = event.detail.records;
        buildSearchIndex(records);
        // If there's an active search, update results
        if (currentSearchTerm) {
            const filteredRecords = performSearch(currentSearchTerm, records);
            requestAnimationFrame(() => {
                renderRecords(filteredRecords);
            });
        }
    });

    return records;
}

function buildSearchIndex(records) {
    searchIndex.clear();
    records.forEach(record => {
        // Create a searchable text string for each record
        const searchableText = SEARCHABLE_FIELDS
            .map(field => record.fields[field] || '')
            .join(' ')
            .toLowerCase()
            // Tokenize the text into words
            .split(/\s+/)
            .filter(Boolean);
        
        // Store unique tokens for each record
        searchIndex.set(record.id, new Set(searchableText));
    });
}

function performSearch(searchTerm, records) {
    if (!searchTerm.trim()) {
        return records;
    }

    // Split search terms and remove empty strings
    const terms = searchTerm.toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    // Use Set for faster lookups
    return records.filter(record => {
        const recordTokens = searchIndex.get(record.id);
        return terms.every(term => 
            // Check if any token in the record contains this search term
            Array.from(recordTokens).some(token => token.includes(term))
        );
    });
}

function initializeSearchWorker() {
    const workerCode = `
        let searchIndex = new Map();

        function buildIndex(records, fields) {
            searchIndex.clear();
            records.forEach(record => {
                const searchableText = fields
                    .map(field => record.fields[field] || '')
                    .join(' ')
                    .toLowerCase();
                searchIndex.set(record.id, searchableText);
            });
        }

        function search(term, records) {
            if (!term.trim()) return records;
            const searchTerm = term.toLowerCase();
            return records.filter(record => 
                searchIndex.get(record.id).includes(searchTerm)
            );
        }

        self.onmessage = function(e) {
            const { type, data } = e.data;
            if (type === 'BUILD_INDEX') {
                buildIndex(data.records, data.fields);
                self.postMessage({ type: 'INDEX_BUILT' });
            } else if (type === 'SEARCH') {
                const results = search(data.term, data.records);
                self.postMessage({ type: 'SEARCH_RESULTS', results });
            }
        };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    searchWorker = new Worker(URL.createObjectURL(blob));
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    initializeSearchWorker();
    
    // Initialize with cached data if available
    const cached = localStorage.getItem('airtableCache');
    if (cached) {
        const { data } = JSON.parse(cached);
        searchWorker.postMessage({
            type: 'BUILD_INDEX',
            data: { records: data, fields: SEARCHABLE_FIELDS }
        });
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            searchWorker.postMessage({
                type: 'SEARCH',
                data: { term: searchTerm, records }
            });
        }, DEBOUNCE_DELAY);
    });

    searchWorker.onmessage = (e) => {
        const { type, results } = e.data;
        if (type === 'SEARCH_RESULTS') {
            requestAnimationFrame(() => {
                renderRecords(results);
            });
        }
    };
}

export { setupSearch }; 