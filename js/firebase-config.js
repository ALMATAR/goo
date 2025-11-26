// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_zzKFzLqf0r_EbXkQSa2QUuyQHwEY2gA",
  authDomain: "kimi-eaea2.firebaseapp.com",
  projectId: "kimi-eaea2",
  storageBucket: "kimi-eaea2.firebasestorage.app",
  messagingSenderId: "686260860882",
  appId: "1:686260860882:web:f75df0cf1709a8890fba0b",
  measurementId: "G-PXHPHKE9YV"
};

// Initialize Firebase
let app, database, firestore, auth;

try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    firestore = firebase.firestore();
    auth = firebase.auth();
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Utility Functions
const firebaseUtils = {
    // Get current timestamp
    getTimestamp: () => firebase.database.ServerValue.TIMESTAMP,
    
    // Format Arabic numbers
    toArabicNumber: (num) => {
        const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().replace(/\d/g, (d) => arabicNumbers[d]);
    },
    
    // Convert to Arabic numerals
    convertToArabic: (num) => {
        const arabicNumerals = {
            '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
            '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
        };
        return num.toString().replace(/[0-9]/g, (d) => arabicNumerals[d]);
    },
    
    // Format time in Arabic
    formatTimeArabic: (timestamp) => {
        const date = new Date(timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'م' : 'ص';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        
        return `${firebaseUtils.toArabicNumber(displayHours)}:${firebaseUtils.toArabicNumber(minutes.toString().padStart(2, '0'))} ${period}`;
    },
    
    // Generate unique ID
    generateId: () => database.ref().push().key,
    
    // Error handling
    handleError: (error, context = '') => {
        console.error(`Firebase Error in ${context}:`, error);
        return {
            success: false,
            error: error.message || 'حدث خطأ في قاعدة البيانات',
            context: context
        };
    },
    
    // Success response
    handleSuccess: (data, message = '') => {
        return {
            success: true,
            data: data,
            message: message
        };
    }
};

// Database References
const dbRefs = {
    // Settings
    settings: database.ref('settings'),
    centerInfo: database.ref('settings/centerInfo'),
    displaySettings: database.ref('settings/display'),
    audioSettings: database.ref('settings/audio'),
    
    // Clinics
    clinics: database.ref('clinics'),
    clinic: (clinicId) => database.ref(`clinics/${clinicId}`),
    clinicQueue: (clinicId) => database.ref(`clinics/${clinicId}/queue`),
    clinicCurrent: (clinicId) => database.ref(`clinics/${clinicId}/currentNumber`),
    clinicStatus: (clinicId) => database.ref(`clinics/${clinicId}/status`),
    
    // Appointments
    appointments: database.ref('appointments'),
    appointmentRequests: database.ref('appointmentRequests'),
    
    // Doctors
    doctors: database.ref('doctors'),
    doctor: (doctorId) => database.ref(`doctors/${doctorId}`),
    attendance: database.ref('attendance'),
    doctorRequests: database.ref('doctorRequests'),
    
    // Clients
    clients: database.ref('clients'),
    complaints: database.ref('complaints'),
    
    // Notifications
    notifications: database.ref('notifications'),
    displayNotifications: database.ref('notifications/display'),
    controlNotifications: database.ref('notifications/control'),
    
    // Audio/Video
    audioFiles: database.ref('media/audio'),
    videoFiles: database.ref('media/video'),
    instantAudio: database.ref('media/instant'),
    
    // Emergency
    emergency: database.ref('emergency'),
    alerts: database.ref('alerts')
};

// Authentication Functions
const authUtils = {
    // Admin login
    adminLogin: async (password) => {
        try {
            // In a real implementation, you would use Firebase Auth
            // For demo purposes, we'll use a simple password check
            const snapshot = await database.ref('settings/adminPassword').once('value');
            const correctPassword = snapshot.val() || 'admin123';
            
            if (password === correctPassword) {
                localStorage.setItem('adminAuthenticated', 'true');
                return { success: true, message: 'تم تسجيل الدخول بنجاح' };
            } else {
                return { success: false, message: 'كلمة المرور غير صحيحة' };
            }
        } catch (error) {
            return firebaseUtils.handleError(error, 'adminLogin');
        }
    },
    
    // Check admin authentication
    isAdminAuthenticated: () => {
        return localStorage.getItem('adminAuthenticated') === 'true';
    },
    
    // Doctor login
    doctorLogin: async (email, password) => {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return firebaseUtils.handleError(error, 'doctorLogin');
        }
    },
    
    // Logout
    logout: () => {
        localStorage.removeItem('adminAuthenticated');
        auth.signOut();
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebase, database, firestore, auth, firebaseUtils, dbRefs, authUtils };
}
