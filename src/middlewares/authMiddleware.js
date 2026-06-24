const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Main protect middleware with subscription and license check
exports.protect = async function (req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    if (token.split('.').length !== 3) {
        return res.status(401).json({ error: 'Malformed token' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check if user is blocked
        if (user.is_blocked) {
            return res.status(403).json({ 
                error: 'Account is blocked', 
                message: 'Your account has been blocked. Please contact support.',
                code: 'ACCOUNT_BLOCKED'
            });
        }

        // Check if license is active
        if (user.license_status === 'blocked') {
            return res.status(403).json({ 
                error: 'License blocked', 
                message: 'Your license has been blocked. Please contact support.',
                code: 'LICENSE_BLOCKED'
            });
        }

        // Update subscription status if expired
        const currentDate = new Date();
        if (user.subscription_end && user.subscription_end < currentDate && user.subscription_status !== 'expired') {
            user.subscription_status = 'expired';
            await user.save();
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('❌ Token error:', err);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check if user has active subscription (for billing/product APIs)
exports.checkActiveSubscription = async function (req, res, next) {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'User not authenticated',
                code: 'UNAUTHORIZED'
            });
        }

        // Check if subscription is active
        const currentDate = new Date();
        let isSubscriptionActive = false;
        
        if (user.plan === 'free') {
            // Free plan users have limited access
            isSubscriptionActive = true;
            
            // Optional: Add limits for free plan users
            req.userPlan = {
                type: 'free',
                limits: {
                    maxProducts: 10,
                    maxInvoices: 5,
                    maxCustomers: 20
                }
            };
        } 
        else if (user.plan === 'premium') {
            // Check subscription status for premium users
            if (user.subscription_status === 'active') {
                // Check if subscription end date is valid
                if (user.subscription_end && user.subscription_end > currentDate) {
                    isSubscriptionActive = true;
                    req.userPlan = {
                        type: 'premium',
                        expiryDate: user.subscription_end,
                        limits: {
                            maxProducts: 'unlimited',
                            maxInvoices: 'unlimited',
                            maxCustomers: 'unlimited'
                        }
                    };
                } else if (!user.subscription_end) {
                    // If no end date specified, assume active
                    isSubscriptionActive = true;
                    req.userPlan = {
                        type: 'premium',
                        limits: {
                            maxProducts: 'unlimited',
                            maxInvoices: 'unlimited',
                            maxCustomers: 'unlimited'
                        }
                    };
                } else {
                    // Subscription expired
                    isSubscriptionActive = false;
                }
            } else {
                isSubscriptionActive = false;
            }
        }

        if (!isSubscriptionActive) {
            return res.status(403).json({ 
                error: 'Subscription expired', 
                message: 'Your subscription has expired. Please renew to continue using our services.',
                code: 'SUBSCRIPTION_EXPIRED',
                subscription_status: user.subscription_status,
                subscription_end: user.subscription_end
            });
        }

        next();
    } catch (err) {
        console.error('❌ Subscription check error:', err);
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Error checking subscription status',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware to check if user has valid license
exports.checkValidLicense = async function (req, res, next) {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'User not authenticated',
                code: 'UNAUTHORIZED'
            });
        }

        // Check license status
        if (user.license_status !== 'active') {
            return res.status(403).json({ 
                error: 'Invalid license', 
                message: 'Your license is not active. Please contact support.',
                code: 'LICENSE_INACTIVE',
                license_status: user.license_status
            });
        }

        // Check if license key exists
        if (!user.license_key) {
            return res.status(403).json({ 
                error: 'No license', 
                message: 'No license key found. Please contact support.',
                code: 'NO_LICENSE'
            });
        }

        next();
    } catch (err) {
        console.error('❌ License check error:', err);
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Error checking license status',
            code: 'SERVER_ERROR'
        });
    }
};

// Combined middleware for subscription and license check
exports.checkSubscriptionAndLicense = async function (req, res, next) {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'User not authenticated',
                code: 'UNAUTHORIZED'
            });
        }

        // Check license first
        if (user.license_status !== 'active') {
            return res.status(403).json({ 
                error: 'Invalid license', 
                message: 'Your license is not active. Please contact support.',
                code: 'LICENSE_INACTIVE'
            });
        }

        // Check subscription for premium users
        if (user.plan === 'premium') {
            const currentDate = new Date();
            let isSubscriptionActive = false;
            
            if (user.subscription_status === 'active') {
                if (user.subscription_end && user.subscription_end > currentDate) {
                    isSubscriptionActive = true;
                } else if (!user.subscription_end) {
                    isSubscriptionActive = true;
                } else {
                    // Update subscription status to expired
                    user.subscription_status = 'expired';
                    await user.save();
                }
            }

            if (!isSubscriptionActive) {
                return res.status(403).json({ 
                    error: 'Subscription expired', 
                    message: 'Your premium subscription has expired. Please renew to continue.',
                    code: 'SUBSCRIPTION_EXPIRED',
                    subscription_end: user.subscription_end
                });
            }
        }

        next();
    } catch (err) {
        console.error('❌ Subscription & License check error:', err);
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Error checking subscription and license',
            code: 'SERVER_ERROR'
        });
    }
};

// Middleware to check user role (admin/superAdmin)
exports.checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        if (!roles.includes(req.user.user_type)) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: `Access denied. Required roles: ${roles.join(', ')}`,
                code: 'ACCESS_DENIED'
            });
        }
        
        next();
    };
};

// Middleware to check if user has specific permission
exports.checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'No permissions found',
                code: 'NO_PERMISSIONS'
            });
        }

        const hasPermission = req.user.permissions.some(
            perm => perm.component === permission && perm[permission]
        );

        if (!hasPermission) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: `You don't have permission to ${permission}`,
                code: 'PERMISSION_DENIED'
            });
        }

        next();
    };
};

// Middleware to check if user has access to specific page/component
exports.checkPageAccess = (pageName) => {
    return (req, res, next) => {
        if (!req.user || !req.user.allowed_pages) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'No page access permissions',
                code: 'NO_PAGE_ACCESS'
            });
        }

        const hasAccess = req.user.allowed_pages.includes(pageName.toLowerCase());

        if (!hasAccess) {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: `Access denied to ${pageName} page`,
                code: 'PAGE_ACCESS_DENIED'
            });
        }

        next();
    };
};

// Middleware to check device limits
exports.checkDeviceLimit = async function (req, res, next) {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // This would require tracking active devices/sessions
        // For now, just pass through
        // You can implement device tracking logic here
        
        next();
    } catch (err) {
        console.error('❌ Device limit check error:', err);
        next();
    }
};