// Simple Kinklist Application
document.addEventListener('DOMContentLoaded', function() {
    // Define constants for choice colors
    const COLORS = {
        0: '#FFFFFF', // Not Entered
        1: '#6DB5FE', // Favorite
        2: '#23FD22', // Like
        3: '#FDFD6B', // Indifferent
        4: '#DB6C00', // Maybe
        5: '#920000'  // Limit
    };

    const LABELS = {
        0: 'Not Entered',
        1: 'Favorite',
        2: 'Like',
        3: 'Indifferent',
        4: 'Maybe',
        5: 'Limit'
    };

    // Store kinks data
    let kinks = {};
    let currentKinkList = [];
    let currentKinkIndex = 0;

    // DOM Elements
    const kinkListElement = document.getElementById('kink-list');
    const listTypeSelect = document.getElementById('list-type');
    const editButton = document.getElementById('edit-btn');
    const exportJpgButton = document.getElementById('export-jpg');
    const exportPreviewButton = document.getElementById('export-preview');
    const loadingElement = document.getElementById('loading');
    
    // Modal elements
    const editModal = document.getElementById('edit-modal');
    const kinkModal = document.getElementById('kink-modal');
    const previewModal = document.getElementById('preview-modal');
    const kinksTextArea = document.getElementById('kinks-text');
    const saveKinksButton = document.getElementById('save-kinks');
    const closeButtons = document.querySelectorAll('.close-btn');
    
    // Kink modal elements
    const kinkCategoryElement = document.getElementById('kink-category');
    const kinkNameElement = document.getElementById('kink-name');
    const kinkDescriptionElement = document.getElementById('kink-description');
    const kinkChoicesElement = document.getElementById('kink-choices');
    const prevKinkButton = document.getElementById('prev-kink');
    const nextKinkButton = document.getElementById('next-kink');
    
    // Canvas elements
    const canvasContainer = document.getElementById('canvas-container');
    const downloadJpgButton = document.getElementById('download-jpg');

    // Initialize app
    init();

    function init() {
        // Load the initial data
        loadKinkFile('classic.txt');
        
        // Add event listeners
        listTypeSelect.addEventListener('change', handleListTypeChange);
        editButton.addEventListener('click', openEditModal);
        saveKinksButton.addEventListener('click', saveKinks);
        exportJpgButton.addEventListener('click', exportAsJpg);
        exportPreviewButton.addEventListener('click', previewKinklist);
        downloadJpgButton.addEventListener('click', downloadCanvasAsJpg);
        prevKinkButton.addEventListener('click', () => navigateKinks(-1));
        nextKinkButton.addEventListener('click', () => navigateKinks(1));
        
        // Close buttons
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                editModal.style.display = 'none';
                kinkModal.style.display = 'none';
                previewModal.style.display = 'none';
            });
        });
        
        // Close modals when clicking outside content
        window.addEventListener('click', (e) => {
            if (e.target === editModal) editModal.style.display = 'none';
            if (e.target === kinkModal) kinkModal.style.display = 'none';
            if (e.target === previewModal) previewModal.style.display = 'none';
        });
        
        // Handle hash for sharing
        window.addEventListener('hashchange', loadFromHash);
        loadFromHash();
    }

    function loadKinkFile(filename) {
        loadingElement.classList.remove('hidden');
        
        fetch(filename)
            .then(response => response.text())
            .then(data => {
                kinksTextArea.value = data;
                parseKinksText(data);
                renderKinkList();
                loadingElement.classList.add('hidden');
            })
            .catch(error => {
                console.error('Error loading kink file:', error);
                loadingElement.classList.add('hidden');
                alert('Failed to load kink list file.');
            });
    }
    
    function handleListTypeChange() {
        const selectedType = listTypeSelect.value;
        loadKinkFile(selectedType + '.txt');
    }
    
    function openEditModal() {
        editModal.style.display = 'block';
    }
    
    function saveKinks() {
        try {
            parseKinksText(kinksTextArea.value);
            renderKinkList();
            editModal.style.display = 'none';
            updateHash();
        } catch (error) {
            console.error('Error parsing kinks:', error);
            alert('There was an error parsing the kink list. Please check the format and try again.');
        }
    }
    
    function parseKinksText(text) {
        // Reset kinks object
        kinks = {};
        
        // Parse the text into categories and kinks
        const lines = text.split('\n');
        let currentCategory = null;
        let currentField = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Category line
            if (line.startsWith('#')) {
                if (currentCategory) {
                    // Save the previous category
                    kinks[currentCategory.name] = currentCategory;
                }
                
                // Start a new category
                currentCategory = {
                    name: line.substring(1).trim(),
                    fields: [],
                    kinks: []
                };
            }
            // Fields line
            else if (line.startsWith('(') && line.endsWith(')')) {
                currentCategory.fields = line.substring(1, line.length - 1)
                    .split(',')
                    .map(field => field.trim());
            }
            // Kink name line
            else if (line.startsWith('*')) {
                const kinkName = line.substring(1).trim();
                const kink = {
                    name: kinkName,
                    description: '',
                    selections: {}
                };
                
                // Initialize selections for each field
                currentCategory.fields.forEach(field => {
                    kink.selections[field] = 0; // Default to "Not Entered"
                });
                
                currentCategory.kinks.push(kink);
            }
            // Kink description line
            else if (line.startsWith('?') && currentCategory.kinks.length > 0) {
                currentCategory.kinks[currentCategory.kinks.length - 1].description = line.substring(1).trim();
            }
        }
        
        // Add the last category
        if (currentCategory) {
            kinks[currentCategory.name] = currentCategory;
        }
        
        // Create flat list of kinks for modal navigation
        createKinkList();
    }
    
    function createKinkList() {
        currentKinkList = [];
        
        // Flatten the kinks structure for easier navigation
        Object.keys(kinks).forEach(categoryName => {
            const category = kinks[categoryName];
            
            category.kinks.forEach(kink => {
                category.fields.forEach(field => {
                    currentKinkList.push({
                        categoryName,
                        kinkName: kink.name,
                        kinkDescription: kink.description,
                        field,
                        selection: kink.selections[field] || 0
                    });
                });
            });
        });
    }
    
    function renderKinkList() {
        kinkListElement.innerHTML = '';
        
        // Render each category
        Object.keys(kinks).forEach(categoryName => {
            const category = kinks[categoryName];
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category';
            
            // Create header
            const headerElement = document.createElement('div');
            headerElement.className = 'category-header';
            headerElement.textContent = category.name;
            
            // Add fields as subtitle if there's more than one
            if (category.fields.length > 1) {
                const subtitleElement = document.createElement('div');
                subtitleElement.className = 'category-subtitle';
                subtitleElement.textContent = category.fields.join(', ');
                headerElement.appendChild(subtitleElement);
            }
            
            categoryElement.appendChild(headerElement);
            
            // Create kinks for this category
            category.kinks.forEach(kink => {
                const kinkElement = document.createElement('div');
                kinkElement.className = 'kink-item';
                
                // Kink name with description hint if available
                const nameElement = document.createElement('div');
                nameElement.className = 'kink-name';
                nameElement.textContent = kink.name;
                
                if (kink.description) {
                    const infoIcon = document.createElement('span');
                    infoIcon.textContent = ' ℹ️';
                    infoIcon.title = kink.description;
                    infoIcon.style.cursor = 'help';
                    nameElement.appendChild(infoIcon);
                }
                
                kinkElement.appendChild(nameElement);
                
                // Status indicators
                const statusElement = document.createElement('div');
                statusElement.className = 'kink-status';
                
                category.fields.forEach(field => {
                    const status = kink.selections[field] || 0;
                    const statusDot = document.createElement('span');
                    statusDot.className = 'choice';
                    statusDot.style.backgroundColor = COLORS[status];
                    statusDot.title = `${field}: ${LABELS[status]}`;
                    
                    // Add click handler to edit this kink
                    statusDot.addEventListener('click', () => {
                        openKinkModal(categoryName, kink.name, field);
                    });
                    
                    statusElement.appendChild(statusDot);
                });
                
                kinkElement.appendChild(statusElement);
                categoryElement.appendChild(kinkElement);
            });
            
            kinkListElement.appendChild(categoryElement);
        });
        
        // Update URL hash
        updateHash();
    }
    
    function openKinkModal(categoryName, kinkName, field) {
        const category = kinks[categoryName];
        const kink = category.kinks.find(k => k.name === kinkName);
        
        if (!kink) return;
        
        // Find the index of this kink in the flattened list
        currentKinkIndex = currentKinkList.findIndex(item => 
            item.categoryName === categoryName && 
            item.kinkName === kinkName && 
            item.field === field
        );
        
        // Update modal content
        kinkCategoryElement.textContent = categoryName;
        kinkNameElement.textContent = `${kinkName} (${field})`;
        
        if (kink.description) {
            kinkDescriptionElement.textContent = kink.description;
            kinkDescriptionElement.classList.remove('hidden');
        } else {
            kinkDescriptionElement.classList.add('hidden');
        }
        
        // Set the selected choice
        const selectedValue = kink.selections[field] || 0;
        const choiceButtons = kinkChoicesElement.querySelectorAll('.choice-btn');
        
        choiceButtons.forEach(btn => {
            const value = parseInt(btn.dataset.value);
            if (value === selectedValue) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
            
            // Add click handler
            btn.onclick = () => {
                choiceButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Update the kink selection
                kink.selections[field] = value;
                renderKinkList();
                
                // Go to next kink if available
                navigateKinks(1);
            };
        });
        
        kinkModal.style.display = 'block';
    }
    
    function navigateKinks(direction) {
        if (currentKinkList.length === 0) return;
        
        currentKinkIndex = (currentKinkIndex + direction + currentKinkList.length) % currentKinkList.length;
        const kink = currentKinkList[currentKinkIndex];
        
        openKinkModal(kink.categoryName, kink.kinkName, kink.field);
    }
    
    function updateHash() {
        // Create a compact representation of selections for URL sharing
        const selections = [];
        
        Object.keys(kinks).forEach(categoryName => {
            const category = kinks[categoryName];
            
            category.kinks.forEach(kink => {
                category.fields.forEach(field => {
                    const value = kink.selections[field] || 0;
                    selections.push(value);
                });
            });
        });
        
        // Convert selections to base64
        const hash = btoa(selections.join(','));
        window.location.hash = hash;
    }
    
    function loadFromHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        
        try {
            // Decode selections from base64
            const selections = atob(hash).split(',').map(v => parseInt(v));
            let selectionIndex = 0;
            
            Object.keys(kinks).forEach(categoryName => {
                const category = kinks[categoryName];
                
                category.kinks.forEach(kink => {
                    category.fields.forEach(field => {
                        const value = selections[selectionIndex++];
                        if (value !== undefined && value >= 0 && value <= 5) {
                            kink.selections[field] = value;
                        }
                    });
                });
            });
            
            renderKinkList();
        } catch (error) {
            console.error('Error loading from hash:', error);
        }
    }
    
    function previewKinklist() {
        try {
            const canvas = generateCanvas();
            canvasContainer.innerHTML = '';
            canvasContainer.appendChild(canvas);
            previewModal.style.display = 'block';
        } catch (error) {
            console.error('Error generating preview:', error);
            alert('Failed to generate preview.');
        }
    }
    
    function exportAsJpg() {
        try {
            const canvas = generateCanvas();
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            // Create download link
            const link = document.createElement('a');
            link.download = `kinklist-${new Date().toISOString().split('T')[0]}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error exporting as JPG:', error);
            alert('Failed to export as JPG.');
        }
    }
    
    function downloadCanvasAsJpg() {
        const canvas = canvasContainer.querySelector('canvas');
        if (!canvas) return;
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.download = `kinklist-${new Date().toISOString().split('T')[0]}.jpg`;
        link.href = dataUrl;
        link.click();
    }
    
    function generateCanvas() {
        const margin = 30;
        const rowHeight = 25;
        const columnWidth = 250;
        const headerHeight = 50;
        
        // Determine the number of columns based on screen width
        const numColumns = Math.max(1, Math.min(4, Math.floor((window.innerWidth - 60) / columnWidth)));
        
        // Calculate canvas dimensions
        let canvasHeight = margin * 2 + headerHeight;
        let items = [];
        
        // Count total items and build draw items list
        Object.keys(kinks).forEach(categoryName => {
            const category = kinks[categoryName];
            
            // Add category header
            items.push({
                type: 'category',
                name: categoryName,
                fields: category.fields,
                height: 30
            });
            
            // Add each kink
            category.kinks.forEach(kink => {
                items.push({
                    type: 'kink',
                    name: kink.name,
                    selections: category.fields.map(field => kink.selections[field] || 0),
                    fields: category.fields,
                    height: rowHeight
                });
            });
            
            // Add spacing between categories
            items.push({
                type: 'spacing',
                height: 10
            });
        });
        
        // Calculate total height
        const totalHeight = items.reduce((sum, item) => sum + item.height, 0);
        
        // Calculate approximate height per column
        const heightPerColumn = Math.ceil(totalHeight / numColumns);
        
        // Distribute items into columns
        const columns = Array(numColumns).fill().map(() => ({ height: 0, items: [] }));
        let columnIndex = 0;
        
        items.forEach(item => {
            columns[columnIndex].items.push(item);
            columns[columnIndex].height += item.height;
            
            // Check if this column is getting too tall, move to next column
            if (columns[columnIndex].height > heightPerColumn && columnIndex < numColumns - 1) {
                columnIndex++;
            }
        });
        
        // Find the tallest column to determine canvas height
        const tallestColumn = Math.max(...columns.map(col => col.height));
        canvasHeight += tallestColumn;
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = margin * 2 + columnWidth * numColumns;
        canvas.height = canvasHeight;
        
        // Get drawing context
        const ctx = canvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add title and date
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText('Kinklist', margin, margin + 25);
        
        // Add date
        const date = new Date().toLocaleDateString();
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Generated: ${date}`, canvas.width - margin - 150, margin + 25);
        
        // Draw legend
        const legendY = margin + 40;
        const legendItemWidth = 90;
        const legendItemHeight = 20;
        const legendLabels = Object.values(LABELS);
        const legendColors = Object.values(COLORS);
        
        for (let i = 0; i < legendLabels.length; i++) {
            const x = margin + (i * legendItemWidth);
            
            // Color circle
            ctx.fillStyle = legendColors[i];
            ctx.beginPath();
            ctx.arc(x + 8, legendY, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Label text
            ctx.fillStyle = '#333333';
            ctx.font = '12px Arial, sans-serif';
            ctx.fillText(legendLabels[i], x + 20, legendY + 4);
        }
        
        // Draw columns
        for (let i = 0; i < columns.length; i++) {
            const column = columns[i];
            const columnX = margin + (i * columnWidth);
            let yPos = margin + headerHeight + 20;
            
            // Draw items in this column
            column.items.forEach(item => {
                if (item.type === 'category') {
                    // Draw category header
                    ctx.fillStyle = '#4980ae';
                    ctx.fillRect(columnX, yPos, columnWidth - 10, item.height);
                    
                    // Category title
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 14px Arial, sans-serif';
                    ctx.fillText(item.name, columnX + 5, yPos + 20);
                    
                    // Fields (if more than one)
                    if (item.fields.length > 1) {
                        ctx.font = 'italic 10px Arial, sans-serif';
                        ctx.fillText(item.fields.join(', '), columnX + 5, yPos + 32);
                    }
                    
                    yPos += item.height + 5;
                } 
                else if (item.type === 'kink') {
                    // Draw kink row
                    ctx.fillStyle = '#F5F5F5';
                    ctx.fillRect(columnX, yPos, columnWidth - 10, item.height);
                    
                    // Kink name
                    ctx.fillStyle = '#333333';
                    ctx.font = '12px Arial, sans-serif';
                    
                    // Calculate position after selection circles
                    const circleSpacing = 18;
                    const textX = columnX + 5 + (item.selections.length * circleSpacing);
                    ctx.fillText(item.name, textX, yPos + 16);
                    
                    // Draw selection circles
                    for (let j = 0; j < item.selections.length; j++) {
                        const selection = item.selections[j];
                        const circleX = columnX + 10 + (j * circleSpacing);
                        
                        ctx.fillStyle = COLORS[selection];
                        ctx.beginPath();
                        ctx.arc(circleX, yPos + 12, 7, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                    
                    yPos += item.height;
                }
                else if (item.type === 'spacing') {
                    yPos += item.height;
                }
            });
        }
        
        return canvas;
    }
});