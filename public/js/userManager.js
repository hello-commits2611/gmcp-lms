// Production User Database Management System for GMCP LMS
class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.initializeDefaultAdmin();
    }

    // Load users from localStorage with fallback to API
    loadUsers() {
        const stored = localStorage.getItem('gmcp_lms_users');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error loading users:', e);
            }
        }
        
        // If no local storage, return default users that match backend
        const defaultUsers = {
            'admin@gmcpnalanda.com': {
                id: 'admin001',
                email: 'admin@gmcpnalanda.com',
                password: 'AdminGMCP@2025',
                role: 'admin',
                name: 'System Administrator',
                employeeId: 'ADM001',
                department: 'Administration',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                permissions: ['all']
            },
            'uttchrist@gmcpnalanda.com': {
                id: 'admin002',
                email: 'uttchrist@gmcpnalanda.com',
                password: 'UttChrist@2025',
                role: 'admin',
                name: 'Kumar Uttchrist',
                employeeId: 'ADM002',
                department: 'Administration',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                permissions: ['all']
            }
        };
        
        // Save to localStorage and return
        this.users = defaultUsers;
        this.saveUsers();
        return defaultUsers;
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('gmcp_lms_users', JSON.stringify(this.users));
        
        // Also try to sync with backend API (fire and forget)
        this.syncWithBackend();
    }
    
    // Sync with backend API
    async syncWithBackend() {
        try {
            // This is a simple sync - in production you'd want better conflict resolution
            console.log('Syncing user data with backend...');
            
            // For now, just store in localStorage - the backend will read from file system
            // In a real app, you'd call the backend API here
        } catch (error) {
            console.error('Backend sync failed:', error);
        }
    }

    // Initialize default admin user
    initializeDefaultAdmin() {
        if (!this.users['admin@gmcpnalanda.com']) {
            this.users['admin@gmcpnalanda.com'] = {
                email: 'admin@gmcpnalanda.com',
                password: 'AdminGMCP@2025', // In production, this should be hashed
                role: 'admin',
                name: 'System Administrator',
                employeeId: 'ADM001',
                department: 'Administration',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                permissions: ['all'],
                mustChangePassword: false
            };
            this.saveUsers();
        }
    }

    // Initialize example users for testing
    initializeExampleUsers() {
        const exampleUsers = [
            {
                name: 'John Student',
                email: 'john.student@gmcpnalanda.com',
                password: 'Student@123',
                role: 'student',
                branch: 'CSE',
                year: '2',
                semester: '4',
                rollNumber: 'CSE2024001',
                course: 'BCA'
            },
            {
                name: 'Prof. Jane Teacher',
                email: 'jane.teacher@gmcpnalanda.com',
                password: 'Teacher@123',
                role: 'teacher',
                department: 'Computer Science',
                subjects: ['Data Structures', 'Algorithms', 'Database Management']
            },
            {
                name: 'Dr. Principal Manager',
                email: 'principal@gmcpnalanda.com',
                password: 'Manager@123',
                role: 'management',
                department: 'Academic Affairs',
                designation: 'Principal'
            }
        ];

        exampleUsers.forEach(userData => {
            if (!this.users[userData.email]) {
                const result = this.createUser(userData);
                if (result.success) {
                    console.log(`Created example user: ${userData.name} (${userData.role})`);
                }
            }
        });
    }

    // Validate email domain
    isValidEmail(email) {
        return email && email.endsWith('@gmcpnalanda.com');
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Generate employee/student ID based on role
    generateRoleId(role) {
        const prefix = {
            'admin': 'ADM',
            'management': 'MNG',
            'teacher': 'TCH',
            'student': 'STU'
        }[role] || 'USR';

        const existing = Object.values(this.users)
            .filter(u => u.role === role && u.employeeId?.startsWith(prefix))
            .map(u => parseInt(u.employeeId.replace(prefix, '')))
            .filter(n => !isNaN(n));

        const nextNumber = existing.length > 0 ? Math.max(...existing) + 1 : 1;
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    }

    // Create new user
    createUser(userData) {
        try {
            // Validate required fields
            if (!userData.name || !userData.email || !userData.password || !userData.role) {
                throw new Error('Name, email, password, and role are required');
            }

            // Validate email domain
            if (!this.isValidEmail(userData.email)) {
                throw new Error('Email must be from @gmcpnalanda.com domain');
            }

            // Check if user already exists
            if (this.users[userData.email]) {
                throw new Error('User with this email already exists');
            }

            // Validate password
            if (userData.password.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }

            // Create user object
            const newUser = {
                id: this.generateId(),
                email: userData.email,
                password: userData.password, // In production, hash this
                role: userData.role,
                name: userData.name,
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                mustChangePassword: true
            };

            // Add role-specific fields
            if (userData.role === 'student') {
                newUser.studentId = userData.studentId || this.generateRoleId('student');
                newUser.rollNumber = userData.rollNumber || '';
                newUser.course = userData.course || '';
                newUser.year = parseInt(userData.year) || 1;
                newUser.semester = parseInt(userData.semester) || 1;
                newUser.section = userData.section || 'A';
                newUser.branch = userData.branch || userData.course;
                newUser.admissionYear = new Date().getFullYear();
            } else if (userData.role === 'teacher') {
                newUser.employeeId = userData.employeeId || this.generateRoleId('teacher');
                newUser.department = userData.department || 'Computer Science';
                newUser.subjects = userData.subjects || [];
                newUser.classes = userData.classes || [];
                newUser.qualification = userData.qualification || '';
                newUser.experience = userData.experience || '';
            } else if (userData.role === 'management') {
                newUser.employeeId = userData.employeeId || this.generateRoleId('management');
                newUser.department = userData.department || 'Management';
                newUser.designation = userData.designation || 'Manager';
                newUser.permissions = userData.permissions || ['view_all', 'reports'];
            } else if (userData.role === 'admin') {
                newUser.employeeId = userData.employeeId || this.generateRoleId('admin');
                newUser.department = userData.department || 'Administration';
                newUser.permissions = userData.permissions || ['all'];
            }

            // Save user
            this.users[userData.email] = newUser;
            this.saveUsers();

            return { success: true, user: newUser };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Authenticate user
    async authenticate(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Only @gmcpnalanda.com email addresses are allowed');
            }

            const user = this.users[email];
            if (!user) {
                throw new Error('No account found with this email address');
            }

            if (user.password !== password) {
                throw new Error('Incorrect password');
            }

            if (user.status !== 'active') {
                throw new Error('Your account is inactive. Please contact administrator');
            }

            // Update last login
            user.lastLogin = new Date().toISOString();
            this.saveUsers();

            // Create session data (remove password)
            const sessionData = { ...user };
            delete sessionData.password;

            return {
                success: true,
                user: sessionData,
                redirectUrl: this.getPortalUrl(user.role)
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get portal URL based on role
    getPortalUrl(role) {
        const portals = {
            'admin': 'admin-portal.html',
            'management': 'management-portal.html',
            'teacher': 'faculty-portal.html',
            'student': 'student-portal.html'
        };
        return portals[role] || 'login.html';
    }

    // Get all users (admin function)
    getAllUsers() {
        return Object.values(this.users).map(user => {
            const userData = { ...user };
            delete userData.password; // Don't expose passwords
            return userData;
        });
    }

    // Update user
    async updateUser(email, updates) {
        try {
            if (!this.users[email]) {
                throw new Error('User not found');
            }

            // Prevent email changes
            delete updates.email;
            delete updates.id;

            // Update user data
            Object.assign(this.users[email], updates);
            this.saveUsers();

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Delete user
    deleteUser(email) {
        try {
            if (!this.users[email]) {
                throw new Error('User not found');
            }

            // Prevent deletion of default admin
            if (email === 'admin@gmcpnalanda.com') {
                throw new Error('Cannot delete the default administrator account');
            }

            delete this.users[email];
            this.saveUsers();

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Change password
    async changePassword(email, newPassword) {
        try {
            if (!this.users[email]) {
                throw new Error('User not found');
            }

            if (newPassword.length < 8) {
                throw new Error('Password must be at least 8 characters long');
            }

            this.users[email].password = newPassword; // In production, hash this
            this.users[email].mustChangePassword = false;
            this.saveUsers();

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Toggle user status
    async toggleUserStatus(email) {
        try {
            if (!this.users[email]) {
                throw new Error('User not found');
            }

            // Prevent deactivation of default admin
            if (email === 'admin@gmcpnalanda.com') {
                throw new Error('Cannot deactivate the default administrator account');
            }

            this.users[email].status = this.users[email].status === 'active' ? 'inactive' : 'active';
            this.saveUsers();

            return { success: true, status: this.users[email].status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get user by email
    getUser(email) {
        const user = this.users[email];
        if (user) {
            const userData = { ...user };
            delete userData.password;
            return userData;
        }
        return null;
    }

    // Get users by role
    getUsersByRole(role) {
        return Object.values(this.users)
            .filter(user => user.role === role)
            .map(user => {
                const userData = { ...user };
                delete userData.password;
                return userData;
            });
    }

    // Get statistics
    getStatistics() {
        const users = Object.values(this.users);
        return {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            byRole: {
                admin: users.filter(u => u.role === 'admin').length,
                management: users.filter(u => u.role === 'management').length,
                teacher: users.filter(u => u.role === 'teacher').length,
                student: users.filter(u => u.role === 'student').length
            },
            recentLogins: users.filter(u => {
                if (!u.lastLogin) return false;
                const loginDate = new Date(u.lastLogin);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return loginDate > weekAgo;
            }).length
        };
    }

    // Bulk operations
    bulkOperation(emails, operation) {
        const results = [];
        for (const email of emails) {
            try {
                let result;
                switch (operation) {
                    case 'delete':
                        result = this.deleteUser(email);
                        break;
                    case 'activate':
                        if (this.users[email]) {
                            this.users[email].status = 'active';
                            result = { success: true };
                        }
                        break;
                    case 'deactivate':
                        if (this.users[email] && email !== 'admin@gmcpnalanda.com') {
                            this.users[email].status = 'inactive';
                            result = { success: true };
                        }
                        break;
                    default:
                        result = { success: false, error: 'Unknown operation' };
                }
                results.push({ email, ...result });
            } catch (error) {
                results.push({ email, success: false, error: error.message });
            }
        }
        this.saveUsers();
        return results;
    }

    // Export users (for backup)
    exportUsers() {
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            users: this.getAllUsers()
        };
        return JSON.stringify(exportData, null, 2);
    }

    // Import users (for restore)
    async importUsers(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (!data.users || !Array.isArray(data.users)) {
                throw new Error('Invalid import format');
            }

            // Validate and import users
            for (const userData of data.users) {
                if (userData.email && this.isValidEmail(userData.email)) {
                    this.users[userData.email] = userData;
                }
            }

            this.saveUsers();
            return { success: true, imported: data.users.length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Initialize user manager
const userManager = new UserManager();

// Export for global use
window.userManager = userManager;
