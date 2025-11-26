// Doctors Page JavaScript
let currentDoctor = null;
let currentDoctorData = null;
let currentTab = 'dashboard';

// Initialize doctors page
document.addEventListener('DOMContentLoaded', function() {
    initializeDoctors();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Setup login form
    document.getElementById('doctorLoginForm').addEventListener('submit', handleDoctorLogin);
    
    // Setup profile form
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    
    // Setup request form
    document.getElementById('requestForm').addEventListener('submit', handleRequestSubmit);
});

// Initialize doctors system
function initializeDoctors() {
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.database = firebase.database();
        window.auth = firebase.auth();
    }
    
    // Load clinics for profile
    loadClinicsForProfile();
}

// Handle doctor login
function handleDoctorLogin(e) {
    e.preventDefault();
    const email = document.getElementById('doctorEmail').value;
    const password = document.getElementById('doctorPassword').value;
    
    if (!email || !password) {
        alert('يرجى إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            currentDoctor = userCredential.user.uid;
            return database.ref(`doctors/${currentDoctor}`).once('value');
        })
        .then((snapshot) => {
            currentDoctorData = snapshot.val();
            if (currentDoctorData) {
                loginToDoctorPortal();
            } else {
                throw new Error('Doctor data not found');
            }
        })
        .catch((error) => {
            console.error('Login error:', error);
            document.getElementById('loginError').classList.remove('hidden');
        });
}

// Login to doctor portal
function loginToDoctorPortal() {
    // Update UI
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('mainInterface').classList.remove('hidden');
    
    // Load doctor data
    loadDoctorData();
    loadDashboardData();
    loadRequestHistory();
    loadAttendanceRecords();
    
    // Start listeners
    startDoctorListeners();
    
    showNotification(`مرحباً دكتور ${currentDoctorData.name}`);
}

// Load doctor data
function loadDoctorData() {
    document.getElementById('doctorName').textContent = currentDoctorData.name;
    document.getElementById('doctorSpecialty').textContent = currentDoctorData.specialty;
    document.getElementById('doctorClinic').textContent = currentDoctorData.clinic || 'غير محدد';
    document.getElementById('doctorWelcome').textContent = `مرحباً دكتور ${currentDoctorData.name}`;
    
    // Profile form
    document.getElementById('profileName').value = currentDoctorData.name;
    document.getElementById('profileSpecialty').value = currentDoctorData.specialty;
    document.getElementById('profilePhone').value = currentDoctorData.phone;
    document.getElementById('profileNationalId').value = currentDoctorData.nationalId || '';
    document.getElementById('profileEmail').value = currentDoctorData.email;
    document.getElementById('profileClinic').value = currentDoctorData.clinic || '';
    
    // Status and balance
    const status = currentDoctorData.status === 'active' ? 'نشط' : 'غير نشط';
    document.getElementById('doctorStatus').textContent = status;
    document.getElementById('doctorStatus').className = currentDoctorData.status === 'active' ? 'text-green-400' : 'text-red-400';
    
    const leaveBalance = currentDoctorData.leaveBalance || { regular: 21, casual: 7 };
    document.getElementById('leaveBalance').textContent = `${leaveBalance.regular} يوم اعتيادي - ${leaveBalance.casual} يوم عارض`;
}

// Load dashboard data
function loadDashboardData() {
    // Load today's patients
    const today = new Date().toISOString().split('T')[0];
    database.ref(`statistics/${currentDoctor}/${today}`).on('value', (snapshot) => {
        const todayCount = snapshot.val() || 0;
        document.getElementById('todayPatients').textContent = todayCount;
    });
    
    // Load monthly attendance
    const monthStart = getMonthStart();
    database.ref(`attendance/${currentDoctor}`)
        .orderByChild('date')
        .startAt(monthStart)
        .on('value', (snapshot) => {
            const attendance = snapshot.val() || {};
            let present = 0, absent = 0;
            
            Object.keys(attendance).forEach(recordId => {
                const record = attendance[recordId];
                if (record.status === 'present') present++;
                else if (record.status === 'absent') absent++;
            });
            
            document.getElementById('monthAttendance').textContent = present;
            document.getElementById('monthAbsence').textContent = absent;
        });
    
    // Load pending requests
    database.ref('doctorRequests')
        .orderByChild('doctorId')
        .equalTo(currentDoctor)
        .on('value', (snapshot) => {
            const requests = snapshot.val() || {};
            let pending = 0;
            
            Object.keys(requests).forEach(requestId => {
                if (requests[requestId].status === 'pending') pending++;
            });
            
            document.getElementById('pendingRequests').textContent = pending;
        });
    
    // Load recent activity
    loadRecentActivity();
}

