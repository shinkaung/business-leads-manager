import { fetchAirtableData, fetchProductsData } from './airtable.js';

let outlets = new Set();
let products = new Set();

async function initializeAutocomplete() {
    try {
        // Fetch all records from both tables in parallel
        const [outletRecords, productRecords] = await Promise.all([
            fetchAirtableData(),
            fetchProductsData()
        ]);
        
        // Extract unique outlet names
        outlets = new Set(
            outletRecords
                .map(record => record.fields['Name of outlet'])
                .filter(name => name)
        );
        
        // Extract unique product names
        products = new Set(
            productRecords
                .map(record => record.fields['Name'])
                .filter(name => name)
        );
        
        // Initialize all datalists
        updateDatalist('outletList', '', outlets);
        updateDatalist('productsOnTapList', '', products);
        updateDatalist('beerBottleProductsList', '', products);
        updateDatalist('sojuProductsList', '', products);
    } catch (error) {
        console.error('Error initializing autocomplete:', error);
    }
}

function setupInputListener(inputId, datalistId, dataset) {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', (e) => {
            updateDatalist(datalistId, e.target.value, dataset);
        });
    }
}

function updateDatalist(datalistId, searchTerm, dataset) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Filter items based on search term
    const filteredItems = Array.from(dataset).filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Add filtered options to datalist
    filteredItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}

export { initializeAutocomplete }; 