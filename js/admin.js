// Admin Panel JavaScript
let currentTab = 'settings';
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let audioQueue = [];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Setup login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Load settings
    loadSettings();
    loadClinics();
    loadDoctors();
    loadAppointmentRequests();
    loadNotifications();
    loadEmergencyLog();
});

// Initialize admin
function initializeAdmin() {
    // Check if already logged in
    if (localStorage.getItem('adminAuthenticated') === 'true') {
        showAdminInterface();
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    // Simple password check (in production, use Firebase Auth)
    if (password === 'admin123') {
        localStorage.setItem('adminAuthenticated', 'true');
        showAdminInterface();
        loadSettings();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

// Show admin interface
function showAdminInterface() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('adminInterface').classList.remove('hidden');
}

// Logout
function logout() {
    localStorage.removeItem('adminAuthenticated');
    document.getElementById('adminInterface').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginError').classList.add('hidden');
}

// Update current time
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

// Switch tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('tab-inactive');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    
    // Add active class to clicked button
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    activeBtn.classList.add('tab-active');
    activeBtn.classList.remove('tab-inactive');
    
    currentTab = tabName;
}

// Load settings from Firebase
function loadSettings() {
    if (!database) return;
    
    // Load center settings
    database.ref('settings/centerInfo').once('value', (snapshot) => {
        const data = snapshot.val() || {};
        document.getElementById('centerName').value = data.name || '';
        document.getElementById('displayPassword').value = data.displayPassword || '';
        document.getElementById('alertDuration').value = data.alertDuration || 5;
    });
    
    // Load display settings
    database.ref('settings/display').once('value', (snapshot) => {
        const data = snapshot.val() || {};
        document.getElementById('newsTicker').value = data.newsTicker || '';
        document.getElementById('tickerSpeed').value = data.tickerSpeed || 50;
        document.getElementById('screenCount').value = data.screenCount || 5;
    });
    
    // Load audio settings
    database.ref('settings/audio').once('value', (snapshot) => {
        const data = snapshot.val() || {};
        document.getElementById('audioPath').value = data.audioPath || '';
        document.getElementById('videoPath').value = data.videoPath || '';
        document.getElementById('instantPath').value = data.instantPath || '';
        document.getElementById('speechSpeed').value = data.speechSpeed || 1;
    });
}

// Save settings
function saveSettings() {
    const settings = {
        centerInfo: {
            name: document.getElementById('centerName').value,
            displayPassword: document.getElementById('displayPassword').value,
            alertDuration: parseInt(document.getElementById('alertDuration').value) || 5
        },
        display: {
            newsTicker: document.getElementById('newsTicker').value,
            tickerSpeed: parseInt(document.getElementById('tickerSpeed').value) || 50,
            screenCount: parseInt(document.getElementById('screenCount').value) || 5
        },
        audio: {
            audioPath: document.getElementById('audioPath').value,
            videoPath: document.getElementById('videoPath').value,
            instantPath: document.getElementById('instantPath').value,
            speechSpeed: parseFloat(document.getElementById('speechSpeed').value) || 1
        }
    };
    
    // Save to Firebase
    database.ref('settings').update(settings)
        .then(() => {
            alert('تم حفظ الإعدادات بنجاح');
        })
        .catch((error) => {
            console.error('Error saving settings:', error);
            alert('حدث خطأ أثناء حفظ الإعدادات');
        });
}

// Load clinics
function loadClinics() {
    if (!database) return;
    
    database.ref('clinics').on('value', (snapshot) => {
        const clinics = snapshot.val() || {};
        const clinicsList = document.getElementById('clinicsList');
        const clinicSelects = document.querySelectorAll('#notificationClinic, #emergencyClinic, #doctorClinic');
        
        // Clear existing options (except first option)
        clinicSelects.forEach(select => {
            const firstOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            select.appendChild(firstOption);
        });
        
        clinicsList.innerHTML = '';
        
        Object.keys(clinics).forEach(clinicId => {
            const clinic = clinics[clinicId];
            
            // Add to clinic selects
            clinicSelects.forEach(select => {
                const option = document.createElement('option');
                option.value = clinicId;
                option.textContent = `${clinic.name} (${clinic.number})`;
                select.appendChild(option);
            });
            
            // Add to clinics list
            const clinicDiv = document.createElement('div');
            clinicDiv.className = 'bg-white bg-opacity-10 rounded-lg p-4 flex justify-between items-center';
            clinicDiv.innerHTML = `
                <div>
                    <h4 class="font-semibold">${clinic.name}</h4>
                    <p class="text-sm text-gray-300">رقم العيادة: ${clinic.number} | الشاشة: ${clinic.screen || 'غير محدد'}</p>
                    <p class="text-sm text-gray-300">الرقم الحالي: <span class="arabic-number">${clinic.currentNumber || 0}</span></p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="resetClinic('${clinicId}')" class="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm transition-colors">
                        <i class="fas fa-redo ml-1"></i>تصفير
                    </button>
                    <button onclick="deleteClinic('${clinicId}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                        <i class="fas fa-trash ml-1"></i>حذف
                    </button>
                </div>
            `;
            clinicsList.appendChild(clinicDiv);
        });
    });
}

// Add clinic
function addClinic() {
    const name = document.getElementById('newClinicName').value;
    const number = document.getElementById('newClinicNumber').value;
    const screen = document.getElementById('newClinicScreen').value;
    const password = document.getElementById('newClinicPassword').value;
    
    if (!name || !number || !password) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    const clinicData = {
        name: name,
        number: parseInt(number),
        screen: screen || null,
        password: password,
        currentNumber: 0,
        status: 'active',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    const newClinicRef = database.ref('clinics').push();
    newClinicRef.set(clinicData)
        .then(() => {
            // Clear form
            document.getElementById('newClinicName').value = '';
            document.getElementById('newClinicNumber').value = '';
            document.getElementById('newClinicScreen').value = '';
            document.getElementById('newClinicPassword').value = '';
            
            alert('تم إضافة العيادة بنجاح');
        })
        .catch((error) => {
            console.error('Error adding clinic:', error);
            alert('حدث خطأ أثناء إضافة العيادة');
        });
}

// Reset clinic
function resetClinic(clinicId) {
    if (confirm('هل أنت متأكد من تصفير العيادة؟')) {
        database.ref(`clinics/${clinicId}`).update({
            currentNumber: 0
        })
        .then(() => {
            alert('تم تصفير العيادة بنجاح');
        })
        .catch((error) => {
            console.error('Error resetting clinic:', error);
            alert('حدث خطأ أثناء تصفير العيادة');
        });
    }
}

// Delete clinic
function deleteClinic(clinicId) {
    if (confirm('هل أنت متأكد من حذف العيادة؟')) {
        database.ref(`clinics/${clinicId}`).remove()
            .then(() => {
                alert('تم حذف العيادة بنجاح');
            })
            .catch((error) => {
                console.error('Error deleting clinic:', error);
                alert('حدث خطأ أثناء حذف العيادة');
            });
    }
}

// Audio recording functions
function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('المتصفح لا يدعم تسجيل الصوت');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            isRecording = true;
            recordedChunks = [];
            
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'audio/mp3' });
                const audioURL = URL.createObjectURL(blob);
                
                document.getElementById('playBtn').disabled = false;
                document.getElementById('broadcastBtn').disabled = false;
                
                document.getElementById('playBtn').onclick = () => {
                    const audio = new Audio(audioURL);
                    audio.play();
                };
                
                document.getElementById('broadcastBtn').onclick = () => {
                    broadcastAudio(audioURL, 'تسجيل صوتي مباشر');
                };
                
                isRecording = false;
                document.getElementById('recordingStatus').textContent = 'تم إكمال التسجيل';
            };
            
            mediaRecorder.start();
            document.getElementById('recordBtn').textContent = 'إيقاف';
            document.getElementById('recordingStatus').textContent = 'جاري التسجيل...';
            
            const duration = parseInt(document.getElementById('recordDuration').value) || 5;
            setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, duration * 1000);
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            alert('لا يمكن الوصول إلى الميكروفون');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        document.getElementById('recordBtn').textContent = 'تسجيل';
    }
}

