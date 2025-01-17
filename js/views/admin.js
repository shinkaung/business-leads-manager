document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth < 768;
    const tableData = []; // Your data array

    function renderView() {
        if (isMobile) {
            const mobileView = document.getElementById('mobileView');
            mobileView.innerHTML = tableData.map(createMobileCard).join('');
        } else {
            // Render table view
            const tbody = document.querySelector('.mobile-table tbody');
            tbody.innerHTML = tableData.map(createTableRow).join('');
        }
    }

    function createTableRow(data) {
        return `
            <tr>
                <td class="priority-high">${data.contactPerson}</td>
                <td class="priority-high">${data.position}</td>
                <td>${data.tel}</td>
                <td>${data.email}</td>
                <td>${data.outlet}</td>
                <td>${data.address}</td>
                <td>${data.postalCode}</td>
                <td>${data.category}</td>
                <td>${data.style}</td>
                <td>${data.size}</td>
                <td>${data.products}</td>
                <td>${data.estimated}</td>
            </tr>
        `;
    }

    // Handle search
    document.querySelector('input[type="text"]').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = tableData.filter(item => 
            item.contactPerson.toLowerCase().includes(searchTerm) ||
            item.outlet.toLowerCase().includes(searchTerm)
        );
        renderView(filteredData);
    });

    // Initial render
    renderView();

    // Handle window resize
    window.addEventListener('resize', () => {
        if ((window.innerWidth < 768 && !isMobile) || 
            (window.innerWidth >= 768 && isMobile)) {
            location.reload();
        }
    });
}); 