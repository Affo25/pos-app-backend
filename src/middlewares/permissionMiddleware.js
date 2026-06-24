exports.hasPermission = (component, action) => {
    return (req, res, next) => {
        const user = req.user;

        if (user.user_type === "admin" || user.user_type === "superAdmin") {
            return next();
        }

        const perm = user?.permissions?.find(
            (p) => p.component?.toLowerCase() === component?.toLowerCase()
        );

        if (!perm || perm[action] !== true) {
            return res.status(403).json({
                message: `You don't have ${action} permission on ${component}`,
            });
        }

        next();
    };
};
