import jwt from 'jsonwebtoken';

// user authentication middleware
const authUser = async (req, res, next) => {
    console.log("Auth middleware headers:", req.headers);

    // Check for token in different formats
    const token = req.headers.token ||
                 (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
                  ? req.headers.authorization.split(' ')[1]
                  : null);

    if (!token) {
        console.log("No token provided in request");
        return res.json({ success: false, message: 'Not Authorized: No token provided. Please login again.' });
    }

    console.log("Token found, attempting to verify");

    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token decoded successfully:", token_decode);

        req.body.userId = token_decode.id;
        console.log("User ID set in request body:", req.body.userId);

        // Check user role if specified
        if (token_decode.role) {
            req.body.userRole = token_decode.role;
            console.log("User role set in request body:", req.body.userRole);

            // If role-specific access is required
            if (req.roleRequired && req.roleRequired !== token_decode.role) {
                console.log("Role mismatch:", {
                    required: req.roleRequired,
                    provided: token_decode.role
                });
                return res.json({
                    success: false,
                    message: 'You do not have permission to access this resource'
                });
            }
        }

        next();
    } catch (error) {
        console.log("Token verification error:", error);
        res.json({
            success: false,
            message: `Authentication error: ${error.message}. Please login again.`
        });
    }
}

// Role-based middleware functions
export const authManager = (req, res, next) => {
    req.roleRequired = 'manager'
    authUser(req, res, next)
}

export const authDoctor = (req, res, next) => {
    req.roleRequired = 'doctor'
    authUser(req, res, next)
}

export default authUser