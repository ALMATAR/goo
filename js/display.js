// Display Page JavaScript
let currentScreen = 1;
let zoomLevel = 1;
let videoPlaylist = [];
let currentVideoIndex = 0;
let doctorImages = [];
let currentDoctorIndex = 0;
let isFullscreen = false;

// Initialize display
document.addEventListener('DOMContentLoaded', function() {
    initializeDisplay();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Setup login form
    document.getElementById('displayLoginForm').addEventListener('submit', handleDisplayLogin);
    
    // Initialize video player
    initializeVideoPlayer();
    
    // Initialize QR code
    generateQRCode();
    
    // Start doctor image rotation
    startDoctorRotation();
});

// Initialize display
function initializeDisplay() {
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.database = firebase.database();
    }
    
    // Load settings
    loadDisplaySettings();
}

// Handle display login
function handleDisplayLogin(e) {
    e.preventDefault();
    const password = document.getElementById('displayPasswordInput').value;
    const screenNumber = document.getElementById('screenNumber').value;
    
    // Check password (in production, this should be verified with Firebase)
    database.ref('settings/centerInfo/displayPassword').once('value')
        .then((snapshot) => {
            const correctPassword = snapshot.val() || 'display123';
            
            if (password === correctPassword) {
                currentScreen = parseInt(screenNumber);
                localStorage.setItem('displayAuthenticated', 'true');
                localStorage.setItem('currentScreen', currentScreen);
                showDisplayInterface();
                loadClinicsForScreen();
                startFirebaseListeners();
            } else {
                document.getElementById('displayLoginError').classList.remove('hidden');
            }
        })
        .catch((error) => {
            console.error('Error checking password:', error);
            // Fallback to default password
            if (password === 'display123') {
                currentScreen = parseInt(screenNumber);
                localStorage.setItem('displayAuthenticated', 'true');
                localStorage.setItem('currentScreen', currentScreen);
                showDisplayInterface();
                loadClinicsForScreen();
                startFirebaseListeners();
            } else {
                document.getElementById('displayLoginError').classList.remove('hidden');
            }
        });
}

// Show display interface
function showDisplayInterface() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('displayInterface').classList.remove('hidden');
}

