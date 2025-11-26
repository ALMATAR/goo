// Control Panel JavaScript
let currentClinic = null;
let currentClinicData = null;
let currentNumber = 0;
let clinicPassword = '';

// Initialize control panel
document.addEventListener('DOMContentLoaded', function() {
    initializeControl();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Setup login form
    document.getElementById('controlLoginForm').addEventListener('submit', handleControlLogin);
});

// Initialize control panel
function initializeControl() {
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.database = firebase.database();
    }
    
    // Load clinics for selection
    loadClinicsForLogin();
}

// Load clinics for login
function loadClinicsForLogin() {
    if (!database) return;
    
    database.ref('clinics').once('value', (snapshot) => {
        const clinics = snapshot.val() || {};
        const clinicSelect = document.getElementById('clinicSelect');
        const targetClinicSelect = document.getElementById('targetClinic');
        
        // Clear existing options (except first)
        clinicSelect.innerHTML = '<option value="">اختر العيادة...</option>';
        if (targetClinicSelect) {
            targetClinicSelect.innerHTML = '<option value="">اختر العيادة...</option>';
        }
        
        Object.keys(clinics).forEach(clinicId => {
            const clinic = clinics[clinicId];
            const option = document.createElement('option');
            option.value = clinicId;
            option.textContent = `${clinic.name} (${clinic.number})`;
            
            const option2 = option.cloneNode(true);
            
            clinicSelect.appendChild(option);
            if (targetClinicSelect) {
                targetClinicSelect.appendChild(option2);
            }
        });
    });
}

// Handle control login
function handleControlLogin(e) {
    e.preventDefault();
    const clinicId = document.getElementById('clinicSelect').value;
    const password = document.getElementById('controlPassword').value;
    
    if (!clinicId || !password) {
        alert('يرجى اختيار العيادة وإدخال كلمة المرور');
        return;
    }
    
    // Verify clinic password
    database.ref(`clinics/${clinicId}/password`).once('value')
        .then((snapshot) => {
            const correctPassword = snapshot.val();
            
            if (password === correctPassword) {
                currentClinic = clinicId;
                clinicPassword = password;
                loginToClinic();
            } else {
                document.getElementById('controlLoginError').classList.remove('hidden');
            }
        })
        .catch((error) => {
            console.error('Error verifying password:', error);
            document.getElementById('controlLoginError').classList.remove('hidden');
        });
}

// Login to clinic
function loginToClinic() {
    database.ref(`clinics/${currentClinic}`).once('value', (snapshot) => {
        currentClinicData = snapshot.val();
        currentNumber = currentClinicData.currentNumber || 0;
        
        // Update UI
        document.getElementById('clinicName').textContent = `لوحة التحكم - ${currentClinicData.name}`;
        document.getElementById('clinicInfo').textContent = `العيادة رقم: ${currentClinicData.number} | الشاشة: ${currentClinicData.screen || 'غير محدد'}`;
        document.getElementById('currentNumber').textContent = currentNumber;
        document.getElementById('currentDisplay').textContent = currentNumber;
        
        // Show interface
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('controlInterface').classList.remove('hidden');
        
        // Start listening for updates
        startClinicListener();
        loadRecentCalls();
        loadStatistics();
        
        // Show success notification
        showNotification(`تم الدخول إلى ${currentClinicData.name} بنجاح`);
    });
}