// Load recent activity
function loadRecentActivity() {
    database.ref(`doctorActivity/${currentDoctor}`)
        .limitToLast(5)
        .on('value', (snapshot) => {
            const activities = snapshot.val() || {};
            const container = document.getElementById('recentActivity');
            
            container.innerHTML = '';
            
            Object.keys(activities).reverse().forEach(activityId => {
                const activity = activities[activityId];
                const activityDiv = document.createElement('div');
                activityDiv.className = 'bg-white bg-opacity-10 rounded p-2 text-sm';
                activityDiv.innerHTML = `
                    <div class="flex justify-between">
                        <span>${getActivityText(activity)}</span>
                        <span class="text-gray-300">${new Date(activity.timestamp).toLocaleTimeString('ar-EG')}</span>
                    </div>
                `;
                container.appendChild(activityDiv);
            });
        });
}

// Get activity text
function getActivityText(activity) {
    const activityTypes = {
        'login': 'تسجيل دخول',
        'logout': 'تسجيل خروج',
        'attendance': 'تسجيل حضور',
        'departure': 'تسجيل انصراف',
        'request_submitted': 'تقديم طلب',
        'request_approved': 'موافقة على طلب',
        'request_rejected': 'رفض طلب'
    };
    
    return activityTypes[activity.type] || activity.type;
}

// Start doctor listeners
function startDoctorListeners() {
    // Listen for profile updates
    database.ref(`doctors/${currentDoctor}`).on('value', (snapshot) => {
        currentDoctorData = snapshot.val();
        loadDoctorData();
    });
    
    // Listen for notifications
    database.ref('notifications').orderByChild('targetDoctor').equalTo(currentDoctor).on('child_added', (snapshot) => {
        const notification = snapshot.val();
        showNotification(notification.message);
    });
}

// Switch tabs
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Update button styles
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('bg-gray-600', 'hover:bg-blue-600');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    
    // Update active button
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    activeBtn.classList.add('bg-blue-600');
    activeBtn.classList.remove('bg-gray-600', 'hover:bg-blue-600');
    
    currentTab = tabName;
}

// Load clinics for profile
function loadClinicsForProfile() {
    if (!database) return;
    
    database.ref('clinics').on('value', (snapshot) => {
        const clinics = snapshot.val() || {};
        const clinicSelect = document.getElementById('profileClinic');
        
        // Clear existing options (except first)
        const firstOption = clinicSelect.querySelector('option[value=""]');
        clinicSelect.innerHTML = '';
        clinicSelect.appendChild(firstOption);
        
        Object.keys(clinics).forEach(clinicId => {
            const clinic = clinics[clinicId];
            const option = document.createElement('option');
            option.value = clinicId;
            option.textContent = `${clinic.name} (${clinic.number})`;
            clinicSelect.appendChild(option);
        });
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

// Mark attendance
function markAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Check if already marked
    database.ref(`attendance/${currentDoctor}/${today}`).once('value', (snapshot) => {
        if (snapshot.exists()) {
            alert('تم تسجيل الحضور بالفعل لهذا اليوم');
            return;
        }
        
        const attendanceData = {
            doctorId: currentDoctor,
            doctorName: currentDoctorData.name,
            date: today,
            checkIn: now.toISOString(),
            status: 'present',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        database.ref(`attendance/${currentDoctor}/${today}`).set(attendanceData)
            .then(() => {
                // Log activity
                logActivity('attendance', 'تسجيل حضور');
                showNotification('تم تسجيل الحضور بنجاح');
            })
            .catch((error) => {
                console.error('Error marking attendance:', error);
                alert('حدث خطأ أثناء تسجيل الحضور');
            });
    });
}

// Mark departure
function markDeparture() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    database.ref(`attendance/${currentDoctor}/${today}`).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert('لم يتم تسجيل حضور لهذا اليوم');
            return;
        }
        
        const attendanceData = snapshot.val();
        
        if (attendanceData.checkOut) {
            alert('تم تسجيل الانصراف بالفعل لهذا اليوم');
            return;
        }
        
        // Calculate duration
        const checkInTime = new Date(attendanceData.checkIn);
        const duration = Math.floor((now - checkInTime) / (1000 * 60)); // Duration in minutes
        
        const updateData = {
            checkOut: now.toISOString(),
            duration: duration,
            status: duration >= 480 ? 'present' : 'partial' // 8 hours = 480 minutes
        };
        
        database.ref(`attendance/${currentDoctor}/${today}`).update(updateData)
            .then(() => {
                // Log activity
                logActivity('departure', 'تسجيل انصراف');
                showNotification('تم تسجيل الانصراف بنجاح');
            })
            .catch((error) => {
                console.error('Error marking departure:', error);
                alert('حدث خطأ أثناء تسجيل الانصراف');
            });
    });
}

