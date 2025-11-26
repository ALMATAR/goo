// Print Page JavaScript
let currentClinic = null;
let centerName = 'مركزنا الطبي';

// Initialize print page
document.addEventListener('DOMContentLoaded', function() {
    initializePrint();
    loadCenterName();
    setupFormValidation();
});

// Initialize print system
function initializePrint() {
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.database = firebase.database();
    }
    
    // Load clinics
    loadClinics();
}

// Load center name
function loadCenterName() {
    if (!database) return;
    
    database.ref('settings/centerInfo/name').on('value', (snapshot) => {
        centerName = snapshot.val() || 'مركزنا الطبي';
    });
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

// Setup form validation
function setupFormValidation() {
    const startNumber = document.getElementById('startNumber');
    const endNumber = document.getElementById('endNumber');
    
    // Validate number range
    function validateRange() {
        const start = parseInt(startNumber.value);
        const end = parseInt(endNumber.value);
        
        if (start && end && start > end) {
            endNumber.setCustomValidity('رقم النهاية يجب أن يكون أكبر من رقم البداية');
        } else {
            endNumber.setCustomValidity('');
        }
    }
    
    startNumber.addEventListener('input', validateRange);
    endNumber.addEventListener('input', validateRange);
    
    // Validate maximum tickets
    endNumber.addEventListener('input', () => {
        const start = parseInt(startNumber.value);
        const end = parseInt(endNumber.value);
        
        if (start && end && (end - start + 1) > 100) {
            endNumber.setCustomValidity('لا يمكن طباعة أكثر من 100 تذكرة دفعة واحدة');
        } else {
            endNumber.setCustomValidity('');
        }
    });
}

// Preview tickets
function previewTickets() {
    const clinicId = document.getElementById('clinicSelect').value;
    const startNum = parseInt(document.getElementById('startNumber').value);
    const endNum = parseInt(document.getElementById('endNumber').value);
    
    if (!clinicId || !startNum || !endNum) {
        alert('يرجى اختيار العيادة وتحديد نطاق الأرقام');
        return;
    }
    
    if (startNum > endNum) {
        alert('رقم النهاية يجب أن يكون أكبر من رقم البداية');
        return;
    }
    
    if ((endNum - startNum + 1) > 100) {
        alert('لا يمكن طباعة أكثر من 100 تذكرة دفعة واحدة');
        return;
    }
    
    currentClinic = clinicId;
    generateTicketsPreview(startNum, endNum);
    
    document.getElementById('previewSection').classList.remove('hidden');
    
    // Scroll to preview
    document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
}

// Generate tickets preview
function generateTicketsPreview(startNum, endNum) {
    const ticketsGrid = document.getElementById('ticketsGrid');
    const includeDate = document.getElementById('includeDate').checked;
    const includeCenter = document.getElementById('includeCenter').checked;
    const includeWaitTime = document.getElementById('includeWaitTime').checked;
    const waitTime = document.getElementById('waitTime').value;
    
    ticketsGrid.innerHTML = '';
    
    // Get clinic info
    database.ref(`clinics/${currentClinic}`).once('value', (snapshot) => {
        const clinicData = snapshot.val();
        const clinicName = clinicData ? clinicData.name : 'العيادة';
        const currentDate = new Date().toLocaleDateString('ar-EG');
        
        for (let i = startNum; i <= endNum; i++) {
            const ticket = document.createElement('div');
            ticket.className = 'ticket';
            
            let ticketContent = `
                <div class="ticket-center">${clinicName}</div>
                <div class="ticket-number arabic-number">${i}</div>
            `;
            
            if (includeCenter) {
                ticketContent += `<div class="ticket-center">${centerName}</div>`;
            }
            
            if (includeDate) {
                ticketContent += `<div class="ticket-center">${currentDate}</div>`;
            }
            
            if (includeWaitTime) {
                ticketContent += `<div class="ticket-center">الوقت التقريبي: ${waitTime} دقيقة</div>`;
            }
            
            ticket.innerHTML = ticketContent;
            ticketsGrid.appendChild(ticket);
        }
    });
}

// Print tickets
function printTickets() {
    const clinicId = document.getElementById('clinicSelect').value;
    const startNum = parseInt(document.getElementById('startNumber').value);
    const endNum = parseInt(document.getElementById('endNumber').value);
    
    if (!clinicId || !startNum || !endNum) {
        alert('يرجى اختيار العيادة وتحديد نطاق الأرقام');
        return;
    }
    
    // Log print action
    const printData = {
        clinic: clinicId,
        startNumber: startNum,
        endNumber: endNum,
        printedBy: 'admin', // In a real system, this would be the current user
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref('printHistory').push(printData)
        .then(() => {
            // Trigger print
            window.print();
        })
        .catch((error) => {
            console.error('Error logging print:', error);
            // Still print even if logging fails
            window.print();
        });
}

// Close preview
function closePreview() {
    document.getElementById('previewSection').classList.add('hidden');
}

// Update clinic info when selection changes
document.getElementById('clinicSelect').addEventListener('change', (e) => {
    currentClinic = e.target.value;
    
    if (currentClinic) {
        // Get clinic current number to suggest ticket range
        database.ref(`clinics/${currentClinic}`).once('value', (snapshot) => {
            const clinicData = snapshot.val();
            if (clinicData && clinicData.currentNumber) {
                const nextNumber = clinicData.currentNumber + 1;
                document.getElementById('startNumber').value = nextNumber;
                document.getElementById('endNumber').value = nextNumber + 19; // Default 20 tickets
            }
        });
    }
});

// Handle beforeunload to warn about unsaved data
window.addEventListener('beforeunload', (e) => {
    const previewVisible = !document.getElementById('previewSection').classList.contains('hidden');
    if (previewVisible) {
        e.preventDefault();
        e.returnValue = 'لديك معاينة غير محفوظة. هل ترغب في المغادرة؟';
    }
});

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.database = firebase.database();
}