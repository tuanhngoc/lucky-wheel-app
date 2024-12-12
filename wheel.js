class LuckyWheel {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.participants = [];
        this.prizes = [];
        this.grantedWinners = [];
        this.winners = [];
        this.currentAngle = 0;
        this.isSpinning = false;
        this.currentWinner = null;
        this.currentPrize = null;
        this.winnerShown = false;
        this.dataLoaded = false;

        // Set canvas size
        this.canvas.width = 600;
        this.canvas.height = 600;

        this.setupEventListeners();
        this.resizeCanvas();
        this.checkDefaultFile();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        const loadButton = document.getElementById('loadData');
        loadButton.addEventListener('click', () => {
            if (this.dataLoaded) {
                this.resetWheel();
            } else {
                this.loadData();
            }
        });

        document.getElementById('spinButton').addEventListener('click', () => this.spin());
        document.getElementById('recordWin').addEventListener('click', () => this.recordWin());
        document.getElementById('dismissWin').addEventListener('click', () => this.dismissWin());
        
        // File input handler
        document.getElementById('dataFile').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.loadDataFromFile(file);
            }
        });

        // Add menu toggle event listener
        const menuToggle = document.getElementById('menuToggle');
        menuToggle.addEventListener('click', () => this.toggleMenu());
    }

    async checkDefaultFile() {
        try {
            const response = await fetch('default.txt');
            if (response.ok) {
                const content = await response.text();
                this.parseFileData(content);
                // Collapse menu if data is loaded
                this.collapseMenu();
            }
        } catch (error) {
            console.log('No default.txt file found');
        }
    }

    collapseMenu() {
        const mainContent = document.querySelector('.main-content');
        const inputSection = document.getElementById('inputSection');
        mainContent.classList.add('menu-collapsed');
        inputSection.classList.add('collapsed');
    }

    expandMenu() {
        const mainContent = document.querySelector('.main-content');
        const inputSection = document.getElementById('inputSection');
        mainContent.classList.remove('menu-collapsed');
        inputSection.classList.remove('collapsed');
    }

    toggleMenu() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent.classList.contains('menu-collapsed')) {
            this.expandMenu();
        } else {
            this.collapseMenu();
        }
    }

    async loadDataFromFile(file) {
        try {
            const text = await file.text();
            this.parseFileData(text);
        } catch (error) {
            alert('Error reading file: ' + error.message);
        }
    }

    parseFileData(text) {
        const sections = {
            participants: [],
            prizes: [],
            grantedWinners: []
        };
        
        let currentSection = null;
        
        // Parse file line by line
        text.split('\n').forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            
            // Check for section headers
            if (line === '[Participants]') {
                currentSection = 'participants';
                return;
            } else if (line === '[Prizes]') {
                currentSection = 'prizes';
                return;
            } else if (line === '[GrantedWinners]') {
                currentSection = 'grantedWinners';
                return;
            }
            
            // Add line to current section if we're in one
            if (currentSection) {
                sections[currentSection].push(line);
            }
        });
        
        // Update textareas with parsed data
        document.getElementById('participants').value = sections.participants.join('\n');
        document.getElementById('prizes').value = sections.prizes.join('\n');
        document.getElementById('grantedWinners').value = sections.grantedWinners.join('\n');
        
        // Load the data
        this.loadData();
    }

    loadData() {
        const participantsText = document.getElementById('participants').value;
        const prizesText = document.getElementById('prizes').value;
        const grantedWinnersText = document.getElementById('grantedWinners').value;

        // Validate inputs
        if (!participantsText.trim() || !prizesText.trim()) {
            alert('Please enter both participants and prizes');
            return;
        }

        this.participants = participantsText.split('\n').filter(p => p.trim());
        this.prizes = prizesText.split('\n')
            .filter(p => p.trim())
            .map(p => {
                const [name, quantity] = p.split(',');
                return { name: name.trim(), quantity: parseInt(quantity) || 1 };
            });
        this.grantedWinners = grantedWinnersText.split('\n')
            .filter(w => w.trim())
            .map(w => {
                const [name, prize] = w.split(',');
                return { name: name.trim(), prize: prize.trim() };
            });

        // Set a random initial angle when loading data
        this.currentAngle = Math.random() * 2 * Math.PI;
        this.dataLoaded = true;
        
        // Update button text and style
        const loadButton = document.getElementById('loadData');
        loadButton.textContent = 'Reset';
        loadButton.classList.add('reset');
        
        this.drawWheel();
    }

    resetWheel() {
        // Clear all data
        this.participants = [];
        this.prizes = [];
        this.grantedWinners = [];
        this.winners = [];
        this.currentAngle = 0;
        this.currentWinner = null;
        this.currentPrize = null;
        this.winnerShown = false;
        this.dataLoaded = false;

        // Reset textareas
        document.getElementById('participants').value = '';
        document.getElementById('prizes').value = '';
        document.getElementById('grantedWinners').value = '';
        document.getElementById('dataFile').value = '';

        // Reset winners list
        document.getElementById('winnersList').innerHTML = '';
        document.getElementById('winner').textContent = '';
        document.querySelector('.winner-buttons').style.display = 'none';

        // Reset button
        const loadButton = document.getElementById('loadData');
        loadButton.textContent = 'Load Data';
        loadButton.classList.remove('reset');

        // Redraw empty wheel
        this.drawWheel();
    }

    resizeCanvas() {
        const size = Math.min(600, window.innerWidth - 40);
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';
        this.drawWheel();
    }

    drawWheel() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.participants.length === 0) {
            this.drawEmptyWheel();
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        const sliceAngle = (2 * Math.PI) / this.participants.length;

        this.participants.forEach((participant, index) => {
            // Adjust start angle to align with 12 o'clock, with the current slice under the needle
            const startAngle = index * sliceAngle + this.currentAngle;
            const endAngle = startAngle + sliceAngle;

            // Draw slice
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = this.getSliceColor(index);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw text
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            
            // Adjust font size dynamically based on number of participants
            const fontSize = Math.max(8, Math.min(14, 600 / (this.participants.length * 1.5)));
            this.ctx.font = `${fontSize}px Arial`;
            
            // Rotate to the middle of the slice
            this.ctx.rotate(startAngle + sliceAngle / 2);
            
            // Prepare text rendering
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#000';
            
            // Calculate text position along the radius
            const textRadius = radius * 0.8;
            
            // Draw text along the radius
            this.ctx.fillText(participant, textRadius, 0);
            
            this.ctx.restore();
        });

        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.stroke();

        // Draw arrow at the top
        this.drawArrow(centerX, 10);

        // Update debug info
        this.updateDebugInfo(sliceAngle);
    }

    updateDebugInfo(sliceAngle) {
        // Convert current angle to degrees and normalize between 0-360
        const angleInDegrees = ((-this.currentAngle * 180 / Math.PI) + 360) % 360;
        
        // Calculate which slice is at the needle (top)
        // Add half a slice to the angle so we get the center of the slice
        const sliceSize = 360 / this.participants.length;
        const sliceIndex = Math.floor(((angleInDegrees + (sliceSize/2)) % 360) / sliceSize);
        const currentSlice = this.participants[sliceIndex] || 'N/A';

        // Update debug display
        const angleDisplay = document.getElementById('debugCurrentAngle');
        const sliceDisplay = document.getElementById('debugCurrentSlice');

        if (angleDisplay) angleDisplay.textContent = `${angleInDegrees.toFixed(2)}°`;
        if (sliceDisplay) sliceDisplay.textContent = currentSlice;
    }

    drawEmptyWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#666';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Load participants to start', centerX, centerY);
    }

    drawArrow(x, y) {
        const arrowSize = 20;
        
        // Draw arrow pointing downward
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);  // Point
        this.ctx.lineTo(x - arrowSize, y - arrowSize * 1.5);  // Left wing
        this.ctx.lineTo(x + arrowSize, y - arrowSize * 1.5);  // Right wing
        this.ctx.closePath();
        
        this.ctx.fillStyle = '#ff4081';
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();
    }

    getSliceColor(index) {
        const colors = [
            '#FFB6C1', '#98FB98', '#87CEFA', '#DDA0DD', '#F0E68C',
            '#E6E6FA', '#FFA07A', '#98FF98', '#B0E0E6', '#FFB6C1'
        ];
        return colors[index % colors.length];
    }

    spin() {
        if (this.isSpinning || this.participants.length === 0 || this.winnerShown) {
            // Don't allow spinning if winner is shown but not yet recorded/dismissed
            if (this.winnerShown) {
                alert('Please record or dismiss the current winner before spinning again.');
            }
            return;
        }

        this.isSpinning = true;
        document.getElementById('spinButton').disabled = true;

        // Get next available prize
        const availablePrize = this.getNextAvailablePrize();
        if (!availablePrize) {
            alert('No more prizes available!');
            this.isSpinning = false;
            document.getElementById('spinButton').disabled = false;
            return;
        }

        // Check for granted winners for the current prize
        const grantedWinner = this.grantedWinners.find(w => w.prize === availablePrize.name);
        if (grantedWinner) {
            const winnerIndex = this.participants.indexOf(grantedWinner.name);
            if (winnerIndex !== -1) {
                this.spinToParticipant(winnerIndex, availablePrize.name);
                return;
            }
        }

        // Get list of eligible participants (excluding all granted winners)
        const eligibleParticipants = this.participants.filter(
            participant => !this.grantedWinners.some(w => w.name === participant)
        );

        if (eligibleParticipants.length === 0) {
            alert('No eligible participants for the current prize!');
            this.isSpinning = false;
            document.getElementById('spinButton').disabled = false;
            return;
        }

        // Random spin for eligible participants
        const randomEligibleParticipant = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
        const randomIndex = this.participants.indexOf(randomEligibleParticipant);
        this.spinToParticipant(randomIndex, availablePrize.name);
    }

    getNextAvailablePrize() {
        return this.prizes.find(p => p.quantity > 0);
    }

    spinToParticipant(index, prize) {
        const sliceAngle = (2 * Math.PI) / this.participants.length;
        
        // Generate a random offset within 0.2 to 0.8 of the slice
        const randomOffset = (0.2 + Math.random() * 0.6) * sliceAngle;
        
        // Calculate the final angle needed for the target slice to stop at the top
        // Add random offset to ensure the needle points within the slice, not always at center
        const targetSliceMiddleAngle = -Math.PI/2 - (index * sliceAngle) - randomOffset;
        
        // Add extra rotations for dramatic effect
        const extraSpins = 4;
        const totalRotation = -(2 * Math.PI * extraSpins);
        const targetAngle = targetSliceMiddleAngle + totalRotation;
        
        let startTime = null;
        const duration = 5000; // 5 seconds
        const startAngle = this.currentAngle;

        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Cubic easing out - decelerating to zero velocity
            const easeOut = (t) => {
                const t1 = t - 1;
                return t1 * t1 * t1 + 1;
            };

            // Calculate current angle
            const angleChange = (targetAngle - startAngle) * easeOut(progress);
            this.currentAngle = startAngle + angleChange;
            
            // Draw the wheel
            this.drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure final position is exact
                this.currentAngle = targetAngle % (2 * Math.PI);
                this.drawWheel();
                
                this.isSpinning = false;
                document.getElementById('spinButton').disabled = false;
                
                // Set winner
                this.currentWinner = this.participants[index];
                this.currentPrize = prize;
                this.showWinner();
            }
        };

        requestAnimationFrame(animate);
    }

    showWinner() {
        const winnerDisplay = document.getElementById('winner');
        winnerDisplay.textContent = `Winner: ${this.currentWinner} - Prize: ${this.currentPrize}`;
        document.querySelector('.winner-buttons').style.display = 'flex';
        this.winnerShown = true; // Set flag when winner is shown
    }

    recordWin() {
        if (!this.currentWinner || !this.currentPrize) return;

        // Update prizes quantity
        const prize = this.prizes.find(p => p.name === this.currentPrize);
        if (prize) prize.quantity--;

        // Remove granted winner if applicable
        const grantedWinnerIndex = this.grantedWinners.findIndex(w => w.name === this.currentWinner);
        if (grantedWinnerIndex !== -1) {
            this.grantedWinners.splice(grantedWinnerIndex, 1);
        }

        // Add to winners list
        this.winners.push({ name: this.currentWinner, prize: this.currentPrize });
        this.updateWinnersList();

        // Remove winner from participants
        const index = this.participants.indexOf(this.currentWinner);
        if (index !== -1) {
            this.participants.splice(index, 1);
        }

        this.resetWinnerDisplay();
        this.drawWheel();
    }

    dismissWin() {
        if (!this.currentWinner) return;

        // Remove winner from participants
        const index = this.participants.indexOf(this.currentWinner);
        if (index !== -1) {
            this.participants.splice(index, 1);
        }

        this.resetWinnerDisplay();
        this.drawWheel();
    }

    resetWinnerDisplay() {
        document.getElementById('winner').textContent = '';
        document.querySelector('.winner-buttons').style.display = 'none';
        this.currentWinner = null;
        this.currentPrize = null;
        this.winnerShown = false; // Reset flag when winner is recorded/dismissed
    }

    addWinnerToList(winner, prize) {
        const winnersList = document.getElementById('winnersList');
        const listItem = document.createElement('li');
        
        const winnerName = document.createElement('span');
        winnerName.className = 'winner-name';
        winnerName.textContent = winner;
        
        const winnerPrize = document.createElement('span');
        winnerPrize.className = 'winner-prize';
        winnerPrize.textContent = prize;
        
        listItem.appendChild(winnerName);
        listItem.appendChild(winnerPrize);
        
        // Add new winner at the top of the list
        if (winnersList.firstChild) {
            winnersList.insertBefore(listItem, winnersList.firstChild);
        } else {
            winnersList.appendChild(listItem);
        }
    }

    updateWinnersList() {
        const winnersList = document.getElementById('winnersList');
        winnersList.innerHTML = '';
        this.winners.forEach(winner => {
            this.addWinnerToList(winner.name, winner.prize);
        });
    }
}

// Initialize the wheel when the page loads
window.addEventListener('load', () => {
    new LuckyWheel();
});