function playRecording() {
    // This will be set in startRecording function
}

function broadcastRecording() {
    // This will be set in startRecording function
}

// Instant audio functions
function playInstantAudio() {
    const selectedFile = document.getElementById('instantAudioSelect').value;
    if (!selectedFile) {
        alert('يرجى اختيار ملف صوتي');
        return;
    }
    
    const audioPath = document.getElementById('instantPath').value || './instant/';
    const audio = new Audio(audioPath + selectedFile);
    audio.play();
}

function broadcastInstantAudio() {
    const selectedFile = document.getElementById('instantAudioSelect').value;
    if (!selectedFile) {
        alert('يرجى اختيار ملف صوتي');
        return;
    }
    
    const audioPath = document.getElementById('instantPath').value || './instant/';
    const audioURL = audioPath + selectedFile;
    
    broadcastAudio(audioURL, 'ملف صوتي جاهز: ' + selectedFile);
}

// Broadcast audio function
function broadcastAudio(audioURL, description) {
    const broadcastData = {
        audioURL: audioURL,
        description: description,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'audio'
    };
    
    database.ref('broadcasts').push(broadcastData)
        .then(() => {
            alert('تم بث الصوت بنجاح');
        })
        .catch((error) => {
            console.error('Error broadcasting audio:', error);
            alert('حدث خطأ أثناء بث الصوت');
        });
}

