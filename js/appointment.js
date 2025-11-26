// Appointment Booking JavaScript
let selectedClinic = null;
let selectedDate = null;
let selectedTime = null;
let selectedShift = null;
let availableSlots = {};
let appointmentSettings = {};

// Initialize appointment page
document.addEventListener('DOMContentLoaded', function() {
    initializeAppointment();
    generateCalendar();
    setupFormValidation();
});

// Initialize appointment system
function initializeAppointment() {
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.database = firebase.database();
    }
    
    // Load clinics
    loadClinics();
    
    // Load appointment settings
    loadAppointmentSettings();
    
    // Load user's appointments
    loadUserAppointments();
}

// Load clinics
function loadClinics() {
    if (!database) return;
    
    database.ref('clinics').on('value', (snapshot) => {
        const clinics = snapshot.val() || {};
        const clinicSelect = document.getElementById('clinicSelect');
        
        clinicSelect.innerHTML = '<option value="">اختر العيادة...</option>';
        
        Object.keys(clinics).forEach(clinicId => {
            const clinic = clinics[clinicId];
            const option = document.createElement('option');
            option.value = clinicId;
            option.textContent = `${clinic.name} (${clinic.number})`;
            clinicSelect.appendChild(option);
        });
    });
}

// Load appointment settings
function loadAppointmentSettings() {
    if (!database) return;
    
    database.ref('settings/appointments').on('value', (snapshot) => {
        appointmentSettings = snapshot.val() || {
            morningSlots: 20,
            eveningSlots: 15,
            morningStart: '08:00',
            morningEnd: '14:00',
            eveningStart: '14:00',
            eveningEnd: '20:00'
        };
    });
}

// Generate calendar
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'text-center font-semibold p-2';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        calendar.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        const dayDate = new Date(currentYear, currentMonth, day);
        const isToday = dayDate.toDateString() === today.toDateString();
        const isPast = dayDate < today;
        const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6; // Friday or Saturday
        
        dayElement.className = `calendar-day p-3 text-center cursor-pointer rounded-lg ${
            isToday ? 'bg-blue-600' : 
            isPast || isWeekend ? 'disabled bg-gray-600' : 'bg-white bg-opacity-10 hover:bg-blue-600'
        }`;
        dayElement.textContent = day;
        
        if (!isPast && !isWeekend) {
            dayElement.onclick = () => selectDate(dayDate);
        }
        
        calendar.appendChild(dayElement);
    }
}

// Select date
function selectDate(date) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Add selection to clicked day
    event.target.classList.add('selected');
    
    selectedDate = date;
    document.getElementById('selectedDate').value = date.toISOString().split('T')[0];
    
    // Clear time selection
    selectedTime = null;
    selectedShift = null;
    document.getElementById('selectedTime').value = '';
    document.getElementById('timeSlots').innerHTML = '';
    
    // Reset shift buttons
    document.getElementById('morningShift').classList.remove('selected');
    document.getElementById('eveningShift').classList.remove('selected');
}

// Select shift
function selectShift(shift) {
    selectedShift = shift;
    
    // Update button styles
    document.getElementById('morningShift').classList.remove('selected');
    document.getElementById('eveningShift').classList.remove('selected');
    document.getElementById(`${shift}Shift`).classList.add('selected');
    
    // Generate time slots
    generateTimeSlots(shift);
}

// Generate time slots
function generateTimeSlots(shift) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '';
    
    const slots = shift === 'morning' ? appointmentSettings.morningSlots : appointmentSettings.eveningSlots;
    const startTime = shift === 'morning' ? appointmentSettings.morningStart : appointmentSettings.eveningStart;
    const endTime = shift === 'morning' ? appointmentSettings.morningEnd : appointmentSettings.eveningEnd;
    
    // Calculate time interval
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const interval = (endMinutes - startMinutes) / slots;
    
    // Generate slots
    for (let i = 0; i < slots; i++) {
        const slotTime = minutesToTime(startMinutes + (interval * i));
        const slotElement = document.createElement('div');
        
        slotElement.className = 'time-slot p-3 text-center cursor-pointer rounded-lg bg-white bg-opacity-10 hover:bg-blue-600 transition-colors';
        slotElement.textContent = formatTime(slotTime);
        slotElement.onclick = () => selectTime(slotTime, slotElement);
        
        timeSlotsContainer.appendChild(slotElement);
    }
    
    // Check booked slots
    checkBookedSlots();
}

