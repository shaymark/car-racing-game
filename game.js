class CarRacingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, racing, finished
        
        // Game settings
        this.laps = 3;
        this.currentLap = 1;
        this.playerPosition = 1;
        this.totalCars = 4;
        
        // Difficulty settings
        this.difficulty = 'easy'; // easy, hard
        this.aiMaxSpeed = 10; // km/h for easy mode
        
        // Track dimensions
        this.trackWidth = 800;
        this.trackHeight = 600;
        this.laneWidth = 120;
        
        // Check for custom track
        this.customTrack = this.loadCustomTrack();
        
        // Debug mode for collision visualization (disabled by default)
        this.debugMode = false;
        
        // Player car
        this.playerCar = {
            x: this.customTrack?.startPosition?.x || 200,
            y: this.customTrack?.startPosition?.y || 300,
            width: 30,
            height: 50,
            speed: 0,
            maxSpeed: 8,
            acceleration: 0.2,
            deceleration: 0.1,
            turnSpeed: 0.05,
            angle: 0,
            boost: 100,
            maxBoost: 100,
            boostRecharge: 0.5,
            color: '#ffff00', // Yellow for player car
            offTrackTime: 0,
            maxOffTrackTime: 3 // 3 seconds penalty for being off track
        };
        
        // AI cars
        this.aiCars = [];
        this.initAICars();
        
        // Track checkpoints
        this.checkpoints = this.createCheckpoints();
        this.currentCheckpoint = 0;
        
        // Input handling
        this.keys = {};
        this.setupInputHandling();
        
        // UI elements
        this.setupUI();
        
        // Start game loop
        this.gameLoop();
    }
    
    loadCustomTrack() {
        const customTrackData = localStorage.getItem('customTrack');
        if (customTrackData) {
            try {
                const trackData = JSON.parse(customTrackData);
                console.log('Loaded custom track:', trackData);
                return trackData;
            } catch (error) {
                console.error('Error loading custom track:', error);
                return null;
            }
        }
        return null;
    }
    
    loadTrackFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const trackData = JSON.parse(e.target.result);
                        this.loadTrackData(trackData);
                        this.updateStatus('Track loaded successfully!');
                    } catch (error) {
                        this.updateStatus('Error loading track file');
                        console.error('Error loading track:', error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    loadTrackData(trackData) {
        console.log('Loading track data from editor:', trackData);
        console.log('Track points from editor:', trackData.trackPoints);
        
        // Convert track editor format to game format
        const gameTrackData = {
            boundaries: this.convertTrackToBoundaries(trackData),
            checkpoints: trackData.checkpoints || [],
            trackWidth: trackData.trackWidth || 40,
            trackColor: trackData.trackColor || '#0066cc', // Use the color from editor, fallback to blue
            startPosition: this.findStartPosition(trackData),
            trackPoints: trackData.trackPoints || []
        };
        
        console.log('Converted game track data:', gameTrackData);
        
        // Save to localStorage for persistence
        localStorage.setItem('customTrack', JSON.stringify(gameTrackData));
        
        // Update game with new track
        this.customTrack = gameTrackData;
        this.checkpoints = this.createCheckpoints();
        this.currentCheckpoint = 0;
        
        // Reset player and AI positions
        this.restartRace();
        
        console.log('Track loaded:', gameTrackData);
    }
    
    convertTrackToBoundaries(trackData) {
        // For custom tracks, we'll use the trackPoints directly for collision detection
        // instead of converting to a simple polygon
        if (trackData.trackPoints && trackData.trackPoints.length > 0) {
            return { 
                track: [], // Empty for custom tracks - collision uses trackPoints directly
                trackPoints: trackData.trackPoints,
                trackWidth: trackData.trackWidth || 40
            };
        }
        
        // Fallback for simple polygon tracks
        const points = [];
        if (trackData.trackPoints && trackData.trackPoints.length > 0) {
            trackData.trackPoints.forEach(point => {
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
        }
        
        return { track: points };
    }
    
    findStartPosition(trackData) {
        if (trackData.trackPoints && trackData.trackPoints.length > 0) {
            const firstPoint = trackData.trackPoints[0];
            return {
                x: firstPoint.start.x,
                y: firstPoint.start.y
            };
        }
        return { x: 200, y: 300 };
    }
    
    updateStatus(message) {
        // Create or update status display
        let statusDiv = document.getElementById('game-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'game-status';
            statusDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                z-index: 1000;
                font-size: 14px;
            `;
            document.body.appendChild(statusDiv);
        }
        
        statusDiv.textContent = message;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 3000);
    }
    
    initAICars() {
        // Distinct colors for AI cars (avoiding yellow which is for player)
        const colors = ['#ff0000', '#00ff00', '#0000ff']; // Red, Green, Blue
        
        // Get starting position from track
        let startX = 200, startY = 300;
        if (this.customTrack && this.customTrack.startPosition) {
            startX = this.customTrack.startPosition.x;
            startY = this.customTrack.startPosition.y;
        }
        
        // Create staggered starting positions
        const startPositions = [
            { x: startX - 20, y: startY, angle: 0 },     // Left lane
            { x: startX, y: startY, angle: 0 },          // Center lane
            { x: startX + 20, y: startY, angle: 0 }      // Right lane
        ];
        
        for (let i = 0; i < this.totalCars - 1; i++) {
            const behavior = Math.random() > 0.5 ? 'aggressive' : 'conservative';
            const baseSpeed = behavior === 'aggressive' ? 4 : 3;
            const speedVariation = Math.random() * 2;
            
            // Apply difficulty-based speed limit
            const maxSpeed = this.aiMaxSpeed / 3.6; // Convert km/h to pixels per frame
            
            this.aiCars.push({
                x: startPositions[i].x,
                y: startPositions[i].y,
                width: 30,
                height: 50,
                speed: baseSpeed + speedVariation,
                maxSpeed: Math.min(baseSpeed + 2 + speedVariation, maxSpeed), // Limited by difficulty
                angle: startPositions[i].angle,
                color: colors[i],
                checkpoint: 0,
                lap: 1,
                aiBehavior: behavior,
                // Stuck detection properties
                stuckTimer: 0,
                stuckAttempts: 0,
                stuckThreshold: 120 + Math.random() * 60, // 2-3 seconds with variation
                lastPosition: { x: startPositions[i].x, y: startPositions[i].y }
            });
        }
    }
    
    createCheckpoints() {
        if (this.customTrack && this.customTrack.checkpoints && this.customTrack.checkpoints.length > 0) {
            return this.customTrack.checkpoints;
        }
        
        // Auto-generate checkpoints for custom tracks
        if (this.customTrack && this.customTrack.trackPoints && this.customTrack.trackPoints.length > 0) {
            return this.generateCheckpointsFromTrack();
        }
        
        return [
            { x: 200, y: 300, radius: 30 }, // Start/finish line
            { x: 500, y: 250, radius: 30 }, // Top curve
            { x: 650, y: 350, radius: 30 }, // Right curve
            { x: 500, y: 400, radius: 30 }, // Bottom curve
            { x: 600, y: 400, radius: 30 }, // Bottom straight
            { x: 600, y: 200, radius: 30 }  // Top straight
        ];
    }
    
    generateCheckpointsFromTrack() {
        const trackPoints = this.customTrack.trackPoints;
        const checkpoints = [];
        const totalPoints = trackPoints.length;
        
        // Create 6 evenly spaced checkpoints
        for (let i = 0; i < 6; i++) {
            const index = Math.floor((i / 5) * (totalPoints - 1));
            const point = trackPoints[index];
            
            if (point) {
                // Use the start point of each segment as checkpoint
                checkpoints.push({
                    x: point.start.x,
                    y: point.start.y,
                    radius: 30
                });
            }
        }
        
        console.log('Generated checkpoints for custom track:', checkpoints);
        return checkpoints;
    }
    
    // Track boundaries for collision detection
    getTrackBoundaries() {
        if (this.customTrack) {
            return this.customTrack.boundaries || { track: [] };
        }
        
        return {
            track: [
                // Define the blue track area as a polygon
                { x: 100, y: 300 },
                { x: 300, y: 300 },
                { x: 500, y: 250 },
                { x: 650, y: 350 },
                { x: 500, y: 400 },
                { x: 300, y: 400 },
                { x: 600, y: 400 },
                { x: 600, y: 200 },
                { x: 200, y: 200 },
                { x: 100, y: 300 }
            ]
        };
    }
    
    // Check if a point is inside the track using distance-based detection
    isPointOnTrack(x, y) {
        if (this.customTrack && this.customTrack.trackPoints) {
            return this.isPointOnCustomTrack(x, y);
        }
        
        // Fallback to polygon method for default track
        const boundaries = this.getTrackBoundaries();
        const track = boundaries.track;
        
        let inside = false;
        for (let i = 0, j = track.length - 1; i < track.length; j = i++) {
            const xi = track[i].x, yi = track[i].y;
            const xj = track[j].x, yj = track[j].y;
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    // Check if a point is on a custom track (freehand, etc.)
    isPointOnCustomTrack(x, y) {
        const trackPoints = this.customTrack.trackPoints;
        const trackWidth = this.customTrack.trackWidth || 40;
        const halfWidth = trackWidth / 2;
        
        if (!trackPoints || trackPoints.length === 0) {
            console.log('No track points for collision detection');
            return false;
        }
        
        // Check distance to any track segment
        for (let i = 0; i < trackPoints.length; i++) {
            const point = trackPoints[i];
            
            if (point.type === 'line') {
                const distance = this.distanceToLineSegment(x, y, point.start, point.end);
                if (distance <= halfWidth) {
                    return true;
                }
            } else if (point.type === 'curve') {
                const distance = this.distanceToCurve(x, y, point.start, point.control, point.end);
                if (distance <= halfWidth) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Calculate distance from point to line segment
    distanceToLineSegment(px, py, start, end) {
        const A = px - start.x;
        const B = py - start.y;
        const C = end.x - start.x;
        const D = end.y - start.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Start and end are the same point
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = start.x;
            yy = start.y;
        } else if (param > 1) {
            xx = end.x;
            yy = end.y;
        } else {
            xx = start.x + param * C;
            yy = start.y + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calculate distance from point to quadratic curve (approximation)
    distanceToCurve(px, py, start, control, end) {
        // Approximate curve with multiple line segments
        const segments = 10;
        let minDistance = Infinity;
        
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;
            
            const p1 = this.getPointOnCurve(start, control, end, t1);
            const p2 = this.getPointOnCurve(start, control, end, t2);
            
            const distance = this.distanceToLineSegment(px, py, p1, p2);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
    
    // Get point on quadratic curve at parameter t
    getPointOnCurve(start, control, end, t) {
        const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x;
        const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y;
        return { x, y };
    }
    
    // Check if car is on track
    isCarOnTrack(car) {
        const corners = [
            { x: car.x - car.width/2, y: car.y - car.height/2 },
            { x: car.x + car.width/2, y: car.y - car.height/2 },
            { x: car.x - car.width/2, y: car.y + car.height/2 },
            { x: car.x + car.width/2, y: car.y + car.height/2 }
        ];
        
        // Check if all corners are on track
        return corners.every(corner => this.isPointOnTrack(corner.x, corner.y));
    }
    
    setupInputHandling() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (this.gameState === 'menu') {
                this.startRace();
            }
            
            if (e.code === 'KeyR') {
                this.restartRace();
            }
            
            if (e.code === 'KeyD') {
                this.debugMode = !this.debugMode;
                console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
            }
            
            if (e.code === 'KeyR' && e.ctrlKey) {
                // Ctrl+R to reset all AI cars
                this.resetAllAICars();
                console.log('All AI cars reset');
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartRace();
        });
        
        document.getElementById('editor-btn').addEventListener('click', () => {
            window.open('track-editor.html', '_blank');
        });
        
        document.getElementById('load-track-btn').addEventListener('click', () => {
            this.loadTrackFile();
        });
    }
    
    setupUI() {
        this.lapCounter = document.getElementById('lap-counter');
        this.positionDisplay = document.getElementById('position');
        this.speedDisplay = document.getElementById('speed');
        this.boostFill = document.getElementById('boost-fill');
        this.gameOverlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        
        // New UI elements for score and difficulty
        this.currentLapDisplay = document.getElementById('current-lap');
        this.currentCheckpointDisplay = document.getElementById('current-checkpoint');
        this.lapProgressDisplay = document.getElementById('lap-progress');
        this.difficultyInfo = document.getElementById('difficulty-info');
        this.easyBtn = document.getElementById('easy-btn');
        this.hardBtn = document.getElementById('hard-btn');
        
        // Setup difficulty buttons
        this.setupDifficultyButtons();
        
        // Initial UI update
        this.updateScoreDisplay();
    }
    
    setupDifficultyButtons() {
        this.easyBtn.addEventListener('click', () => {
            this.setDifficulty('easy');
        });
        
        this.hardBtn.addEventListener('click', () => {
            this.setDifficulty('hard');
        });
        
        // Set initial difficulty
        this.setDifficulty('easy');
    }
    
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.aiMaxSpeed = difficulty === 'easy' ? 10 : 15; // 10 km/h for easy, 15 km/h for hard
        
        // Update button states
        this.easyBtn.classList.toggle('active', difficulty === 'easy');
        this.hardBtn.classList.toggle('active', difficulty === 'hard');
        
        // Update difficulty info
        this.difficultyInfo.textContent = difficulty === 'easy' 
            ? 'Easy: AI max speed 10 km/h' 
            : 'Hard: AI max speed 15 km/h';
        
        // Update AI cars speed
        this.aiCars.forEach(car => {
            car.maxSpeed = this.aiMaxSpeed / 3.6; // Convert km/h to pixels per frame
        });
        
        console.log(`Difficulty set to ${difficulty}, AI max speed: ${this.aiMaxSpeed} km/h`);
    }
    
    updateScoreDisplay() {
        if (this.currentLapDisplay) {
            this.currentLapDisplay.textContent = `${this.currentLap}/${this.laps}`;
        }
        
        if (this.currentCheckpointDisplay) {
            this.currentCheckpointDisplay.textContent = `${this.currentCheckpoint}/${this.checkpoints.length}`;
        }
        
        if (this.lapProgressDisplay) {
            const progress = this.checkpoints.length > 0 
                ? Math.round((this.currentCheckpoint / this.checkpoints.length) * 100)
                : 0;
            this.lapProgressDisplay.textContent = `${progress}%`;
        }
    }
    
    startRace() {
        this.gameState = 'racing';
        this.gameOverlay.classList.add('hidden');
    }
    
    restartRace() {
        this.currentLap = 1;
        this.playerPosition = 1;
        this.currentCheckpoint = 0;
        this.playerCar.x = 200;
        this.playerCar.y = 300;
        this.playerCar.speed = 0;
        this.playerCar.angle = 0;
        this.playerCar.boost = this.playerCar.maxBoost;
        
        const startPositions = [
            { x: 180, y: 300, angle: 0 },    // Left lane
            { x: 200, y: 300, angle: 0 },    // Center lane
            { x: 220, y: 300, angle: 0 }     // Right lane
        ];
        
        this.aiCars.forEach((car, index) => {
            car.x = startPositions[index].x;
            car.y = startPositions[index].y;
            car.speed = 3 + Math.random() * 2;
            car.angle = startPositions[index].angle;
            car.checkpoint = 0;
            car.lap = 1;
        });
        
        this.gameState = 'racing';
        this.gameOverlay.classList.add('hidden');
    }
    
    updatePlayerCar() {
        // Handle input
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.playerCar.speed = Math.min(this.playerCar.speed + this.playerCar.acceleration, this.playerCar.maxSpeed);
        } else if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.playerCar.speed = Math.max(this.playerCar.speed - this.playerCar.acceleration, -this.playerCar.maxSpeed / 2);
        } else {
            this.playerCar.speed *= 0.95; // Natural deceleration
        }
        
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.playerCar.angle -= this.playerCar.turnSpeed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.playerCar.angle += this.playerCar.turnSpeed;
        }
        
        // Boost
        if (this.keys['Space'] && this.playerCar.boost > 0) {
            this.playerCar.speed = Math.min(this.playerCar.speed + 0.5, this.playerCar.maxSpeed * 1.5);
            this.playerCar.boost = Math.max(0, this.playerCar.boost - 1);
        } else {
            this.playerCar.boost = Math.min(this.playerCar.maxBoost, this.playerCar.boost + this.playerCar.boostRecharge);
        }
        
        // Update position
        this.playerCar.x += Math.sin(this.playerCar.angle) * this.playerCar.speed;
        this.playerCar.y -= Math.cos(this.playerCar.angle) * this.playerCar.speed;
        
        // Keep car on track
        this.keepCarOnTrack(this.playerCar);
        
        // Handle off-track penalty - 500ms timeout
        if (!this.isCarOnTrack(this.playerCar)) {
            this.playerCar.offTrackTime += 1/60; // Assuming 60 FPS
            if (this.playerCar.offTrackTime >= 0.5) { // 500 milliseconds
                // Reset car to last checkpoint
                const lastCheckpoint = this.checkpoints[Math.max(0, this.currentCheckpoint - 1)];
                this.playerCar.x = lastCheckpoint.x;
                this.playerCar.y = lastCheckpoint.y;
                this.playerCar.speed = 0;
                this.playerCar.offTrackTime = 0;
                console.log(`Player car returned to checkpoint ${Math.max(0, this.currentCheckpoint - 1)} after being off track for 500ms`);
            }
        } else {
            this.playerCar.offTrackTime = 0;
        }
    }
    
    updateAICars() {
        this.aiCars.forEach(car => {
            // Initialize stuck detection if not exists
            if (!car.stuckTimer) car.stuckTimer = 0;
            if (!car.lastPosition) car.lastPosition = { x: car.x, y: car.y };
            if (!car.stuckThreshold) car.stuckThreshold = 60; // 1 second at 60fps (more aggressive)
            if (!car.stuckAttempts) car.stuckAttempts = 0;
            
            // AI: follow checkpoints with improved navigation
            const targetCheckpoint = this.checkpoints[car.checkpoint];
            if (!targetCheckpoint) {
                console.log(`AI car checkpoint ${car.checkpoint} not found, resetting to 0`);
                car.checkpoint = 0;
                return;
            }
            const dx = targetCheckpoint.x - car.x;
            const dy = targetCheckpoint.y - car.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if car is stuck (not moving significantly)
            const movement = Math.sqrt(
                (car.x - car.lastPosition.x) ** 2 + 
                (car.y - car.lastPosition.y) ** 2
            );
            
            // More aggressive stuck detection
            if (movement < 2) { // Car barely moved (increased threshold)
                car.stuckTimer++;
                if (car.stuckTimer > 30) { // Log after 0.5 seconds
                    console.log(`AI car stuck for ${car.stuckTimer} frames, movement: ${movement.toFixed(2)}`);
                }
            } else {
                if (car.stuckTimer > 0) {
                    console.log(`AI car unstuck after ${car.stuckTimer} frames`);
                }
                car.stuckTimer = 0;
            }
            
            // Update last position
            car.lastPosition.x = car.x;
            car.lastPosition.y = car.y;
            
            // Handle stuck car (more aggressive)
            if (car.stuckTimer > car.stuckThreshold) {
                this.handleStuckAI(car);
                return;
            }
            
            // Emergency stuck detection - if car hasn't moved at all for 30 frames
            if (movement === 0 && car.stuckTimer > 30) {
                console.log(`AI car completely stationary for ${car.stuckTimer} frames - emergency recovery`);
                this.handleStuckAI(car);
                return;
            }
            
            // Normal AI navigation
            const targetAngle = Math.atan2(dx, -dy);
            
            // Smooth turning with track curvature consideration
            let angleDiff = targetAngle - car.angle;
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // Adjust turning speed based on distance and behavior
            let turnSpeed = 0.05;
            if (distance < 50) { // Close to checkpoint
                turnSpeed = 0.08;
            } else if (distance > 200) { // Far from checkpoint
                turnSpeed = 0.03;
            }
            
            // Add some randomness to prevent all cars from following identical paths
            const randomFactor = (Math.random() - 0.5) * 0.02;
            car.angle += (angleDiff + randomFactor) * turnSpeed;
            
            // Adjust speed based on behavior, distance, and track section
            let targetSpeed = car.maxSpeed;
            if (car.aiBehavior === 'conservative') {
                targetSpeed *= 0.8;
            }
            
            // Slow down when close to checkpoint or in tight turns
            if (distance < 30) {
                targetSpeed *= 0.7;
            } else if (Math.abs(angleDiff) > Math.PI / 4) { // Sharp turn
                targetSpeed *= 0.8;
            }
            
            // Gradually adjust speed
            if (car.speed < targetSpeed) {
                car.speed = Math.min(car.speed + 0.1, targetSpeed);
            } else {
                car.speed = Math.max(car.speed - 0.05, targetSpeed);
            }
            
            // Update position
            car.x += Math.sin(car.angle) * car.speed;
            car.y -= Math.cos(car.angle) * car.speed;
            
            // Keep car on track
            this.keepCarOnTrack(car);
            
            // Handle off-track penalty for AI cars - 500ms timeout
            if (!this.isCarOnTrack(car)) {
                if (!car.offTrackTime) car.offTrackTime = 0;
                car.offTrackTime += 1/60; // Assuming 60 FPS
                if (car.offTrackTime >= 0.5) { // 500 milliseconds
                    // Reset AI car to last checkpoint
                    const lastCheckpoint = this.checkpoints[Math.max(0, car.checkpoint - 1)];
                    car.x = lastCheckpoint.x;
                    car.y = lastCheckpoint.y;
                    car.speed = 0;
                    car.offTrackTime = 0;
                    console.log(`AI car returned to checkpoint ${Math.max(0, car.checkpoint - 1)} after being off track for 500ms`);
                }
            } else {
                car.offTrackTime = 0;
            }
            
            // Check checkpoint with larger detection radius for AI
            const checkpointRadius = targetCheckpoint.radius * 1.5; // AI gets larger detection area
            if (distance < checkpointRadius) {
                car.checkpoint = (car.checkpoint + 1) % this.checkpoints.length;
                if (car.checkpoint === 0) {
                    car.lap++;
                }
                car.stuckTimer = 0; // Reset stuck timer when checkpoint reached
            }
        });
    }
    
    handleStuckAI(car) {
        console.log(`AI car stuck, attempting recovery... (attempt ${car.stuckAttempts + 1})`);
        
        // Try to get unstuck by moving to a different position
        car.stuckAttempts = car.stuckAttempts + 1;
        
        if (car.stuckAttempts <= 2) {
            // Try to move to a random position near the current checkpoint
            const targetCheckpoint = this.checkpoints[car.checkpoint];
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDistance = 30 + Math.random() * 50; // Larger random area
            
            const newX = targetCheckpoint.x + Math.cos(randomAngle) * randomDistance;
            const newY = targetCheckpoint.y + Math.sin(randomAngle) * randomDistance;
            
            console.log(`Moving AI car from (${car.x.toFixed(1)}, ${car.y.toFixed(1)}) to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
            
            car.x = newX;
            car.y = newY;
            
            // Reset stuck timer
            car.stuckTimer = 0;
            
        } else {
            // Force advance to next checkpoint if still stuck
            console.log(`AI car force advancing to next checkpoint (${car.checkpoint} -> ${(car.checkpoint + 1) % this.checkpoints.length})`);
            
            car.checkpoint = (car.checkpoint + 1) % this.checkpoints.length;
            if (car.checkpoint === 0) {
                car.lap++;
            }
            
            // Reset stuck state
            car.stuckTimer = 0;
            car.stuckAttempts = 0;
            
            // Move car to new checkpoint
            const newCheckpoint = this.checkpoints[car.checkpoint];
            car.x = newCheckpoint.x;
            car.y = newCheckpoint.y;
            
            console.log(`AI car teleported to checkpoint ${car.checkpoint} at (${car.x.toFixed(1)}, ${car.y.toFixed(1)})`);
        }
    }
    
    resetAllAICars() {
        this.aiCars.forEach((car, index) => {
            // Reset to start position
            let startX = 200, startY = 300;
            if (this.customTrack && this.customTrack.startPosition) {
                startX = this.customTrack.startPosition.x;
                startY = this.customTrack.startPosition.y;
            }
            
            // Stagger positions
            car.x = startX + (index - 1) * 20;
            car.y = startY;
            car.angle = 0;
            car.speed = 0;
            car.checkpoint = 0;
            car.lap = 1;
            
            // Reset stuck detection
            car.stuckTimer = 0;
            car.stuckAttempts = 0;
            car.lastPosition = { x: car.x, y: car.y };
            
            console.log(`AI car ${index} reset to (${car.x.toFixed(1)}, ${car.y.toFixed(1)})`);
        });
    }
    
    keepCarOnTrack(car) {
        // Store original position
        const originalX = car.x;
        const originalY = car.y;
        
        // Check if car is on track
        if (!this.isCarOnTrack(car)) {
            // Try to push car back onto track
            const pushDistance = 2;
            const directions = [
                { dx: -pushDistance, dy: 0 },
                { dx: pushDistance, dy: 0 },
                { dx: 0, dy: -pushDistance },
                { dx: 0, dy: pushDistance },
                { dx: -pushDistance, dy: -pushDistance },
                { dx: pushDistance, dy: -pushDistance },
                { dx: -pushDistance, dy: pushDistance },
                { dx: pushDistance, dy: pushDistance }
            ];
            
            // Try each direction to find a valid position
            for (let dir of directions) {
                car.x = originalX + dir.dx;
                car.y = originalY + dir.dy;
                if (this.isCarOnTrack(car)) {
                    break;
                }
            }
            
            // If still not on track, revert to original position
            if (!this.isCarOnTrack(car)) {
                car.x = originalX;
                car.y = originalY;
            }
            
            // Reduce speed when hitting boundaries
            car.speed *= 0.8;
        }
    }
    
    checkPlayerCheckpoint() {
        const targetCheckpoint = this.checkpoints[this.currentCheckpoint];
        const distance = Math.sqrt((this.playerCar.x - targetCheckpoint.x) ** 2 + (this.playerCar.y - targetCheckpoint.y) ** 2);
        
        if (distance < targetCheckpoint.radius) {
            this.currentCheckpoint = (this.currentCheckpoint + 1) % this.checkpoints.length;
            if (this.currentCheckpoint === 0) {
                this.currentLap++;
                if (this.currentLap > this.laps) {
                    this.finishRace();
                }
            }
        }
    }
    
    calculatePositions() {
        const allCars = [this.playerCar, ...this.aiCars];
        const positions = allCars.map((car, index) => ({
            car: car,
            index: index,
            progress: this.calculateCarProgress(car)
        }));
        
        positions.sort((a, b) => b.progress - a.progress);
        
        // Find player position
        const playerPos = positions.find(p => p.index === 0);
        this.playerPosition = positions.indexOf(playerPos) + 1;
    }
    
    calculateCarProgress(car) {
        if (car === this.playerCar) {
            return (this.currentLap - 1) * this.checkpoints.length + this.currentCheckpoint;
        } else {
            return (car.lap - 1) * this.checkpoints.length + car.checkpoint;
        }
    }
    
    finishRace() {
        this.gameState = 'finished';
        this.overlayTitle.textContent = this.playerPosition === 1 ? '🏆 Victory! 🏆' : 'Race Finished';
        this.overlayMessage.textContent = `You finished in ${this.playerPosition}${this.getOrdinalSuffix(this.playerPosition)} place!`;
        this.gameOverlay.classList.remove('hidden');
    }
    
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }
    
    updateUI() {
        this.lapCounter.textContent = `${this.currentLap}/${this.laps}`;
        this.positionDisplay.textContent = `${this.playerPosition}${this.getOrdinalSuffix(this.playerPosition)}`;
        this.speedDisplay.textContent = `${Math.round(this.playerCar.speed * 10)} km/h`;
        this.boostFill.style.width = `${(this.playerCar.boost / this.playerCar.maxBoost) * 100}%`;
        
        // Update score display
        this.updateScoreDisplay();
        
        // Show off-track warning
        if (!this.isCarOnTrack(this.playerCar)) {
            const timeLeft = this.playerCar.maxOffTrackTime - this.playerCar.offTrackTime;
            if (timeLeft <= 2) {
                this.speedDisplay.textContent = `OFF TRACK! ${timeLeft.toFixed(1)}s`;
                this.speedDisplay.style.color = '#e74c3c';
            }
        } else {
            this.speedDisplay.style.color = 'white';
        }
    }
    
    drawTrack() {
        // Always draw the same track type to prevent color changes
        if (this.customTrack && this.customTrack.trackPoints && this.customTrack.trackPoints.length > 0) {
            this.drawCustomTrack();
        } else {
            this.drawDefaultTrack();
        }
        
        // Debug: Log track drawing to console
        console.log('Track drawn - customTrack:', !!this.customTrack, 'trackPoints:', this.customTrack?.trackPoints?.length || 0);
    }
    
    drawDefaultTrack() {
        // Reset context state for consistent drawing
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Draw dark gray background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, 0, this.trackWidth, this.trackHeight);
        
        // Draw blue track
        this.ctx.fillStyle = '#0066cc';
        this.drawBlueTrack();
        
        // Track outline removed - only blue track color visible
        
        // Draw start line
        this.drawStartLine();
        
        // Draw checkpoints (without numbers) - consistent colors
        this.checkpoints.forEach((checkpoint, index) => {
            this.ctx.beginPath();
            this.ctx.arc(checkpoint.x, checkpoint.y, checkpoint.radius, 0, 2 * Math.PI);
            this.ctx.strokeStyle = '#95a5a6'; // Always gray, never changes
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        });
    }
    
    drawCustomTrack() {
        // Reset context state for consistent drawing
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Draw dark gray background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, 0, this.trackWidth, this.trackHeight);
        
        // Draw custom track - use the color from editor
        this.ctx.fillStyle = this.customTrack.trackColor || '#0066cc'; // Use saved color
        this.drawCustomTrackPath();
        
        // Track outline removed - only track color visible
        
        // Draw checkpoints - consistent colors
        this.checkpoints.forEach((checkpoint, index) => {
            this.ctx.beginPath();
            this.ctx.arc(checkpoint.x, checkpoint.y, checkpoint.radius, 0, 2 * Math.PI);
            this.ctx.strokeStyle = '#95a5a6'; // Always gray, never changes
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        });
    }
    
    drawCustomTrackPath() {
        // Ensure consistent drawing state
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
        
        const trackPoints = this.customTrack.trackPoints || [];
        const trackWidth = this.customTrack.trackWidth || 40;
        
        if (trackPoints.length > 0) {
            // Draw each line segment individually to preserve parallel lines
            trackPoints.forEach((point, index) => {
                this.ctx.beginPath();
                this.ctx.lineWidth = trackWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
                if (point.type === 'line') {
                    this.ctx.moveTo(point.start.x, point.start.y);
                    this.ctx.lineTo(point.end.x, point.end.y);
                } else if (point.type === 'curve') {
                    this.ctx.moveTo(point.start.x, point.start.y);
                    this.ctx.quadraticCurveTo(point.control.x, point.control.y, point.end.x, point.end.y);
                }
                
                this.ctx.stroke();
            });
        }
        
        // Debug mode disabled - no collision boundaries drawn
    }
    
    drawCollisionDebug() {
        const trackPoints = this.customTrack.trackPoints || [];
        const trackWidth = this.customTrack.trackWidth || 40;
        const halfWidth = trackWidth / 2;
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        
        trackPoints.forEach(point => {
            if (point.type === 'line') {
                // Draw perpendicular lines to show collision area
                const dx = point.end.x - point.start.x;
                const dy = point.end.y - point.start.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                if (length > 0) {
                    const perpX = -dy / length;
                    const perpY = dx / length;
                    
                    // Draw collision boundary lines
                    this.ctx.beginPath();
                    this.ctx.moveTo(
                        point.start.x + perpX * halfWidth,
                        point.start.y + perpY * halfWidth
                    );
                    this.ctx.lineTo(
                        point.start.x - perpX * halfWidth,
                        point.start.y - perpY * halfWidth
                    );
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(
                        point.end.x + perpX * halfWidth,
                        point.end.y + perpY * halfWidth
                    );
                    this.ctx.lineTo(
                        point.end.x - perpX * halfWidth,
                        point.end.y - perpY * halfWidth
                    );
                    this.ctx.stroke();
                }
            }
        });
    }
    
    drawCustomTrackOutline() {
        // Ensure consistent drawing state
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
        
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        const trackPoints = this.customTrack.trackPoints || [];
        if (trackPoints.length > 0) {
            this.ctx.moveTo(trackPoints[0].start.x, trackPoints[0].start.y);
            
            trackPoints.forEach(point => {
                if (point.type === 'line') {
                    this.ctx.lineTo(point.end.x, point.end.y);
                } else if (point.type === 'curve') {
                    this.ctx.quadraticCurveTo(point.control.x, point.control.y, point.end.x, point.end.y);
                }
            });
        }
        
        this.ctx.stroke();
    }
    
    drawBlueTrack() {
        this.ctx.beginPath();
        
        // Create a winding track similar to the image
        // Start from left side
        this.ctx.moveTo(100, 300);
        
        // Horizontal straight to the right
        this.ctx.lineTo(300, 300);
        
        // Curve up and to the right
        this.ctx.quadraticCurveTo(400, 200, 500, 250);
        
        // Sharp right turn
        this.ctx.quadraticCurveTo(600, 300, 650, 350);
        
        // Curve down and to the left
        this.ctx.quadraticCurveTo(600, 450, 500, 400);
        
        // Sharp left turn
        this.ctx.quadraticCurveTo(400, 350, 300, 400);
        
        // Long horizontal straight to the right
        this.ctx.lineTo(600, 400);
        
        // Sharp upward curve
        this.ctx.quadraticCurveTo(650, 300, 600, 200);
        
        // Left turn back to start
        this.ctx.quadraticCurveTo(400, 150, 200, 200);
        
        // Connect back to start
        this.ctx.lineTo(100, 300);
        
        this.ctx.fill();
    }
    
    drawTrackOutline() {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        
        this.ctx.beginPath();
        
        // Start from left side
        this.ctx.moveTo(100, 300);
        
        // Horizontal straight to the right
        this.ctx.lineTo(300, 300);
        
        // Curve up and to the right
        this.ctx.quadraticCurveTo(400, 200, 500, 250);
        
        // Sharp right turn
        this.ctx.quadraticCurveTo(600, 300, 650, 350);
        
        // Curve down and to the left
        this.ctx.quadraticCurveTo(600, 450, 500, 400);
        
        // Sharp left turn
        this.ctx.quadraticCurveTo(400, 350, 300, 400);
        
        // Long horizontal straight to the right
        this.ctx.lineTo(600, 400);
        
        // Sharp upward curve
        this.ctx.quadraticCurveTo(650, 300, 600, 200);
        
        // Left turn back to start
        this.ctx.quadraticCurveTo(400, 150, 200, 200);
        
        // Connect back to start
        this.ctx.lineTo(100, 300);
        
        this.ctx.stroke();
    }
    
    drawStartLine() {
        // Draw "start" text
        this.ctx.fillStyle = '#006600';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('start', 200, 280);
        
        // Draw start line on track
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(180, 300);
        this.ctx.lineTo(220, 300);
        this.ctx.stroke();
    }
    
    drawCar(car) {
        this.ctx.save();
        this.ctx.translate(car.x, car.y);
        this.ctx.rotate(car.angle);
        
        // Check if car is on track for visual feedback
        const isOnTrack = this.isCarOnTrack(car);
        
        // Car body - always use original color, never change it
        this.ctx.fillStyle = car.color; // Always use the car's original color
        this.ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
        
        // Car details
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(-car.width / 2 + 2, -car.height / 2 + 2, car.width - 4, car.height / 3);
        
        // Headlights
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 5, 4, 8);
        this.ctx.fillRect(car.width / 2 - 9, -car.height / 2 + 5, 4, 8);
        
        // Off-track indicator (red glow around car, doesn't change car color)
        if (!isOnTrack) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; // Red glow
            this.ctx.fillRect(-car.width / 2 - 5, -car.height / 2 - 5, car.width + 10, car.height + 10);
            
            // Show countdown timer when off track
            if (car.offTrackTime && car.offTrackTime > 0) {
                const timeLeft = Math.max(0, 0.5 - car.offTrackTime);
                const percentage = (timeLeft / 0.5) * 100;
                
                // Draw countdown bar above car
                this.ctx.restore();
                this.ctx.save();
                
                // Background bar
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(car.x - 20, car.y - car.height / 2 - 30, 40, 8);
                
                // Progress bar
                this.ctx.fillStyle = percentage > 50 ? '#00ff00' : percentage > 25 ? '#ffff00' : '#ff0000';
                this.ctx.fillRect(car.x - 20, car.y - car.height / 2 - 30, 40 * (percentage / 100), 8);
                
                // Border
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(car.x - 20, car.y - car.height / 2 - 30, 40, 8);
                
                // Time text
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${(timeLeft * 1000).toFixed(0)}ms`, car.x, car.y - car.height / 2 - 35);
            }
        }
        
        this.ctx.restore();
        
        // Draw stuck indicator for AI cars
        if (car.stuckTimer && car.stuckTimer > car.stuckThreshold * 0.5) {
            this.ctx.save();
            
            // Draw warning triangle above car
            this.ctx.fillStyle = '#ff6600';
            this.ctx.beginPath();
            this.ctx.moveTo(car.x, car.y - car.height / 2 - 15);
            this.ctx.lineTo(car.x - 8, car.y - car.height / 2 - 25);
            this.ctx.lineTo(car.x + 8, car.y - car.height / 2 - 25);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw exclamation mark
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!', car.x, car.y - car.height / 2 - 18);
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.trackWidth, this.trackHeight);
        
        // Reset canvas context to ensure consistent drawing
        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Draw track
        this.drawTrack();
        
        // Draw all cars
        this.drawCar(this.playerCar);
        this.aiCars.forEach(car => this.drawCar(car));
        
        // Speed lines removed - only track color and boundaries visible
    }
    
    update() {
        if (this.gameState === 'racing') {
            this.updatePlayerCar();
            this.updateAICars();
            this.checkPlayerCheckpoint();
            this.calculatePositions();
            this.updateUI();
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new CarRacingGame();
}); 