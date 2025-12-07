const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        let token = null;

        // 1. Try Authorization header (Bearer token)
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        // 2. Try Cookie if header not found
        if (!token && req.headers.cookie) {
            const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
            }, {});
            if (cookies.token) {
                token = cookies.token;
            }
        }

        if (!token) {
            // If endpoint is optional auth, you might skip this, but here we enforce it
            // or we just set req.user = null and let controller decide.
            // But for safety, strict middleware usually returns 401.
            // Given controller checks !req.user, we can just next() with null user?
            // No, let's allow "Guest" requests if token is missing? 
            // The controller specifically sends 401 if (!req.user).
            // So ensuring req.user is set only if valid token exists.
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, ... }
        next();
    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        req.user = null; // Invalid token -> no user
        next();
    }
};