// Convert time string to minutes
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Convert minutes to time string
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Format time for display
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'م' : 'ص';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${minutes} ${period}`;
}

// Select time
function selectTime(time, element) {
    // Remove previous selection
    document.querySelectorAll('.time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Check if slot is booked
    if (element.classList.contains('booked')) {
        alert('هذا الوقت محجوز بالفعل');
        return;
    }
    
    // Add selection
    element.classList.add('selected');
    selectedTime = time;
    document.getElementById('selectedTime').value = time;
}

// Check booked slots
function checkBookedSlots() {
    if (!selectedDate || !selectedClinic) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    database.ref('appointments').orderByChild('date').equalTo(dateStr).once('value', (snapshot) => {
        const appointments = snapshot.val() || {};
        
        Object.keys(appointments).forEach(appointmentId => {
            const appointment = appointments[appointmentId];
            if (appointment.clinic === selectedClinic && appointment.shift === selectedShift) {
                // Mark slot as booked
                const timeSlots = document.querySelectorAll('.time-slot');
                timeSlots.forEach(slot => {
                    if (slot.textContent === formatTime(appointment.time)) {
                        slot.classList.add('booked');
                        slot.onclick = null;
                    }
                });
            }
        });
    });
}

// Setup form validation
function setupFormValidation() {
    const form = document.getElementById('appointmentForm');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitAppointment();
    });
    
    // Clinic selection change handler
    document.getElementById('clinicSelect').addEventListener('change', (e) => {
        selectedClinic = e.target.value;
        checkBookedSlots();
    });
}

// Submit appointment
function submitAppointment() {
    const formData = {
        clientName: document.getElementById('clientName').value,
        nationalId: document.getElementById('nationalId').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        clinic: selectedClinic,
        date: document.getElementById('selectedDate').value,
        time: selectedTime,
        shift: selectedShift,
        visitReason: document.getElementById('visitReason').value,
        status: 'pending',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Validate data
    if (!validateAppointmentData(formData)) {
        return;
    }
    
    // Show loading
    document.getElementById('loadingScreen').classList.remove('hidden');
    
    // Check if slot is still available
    checkSlotAvailability(formData)
        .then((isAvailable) => {
            if (isAvailable) {
                // Save appointment
                return database.ref('appointmentRequests').push(formData);
            } else {
                throw new Error('الوقت المحدد محجوز بالفعل');
            }
        })
        .then((result) => {
            // Hide loading
            document.getElementById('loadingScreen').classList.add('hidden');
            
            // Show success modal
            showSuccessModal(formData, result.key);
            
            // Reset form
            resetForm();
            
            // Load appointments
            loadUserAppointments();
        })
        .catch((error) => {
            // Hide loading
            document.getElementById('loadingScreen').classList.add('hidden');
            
            alert('حدث خطأ: ' + error.message);
        });
}

// Validate appointment data
function validateAppointmentData(data) {
    if (!data.clientName || data.clientName.length < 3) {
        alert('الاسم يجب أن يكون 3 أحرف على الأقل');
        return false;
    }
    
    if (!data.nationalId || data.nationalId.length < 10) {
        alert('الرقم القومي يجب أن يكون 10 أرقام على الأقل');
        return false;
    }
    
    if (!data.phoneNumber || !/^01[0-9]{9}$/.test(data.phoneNumber)) {
        alert('رقم التليفون يجب أن يكون 11 رقم ويبدأ بـ 01');
        return false;
    }
    
    if (!data.clinic) {
        alert('يرجى اختيار العيادة');
        return false;
    }
    
    if (!data.date) {
        alert('يرجى اختيار التاريخ');
        return false;
    }
    
    if (!data.time) {
        alert('يرجى اختيار الوقت');
        return false;
    }
    
    return true;
}

// Check slot availability
function checkSlotAvailability(data) {
    return database.ref('appointments')
        .orderByChild('date')
        .equalTo(data.date)
        .once('value')
        .then((snapshot) => {
            const appointments = snapshot.val() || {};
            
            // Check if slot is booked
            for (let appointmentId in appointments) {
                const appointment = appointments[appointmentId];
                if (appointment.clinic === data.clinic && 
                    appointment.time === data.time && 
                    appointment.shift === data.shift &&
                    appointment.status !== 'cancelled') {
                    return false;
                }
            }
            
            return true;
        });
}

// Show success modal
function showSuccessModal(data, appointmentId) {
    const modal = document.getElementById('successModal');
    const details = document.getElementById('appointmentDetails');
    
    // Format appointment details
    const appointmentDate = new Date(data.date);
    const formattedDate = appointmentDate.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    details.innerHTML = `
        <div class="text-right space-y-2">
            <div><strong>الاسم:</strong> ${data.clientName}</div>
            <div><strong>العيادة:</strong> ${getClinicName(data.clinic)}</div>
            <div><strong>التاريخ:</strong> ${formattedDate}</div>
            <div><strong>الوقت:</strong> ${formatTime(data.time)} ${data.shift === 'morning' ? 'صباحاً' : 'مساءً'}</div>
            <div><strong>رقم الحجز:</strong> <span class="arabic-number">${appointmentId.slice(-6)}</span></div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Get clinic name
