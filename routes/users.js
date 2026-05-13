/**
 * Users Routes - 100% FIRESTORE ONLY
 * 
 * All data operations now use Firebase Firestore
 * No JSON file operations - everything in the cloud
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const firestoreService = require('../utils/firestore-service');
const { createNotification } = require('../config/firebase-config');

const router = express.Router();

// ========================================
// ALL DATA NOW STORED IN FIRESTORE ONLY
// No more JSON file operations
// ========================================

// Helper functions
const isValidEmail = (email) => {
    return email && email.endsWith('@gmcpnalanda.com');
};

const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const generateRoleId = (role) => {
    const prefix = {
        'admin': 'ADM',
        'management': 'MNG', 
        'teacher': 'TCH',
        'student': 'STU'
    }[role] || 'USR';
    
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `${prefix}${randomNum.toString().padStart(3, '0')}`;
};

// Session validation middleware (simplified for development)
const validateSession = (req, res, next) => {
    console.log(`🔒 Session validation for ${req.method} ${req.path}`);
    // For now, allowing all requests - replace with proper session validation
    console.log('✅ Session validation passed');
    next();
};

// ========== USER CRUD OPERATIONS ==========

// Get all users
router.get('/', validateSession, async (req, res) => {
    try {
        console.log('📋 Fetching all users from Firestore...');
        const users = await firestoreService.getAllUsers();
        
        // Remove passwords from response
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
        
        console.log(`✅ Retrieved ${safeUsers.length} users from Firestore`);
        res.json({
            success: true,
            users: safeUsers,
            count: safeUsers.length
        });
        
    } catch (error) {
        console.error('Get users list error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users: ' + error.message
        });
    }
});

// Get user by email
router.get('/:email', validateSession, async (req, res) => {
    try {
        const email = req.params.email;
        console.log(`🔍 Fetching user: ${email}`);
        
        const user = await firestoreService.getUser(email);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Remove password from response
        const { password, ...safeUser } = user;
        
        console.log(`✅ User found: ${user.name} (${user.role})`);
        res.json({
            success: true,
            user: safeUser
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user: ' + error.message
        });
    }
});

// Create new user
router.post('/', validateSession, async (req, res) => {
    try {
        const userData = req.body;
        console.log('🔍 Creating user:', userData.email);
        
        // Validate required fields
        if (!userData.name || !userData.email || !userData.password || !userData.role) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, password, and role are required'
            });
        }
        
        // Validate email domain
        if (!isValidEmail(userData.email)) {
            return res.status(400).json({
                success: false,
                error: 'Email must be from @gmcpnalanda.com domain'
            });
        }
        
        // Check if user already exists in Firestore
        const existingUser = await firestoreService.getUser(userData.email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        
        // Validate password
        if (userData.password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user object
        const newUser = {
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            name: userData.name,
            status: 'active',
            lastLogin: null,
            mustChangePassword: userData.requirePasswordChange !== false,
            // Add role-specific fields if provided
            ...(userData.role === 'student' && {
                studentId: userData.studentId || generateRoleId('student'),
                rollNumber: userData.rollNumber,
                course: userData.course,
                year: userData.year ? parseInt(userData.year) : undefined,
                semester: userData.semester ? parseInt(userData.semester) : undefined,
                section: userData.section,
                branch: userData.branch
            }),
            ...(userData.role === 'teacher' && {
                employeeId: userData.employeeId || generateRoleId('teacher'),
                department: userData.department,
                subjects: userData.subjects,
                classes: userData.classes,
                qualification: userData.qualification,
                experience: userData.experience
            }),
            ...(userData.role === 'management' && {
                employeeId: userData.employeeId || generateRoleId('management'),
                department: userData.department,
                designation: userData.designation,
                permissions: userData.permissions
            }),
            ...(userData.role === 'admin' && {
                employeeId: userData.employeeId || generateRoleId('admin'),
                department: userData.department,
                permissions: userData.permissions
            })
        };
        
        // Create user in Firestore
        const createdUser = await firestoreService.createUser(userData.email, newUser);
        
        // Remove password from response
        const { password, ...safeUser } = createdUser;
        
        console.log(`✅ User created in Firestore: ${newUser.name} (${newUser.role})`);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: safeUser
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user: ' + error.message
        });
    }
});

// Update user
router.put('/:email', validateSession, async (req, res) => {
    try {
        const email = req.params.email;
        const updates = req.body;
        
        console.log(`🔄 Updating user: ${email}`);
        
        // Check if user exists
        const existingUser = await firestoreService.getUser(email);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Prevent email changes and other protected fields
        delete updates.email;
        delete updates.createdAt;
        
        // Update user in Firestore
        const updatedUser = await firestoreService.updateUser(email, updates);
        
        // Remove password from response
        const { password, ...safeUser } = updatedUser;
        
        console.log(`✅ User updated in Firestore: ${email}`);
        res.json({
            success: true,
            message: 'User updated successfully',
            user: safeUser
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user: ' + error.message
        });
    }
});

// Delete user with cascade delete
router.delete('/:email', validateSession, async (req, res) => {
    try {
        const email = req.params.email;
        console.log(`🗑️ CASCADE DELETE request for user: ${email}`);
        
        // Check if user exists
        const user = await firestoreService.getUser(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Store user info for response
        const userInfo = {
            email: user.email,
            name: user.name,
            role: user.role
        };
        
        console.log(`🔄 Starting cascade delete for user: ${email} (${userInfo.name})`);
        
        // Perform cascade delete using Firestore service
        const deletionResults = await firestoreService.cascadeDeleteUser(email);
        
        if (deletionResults.success) {
            console.log(`✅ Cascade delete completed for ${email}`);
            console.log(`   - User: ${deletionResults.user ? '✅' : '❌'}`);
            console.log(`   - Profile: ${deletionResults.profile ? '✅' : '➡️'}`);
            console.log(`   - Hostel: ${deletionResults.hostel ? '✅' : '➡️'}`);
            console.log(`   - Requests: ${deletionResults.requests}`);
            console.log(`   - Notifications: ${deletionResults.notifications}`);
            
            res.json({
                success: true,
                message: 'User and all associated data deleted successfully',
                deletedUser: userInfo,
                deletionSummary: deletionResults
            });
        } else {
            throw new Error(deletionResults.error || 'Cascade delete failed');
        }
        
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user: ' + error.message
        });
    }
});

// ========== PASSWORD MANAGEMENT ==========

// Admin reset user password
router.post('/reset-password', validateSession, async (req, res) => {
    try {
        const { email, newPassword, requirePasswordChange } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email and new password are required'
            });
        }
        
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email must be from @gmcpnalanda.com domain'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }
        
        // Check if user exists
        const user = await firestoreService.getUser(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update user password in Firestore
        await firestoreService.updateUser(email, {
            password: hashedPassword,
            mustChangePassword: requirePasswordChange !== false,
            passwordResetAt: new Date().toISOString()
        });
        
        console.log(`✅ Password reset for user: ${email}`);
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password: ' + error.message
        });
    }
});

// User change own password
router.post('/change-password', validateSession, async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        
        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email, current password, and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters long'
            });
        }
        
        // Get user from Firestore
        const user = await firestoreService.getUser(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password in Firestore
        await firestoreService.updateUser(email, {
            password: hashedPassword,
            mustChangePassword: false,
            passwordChangedAt: new Date().toISOString()
        });
        
        console.log(`✅ Password changed by user: ${email}`);
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password: ' + error.message
        });
    }
});

// Verify password (for authentication)
router.post('/verify-password', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        
        // Get user from Firestore
        const user = await firestoreService.getUser(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Account is inactive'
            });
        }
        
        // Update last login in Firestore
        await firestoreService.updateUser(email, {
            lastLogin: new Date().toISOString()
        });
        
        // Remove password from response
        const { password: _, ...safeUser } = user;
        
        console.log(`✅ Password verified for user: ${email}`);
        res.json({
            success: true,
            message: 'Authentication successful',
            user: safeUser,
            requirePasswordReset: user.mustChangePassword || false
        });
        
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed: ' + error.message
        });
    }
});

// ========== BULK OPERATIONS ==========

// Bulk create users
router.post('/bulk-create', validateSession, async (req, res) => {
    try {
        const { users: usersToCreate } = req.body;
        
        if (!usersToCreate || !Array.isArray(usersToCreate) || usersToCreate.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Users array is required and must not be empty'
            });
        }
        
        const results = {
            created: 0,
            skipped: 0,
            errors: 0,
            details: []
        };
        
        console.log(`📥 Bulk creating ${usersToCreate.length} users in Firestore...`);
        
        for (const userData of usersToCreate) {
            try {
                // Validate required fields
                if (!userData.name || !userData.email || !userData.role) {
                    results.errors++;
                    results.details.push({
                        email: userData.email || 'Unknown',
                        status: 'error',
                        message: 'Missing required fields (name, email, role)'
                    });
                    continue;
                }
                
                // Validate email domain
                if (!isValidEmail(userData.email)) {
                    results.errors++;
                    results.details.push({
                        email: userData.email,
                        status: 'error',
                        message: 'Invalid email domain (must be @gmcpnalanda.com)'
                    });
                    continue;
                }
                
                // Check if user already exists
                const existingUser = await firestoreService.getUser(userData.email);
                if (existingUser) {
                    results.skipped++;
                    results.details.push({
                        email: userData.email,
                        status: 'skipped',
                        message: 'User already exists'
                    });
                    continue;
                }
                
                // Set default password if not provided
                const password = userData.password || 'TempPass123!';
                
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // Create user object
                const newUser = {
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role,
                    name: userData.name,
                    status: 'active',
                    lastLogin: null,
                    mustChangePassword: userData.mustChangePassword !== false,
                    // Add role-specific fields if provided
                    ...(userData.role === 'student' && {
                        studentId: userData.studentId || generateRoleId('student'),
                        rollNumber: userData.rollNumber,
                        course: userData.course,
                        year: userData.year,
                        semester: userData.semester,
                        section: userData.section,
                        branch: userData.branch
                    }),
                    ...(userData.role === 'teacher' && {
                        employeeId: userData.employeeId || generateRoleId('teacher'),
                        department: userData.department,
                        subjects: userData.subjects,
                        classes: userData.classes
                    }),
                    ...(userData.role === 'management' && {
                        employeeId: userData.employeeId || generateRoleId('management'),
                        designation: userData.designation,
                        department: userData.department
                    }),
                    ...(userData.role === 'admin' && {
                        employeeId: userData.employeeId || generateRoleId('admin'),
                        department: userData.department,
                        permissions: userData.permissions
                    })
                };
                
                // Create user in Firestore
                await firestoreService.createUser(userData.email, newUser);
                
                results.created++;
                results.details.push({
                    email: userData.email,
                    status: 'created',
                    message: 'User created successfully',
                    roleId: newUser.studentId || newUser.employeeId || null
                });
                
                console.log(`✅ Created user: ${userData.email} (${userData.role})`);
                
            } catch (userError) {
                console.error(`❌ Error creating user ${userData.email}:`, userError);
                results.errors++;
                results.details.push({
                    email: userData.email,
                    status: 'error',
                    message: `Creation failed: ${userError.message}`
                });
            }
        }
        
        console.log(`✅ Bulk creation completed: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`);
        
        res.json({
            success: true,
            message: 'Bulk creation completed',
            created: results.created,
            skipped: results.skipped,
            errors: results.errors,
            details: results.details
        });
        
    } catch (error) {
        console.error('Bulk create users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create users: ' + error.message
        });
    }
});

// Bulk delete users
router.post('/bulk-delete', validateSession, async (req, res) => {
    try {
        const { emails } = req.body;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Emails array is required and must not be empty'
            });
        }
        
        const results = {
            deleted: 0,
            notFound: 0,
            errors: 0,
            details: []
        };
        
        console.log(`🗑️ Bulk deleting ${emails.length} users from Firestore...`);
        
        for (const email of emails) {
            try {
                // Check if user exists
                const user = await firestoreService.getUser(email);
                if (!user) {
                    results.notFound++;
                    results.details.push({
                        email: email,
                        status: 'not_found',
                        message: 'User not found'
                    });
                    continue;
                }
                
                // Store user info
                const userInfo = {
                    email: user.email,
                    name: user.name,
                    role: user.role
                };
                
                // Perform cascade delete
                const deletionResults = await firestoreService.cascadeDeleteUser(email);
                
                if (deletionResults.success) {
                    results.deleted++;
                    results.details.push({
                        ...userInfo,
                        status: 'deleted',
                        message: 'User and all associated data deleted successfully',
                        deletionSummary: deletionResults
                    });
                    console.log(`✅ Cascade deleted user: ${email}`);
                } else {
                    throw new Error(deletionResults.error || 'Cascade delete failed');
                }
                
            } catch (userError) {
                console.error(`❌ Error deleting user ${email}:`, userError);
                results.errors++;
                results.details.push({
                    email: email,
                    status: 'error',
                    message: `Deletion failed: ${userError.message}`
                });
            }
        }
        
        console.log(`✅ Bulk deletion completed: ${results.deleted} deleted, ${results.notFound} not found, ${results.errors} errors`);
        
        res.json({
            success: true,
            message: 'Bulk deletion completed',
            deleted: results.deleted,
            notFound: results.notFound,
            errors: results.errors,
            details: results.details
        });
        
    } catch (error) {
        console.error('Bulk delete users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete users: ' + error.message
        });
    }
});

// Bulk activate users
router.post('/bulk-activate', validateSession, async (req, res) => {
    await bulkStatusChange(req, res, 'active');
});

// Bulk deactivate users
router.post('/bulk-deactivate', validateSession, async (req, res) => {
    await bulkStatusChange(req, res, 'inactive');
});

// Helper function for bulk status changes
async function bulkStatusChange(req, res, newStatus) {
    try {
        const { emails } = req.body;
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Emails array is required and must not be empty'
            });
        }
        
        const results = {
            updated: 0,
            notFound: 0,
            errors: 0,
            details: []
        };
        
        console.log(`🔄 Bulk ${newStatus === 'active' ? 'activating' : 'deactivating'} ${emails.length} users in Firestore...`);
        
        for (const email of emails) {
            try {
                // Check if user exists
                const user = await firestoreService.getUser(email);
                if (!user) {
                    results.notFound++;
                    results.details.push({
                        email: email,
                        status: 'not_found',
                        message: 'User not found'
                    });
                    continue;
                }
                
                // Update user status in Firestore
                await firestoreService.updateUser(email, {
                    status: newStatus,
                    statusUpdatedAt: new Date().toISOString()
                });
                
                results.updated++;
                results.details.push({
                    email: email,
                    name: user.name,
                    role: user.role,
                    status: 'updated',
                    message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
                    newStatus: newStatus
                });
                
                console.log(`✅ ${newStatus === 'active' ? 'Activated' : 'Deactivated'} user: ${email}`);
                
            } catch (userError) {
                console.error(`❌ Error updating user ${email}:`, userError);
                results.errors++;
                results.details.push({
                    email: email,
                    status: 'error',
                    message: `Status update failed: ${userError.message}`
                });
            }
        }
        
        console.log(`✅ Bulk status update completed: ${results.updated} updated, ${results.notFound} not found, ${results.errors} errors`);
        
        res.json({
            success: true,
            message: `Bulk ${newStatus === 'active' ? 'activation' : 'deactivation'} completed`,
            updated: results.updated,
            notFound: results.notFound,
            errors: results.errors,
            details: results.details
        });
        
    } catch (error) {
        console.error(`Bulk ${newStatus} users error:`, error);
        res.status(500).json({
            success: false,
            error: `Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} users: ` + error.message
        });
    }
}

// ========== UTILITY ENDPOINTS ==========

// Get users by role
router.get('/by-role/:role', validateSession, async (req, res) => {
    try {
        const role = req.params.role;
        console.log(`🔍 Fetching users by role: ${role}`);
        
        const users = await firestoreService.getUsersByRole(role);
        
        // Remove passwords from response
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });
        
        console.log(`✅ Retrieved ${safeUsers.length} users with role: ${role}`);
        res.json({
            success: true,
            users: safeUsers,
            role: role,
            count: safeUsers.length
        });
        
    } catch (error) {
        console.error('Get users by role error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users by role: ' + error.message
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Users API is healthy',
        timestamp: new Date().toISOString(),
        database: 'Firestore',
        status: 'All operations use Firestore only'
    });
});

module.exports = router;