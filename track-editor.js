class TrackEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'line';
        this.trackWidth = 40;
        this.trackColor = '#0066cc';
        
        // Track data
        this.trackPoints = [];
        this.checkpoints = [];
        this.undoStack = [];
        
        // Drawing state
        this.startPoint = null;
        this.currentPath = [];
        
        this.initializeEventListeners();
        this.updateUI();
        
        // Debug: Check if buttons exist
        console.log('Track Editor initialized');
        console.log('Add checkpoint button:', document.getElementById('addCheckpoint'));
        console.log('Auto checkpoints button:', document.getElementById('autoCheckpoints'));
        console.log('Clear checkpoints button:', document.getElementById('clearCheckpoints'));
    }
    
    initializeEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Tool controls
        document.getElementById('drawingTool').addEventListener('change', (e) => {
            this.currentTool = e.target.value;
            this.updateStatus(`Tool: ${this.currentTool}`);
        });
        
        document.getElementById('trackWidth').addEventListener('input', (e) => {
            this.trackWidth = parseInt(e.target.value);
            document.getElementById('widthValue').textContent = `${this.trackWidth}px`;
        });
        
        document.getElementById('trackColor').addEventListener('change', (e) => {
            this.trackColor = e.target.value;
        });
        
        // Buttons
        document.getElementById('clear-btn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('save-btn').addEventListener('click', () => {
            console.log('Save button clicked');
            this.showSaveModal();
        });
        
        // Add a direct save method as backup
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                console.log('Ctrl+S pressed - direct save');
                this.directSave();
            }
        });
        document.getElementById('quick-save-btn').addEventListener('click', () => {
            console.log('Quick save button clicked');
            this.quickSave();
        });
        
        document.getElementById('direct-save-btn').addEventListener('click', () => {
            console.log('Direct save button clicked');
            this.directSave();
        });
        document.getElementById('load-btn').addEventListener('click', () => {
            console.log('Load button clicked');
            this.showLoadModal();
        });
        document.getElementById('play-btn').addEventListener('click', () => this.testTrack());
        // Check if checkpoint buttons exist
        const addCheckpointBtn = document.getElementById('addCheckpoint');
        const autoCheckpointsBtn = document.getElementById('autoCheckpoints');
        const clearCheckpointsBtn = document.getElementById('clearCheckpoints');
        
        if (addCheckpointBtn) {
            addCheckpointBtn.addEventListener('click', () => {
                console.log('Add checkpoint button clicked');
                this.addCheckpoint();
            });
        } else {
            console.error('Add checkpoint button not found!');
        }
        
        if (autoCheckpointsBtn) {
            autoCheckpointsBtn.addEventListener('click', () => {
                console.log('Auto checkpoints button clicked');
                this.autoPlaceCheckpoints();
            });
        } else {
            console.error('Auto checkpoints button not found!');
        }
        
        if (clearCheckpointsBtn) {
            clearCheckpointsBtn.addEventListener('click', () => {
                console.log('Clear checkpoints button clicked');
                this.clearAllCheckpoints();
            });
        } else {
            console.error('Clear checkpoints button not found!');
        }
        
        // Modal events
        const modalCancel = document.getElementById('modalCancel');
        const modalConfirm = document.getElementById('modalConfirm');
        
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                console.log('Modal cancel clicked');
                this.hideModal();
            });
        } else {
            console.error('Modal cancel button not found!');
        }
        
        if (modalConfirm) {
            modalConfirm.addEventListener('click', () => {
                console.log('Modal confirm clicked');
                this.saveTrack();
            });
        } else {
            console.error('Modal confirm button not found!');
        }
        
        // Mouse coordinate display
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) * (this.canvas.width / rect.width));
            const y = Math.round((e.clientY - rect.top) * (this.canvas.height / rect.height));
            document.getElementById('coordinates').textContent = `Mouse: (${x}, ${y})`;
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY)
        };
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.startPoint = pos;
        this.currentPath = [pos];
        
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
        this.ctx.strokeStyle = this.trackColor;
        this.ctx.lineWidth = this.trackWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.updateStatus('Drawing...');
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        this.currentPath.push(pos);
        
        if (this.currentTool === 'freehand') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        }
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'line') {
            this.drawLine(this.startPoint, pos);
        } else if (this.currentTool === 'curve') {
            this.drawCurve(this.startPoint, pos);
        } else if (this.currentTool === 'freehand') {
            this.saveFreehandPath();
        }
        
        this.updateStatus('Ready to draw');
    }
    
    handleCanvasClick(e) {
        if (this.currentTool === 'checkpoint') {
            const pos = this.getMousePos(e);
            this.addCheckpointAt(pos);
            
            // Reset to normal drawing mode after adding checkpoint
            this.currentTool = 'line';
            this.canvas.style.cursor = 'crosshair';
            this.canvas.style.border = '3px solid #4ecdc4';
            this.updateStatus('Checkpoint added! Ready to draw again');
        }
    }
    
    drawLine(start, end) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        
        this.trackPoints.push({ type: 'line', start, end });
        this.updateTrackInfo();
    }
    
    drawCurve(start, end) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(midX, midY, end.x, end.y);
        this.ctx.stroke();
        
        this.trackPoints.push({ type: 'curve', start, end, control: { x: midX, y: midY } });
        this.updateTrackInfo();
    }
    
    saveFreehandPath() {
        if (this.currentPath.length < 2) {
            console.log('Freehand path too short, not saving');
            return;
        }
        
        console.log('Saving freehand path with', this.currentPath.length, 'points');
        
        // Convert freehand path to a series of line segments
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            const start = this.currentPath[i];
            const end = this.currentPath[i + 1];
            
            // Only add segments that are long enough (to avoid tiny segments)
            const distance = Math.sqrt(
                Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
            );
            
            if (distance > 2) { // Minimum 2 pixel distance
                this.trackPoints.push({ 
                    type: 'line', 
                    start: { x: start.x, y: start.y }, 
                    end: { x: end.x, y: end.y } 
                });
            }
        }
        
        this.updateTrackInfo();
        console.log('Freehand path saved, total track points:', this.trackPoints.length);
    }
    
    addCheckpoint() {
        this.currentTool = 'checkpoint';
        this.updateStatus('Click on track to add checkpoint');
        
        // Change cursor to indicate checkpoint mode
        this.canvas.style.cursor = 'crosshair';
        
        // Add visual feedback
        this.canvas.style.border = '3px solid #f39c12';
    }
    
    addCheckpointAt(pos) {
        const checkpoint = {
            id: Date.now(),
            x: pos.x,
            y: pos.y,
            radius: 30
        };
        
        this.checkpoints.push(checkpoint);
        this.drawCheckpoint(checkpoint);
        this.updateCheckpointsList();
        this.updateStatus('Checkpoint added');
    }
    
    drawCheckpoint(checkpoint) {
        this.ctx.beginPath();
        this.ctx.arc(checkpoint.x, checkpoint.y, checkpoint.radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#f39c12';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Draw checkpoint number
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.checkpoints.indexOf(checkpoint) + 1, checkpoint.x, checkpoint.y + 5);
    }
    
    updateCheckpointsList() {
        const container = document.getElementById('checkpointsList');
        container.innerHTML = '';
        
        this.checkpoints.forEach((checkpoint, index) => {
            const item = document.createElement('div');
            item.className = 'checkpoint-item';
            item.innerHTML = `
                <div class="checkpoint-info">
                    <strong>Checkpoint ${index + 1}</strong><br>
                    <small>(${checkpoint.x}, ${checkpoint.y})</small>
                </div>
                <div class="checkpoint-actions">
                    <button onclick="trackEditor.removeCheckpoint(${checkpoint.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    removeCheckpoint(id) {
        this.checkpoints = this.checkpoints.filter(cp => cp.id !== id);
        this.redrawCanvas();
        this.updateCheckpointsList();
    }
    
    clearAllCheckpoints() {
        this.checkpoints = [];
        this.redrawCanvas();
        this.updateCheckpointsList();
        this.updateStatus('All checkpoints cleared');
    }
    
    autoPlaceCheckpoints() {
        if (this.trackPoints.length === 0) {
            this.updateStatus('Draw a track first!');
            return;
        }
        
        this.clearAllCheckpoints();
        
        // Calculate total track length
        let totalLength = 0;
        const segmentLengths = [];
        
        this.trackPoints.forEach(point => {
            let length = 0;
            if (point.type === 'line') {
                length = Math.sqrt(
                    Math.pow(point.end.x - point.start.x, 2) + 
                    Math.pow(point.end.y - point.start.y, 2)
                );
            } else if (point.type === 'curve') {
                // Approximate curve length
                const dx = point.end.x - point.start.x;
                const dy = point.end.y - point.start.y;
                length = Math.sqrt(dx * dx + dy * dy) * 1.2;
            }
            totalLength += length;
            segmentLengths.push(length);
        });
        
        // Place checkpoints every 1/6th of the track
        const checkpointCount = 6;
        const checkpointSpacing = totalLength / checkpointCount;
        
        let currentLength = 0;
        let checkpointIndex = 0;
        
        this.trackPoints.forEach((point, pointIndex) => {
            let segmentLength = segmentLengths[pointIndex];
            
            while (currentLength + segmentLength >= checkpointSpacing * (checkpointIndex + 1) && checkpointIndex < checkpointCount) {
                // Calculate position along this segment
                const targetLength = checkpointSpacing * (checkpointIndex + 1) - currentLength;
                const ratio = targetLength / segmentLength;
                
                let checkpointPos;
                if (point.type === 'line') {
                    checkpointPos = {
                        x: point.start.x + (point.end.x - point.start.x) * ratio,
                        y: point.start.y + (point.end.y - point.start.y) * ratio
                    };
                } else if (point.type === 'curve') {
                    // Approximate position on curve
                    checkpointPos = {
                        x: point.start.x + (point.end.x - point.start.x) * ratio,
                        y: point.start.y + (point.end.y - point.start.y) * ratio
                    };
                }
                
                if (checkpointPos) {
                    this.addCheckpointAt(checkpointPos);
                }
                
                checkpointIndex++;
            }
            
            currentLength += segmentLength;
        });
        
        this.updateStatus(`Auto-placed ${this.checkpoints.length} checkpoints`);
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.trackPoints = [];
        this.checkpoints = [];
        this.updateTrackInfo();
        this.updateCheckpointsList();
        this.updateStatus('Canvas cleared');
    }
    
    undo() {
        if (this.trackPoints.length > 0) {
            this.trackPoints.pop();
            this.redrawCanvas();
            this.updateTrackInfo();
            this.updateStatus('Undone');
        }
    }
    
    redrawCanvas() {
        console.log('Redrawing canvas with', this.trackPoints.length, 'track points');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw track
        this.ctx.strokeStyle = this.trackColor;
        this.ctx.lineWidth = this.trackWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        let drawnSegments = 0;
        this.trackPoints.forEach((point, index) => {
            if (point.type === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(point.start.x, point.start.y);
                this.ctx.lineTo(point.end.x, point.end.y);
                this.ctx.stroke();
                drawnSegments++;
            } else if (point.type === 'curve') {
                this.ctx.beginPath();
                this.ctx.moveTo(point.start.x, point.start.y);
                this.ctx.quadraticCurveTo(point.control.x, point.control.y, point.end.x, point.end.y);
                this.ctx.stroke();
                drawnSegments++;
            }
        });
        
        console.log('Drew', drawnSegments, 'segments');
        
        // Redraw checkpoints
        this.checkpoints.forEach(checkpoint => {
            this.drawCheckpoint(checkpoint);
        });
    }
    
    updateTrackInfo() {
        document.getElementById('pointCount').textContent = this.trackPoints.length;
        
        let totalLength = 0;
        this.trackPoints.forEach(point => {
            if (point.type === 'line') {
                totalLength += Math.sqrt(
                    Math.pow(point.end.x - point.start.x, 2) + 
                    Math.pow(point.end.y - point.start.y, 2)
                );
            } else if (point.type === 'curve') {
                // Approximate curve length
                const dx = point.end.x - point.start.x;
                const dy = point.end.y - point.start.y;
                totalLength += Math.sqrt(dx * dx + dy * dy) * 1.2; // Rough approximation
            }
        });
        
        document.getElementById('trackLength').textContent = `${Math.round(totalLength)}px`;
    }
    
    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }
    
    showSaveModal() {
        console.log('showSaveModal() called');
        console.log('Track points count:', this.trackPoints.length);
        console.log('Checkpoints count:', this.checkpoints.length);
        
        const modalTitle = document.getElementById('modalTitle');
        const trackNameInput = document.getElementById('trackName');
        const trackDescriptionInput = document.getElementById('trackDescription');
        const fileModal = document.getElementById('fileModal');
        
        if (!modalTitle || !trackNameInput || !trackDescriptionInput || !fileModal) {
            console.error('Modal elements not found!');
            this.updateStatus('Error: Modal elements not found');
            return;
        }
        
        modalTitle.textContent = 'Save Track';
        trackNameInput.value = '';
        trackDescriptionInput.value = '';
        fileModal.classList.remove('hidden');
        
        console.log('Modal should be visible now');
        console.log('Modal element:', fileModal);
        console.log('Modal classes:', fileModal.className);
    }
    
    hideModal() {
        document.getElementById('fileModal').classList.add('hidden');
    }
    
    saveTrack() {
        console.log('saveTrack() called');
        const trackName = document.getElementById('trackName').value || 'My Track';
        const description = document.getElementById('trackDescription').value || '';
        
        console.log('Track name:', trackName);
        console.log('Track points count:', this.trackPoints.length);
        
        if (this.trackPoints.length === 0) {
            this.updateStatus('No track to save! Draw something first.');
            return;
        }
        
        const trackData = {
            name: trackName,
            description: description,
            trackPoints: this.trackPoints,
            checkpoints: this.checkpoints,
            trackWidth: this.trackWidth,
            trackColor: this.trackColor,
            createdAt: new Date().toISOString()
        };
        
        console.log('Track data prepared:', trackData);
        
        try {
            // Create downloadable file
            const jsonString = JSON.stringify(trackData, null, 2);
            console.log('JSON string created, length:', jsonString.length);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            console.log('Blob created, size:', blob.size);
            
            const url = URL.createObjectURL(blob);
            console.log('URL created:', url);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `${trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.style.display = 'none';
            
            console.log('Download link created, filename:', a.download);
            
            // Trigger download
            document.body.appendChild(a);
            console.log('Link appended to body');
            a.click();
            console.log('Click triggered');
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('Cleanup completed');
            }, 100);
            
            this.hideModal();
            this.updateStatus(`Track "${trackName}" saved successfully!`);
            
            // Also save to localStorage as backup
            localStorage.setItem(`track_${trackName}`, jsonString);
            console.log('Track also saved to localStorage');
            
        } catch (error) {
            console.error('Error saving track:', error);
            this.updateStatus('Error saving track. Please try again.');
        }
    }
    
    directSave() {
        console.log('directSave() called');
        
        if (this.trackPoints.length === 0) {
            this.updateStatus('No track to save! Draw something first.');
            return;
        }
        
        const trackName = prompt('Enter track name:', 'My Track');
        if (!trackName) return;
        
        const description = prompt('Enter track description (optional):', '');
        
        const trackData = {
            name: trackName,
            description: description,
            trackPoints: this.trackPoints,
            checkpoints: this.checkpoints,
            trackWidth: this.trackWidth,
            trackColor: this.trackColor,
            createdAt: new Date().toISOString()
        };
        
        try {
            const jsonString = JSON.stringify(trackData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${trackName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            localStorage.setItem(`track_${trackName}`, jsonString);
            this.updateStatus(`Track "${trackName}" saved successfully!`);
            
        } catch (error) {
            console.error('Error in direct save:', error);
            this.updateStatus('Error saving track. Please try again.');
        }
    }
    
    quickSave() {
        if (this.trackPoints.length === 0) {
            this.updateStatus('No track to save! Draw something first.');
            return;
        }
        
        const trackName = `QuickTrack_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
        
        const trackData = {
            name: trackName,
            description: 'Quick saved track',
            trackPoints: this.trackPoints,
            checkpoints: this.checkpoints,
            trackWidth: this.trackWidth,
            trackColor: this.trackColor,
            createdAt: new Date().toISOString()
        };
        
        try {
            const jsonString = JSON.stringify(trackData, null, 2);
            localStorage.setItem(`track_${trackName}`, jsonString);
            this.updateStatus(`Track quick saved as "${trackName}"`);
        } catch (error) {
            console.error('Error quick saving track:', error);
            this.updateStatus('Error saving track. Please try again.');
        }
    }
    
    showLoadModal() {
        document.getElementById('modalTitle').textContent = 'Load Track';
        document.getElementById('fileModal').classList.remove('hidden');
        
        // Show file input or saved tracks list
        this.showSavedTracks();
    }
    
    showSavedTracks() {
        const modalBody = document.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="load-options">
                <h4>Load from File:</h4>
                <input type="file" id="fileInput" accept=".json" style="margin-bottom: 15px;">
                
                <h4>Saved Tracks:</h4>
                <div id="savedTracksList" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;
        
        // Add event listener for file input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadTrackFromFile(e.target.files[0]);
        });
        
        // Show saved tracks from localStorage
        this.displaySavedTracks();
    }
    
    displaySavedTracks() {
        const container = document.getElementById('savedTracksList');
        container.innerHTML = '';
        
        const savedTracks = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('track_')) {
                try {
                    const trackData = JSON.parse(localStorage.getItem(key));
                    savedTracks.push(trackData);
                } catch (e) {
                    // Skip invalid entries
                }
            }
        }
        
        if (savedTracks.length === 0) {
            container.innerHTML = '<p style="color: #bdc3c7;">No saved tracks found</p>';
            return;
        }
        
        savedTracks.forEach(track => {
            const trackItem = document.createElement('div');
            trackItem.className = 'saved-track-item';
            trackItem.style.cssText = `
                background: rgba(255,255,255,0.1);
                padding: 10px;
                margin: 5px 0;
                border-radius: 5px;
                cursor: pointer;
                border: 1px solid rgba(255,255,255,0.2);
            `;
            trackItem.innerHTML = `
                <strong>${track.name}</strong><br>
                <small>${track.description || 'No description'}</small><br>
                <small>Created: ${new Date(track.createdAt).toLocaleDateString()}</small>
            `;
            trackItem.addEventListener('click', () => {
                this.loadTrackData(track);
                this.hideModal();
                this.updateStatus(`Loaded track: ${track.name}`);
            });
            container.appendChild(trackItem);
        });
    }
    
    loadTrackFromFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const trackData = JSON.parse(e.target.result);
                this.loadTrackData(trackData);
                this.hideModal();
                this.updateStatus(`Loaded track from file: ${file.name}`);
            } catch (error) {
                this.updateStatus('Error loading track file');
                console.error('Error loading track:', error);
            }
        };
        reader.readAsText(file);
    }
    
    loadTrack() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            this.loadTrackFromFile(e.target.files[0]);
        };
        input.click();
    }
    
    loadTrackData(trackData) {
        console.log('Loading track data:', trackData);
        console.log('Track points before loading:', this.trackPoints.length);
        
        this.trackPoints = trackData.trackPoints || [];
        this.checkpoints = trackData.checkpoints || [];
        this.trackWidth = trackData.trackWidth || 40;
        this.trackColor = trackData.trackColor || '#0066cc';
        
        console.log('Track points after loading:', this.trackPoints.length);
        console.log('First few track points:', this.trackPoints.slice(0, 3));
        
        // Update UI
        document.getElementById('trackWidth').value = this.trackWidth;
        document.getElementById('widthValue').textContent = `${this.trackWidth}px`;
        document.getElementById('trackColor').value = this.trackColor;
        
        this.redrawCanvas();
        this.updateTrackInfo();
        this.updateCheckpointsList();
        
        console.log('Track loaded and redrawn');
    }
    
    testTrack() {
        if (this.trackPoints.length === 0) {
            this.updateStatus('Draw a track first!');
            return;
        }
        
        // Generate track data for the game
        const trackData = this.generateGameTrackData();
        
        // Save to localStorage for the game to use
        localStorage.setItem('customTrack', JSON.stringify(trackData));
        
        // Open the game
        window.open('index.html', '_blank');
        
        this.updateStatus('Track ready for testing!');
    }
    
    generateGameTrackData() {
        // Convert track points to game format
        const boundaries = this.generateTrackBoundaries();
        const checkpoints = this.checkpoints.map((cp, index) => ({
            x: cp.x,
            y: cp.y,
            radius: cp.radius
        }));
        
        return {
            boundaries: boundaries,
            checkpoints: checkpoints,
            trackWidth: this.trackWidth,
            trackColor: this.trackColor,
            startPosition: this.findStartPosition()
        };
    }
    
    generateTrackBoundaries() {
        // Create a polygon boundary from track points
        const points = [];
        
        this.trackPoints.forEach(point => {
            if (point.type === 'line') {
                points.push({ x: point.start.x, y: point.start.y });
                points.push({ x: point.end.x, y: point.end.y });
            } else if (point.type === 'curve') {
                // Add curve points (simplified)
                points.push({ x: point.start.x, y: point.start.y });
                points.push({ x: point.control.x, y: point.control.y });
                points.push({ x: point.end.x, y: point.end.y });
            }
        });
        
        return { track: points };
    }
    
    findStartPosition() {
        if (this.trackPoints.length > 0) {
            const firstPoint = this.trackPoints[0];
            return {
                x: firstPoint.start.x,
                y: firstPoint.start.y
            };
        }
        return { x: 200, y: 300 };
    }
    
    updateUI() {
        this.updateTrackInfo();
        this.updateCheckpointsList();
        this.updateStatus('Ready to draw');
    }
}

// Initialize the track editor when page loads
let trackEditor;
window.addEventListener('load', () => {
    trackEditor = new TrackEditor();
}); 