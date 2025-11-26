// Client Page JavaScript
let selectedClinic = null;
let selectedClinicData = null;
let myTicketNumber = null;
let currentClinicNumber = 0;
let clientNotifications = [];
let isNotificationsPanelOpen = false;

// Initialize client page
document.addEventListener('DOMContentLoaded', function() {
    initializeClient();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Setup feedback character counter
    setupFeedbackCounter();
    
    // Load saved contact info
    loadContactInfo();
});

// Initialize client
function initializeClient() {
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.database = firebase.database();
    }
    
    // Load clinics
    loadClinics();
}

// Load clinics
function loadClinics() {
    if (!database) return;
    
    database.ref('clinics').on('value', (snapshot) => {
        const clinics = snapshot.val() || {};
        const clinicsList = document.getElementById('clinicsList');
        
        clinicsList.innerHTML = '';
        
        Object.keys(clinics).forEach(clinicId => {
            const clinic = clinics[clinicId];
            const clinicCard = createClinicCard(clinic, clinicId);
            clinicsList.appendChild(clinicCard);
        });
    });
}

// Create clinic card
function createClinicCard(clinic, clinicId) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'clinic-card rounded-xl p-6 cursor-pointer';
    cardDiv.onclick = () => selectClinic(clinicId, clinic);
    
    const statusClass = clinic.status === 'active' ? 'text-green-400' : 'text-red-400';
    const statusText = clinic.status === 'active' ? 'نشطة' : 'متوقفة';
    
    cardDiv.innerHTML = `
        <div class="text-center">
            <i class="fas fa-hospital text-4xl text-blue-400 mb-4"></i>
            <h3 class="text-xl font-bold mb-2">${clinic.name}</h3>
            <p class="text-gray-300 mb-2">العيادة رقم: <span class="arabic-number">${clinic.number}</span></p>
            <p class="text-gray-300 mb-4">الرقم الحالي: <span class="arabic-number">${clinic.currentNumber || 0}</span></p>
            <div class="flex justify-center items-center space-x-2">
                <span class="w-3 h-3 rounded-full ${clinic.status === 'active' ? 'bg-green-400' : 'bg-red-400'}"></span>
                <span class="${statusClass}">${statusText}</span>
            </div>
        </div>
    `;
    
    return cardDiv;
}

// Select clinic
function selectClinic(clinicId, clinicData) {
    selectedClinic = clinicId;
    selectedClinicData = clinicData;
    currentClinicNumber = clinicData.currentNumber || 0;
    
    // Update UI
    document.getElementById('clinicSelection').classList.add('hidden');
    document.getElementById('clientInterface').classList.remove('hidden');
    
    document.getElementById('selectedClinicName').textContent = clinicData.name;
    document.getElementById('currentClinicNumber').textContent = currentClinicNumber;
    
    // Start listening for updates
    startClinicListener();
    
    // Load existing notifications
    loadNotifications();
    
    showNotification(`تم اختيار ${clinicData.name} بنجاح`);
}

// Start clinic listener
function startClinicListener() {
    if (!database || !selectedClinic) return;
    
    database.ref(`clinics/${selectedClinic}`).on('value', (snapshot) => {
        const clinicData = snapshot.val();
        if (clinicData) {
            currentClinicNumber = clinicData.currentNumber || 0;
            
            // Update displays
            document.getElementById('currentClinicNumber').textContent = currentClinicNumber;
            document.getElementById('currentDisplay').textContent = currentClinicNumber;
            
            // Update queue info
            updateQueueInfo();
            
            // Check if it's client's turn
            if (myTicketNumber !== null && currentClinicNumber === myTicketNumber) {
                showYourTurnAlert();
            }
            
            // Update status
            updateClientStatus();
        }
    });
}

// Update queue information
function updateQueueInfo() {
    if (myTicketNumber === null) return;
    
    const remaining = Math.max(0, myTicketNumber - currentClinicNumber);
    const estimatedTime = remaining * 5; // Assuming 5 minutes per client
    
    document.getElementById('totalQueue').textContent = currentClinicNumber + remaining;
    document.getElementById('remainingClients').textContent = remaining;
    document.getElementById('estimatedTime').textContent = estimatedTime > 0 ? `${estimatedTime} دقيقة` : 'الآن';
}