// Audio queue functions
function addToAudioQueue(audioFile, clinicNumber, clientNumber) {
    const queueItem = {
        audioFile: audioFile,
        clinicNumber: clinicNumber,
        clientNumber: clientNumber,
        timestamp: Date.now()
    };
    
    audioQueue.push(queueItem);
    updateAudioQueueDisplay();
}

function updateAudioQueueDisplay() {
    const queueDiv = document.getElementById('audioQueue');
    queueDiv.innerHTML = '';
    
    audioQueue.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'bg-white bg-opacity-10 rounded p-2 flex justify-between items-center';
        itemDiv.innerHTML = `
            <span>العميل ${item.clientNumber} - العيادة ${item.clinicNumber}</span>
            <button onclick="removeFromQueue(${index})" class="text-red-400 hover:text-red-300">
                <i class="fas fa-times"></i>
            </button>
        `;
        queueDiv.appendChild(itemDiv);
    });
}

function removeFromQueue(index) {
    audioQueue.splice(index, 1);
    updateAudioQueueDisplay();
}

function clearAudioQueue() {
    audioQueue = [];
    updateAudioQueueDisplay();
}

function processAudioQueue() {
    if (audioQueue.length === 0) {
        alert('القائمة فارغة');
        return;
    }
    
    // Process queue items one by one
    audioQueue.forEach((item, index) => {
        setTimeout(() => {
            playQueueItem(item);
        }, index * 3000); // 3 seconds between each item
    });
}

function playQueueItem(item) {
    // Play ding sound
    const dingAudio = new Audio('./audio/ding.mp3');
    dingAudio.play();
    
    setTimeout(() => {
        // Play client number
        const clientAudio = new Audio(`./audio/${item.clientNumber}.mp3`);
        clientAudio.play();
        
        setTimeout(() => {
            // Play clinic number
            const clinicAudio = new Audio(`./audio/clinic${item.clinicNumber}.mp3`);
            clinicAudio.play();
        }, 1000);
    }, 500);
}