// Logout from display
function logoutDisplay() {
    localStorage.removeItem('displayAuthenticated');
    localStorage.removeItem('currentScreen');
    document.getElementById('displayInterface').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('displayPasswordInput').value = '';
    document.getElementById('displayLoginError').classList.add('hidden');
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    // Update time
    const timeString = now.toLocaleTimeString('ar-EG', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
    
    // Update date
    const dateString = now.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('currentDate').textContent = dateString;
}

// Load display settings
function loadDisplaySettings() {
    if (!database) return;
    
    // Load center name
    database.ref('settings/centerInfo/name').on('value', (snapshot) => {
        const centerName = snapshot.val() || 'مركزنا الطبي';
        document.getElementById('centerName').textContent = centerName;
        document.title = `${centerName} - شاشة العرض`;
    });
    
    // Load news ticker
    database.ref('settings/display/newsTicker').on('value', (snapshot) => {
        const newsTicker = snapshot.val() || 'أهلاً وسهلاً بكم في مركزنا الطبي - نسعى دائماً لتقديم أفضل خدمة طبية لكم';
        document.getElementById('newsTicker').textContent = newsTicker;
    });
    
    // Load video playlist
    database.ref('settings/videoPlaylist').on('value', (snapshot) => {
        videoPlaylist = snapshot.val() || [];
        if (videoPlaylist.length > 0) {
            loadVideo(0);
        }
    });
    
    // Load doctor images
    database.ref('settings/doctorImages').on('value', (snapshot) => {
        doctorImages = snapshot.val() || [];
        if (doctorImages.length > 0) {
            updateDoctorImage();
        }
    });
}

// Load clinics for current screen
function loadClinicsForScreen() {
    if (!database) return;
    
    database.ref('clinics').orderByChild('screen').equalTo(currentScreen.toString()).on('value', (snapshot) => {
        const clinics = snapshot.val() || {};
        const clinicsDisplay = document.getElementById('clinicsDisplay');
        
        clinicsDisplay.innerHTML = '';
        
        Object.keys(clinics).forEach(clinicId => {
            const clinic = clinics[clinicId];
            const clinicCard = createClinicCard(clinic, clinicId);
            clinicsDisplay.appendChild(clinicCard);
        });
    });
}

// Create clinic card
function createClinicCard(clinic, clinicId) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `clinic-card rounded-xl p-4 mb-4 ${clinic.status === 'active' ? 'active' : 'inactive'}`;
    cardDiv.id = `clinic-${clinicId}`;
    
    const lastCalled = clinic.lastCalled ? new Date(clinic.lastCalled).toLocaleTimeString('ar-EG', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
    }) : '--:--';
    
    cardDiv.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h3 class="text-xl font-bold mb-1">${clinic.name}</h3>
                <p class="text-sm text-gray-300">العيادة رقم: <span class="arabic-number">${clinic.number}</span></p>
            </div>
            <div class="text-center">
                <div class="text-4xl font-bold text-yellow-400 mb-1">
                    <span class="arabic-number">${clinic.currentNumber || 0}</span>
                </div>
                <p class="text-xs text-gray-300">آخر نداء: ${lastCalled}</p>
            </div>
        </div>
        <div class="mt-2 flex justify-between items-center">
            <span class="text-xs px-2 py-1 rounded ${clinic.status === 'active' ? 'bg-green-600' : 'bg-red-600'}">
                ${clinic.status === 'active' ? 'نشطة' : 'متوقفة'}
            </span>
            <span class="text-xs text-gray-300">الشاشة ${clinic.screen || 'غير محدد'}</span>
        </div>
    `;
    
    return cardDiv;
}

// Start Firebase listeners
function startFirebaseListeners() {
    // Listen for clinic updates
    database.ref('clinics').orderByChild('screen').equalTo(currentScreen.toString()).on('child_changed', (snapshot) => {
        const clinic = snapshot.val();
        const clinicId = snapshot.key;
        
        updateClinicCard(clinic, clinicId);
        
        // Show notification if client was called
        if (clinic.lastCalled && clinic.currentNumber > 0) {
            showNotification(`على العميل رقم ${clinic.currentNumber} التوجه إلى ${clinic.name}`, clinicId);
            playCallSound(clinic.currentNumber, clinic.number);
        }
    });
    
    // Listen for notifications
    database.ref('notifications').limitToLast(1).on('child_added', (snapshot) => {
        const notification = snapshot.val();
        if (notification.clinic && notification.clinic === currentScreen.toString()) {
            showNotification(notification.text);
        }
    });
    
    // Listen for broadcasts
    database.ref('broadcasts').limitToLast(1).on('child_added', (snapshot) => {
        const broadcast = snapshot.val();
        if (broadcast.type === 'audio') {
            playAudioBroadcast(broadcast.audioURL);
        }
    });
}

// Update clinic card
function updateClinicCard(clinic, clinicId) {
    const card = document.getElementById(`clinic-${clinicId}`);
    if (card) {
        const lastCalled = clinic.lastCalled ? new Date(clinic.lastCalled).toLocaleTimeString('ar-EG', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        }) : '--:--';
        
        card.className = `clinic-card rounded-xl p-4 mb-4 ${clinic.status === 'active' ? 'active' : 'inactive'}`;
        
        // Update current number
        const currentNumberSpan = card.querySelector('.text-4xl');
        if (currentNumberSpan) {
            currentNumberSpan.innerHTML = `<span class="arabic-number">${clinic.currentNumber || 0}</span>`;
        }
        
        // Update last called time
        const lastCalledP = card.querySelector('.text-xs');
        if (lastCalledP) {
            lastCalledP.textContent = `آخر نداء: ${lastCalled}`;
        }
        
        // Update status
        const statusSpan = card.querySelector('.px-2');
        if (statusSpan) {
            statusSpan.className = `text-xs px-2 py-1 rounded ${clinic.status === 'active' ? 'bg-green-600' : 'bg-red-600'}`;
            statusSpan.textContent = clinic.status === 'active' ? 'نشطة' : 'متوقفة';
        }
        
        // Flash animation for called clinic
        if (clinic.lastCalled) {
            card.style.animation = 'flash 2s ease-in-out';
            setTimeout(() => {
                card.style.animation = '';
            }, 2000);
        }
    }
}

// Show notification
function showNotification(text, clinicId = null) {
    const notificationBar = document.getElementById('notificationBar');
    const notificationText = document.getElementById('notificationText');
    const notificationTime = document.getElementById('notificationTime');
    
    notificationText.textContent = text;
    notificationTime.textContent = new Date().toLocaleTimeString('ar-EG', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    notificationBar.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notificationBar.classList.add('hidden');
    }, 5000);
}

// Close notification
function closeNotification() {
    document.getElementById('notificationBar').classList.add('hidden');
}

// Play call sound
function playCallSound(clientNumber, clinicNumber) {
    // Play ding sound first
    const dingAudio = new Audio('./audio/ding.mp3');
    dingAudio.play();
    
    // Then play client number
    setTimeout(() => {
        const clientAudio = new Audio(`./audio/${clientNumber}.mp3`);
        clientAudio.play();
        
        // Then play clinic number
        setTimeout(() => {
            const clinicAudio = new Audio(`./audio/clinic${clinicNumber}.mp3`);
            clinicAudio.play();
        }, 1000);
    }, 500);
}

// Play audio broadcast
function playAudioBroadcast(audioURL) {
    const audio = new Audio(audioURL);
    audio.play().catch(error => {
        console.error('Error playing broadcast:', error);
    });
}

// Initialize video player
function initializeVideoPlayer() {
    const video = document.getElementById('mainVideo');
    
    video.addEventListener('ended', () => {
        nextVideo();
    });
    
    // Load default video or playlist
    if (videoPlaylist.length === 0) {
        // Add some default health awareness videos
        videoPlaylist = [
            { url: './media/health_awareness1.mp4', title: 'فيديو توعية صحية 1' },
            { url: './media/health_awareness2.mp4', title: 'فيديو توعية صحية 2' },
            { url: './media/health_awareness3.mp4', title: 'فيديو توعية صحية 3' }
        ];
    }
    
    loadVideo(0);
}

// Load video
function loadVideo(index) {
    if (videoPlaylist.length === 0) return;
    
    const video = document.getElementById('mainVideo');
    const videoData = videoPlaylist[index];
    
    video.src = videoData.url;
    video.load();
    
    // Auto play
    video.play().catch(error => {
        console.error('Error playing video:', error);
    });
}

// Play video
function playVideo() {
    const video = document.getElementById('mainVideo');
    video.play();
}

// Pause video
function pauseVideo() {
    const video = document.getElementById('mainVideo');
    video.pause();
}

// Next video
function nextVideo() {
    currentVideoIndex = (currentVideoIndex + 1) % videoPlaylist.length;
    loadVideo(currentVideoIndex);
}

// Generate QR code
function generateQRCode() {
    const qrCanvas = document.getElementById('qrCodeCanvas');
    const clientURL = window.location.origin + '/client.html';
    
    QRCode.toCanvas(qrCanvas, clientURL, {
        width: 120,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, (error) => {
        if (error) {
            console.error('Error generating QR code:', error);
        }
    });
}

// Start doctor image rotation
function startDoctorRotation() {
    if (doctorImages.length === 0) {
        // Add some default doctor images
        doctorImages = [
            { image: './images/doctor1.jpg', name: 'د. أحمد محمد' },
            { image: './images/doctor2.jpg', name: 'د. فاطمة علي' },
            { image: './images/doctor3.jpg', name: 'د. خالد حسن' }
        ];
    }
    
    updateDoctorImage();
    
    // Rotate every 10 seconds
    setInterval(() => {
        currentDoctorIndex = (currentDoctorIndex + 1) % doctorImages.length;
        updateDoctorImage();
    }, 10000);
}

// Update doctor image
function updateDoctorImage() {
    if (doctorImages.length === 0) return;
    
    const doctorData = doctorImages[currentDoctorIndex];
    const doctorImage = document.getElementById('currentDoctorImage');
    const doctorName = document.getElementById('doctorNameDisplay');
    
    doctorImage.src = doctorData.image;
    doctorImage.alt = doctorData.name;
    doctorName.textContent = doctorData.name;
    
    // Fade animation
    doctorImage.style.opacity = '0';
    setTimeout(() => {
        doctorImage.style.opacity = '1';
    }, 100);
}

// Fullscreen functions
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            isFullscreen = true;
        });
    } else {
        document.exitFullscreen().then(() => {
            isFullscreen = false;
        });
    }
}

// Zoom functions
function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.1, 2);
    applyZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
    applyZoom();
}

function applyZoom() {
    document.body.style.transform = `scale(${zoomLevel})`;
    document.body.style.transformOrigin = 'top left';
}

// Add CSS animation for flash effect
const style = document.createElement('style');
style.textContent = `
    @keyframes flash {
        0%, 100% { background-color: rgba(59, 130, 246, 0.3); }
        50% { background-color: rgba(255, 255, 0, 0.3); }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'f':
        case 'F11':
            e.preventDefault();
            toggleFullscreen();
            break;
        case '+':
        case '=':
            zoomIn();
            break;
        case '-':
            zoomOut();
            break;
        case 'Escape':
            if (isFullscreen) {
                document.exitFullscreen();
            }
            break;
    }
});

// Handle visibility change (pause video when tab is not visible)
document.addEventListener('visibilitychange', () => {
    const video = document.getElementById('mainVideo');
    if (document.hidden) {
        video.pause();
    } else {
        video.play().catch(() => {});
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    // Adjust layout for different screen sizes
    const clinicsDisplay = document.getElementById('clinicsDisplay');
    if (window.innerWidth < 1024) {
        // Mobile layout
        clinicsDisplay.classList.add('text-sm');
    } else {
        // Desktop layout
        clinicsDisplay.classList.remove('text-sm');
    }
});

// Auto-hide cursor after inactivity
let cursorTimeout;
function hideCursor() {
    document.body.style.cursor = 'none';
}
function showCursor() {
    document.body.style.cursor = 'default';
    clearTimeout(cursorTimeout);
    cursorTimeout = setTimeout(hideCursor, 3000); // Hide after 3 seconds
}

document.addEventListener('mousemove', showCursor);
document.addEventListener('mousedown', showCursor);
document.addEventListener('keydown', showCursor);

// Initialize cursor hiding
setTimeout(hideCursor, 3000);