// Update client status
function updateClientStatus() {
    if (myTicketNumber === null) return;
    
    const waitingStatus = document.getElementById('waitingStatus');
    const yourTurnStatus = document.getElementById('yourTurnStatus');
    
    if (currentClinicNumber === myTicketNumber) {
        waitingStatus.classList.add('hidden');
        yourTurnStatus.classList.remove('hidden');
    } else if (currentClinicNumber < myTicketNumber) {
        waitingStatus.classList.remove('hidden');
        yourTurnStatus.classList.add('hidden');
    } else {
        waitingStatus.classList.add('hidden');
        yourTurnStatus.classList.add('hidden');
    }
}

// Set ticket number
function setMyTicketNumber() {
    const ticketInput = document.getElementById('ticketInput');
    const ticketNumber = parseInt(ticketInput.value);
    
    if (!ticketNumber || ticketNumber < 0) {
        alert('يرجى إدخال رقم تذكرة صحيح');
        return;
    }
    
    myTicketNumber = ticketNumber;
    document.getElementById('myTicketNumber').textContent = ticketNumber;
    
    // Clear input
    ticketInput.value = '';
    
    // Update queue info
    updateQueueInfo();
    updateClientStatus();
    
    // Save to local storage
    localStorage.setItem('myTicketNumber', ticketNumber);
    localStorage.setItem('selectedClinic', selectedClinic);
    
    showNotification(`تم تسجيل رقم التذكرة: ${ticketNumber}`);
    
    // Check if it's already client's turn
    if (currentClinicNumber === ticketNumber) {
        showYourTurnAlert();
    }
}

// Show your turn alert
function showYourTurnAlert() {
    document.getElementById('alertTicketNumber').textContent = myTicketNumber;
    document.getElementById('yourTurnAlert').classList.remove('hidden');
    
    // Play alert sound
    playAlertSound();
    
    // Send notification if contact info exists
    sendTurnNotification();
}

// Close your turn alert
function closeYourTurnAlert() {
    document.getElementById('yourTurnAlert').classList.add('hidden');
}