// Doctor management functions
function loadDoctors() {
    if (!database) return;
    
    database.ref('doctors').on('value', (snapshot) => {
        const doctors = snapshot.val() || {};
        const doctorsTableBody = document.getElementById('doctorsTableBody');
        
        doctorsTableBody.innerHTML = '';
        
        Object.keys(doctors).forEach(doctorId => {
            const doctor = doctors[doctorId];
            const row = document.createElement('tr');
            row.className = 'border-b border-white border-opacity-30';
            row.innerHTML = `
                <td class="p-2">${doctor.name}</td>
                <td class="p-2">${doctor.specialty}</td>
                <td class="p-2">${doctor.clinic || 'غير محدد'}</td>
                <td class="p-2">${doctor.phone}</td>
                <td class="p-2">
                    <span class="px-2 py-1 rounded text-xs ${doctor.status === 'active' ? 'bg-green-600' : 'bg-red-600'}">
                        ${doctor.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td class="p-2">
                    <button onclick="toggleDoctorStatus('${doctorId}')" class="text-blue-400 hover:text-blue-300 mr-2">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    <button onclick="deleteDoctor('${doctorId}')" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            doctorsTableBody.appendChild(row);
        });
    });
}

function addDoctor() {
    const name = document.getElementById('doctorName').value;
    const phone = document.getElementById('doctorPhone').value;
    const nationalId = document.getElementById('doctorNationalId').value;
    const specialty = document.getElementById('doctorSpecialty').value;
    const clinic = document.getElementById('doctorClinic').value;
    const email = document.getElementById('doctorEmail').value;
    
    if (!name || !phone || !specialty || !email) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    const doctorData = {
        name: name,
        phone: phone,
        nationalId: nationalId,
        specialty: specialty,
        clinic: clinic,
        email: email,
        status: 'active',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        leaveBalance: {
            regular: 21,
            casual: 7
        },
        attendance: {
            present: 0,
            absent: 0,
            late: 0
        }
    };
    
    // Create user in Firebase Auth
    const password = 'doctor123'; // Default password
    
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const userId = userCredential.user.uid;
            return database.ref(`doctors/${userId}`).set(doctorData);
        })
        .then(() => {
            // Clear form
            document.getElementById('doctorName').value = '';
            document.getElementById('doctorPhone').value = '';
            document.getElementById('doctorNationalId').value = '';
            document.getElementById('doctorSpecialty').value = '';
            document.getElementById('doctorClinic').value = '';
            document.getElementById('doctorEmail').value = '';
            
            alert('تم إضافة الطبيب بنجاح');
        })
        .catch((error) => {
            console.error('Error adding doctor:', error);
            alert('حدث خطأ أثناء إضافة الطبيب: ' + error.message);
        });
}

function toggleDoctorStatus(doctorId) {
    database.ref(`doctors/${doctorId}`).once('value', (snapshot) => {
        const doctor = snapshot.val();
        const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
        
        database.ref(`doctors/${doctorId}`).update({
            status: newStatus
        });
    });
}

function deleteDoctor(doctorId) {
    if (confirm('هل أنت متأكد من حذف الطبيب؟')) {
        database.ref(`doctors/${doctorId}`).remove()
            .then(() => {
                alert('تم حذف الطبيب بنجاح');
            })
            .catch((error) => {
                console.error('Error deleting doctor:', error);
                alert('حدث خطأ أثناء حذف الطبيب');
            });
    }
}

// Load appointment requests
function loadAppointmentRequests() {
    if (!database) return;
    
    database.ref('appointmentRequests').on('value', (snapshot) => {
        const requests = snapshot.val() || {};
        const requestsDiv = document.getElementById('appointmentRequests');
        
        requestsDiv.innerHTML = '';
        
        Object.keys(requests).forEach(requestId => {
            const request = requests[requestId];
            const requestDiv = document.createElement('div');
            requestDiv.className = 'bg-white bg-opacity-10 rounded-lg p-3';
            requestDiv.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold">${request.clientName}</h4>
                        <p class="text-sm text-gray-300">العيادة: ${request.clinic}</p>
                        <p class="text-sm text-gray-300">التاريخ: ${request.date}</p>
                        <p class="text-sm text-gray-300">التوقيت: ${request.time}</p>
                        <p class="text-sm text-gray-300">السبب: ${request.reason}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="approveAppointment('${requestId}')" class="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors">
                            <i class="fas fa-check ml-1"></i>موافقة
                        </button>
                        <button onclick="rejectAppointment('${requestId}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                            <i class="fas fa-times ml-1"></i>رفض
                        </button>
                    </div>
                </div>
            `;
            requestsDiv.appendChild(requestDiv);
        });
    });
}