// Start clinic listener
function startClinicListener() {
    database.ref(`clinics/${currentClinic}`).on('value', (snapshot) => {
        currentClinicData = snapshot.val();
        currentNumber = currentClinicData.currentNumber || 0;
        
        // Update displays
        document.getElementById('currentNumber').textContent = currentNumber;
        document.getElementById('currentDisplay').textContent = currentNumber;
        document.getElementById('clinicStatus').textContent = currentClinicData.status === 'active' ? 'نشطة' : 'متوقفة';
        document.getElementById('clinicStatus').className = currentClinicData.status === 'active' ? 'font-bold text-green-400' : 'font-bold text-red-400';
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

// Control functions
function nextClient() {
    const newNumber = currentNumber + 1;
    updateClinicNumber(newNumber);
    playCallSound(newNumber, currentClinicData.number);
    addRecentCall(newNumber, 'التالي');
    showNotification(`تم الانتقال للعميل رقم ${newNumber}`);
}

function previousClient() {
    if (currentNumber > 0) {
        const newNumber = currentNumber - 1;
        updateClinicNumber(newNumber);
        addRecentCall(newNumber, 'السابق');
        showNotification(`تم الرجوع للعميل رقم ${newNumber}`);
    }
}

function repeatCall() {
    playCallSound(currentNumber, currentClinicData.number);
    addRecentCall(currentNumber, 'تكرار');
    showNotification(`تم تكرار نداء العميل رقم ${currentNumber}`);
}

function callSpecificNumber() {
    document.getElementById('callNumberModal').classList.remove('hidden');
}

function confirmCallNumber() {
    const specificNumber = parseInt(document.getElementById('specificNumber').value);
    
    if (specificNumber >= 0) {
        updateClinicNumber(specificNumber);
        playCallSound(specificNumber, currentClinicData.number);
        addRecentCall(specificNumber, 'محدد');
        showNotification(`تم نداء العميل رقم ${specificNumber}`);
        closeCallNumberModal();
    } else {
        alert('يرجى إدخال رقم صحيح');
    }
}

function closeCallNumberModal() {
    document.getElementById('callNumberModal').classList.add('hidden');
    document.getElementById('specificNumber').value = '';
}

function resetClinic() {
    if (confirm('هل أنت متأكد من تصفير العيادة؟')) {
        updateClinicNumber(0);
        addRecentCall(0, 'تصفير');
        showNotification('تم تصفير العيادة بنجاح');
    }
}

function pauseClinic() {
    database.ref(`clinics/${currentClinic}`).update({
        status: 'paused'
    });
    showNotification('تم إيقاف العيادة مؤقتاً');
}

function resumeClinic() {
    database.ref(`clinics/${currentClinic}`).update({
        status: 'active'
    });
    showNotification('تم استئناف عمل العيادة');
}

function emergencyAlert() {
    const emergencyData = {
        type: 'emergency',
        clinic: currentClinic,
        clinicName: currentClinicData.name,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        message: `حالة طارئة في ${currentClinicData.name}`
    };
    
    database.ref('emergency').push(emergencyData);
    showNotification('تم إرسال تنبيه الطوارئ');
}

function transferClient() {
    document.getElementById('transferModal').classList.remove('hidden');
}

function confirmTransfer() {
    const clientNumber = parseInt(document.getElementById('transferClientNumber').value);
    const targetClinic = document.getElementById('targetClinic').value;
    
    if (!clientNumber || !targetClinic) {
        alert('يرجى إدخال رقم العميل واختيار العيادة المستهدفة');
        return;
    }
    
    if (targetClinic === currentClinic) {
        alert('لا يمكن تحويل العميل إلى نفس العيادة');
        return;
    }
    
    // Get target clinic data
    database.ref(`clinics/${targetClinic}`).once('value', (snapshot) => {
        const targetClinicData = snapshot.val();
        
        if (targetClinicData) {
            // Update target clinic number
            database.ref(`clinics/${targetClinic}`).update({
                currentNumber: clientNumber,
                lastTransferred: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Log the transfer
            const transferData = {
                fromClinic: currentClinic,
                fromClinicName: currentClinicData.name,
                toClinic: targetClinic,
                toClinicName: targetClinicData.name,
                clientNumber: clientNumber,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            database.ref('transfers').push(transferData);
            
            showNotification(`تم تحويل العميل رقم ${clientNumber} إلى ${targetClinicData.name}`);
            closeTransferModal();
        }
    });
}

function closeTransferModal() {
    document.getElementById('transferModal').classList.add('hidden');
    document.getElementById('transferClientNumber').value = '';
    document.getElementById('targetClinic').value = '';
}

function alertOtherClinic() {
    const targetClinic = document.getElementById('targetClinic').value;
    
    if (!targetClinic) {
        alert('يرجى اختيار العيادة المستهدفة');
        return;
    }
    
    if (targetClinic === currentClinic) {
        alert('لا يمكن إرسال تنبيه إلى نفس العيادة');
        return;
    }
    
    const alertData = {
        fromClinic: currentClinic,
        fromClinicName: currentClinicData.name,
        toClinic: targetClinic,
        message: `تنبيه من ${currentClinicData.name}`,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('alerts').push(alertData);
    showNotification(`تم إرسال تنبيه إلى ${targetClinic}`);
}

// Update clinic number in Firebase
function updateClinicNumber(newNumber) {
    const updateData = {
        currentNumber: newNumber,
        lastCalled: firebase.database.ServerValue.TIMESTAMP,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(`clinics/${currentClinic}`).update(updateData)
        .then(() => {
            // Update local display
            currentNumber = newNumber;
        })
        .catch((error) => {
            console.error('Error updating clinic number:', error);
            alert('حدث خطأ أثناء تحديث الرقم');
        });
}

// Play call sound
function playCallSound(clientNumber, clinicNumber) {
    // Play ding sound first
    const dingAudio = new Audio('./audio/ding.mp3');
    dingAudio.play().catch(() => {
        // Fallback if audio fails
        console.log('Playing call sound failed, using fallback');
    });
    
    // Then play client number
    setTimeout(() => {
        const clientAudio = new Audio(`./audio/${clientNumber}.mp3`);
        clientAudio.play().catch(() => {
            // Text to speech fallback
            speakNumber(clientNumber, clinicNumber);
        });
        
        // Then play clinic number
        setTimeout(() => {
            const clinicAudio = new Audio(`./audio/clinic${clinicNumber}.mp3`);
            clinicAudio.play().catch(() => {
                // Text to speech fallback
                speakClinic(clinicNumber);
            });
        }, 1000);
    }, 500);
}

// Text to speech fallback
function speakNumber(clientNumber, clinicNumber) {
    if ('speechSynthesis' in window) {
        const message = `على العميل رقم ${clientNumber} التوجه إلى عيادة رقم ${clinicNumber}`;
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

function speakClinic(clinicNumber) {
    if ('speechSynthesis' in window) {
        const message = `التوجه إلى عيادة رقم ${clinicNumber}`;
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// Load recent calls
function loadRecentCalls() {
    if (!database || !currentClinic) return;
    
    database.ref(`clinics/${currentClinic}/recentCalls`).limitToLast(5).on('value', (snapshot) => {
        const calls = snapshot.val() || {};
        const recentCallsDiv = document.getElementById('recentCalls');
        
        recentCallsDiv.innerHTML = '';
        
        Object.keys(calls).reverse().forEach(callId => {
            const call = calls[callId];
            const callDiv = document.createElement('div');
            callDiv.className = 'bg-white bg-opacity-10 rounded p-2 text-sm';
            callDiv.innerHTML = `
                <div class="flex justify-between">
                    <span>العميل رقم <span class="arabic-number">${call.number}</span></span>
                    <span class="text-gray-300">${call.type}</span>
                </div>
                <div class="text-xs text-gray-400">${new Date(call.timestamp).toLocaleTimeString('ar-EG')}</div>
            `;
            recentCallsDiv.appendChild(callDiv);
        });
    });
}

// Add recent call
function addRecentCall(number, type) {
    const callData = {
        number: number,
        type: type,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(`clinics/${currentClinic}/recentCalls`).push(callData);
}

// Load statistics
function loadStatistics() {
    if (!database || !currentClinic) return;
    
    // Today's count
    const today = new Date().toISOString().split('T')[0];
    database.ref(`statistics/${currentClinic}/${today}`).on('value', (snapshot) => {
        const todayCount = snapshot.val() || 0;
        document.getElementById('todayCount').textContent = todayCount;
    });
    
    // This week's count
    const weekStart = getWeekStart();
    database.ref(`statistics/${currentClinic}`).orderByKey().startAt(weekStart).on('value', (snapshot) => {
        const weekData = snapshot.val() || {};
        const weekCount = Object.values(weekData).reduce((sum, count) => sum + count, 0);
        document.getElementById('weekCount').textContent = weekCount;
    });
    
    // This month's count
    const monthStart = getMonthStart();
    database.ref(`statistics/${currentClinic}`).orderByKey().startAt(monthStart).on('value', (snapshot) => {
        const monthData = snapshot.val() || {};
        const monthCount = Object.values(monthData).reduce((sum, count) => sum + count, 0);
        document.getElementById('monthCount').textContent = monthCount;
    });
}

// Helper functions
function getWeekStart() {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return weekStart.toISOString().split('T')[0];
}

function getMonthStart() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return monthStart.toISOString().split('T')[0];
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

// Logout
function logoutControl() {
    if (database && currentClinic) {
        database.ref(`clinics/${currentClinic}`).off();
    }
    
    currentClinic = null;
    currentClinicData = null;
    currentNumber = 0;
    clinicPassword = '';
    
    document.getElementById('controlInterface').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('controlPassword').value = '';
    document.getElementById('clinicSelect').value = '';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!currentClinic) return;
    
    switch(e.key) {
        case 'ArrowRight':
        case ' ':
            e.preventDefault();
            nextClient();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            previousClient();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            repeatCall();
            break;
        case 'Escape':
            closeCallNumberModal();
            closeTransferModal();
            break;
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentClinic) {
        // Page is hidden, can pause updates if needed
    } else if (currentClinic) {
        // Page is visible again, resume updates
        startClinicListener();
    }
});

// Handle beforeunload to clean up listeners
window.addEventListener('beforeunload', () => {
    if (database && currentClinic) {
        database.ref(`clinics/${currentClinic}`).off();
    }
});

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
}