// Play alert sound
function playAlertSound() {
    const alertAudio = new Audio('./audio/your_turn.mp3');
    alertAudio.play().catch(() => {
        // Fallback to text to speech
        if ('speechSynthesis' in window) {
            const message = `دورك الآن! الرجاء التوجه إلى ${selectedClinicData.name}`;
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    });
}

// Send turn notification
function sendTurnNotification() {
    const email = document.getElementById('clientEmail').value;
    const phone = document.getElementById('clientPhone').value;
    
    if (email || phone) {
        const notificationData = {
            type: 'turn_notification',
            clinic: selectedClinic,
            clinicName: selectedClinicData.name,
            ticketNumber: myTicketNumber,
            email: email,
            phone: phone,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref('notifications').push(notificationData);
    }
}

// Save contact info
function saveContactInfo() {
    const email = document.getElementById('clientEmail').value;
    const phone = document.getElementById('clientPhone').value;
    
    // Save to local storage
    if (email) localStorage.setItem('clientEmail', email);
    if (phone) localStorage.setItem('clientPhone', phone);
    
    showNotification('تم حفظ بيانات التواصل');
}

// Load contact info
function loadContactInfo() {
    const savedEmail = localStorage.getItem('clientEmail');
    const savedPhone = localStorage.getItem('clientPhone');
    const savedTicket = localStorage.getItem('myTicketNumber');
    const savedClinic = localStorage.getItem('selectedClinic');
    
    if (savedEmail) document.getElementById('clientEmail').value = savedEmail;
    if (savedPhone) document.getElementById('clientPhone').value = savedPhone;
    
    // Auto-restore session if data exists
    if (savedClinic && savedTicket) {
        database.ref(`clinics/${savedClinic}`).once('value', (snapshot) => {
            const clinicData = snapshot.val();
            if (clinicData) {
                selectClinic(savedClinic, clinicData);
                myTicketNumber = parseInt(savedTicket);
                document.getElementById('myTicketNumber').textContent = myTicketNumber;
                updateQueueInfo();
                updateClientStatus();
            }
        });
    }
}

// Setup feedback character counter
function setupFeedbackCounter() {
    const feedbackText = document.getElementById('feedbackText');
    const charCount = document.getElementById('charCount');
    
    feedbackText.addEventListener('input', () => {
        const count = feedbackText.value.length;
        charCount.textContent = count;
        
        if (count > 140) {
            feedbackText.value = feedbackText.value.substring(0, 140);
            charCount.textContent = 140;
        }
    });
}

// Submit feedback
function submitFeedback() {
    const type = document.getElementById('feedbackType').value;
    const text = document.getElementById('feedbackText').value;
    const notes = document.getElementById('feedbackNotes').value;
    
    if (!text.trim()) {
        alert('يرجى إدخال نص الشكوى أو الاقتراح');
        return;
    }
    
    if (text.length > 140) {
        alert('النص يجب ألا يتجاوز 140 حرف');
        return;
    }
    
    const feedbackData = {
        type: type,
        text: text,
        notes: notes,
        clinic: selectedClinic,
        clinicName: selectedClinicData.name,
        ticketNumber: myTicketNumber,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'new'
    };
    
    database.ref('complaints').push(feedbackData)
        .then(() => {
            // Clear form
            document.getElementById('feedbackText').value = '';
            document.getElementById('feedbackNotes').value = '';
            document.getElementById('charCount').textContent = '0';
            
            showNotification('تم إرسال ملاحظاتك بنجاح، شكراً لك');
        })
        .catch((error) => {
            console.error('Error submitting feedback:', error);
            alert('حدث خطأ أثناء إرسال الملاحظات');
        });
}

// Toggle notifications panel
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    
    if (isNotificationsPanelOpen) {
        panel.classList.add('hidden');
        isNotificationsPanelOpen = false;
    } else {
        panel.classList.remove('hidden');
        isNotificationsPanelOpen = true;
        
        // Mark notifications as read
        document.getElementById('notificationCount').classList.add('hidden');
        document.getElementById('notificationCount').textContent = '0';
    }
}

// Load notifications
function loadNotifications() {
    if (!database || !selectedClinic) return;
    
    database.ref('notifications').orderByChild('clinic').equalTo(selectedClinic).limitToLast(10).on('value', (snapshot) => {
        const notifications = snapshot.val() || {};
        const notificationsList = document.getElementById('notificationsList');
        
        notificationsList.innerHTML = '';
        clientNotifications = [];
        
        Object.keys(notifications).reverse().forEach(notificationId => {
            const notification = notifications[notificationId];
            
            // Add to notifications array
            clientNotifications.push(notification);
            
            const notificationDiv = document.createElement('div');
            notificationDiv.className = 'bg-white bg-opacity-10 rounded p-2 text-sm';
            notificationDiv.innerHTML = `
                <div class="flex justify-between items-start">
                    <span>${notification.text}</span>
                    <span class="text-gray-300 text-xs">${new Date(notification.timestamp).toLocaleTimeString('ar-EG')}</span>
                </div>
            `;
            notificationsList.appendChild(notificationDiv);
        });
        
        // Update notification count
        if (clientNotifications.length > 0 && !isNotificationsPanelOpen) {
            document.getElementById('notificationCount').textContent = clientNotifications.length;
            document.getElementById('notificationCount').classList.remove('hidden');
        }
    });
}

// Update time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-EG', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
}

// Show notification
function showNotification(message) {
    const popup = document.getElementById('notificationPopup');
    const messageSpan = document.getElementById('notificationMessage');
    
    messageSpan.textContent = message;
    popup.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 3000);
}

// Back to clinic selection
function backToClinicSelection() {
    if (database && selectedClinic) {
        database.ref(`clinics/${selectedClinic}`).off();
    }
    
    selectedClinic = null;
    selectedClinicData = null;
    myTicketNumber = null;
    
    document.getElementById('clientInterface').classList.add('hidden');
    document.getElementById('clinicSelection').classList.remove('hidden');
    
    // Reset displays
    document.getElementById('myTicketNumber').textContent = '-';
    document.getElementById('waitingStatus').classList.add('hidden');
    document.getElementById('yourTurnStatus').classList.add('hidden');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (selectedClinic) {
            backToClinicSelection();
        }
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && selectedClinic) {
        // Page is hidden, can pause updates if needed
    } else if (selectedClinic) {
        // Page is visible again, resume updates
        startClinicListener();
    }
});

// Handle beforeunload to clean up listeners
window.addEventListener('beforeunload', () => {
    if (database && selectedClinic) {
        database.ref(`clinics/${selectedClinic}`).off();
    }
});

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
}