// Log activity
function logActivity(type, description) {
    const activityData = {
        type: type,
        description: description,
        doctorId: currentDoctor,
        doctorName: currentDoctorData.name,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(`doctorActivity/${currentDoctor}`).push(activityData);
}

// Handle profile update
function handleProfileUpdate(e) {
    e.preventDefault();
    
    const profileData = {
        name: document.getElementById('profileName').value,
        specialty: document.getElementById('profileSpecialty').value,
        phone: document.getElementById('profilePhone').value,
        nationalId: document.getElementById('profileNationalId').value,
        clinic: document.getElementById('profileClinic').value,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Validate data
    if (!profileData.name || !profileData.specialty || !profileData.phone) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    database.ref(`doctors/${currentDoctor}`).update(profileData)
        .then(() => {
            showNotification('تم تحديث الملف الشخصي بنجاح');
            logActivity('profile_update', 'تحديث الملف الشخصي');
        })
        .catch((error) => {
            console.error('Error updating profile:', error);
            alert('حدث خطأ أثناء تحديث الملف الشخصي');
        });
}

// Change password
function changePassword() {
    const newPassword = prompt('أدخل كلمة المرور الجديدة:');
    
    if (newPassword && newPassword.length >= 6) {
        auth.currentUser.updatePassword(newPassword)
            .then(() => {
                showNotification('تم تغيير كلمة المرور بنجاح');
                logActivity('password_change', 'تغيير كلمة المرور');
            })
            .catch((error) => {
                console.error('Error changing password:', error);
                alert('حدث خطأ أثناء تغيير كلمة المرور');
            });
    } else if (newPassword) {
        alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
}

// Handle request submit
function handleRequestSubmit(e) {
    e.preventDefault();
    
    const requestData = {
        doctorId: currentDoctor,
        doctorName: currentDoctorData.name,
        type: document.getElementById('requestType').value,
        fromDate: document.getElementById('requestFromDate').value,
        toDate: document.getElementById('requestToDate').value,
        replacement: document.getElementById('requestReplacement').value,
        notes: document.getElementById('requestNotes').value,
        status: 'pending',
        submittedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Validate data
    if (!requestData.type || !requestData.fromDate || !requestData.toDate) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    database.ref('doctorRequests').push(requestData)
        .then(() => {
            showNotification('تم إرسال الطلب بنجاح');
            logActivity('request_submitted', `تقديم طلب ${getRequestTypeText(requestData.type)}`);
            
            // Reset form
            document.getElementById('requestForm').reset();
        })
        .catch((error) => {
            console.error('Error submitting request:', error);
            alert('حدث خطأ أثناء إرسال الطلب');
        });
}

// Load request history
function loadRequestHistory() {
    if (!currentDoctor) return;
    
    database.ref('doctorRequests')
        .orderByChild('doctorId')
        .equalTo(currentDoctor)
        .limitToLast(10)
        .on('value', (snapshot) => {
            const requests = snapshot.val() || {};
            const container = document.getElementById('requestHistory');
            
            container.innerHTML = '';
            
            if (Object.keys(requests).length === 0) {
                container.innerHTML = '<p class="text-gray-300 text-center">لا توجد طلبات</p>';
                return;
            }
            
            Object.keys(requests).reverse().forEach(requestId => {
                const request = requests[requestId];
                const requestDiv = document.createElement('div');
                requestDiv.className = 'request-card rounded-lg p-3';
                
                const statusColors = {
                    'pending': 'text-yellow-400',
                    'approved': 'text-green-400',
                    'rejected': 'text-red-400'
                };
                
                const fromDate = new Date(request.fromDate).toLocaleDateString('ar-EG');
                const toDate = new Date(request.toDate).toLocaleDateString('ar-EG');
                
                requestDiv.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold">${getRequestTypeText(request.type)}</h4>
                            <p class="text-sm text-gray-300">${fromDate} - ${toDate}</p>
                            <p class="text-sm ${statusColors[request.status] || 'text-gray-300'}">${getStatusText(request.status)}</p>
                        </div>
                        <div class="text-xs text-gray-400">
                            ${new Date(request.submittedAt).toLocaleDateString('ar-EG')}
                        </div>
                    </div>
                `;
                
                container.appendChild(requestDiv);
            });
        });
}

// Load attendance records
function loadAttendanceRecords() {
    if (!currentDoctor) return;
    
    database.ref(`attendance/${currentDoctor}`)
        .limitToLast(30)
        .on('value', (snapshot) => {
            const attendance = snapshot.val() || {};
            const tbody = document.getElementById('attendanceTableBody');
            
            tbody.innerHTML = '';
            
            Object.keys(attendance).reverse().forEach(recordId => {
                const record = attendance[recordId];
                const row = document.createElement('tr');
                row.className = 'border-b border-white border-opacity-30';
                
                const checkIn = record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG') : '-';
                const checkOut = record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG') : '-';
                const duration = record.duration ? `${Math.floor(record.duration / 60)}:${(record.duration % 60).toString().padStart(2, '0')}` : '-';
                
                const statusColors = {
                    'present': 'text-green-400',
                    'absent': 'text-red-400',
                    'partial': 'text-yellow-400'
                };
                
                row.innerHTML = `
                    <td class="p-3">${new Date(record.date).toLocaleDateString('ar-EG')}</td>
                    <td class="p-3">${checkIn}</td>
                    <td class="p-3">${checkOut}</td>
                    <td class="p-3">${duration}</td>
                    <td class="p-3 ${statusColors[record.status] || 'text-gray-300'}">${getStatusText(record.status)}</td>
                    <td class="p-3">${record.notes || '-'}</td>
                `;
                
                tbody.appendChild(row);
            });
        });
}

// Get request type text
function getRequestTypeText(type) {
    const requestTypes = {
        'regular_leave': 'إجازة اعتيادية',
        'casual_leave': 'إجازة عارضة',
        'rest_compensation': 'بدل راحة',
        'mission': 'مأمورية',
        'morning_permission': 'إذن صباحي',
        'evening_permission': 'إذن مسائي',
        'training_mission': 'مأمورية تدريب',
        'sick_leave': 'إجازة مرضى',
        'health_insurance': 'تأمين صحي',
        'route_permit': 'خط سير',
        'other': 'أخرى'
    };
    
    return requestTypes[type] || type;
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        'pending': 'قيد الانتظار',
        'approved': 'مقبول',
        'rejected': 'مرفوض',
        'present': 'حاضر',
        'absent': 'غائب',
        'partial': 'حضور جزئي'
    };
    
    return statusTexts[status] || status;
}

// Get month start date
function getMonthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

// Show request modal
function showRequestModal() {
    document.getElementById('requestModal').classList.remove('hidden');
}

// Close request modal
function closeRequestModal() {
    document.getElementById('requestModal').classList.add('hidden');
}

// Logout doctor
function logoutDoctor() {
    auth.signOut()
        .then(() => {
            // Clean up
            if (database && currentDoctor) {
                database.ref(`doctors/${currentDoctor}`).off();
                database.ref(`attendance/${currentDoctor}`).off();
                database.ref('doctorRequests').off();
            }
            
            currentDoctor = null;
            currentDoctorData = null;
            
            document.getElementById('mainInterface').classList.add('hidden');
            document.getElementById('loginModal').classList.remove('hidden');
            
            // Reset forms
            document.getElementById('doctorLoginForm').reset();
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle text-xl ml-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
    window.auth = firebase.auth();
}