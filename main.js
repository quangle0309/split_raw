let canvas;
let originalImage = null;
let cutPositions = [];
let slicedImages = [];

// Modal elements
const modal = document.getElementById('previewModal');
const modalImage = document.getElementById('modalImage');
const closeModal = document.getElementById('closeModal');

// Modal functions
function showModal(imageUrl) {
    modal.style.display = 'flex';
    modalImage.src = imageUrl;
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
}

function hideModal() {
    modal.style.display = 'none';
    modalImage.src = '';
    document.body.style.overflow = ''; // Restore scrolling
}

// Close modal on click outside
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        hideModal();
    }
});

// Close modal on button click
closeModal.addEventListener('click', hideModal);

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideModal();
    }
});

// Initialize canvas
function initCanvas() {
    canvas = new fabric.Canvas('canvas', {
        selection: false,
        backgroundColor: '#f0f0f0'
    });

    canvas.on('mouse:move', showCutLine);
    canvas.on('mouse:down', handleCut);
}

// Handle file input
document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            loadImage(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// Load image to canvas
function loadImage(url) {
    fabric.Image.fromURL(url, function(img) {
        originalImage = img;

        // Scale image to fit canvas
        const containerWidth = document.getElementById('canvasContainer').offsetWidth;
        const scale = containerWidth / img.width;

        img.scale(scale);
        canvas.setDimensions({
            width: img.width * scale,
            height: img.height * scale
        });

        canvas.clear();
        canvas.add(img);
        canvas.centerObject(img);
        img.setCoords();
        canvas.renderAll();

        // Reset arrays
        cutPositions = [];
        slicedImages = [];
        updateCutMarkers();
        updatePreviewContainer();
        document.getElementById('downloadAllBtn').classList.add('hidden');
    });
}

// Show cut line on mouse move
function showCutLine(event) {
    const cutLine = document.getElementById('cutLine');
    if (!originalImage) return;

    const pointer = canvas.getPointer(event.e);
    cutLine.style.display = 'block';
    cutLine.style.top = pointer.y + 'px';
}

// Add cut marker
function addCutMarker(y) {
    const markersContainer = document.getElementById('cutMarkers');
    const marker = document.createElement('div');
    marker.className = 'absolute w-full h-0.5 bg-blue-500';
    marker.style.top = y + 'px';
    markersContainer.appendChild(marker);
}

// Update cut markers
function updateCutMarkers() {
    const markersContainer = document.getElementById('cutMarkers');
    markersContainer.innerHTML = '';
    cutPositions.forEach(pos => addCutMarker(pos));
}

// Handle cut on click
function handleCut(event) {
    if (!originalImage) return;

    const pointer = canvas.getPointer(event.e);
    cutPositions.push(pointer.y);
    cutPositions.sort((a, b) => a - b);

    updateCutMarkers();
    sliceImage();
}

// Slice image into parts
function sliceImage() {
    if (!originalImage) return;

    const imageElement = originalImage._element;
    const scale = originalImage.scaleX;
    slicedImages = [];

    // Convert cut positions from scaled to actual pixels
    const actualPositions = [0, ...cutPositions.map(y => y / scale), imageElement.height];

    // Create slices
    for (let i = 0; i < actualPositions.length - 1; i++) {
        const sliceCanvas = document.createElement('canvas');
        const ctx = sliceCanvas.getContext('2d');

        const startY = actualPositions[i];
        const endY = actualPositions[i + 1];
        const height = endY - startY;

        sliceCanvas.width = imageElement.width;
        sliceCanvas.height = height;

        ctx.drawImage(imageElement,
            0, startY, imageElement.width, height,
            0, 0, imageElement.width, height
        );

        slicedImages.push(sliceCanvas.toDataURL('image/jpeg', 0.9));
    }

    updatePreviewContainer();
    document.getElementById('downloadAllBtn').classList.remove('hidden');
}

// Update preview container with grid layout
function updatePreviewContainer() {
    const container = document.getElementById('previewContainer');
    container.innerHTML = '';

    slicedImages.forEach((dataUrl, index) => {
        const preview = document.createElement('div');
        preview.className = 'relative aspect-video border rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity';

        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'w-full h-full object-cover';

        const label = document.createElement('div');
        label.className = 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 text-center';
        label.textContent = `Phần ${index + 1}`;

        // Add click event to show preview
        preview.addEventListener('click', () => showModal(dataUrl));

        preview.appendChild(img);
        preview.appendChild(label);
        container.appendChild(preview);
    });
}

// Download all images
async function downloadAllImages() {
    const zip = new JSZip();

    slicedImages.forEach((dataUrl, index) => {
        const imageData = dataUrl.split(',')[1];
        zip.file(`image_${index + 1}.jpg`, imageData, {base64: true});
    });

    const content = await zip.generateAsync({type: "blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'split_images.zip';
    link.click();
}

// Reset functionality
document.getElementById('resetBtn').addEventListener('click', function() {
    if (originalImage) {
        loadImage(originalImage._element.src);
    }
});

// Undo functionality
document.getElementById('undoBtn').addEventListener('click', function() {
    if (cutPositions.length > 0) {
        cutPositions.pop();
        updateCutMarkers();
        sliceImage();
    }
});

// Download all button
document.getElementById('downloadAllBtn').addEventListener('click', downloadAllImages);

// Initialize on load
initCanvas();