function approveAppointment(requestId) {
    database.ref(`appointmentRequests/${requestId}`).once('value', (snapshot) => {
        const request = snapshot.val();
        
        // Move to approved appointments
        const appointmentData = {
            ...request,
            status: 'approved',
            approvedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref(`appointments/${requestId}`).set(appointmentData)
            .then(() => {
                // Remove from requests
                database.ref(`appointmentRequests/${requestId}`).remove();
                alert('تمت الموافقة على الموعد');
            });
    });
}

function rejectAppointment(requestId) {
    database.ref(`appointmentRequests/${requestId}`).remove()
        .then(() => {
            alert('تم رفض الموعد');
        });
}

function saveAppointmentSettings() {
    const settings = {
        morningSlots: parseInt(document.getElementById('morningSlots').value) || 20,
        eveningSlots: parseInt(document.getElementById('eveningSlots').value) || 15,
        morningStart: document.getElementById('morningStart').value,
        morningEnd: document.getElementById('morningEnd').value,
        eveningStart: document.getElementById('eveningStart').value,
        eveningEnd: document.getElementById('eveningEnd').value
    };
    
    database.ref('settings/appointments').update(settings)
        .then(() => {
            alert('تم حفظ إعدادات المواعيد بنجاح');
        })
        .catch((error) => {
            console.error('Error saving appointment settings:', error);
            alert('حدث خطأ أثناء حفظ الإعدادات');
        });
}

// Notification functions
function loadNotifications() {
    if (!database) return;
    
    database.ref('notifications').limitToLast(10).on('value', (snapshot) => {
        const notifications = snapshot.val() || {};
        const notificationsDiv = document.getElementById('recentNotifications');
        
        notificationsDiv.innerHTML = '';
        
        Object.keys(notifications).reverse().forEach(notificationId => {
            const notification = notifications[notificationId];
            const notificationDiv = document.createElement('div');
            notificationDiv.className = 'bg-white bg-opacity-10 rounded p-2 text-sm';
            notificationDiv.innerHTML = `
                <div class="flex justify-between">
                    <span>${notification.text}</span>
                    <span class="text-gray-300">${new Date(notification.timestamp).toLocaleTimeString('ar-EG')}</span>
                </div>
            `;
            notificationsDiv.appendChild(notificationDiv);
        });
    });
}

function sendNotification() {
    const type = document.getElementById('notificationType').value;
    const clinic = document.getElementById('notificationClinic').value;
    const text = document.getElementById('notificationText').value;
    
    if (!text) {
        alert('يرجى إدخال نص التنبيه');
        return;
    }
    
    const notificationData = {
        type: type,
        clinic: clinic,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('notifications').push(notificationData)
        .then(() => {
            alert('تم إرسال التنبيه بنجاح');
            document.getElementById('notificationText').value = '';
        })
        .catch((error) => {
            console.error('Error sending notification:', error);
            alert('حدث خطأ أثناء إرسال التنبيه');
        });
}

function sendToAllControls() {
    const text = document.getElementById('notificationText').value;
    
    if (!text) {
        alert('يرجى إدخال نص التنبيه');
        return;
    }
    
    const notificationData = {
        type: 'control_broadcast',
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('controlNotifications').push(notificationData)
        .then(() => {
            alert('تم إرسال التنبيه لجميع لوحات التحكم');
            document.getElementById('notificationText').value = '';
        })
        .catch((error) => {
            console.error('Error sending broadcast:', error);
            alert('حدث خطأ أثناء إرسال التنبيه');
        });
}

// Emergency functions
function loadEmergencyLog() {
    if (!database) return;
    
    database.ref('emergency').limitToLast(10).on('value', (snapshot) => {
        const emergencies = snapshot.val() || {};
        const emergencyLogDiv = document.getElementById('emergencyLog');
        
        emergencyLogDiv.innerHTML = '';
        
        Object.keys(emergencies).reverse().forEach(emergencyId => {
            const emergency = emergencies[emergencyId];
            const emergencyDiv = document.createElement('div');
            emergencyDiv.className = 'bg-red-600 bg-opacity-30 rounded p-2 text-sm';
            emergencyDiv.innerHTML = `
                <div class="flex justify-between">
                    <span>${emergency.reason}</span>
                    <span class="text-gray-300">${new Date(emergency.timestamp).toLocaleTimeString('ar-EG')}</span>
                </div>
            `;
            emergencyLogDiv.appendChild(emergencyDiv);
        });
    });
}

function activateEmergency() {
    const clinic = document.getElementById('emergencyClinic').value;
    const reason = document.getElementById('emergencyReason').value;
    
    if (!clinic || !reason) {
        alert('يرجى اختيار العيادة وكتابة سبب الحالة الطارئة');
        return;
    }
    
    const emergencyData = {
        clinic: clinic,
        reason: reason,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'active'
    };
    
    database.ref('emergency').push(emergencyData)
        .then(() => {
            alert('تم تفعيل الحالة الطارئة');
            document.getElementById('emergencyReason').value = '';
        })
        .catch((error) => {
            console.error('Error activating emergency:', error);
            alert('حدث خطأ أثناء تفعيل الحالة الطارئة');
        });
}

function skipQueue() {
    const clinic = document.getElementById('emergencyClinic').value;
    const clientNumber = document.getElementById('emergencyClientNumber').value;
    
    if (!clinic) {
        alert('يرجى اختيار العيادة');
        return;
    }
    
    if (clientNumber) {
        database.ref(`clinics/${clinic}`).update({
            currentNumber: parseInt(clientNumber),
            lastSkipped: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            alert(`تم تخطي الطابور والانتقال للعميل رقم ${clientNumber}`);
        })
        .catch((error) => {
            console.error('Error skipping queue:', error);
            alert('حدث خطأ أثناء تخطي الطابور');
        });
    } else {
        alert('يرجى إدخال رقم العميل');
    }
}

function clearAllQueues() {
    if (confirm('هل أنت متأكد من تصفير جميع العيادات؟')) {
        database.ref('clinics').once('value', (snapshot) => {
            const clinics = snapshot.val() || {};
            const updates = {};
            
            Object.keys(clinics).forEach(clinicId => {
                updates[`clinics/${clinicId}/currentNumber`] = 0;
            });
            
            database.ref().update(updates)
                .then(() => {
                    alert('تم تصفير جميع العيادات بنجاح');
                })
                .catch((error) => {
                    console.error('Error clearing queues:', error);
                    alert('حدث خطأ أثناء تصفير العيادات');
                });
        });
    }
}

function resetDaily() {
    if (confirm('هل أنت متأكد من التصفير اليومي؟')) {
        clearAllQueues();
        
        // Set up daily reset at 6 AM
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0);
        
        const timeUntilReset = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            clearAllQueues();
            // Set up recurring daily reset
            setInterval(clearAllQueues, 24 * 60 * 60 * 1000);
        }, timeUntilReset);
        
        alert('تم إعداد التصفير اليومي عند الساعة 6 صباحاً');
    }
}

// Notification type change handler
document.getElementById('notificationType').addEventListener('change', function() {
    const clientNumberDiv = document.getElementById('clientNumberDiv');
    if (this.value === 'client') {
        clientNumberDiv.classList.remove('hidden');
    } else {
        clientNumberDiv.classList.add('hidden');
    }
});

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    window.firestore = firebase.firestore();
    window.auth = firebase.auth();
}