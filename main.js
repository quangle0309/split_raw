let canvas;
let originalImage = null;
let cutPositions = [];
let slicedImages = [];
let currentImageIndex = 0;

// Modal elements
const modal = document.getElementById('previewModal');
const modalImage = document.getElementById('modalImage');
const closeModal = document.getElementById('closeModal');

// Update modal elements và thêm nút điều hướng
function updateModalUI() {
    const modal = document.getElementById('previewModal');
    const modalContent = modal.querySelector('div');

    // Thêm nút điều hướng nếu chưa có
    if (!document.getElementById('prevButton')) {
        const prevButton = document.createElement('button');
        prevButton.id = 'prevButton';
        prevButton.className = 'fixed left-8 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75 transition-all';
        prevButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        `;
        modalContent.appendChild(prevButton);
    }

    if (!document.getElementById('nextButton')) {
        const nextButton = document.createElement('button');
        nextButton.id = 'nextButton';
        nextButton.className = 'fixed right-8 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded hover:bg-opacity-75 transition-all';
        nextButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        `;
        modalContent.appendChild(nextButton);
    }

    if (!document.getElementById('imageCounter')) {
        const counter = document.createElement('div');
        counter.id = 'imageCounter';
        counter.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-white bg-opacity-50 text-black px-3 py-1 rounded-full text-sm';
        modalContent.appendChild(counter);
    }
}

// Cập nhật lại hàm showModal
function showModal(imageUrl, index = 0) {
    currentImageIndex = index;
    const modal = document.getElementById('previewModal');
    const modalImage = document.getElementById('modalImage');

    updateModalUI();

    // Cập nhật UI
    modal.style.display = 'flex';
    modalImage.src = imageUrl;
    document.body.style.overflow = 'hidden';
    updateImageCounter();
    updateNavigationButtons();

    // Thêm event listeners
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    prevButton.onclick = showPreviousImage;
    nextButton.onclick = showNextImage;

    // Thêm keyboard navigation
    document.addEventListener('keydown', handleKeyPress);
}

// Cập nhật số thứ tự ảnh
function updateImageCounter() {
    const counter = document.getElementById('imageCounter');
    if (counter) {
        counter.textContent = `${currentImageIndex + 1} / ${slicedImages.length}`;
    }
}

// Cập nhật trạng thái nút điều hướng
function updateNavigationButtons() {
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');

    if (slicedImages.length <= 1) {
        prevButton.classList.add('hidden');
        nextButton.classList.add('hidden');
    } else {
        prevButton.classList.remove('hidden');
        nextButton.classList.remove('hidden');
    }
}

// Điều hướng ảnh
function showPreviousImage() {
    currentImageIndex = (currentImageIndex - 1 + slicedImages.length) % slicedImages.length;
    document.getElementById('modalImage').src = slicedImages[currentImageIndex];
    updateImageCounter();
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % slicedImages.length;
    document.getElementById('modalImage').src = slicedImages[currentImageIndex];
    updateImageCounter();
}

// Xử lý phím
function handleKeyPress(e) {
    switch(e.key) {
        case 'ArrowLeft':
            showPreviousImage();
            break;
        case 'ArrowRight':
            showNextImage();
            break;
        case 'Escape':
            hideModal();
            break;
    }
}

// Cập nhật hàm hideModal
function hideModal() {
    const modal = document.getElementById('previewModal');
    const modalImage = document.getElementById('modalImage');

    modal.style.display = 'none';
    modalImage.src = '';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyPress);
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

        const containerWidth = document.getElementById('canvasContainer').offsetWidth;
        const containerHeight = window.innerHeight * 6;
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const scale = Math.min(scaleX, scaleY);

        img.scale(scale);
        img.set({
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true
        });

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
let animationFrameId = null;

function showCutLine(event) {
    if (!originalImage) return;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
        const cutLine = document.getElementById('cutLine');
        const pointer = canvas.getPointer(event.e);

        cutLine.style.display = 'block';
        cutLine.style.transform = `translateY(${pointer.y}px)`;
    });
}

// Add cut marker
async function addCutMarker(y) {
    document.getElementById('loadingOverlay').style.display = 'block';

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const markersContainer = document.getElementById('cutMarkers');
        const marker = document.createElement('div');
        marker.className = 'absolute w-full h-0.5 bg-blue-500';
        marker.style.top = y + 'px';
        markersContainer.appendChild(marker);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
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
    const scale = originalImage.scaleX; // Tỷ lệ scale của ảnh
    slicedImages = [];

    const actualWidth = imageElement.naturalWidth;
    const actualHeight = imageElement.naturalHeight;

    const actualPositions = [0, ...cutPositions.map(y => Math.round(y / scale)), actualHeight];

    for (let i = 0; i < actualPositions.length - 1; i++) {
        const startY = actualPositions[i];
        const endY = actualPositions[i + 1];
        const height = endY - startY;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = actualWidth;
        sliceCanvas.height = height;
        const ctx = sliceCanvas.getContext('2d');

        ctx.drawImage(imageElement,
            0, startY, actualWidth, height,
            0, 0, actualWidth, height
        );

        slicedImages.push(sliceCanvas.toDataURL('image/jpeg', 1));
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
        label.textContent = `Hình ${index + 1}`;

        // Cập nhật click event để truyền index
        preview.addEventListener('click', () => showModal(dataUrl, index));

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