function getClinicName(clinicId) {
    const clinicSelect = document.getElementById('clinicSelect');
    const selectedOption = clinicSelect.querySelector(`option[value="${clinicId}"]`);
    return selectedOption ? selectedOption.textContent : clinicId;
}

// Close success modal
function closeSuccessModal() {
    document.getElementById('successModal').classList.add('hidden');
}

// Print appointment
function printAppointment() {
    window.print();
}

// Reset form
function resetForm() {
    document.getElementById('appointmentForm').reset();
    selectedClinic = null;
    selectedDate = null;
    selectedTime = null;
    selectedShift = null;
    
    // Clear selections
    document.querySelectorAll('.calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    document.querySelectorAll('.time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });
    document.getElementById('morningShift').classList.remove('selected');
    document.getElementById('eveningShift').classList.remove('selected');
    document.getElementById('timeSlots').innerHTML = '';
}

// Load user appointments
function loadUserAppointments() {
    // Get user's phone number to filter appointments
    const phoneNumber = localStorage.getItem('userPhoneNumber');
    
    if (phoneNumber) {
        database.ref('appointments').orderByChild('phoneNumber').equalTo(phoneNumber).on('value', (snapshot) => {
            const appointments = snapshot.val() || {};
            displayUserAppointments(appointments);
        });
    }
}

// Display user appointments
function displayUserAppointments(appointments) {
    const container = document.getElementById('myAppointments');
    container.innerHTML = '';
    
    if (Object.keys(appointments).length === 0) {
        container.innerHTML = '<p class="text-gray-300 text-center">لا توجد مواعيد محجوزة</p>';
        return;
    }
    
    Object.keys(appointments).forEach(appointmentId => {
        const appointment = appointments[appointmentId];
        
        const appointmentDiv = document.createElement('div');
        appointmentDiv.className = 'bg-white bg-opacity-10 rounded-lg p-4 flex justify-between items-center';
        
        const appointmentDate = new Date(appointment.date);
        const formattedDate = appointmentDate.toLocaleDateString('ar-EG', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        const statusColor = {
            'pending': 'text-yellow-400',
            'approved': 'text-green-400',
            'cancelled': 'text-red-400',
            'completed': 'text-blue-400'
        };
        
        appointmentDiv.innerHTML = `
            <div>
                <h4 class="font-semibold">${appointment.clinicName || appointment.clinic}</h4>
                <p class="text-sm text-gray-300">${formattedDate} - ${formatTime(appointment.time)} ${appointment.shift === 'morning' ? 'صباحاً' : 'مساءً'}</p>
                <p class="text-sm ${statusColor[appointment.status] || 'text-gray-300'}">${getStatusText(appointment.status)}</p>
            </div>
            <div class="flex space-x-2">
                ${appointment.status === 'approved' ? `
                    <button onclick="cancelAppointment('${appointmentId}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                        <i class="fas fa-times ml-1"></i>إلغاء
                    </button>
                ` : ''}
                <button onclick="rescheduleAppointment('${appointmentId}')" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors">
                    <i class="fas fa-edit ml-1"></i>تعديل
                </button>
            </div>
        `;
        
        container.appendChild(appointmentDiv);
    });
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        'pending': 'قيد الانتظار',
        'approved': 'مؤكد',
        'cancelled': 'ملغي',
        'completed': 'مكتمل'
    };
    return statusTexts[status] || status;
}

// Cancel appointment
function cancelAppointment(appointmentId) {
    if (confirm('هل أنت متأكد من إلغاء الموعد؟')) {
        database.ref(`appointments/${appointmentId}`).update({
            status: 'cancelled',
            cancelledAt: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            alert('تم إلغاء الموعد بنجاح');
        })
        .catch((error) => {
            console.error('Error cancelling appointment:', error);
            alert('حدث خطأ أثناء إلغاء الموعد');
        });
    }
}

// Reschedule appointment
function rescheduleAppointment(appointmentId) {
    // For simplicity, just show an alert
    // In a full implementation, this would open an edit modal
    alert('سيتم إعادة توجيهك إلى صفحة تعديل الموعد');
}

// Save user phone number for future appointments
document.getElementById('phoneNumber').addEventListener('change', (e) => {
    localStorage.setItem('userPhoneNumber', e.target.value);
});

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
}