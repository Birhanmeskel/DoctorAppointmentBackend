import jwt from "jsonwebtoken";

// manager authentication middleware
const authManager = async (req, res, next) => {
    try {
        // Check for token in different formats/cases
        const mtoken = req.headers.mtoken || req.headers.mToken || req.headers.MTOKEN ||
                      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
                       ? req.headers.authorization.split(' ')[1] : null);

        console.log("Manager Auth - Headers received:", req.headers);
        console.log("Manager Auth - Token extracted:", mtoken);

        if (!mtoken) {
            console.log("Manager Auth - No token provided");
            return res.json({ success: false, message: 'Not Authorized: No token provided. Please login again.' });
        }

        try {
            const token_decode = jwt.verify(mtoken, process.env.JWT_SECRET);
            console.log("Manager Auth - Token decoded:", token_decode);

            // Check if token has role property
            if (typeof token_decode !== 'object') {
                console.log("Manager Auth - Token payload is not an object:", token_decode);
                return res.json({ success: false, message: 'Not Authorized: Invalid token format. Please login again.' });
            }

            // Check if role is manager
            if (token_decode.role !== 'manager') {
                console.log("Manager Auth - Invalid role in token:", token_decode.role);
                return res.json({ success: false, message: 'Not Authorized: You do not have manager privileges.' });
            }

            // Valid manager token
            console.log("Manager Auth - Valid manager token");

            // Extract manager ID from token and add to request body
            if (token_decode.id) {
                req.body.managerId = token_decode.id;
                console.log("Manager Auth - Added managerId to request:", token_decode.id);
            } else if (token_decode.isLegacyManager) {
                console.log("Manager Auth - Legacy manager token detected");
                // For legacy manager tokens that don't have an ID
                req.body.isLegacyManager = true;
            }

            next();
        } catch (jwtError) {
            console.log("Manager Auth - JWT verification error:", jwtError);
            return res.json({ success: false, message: 'Invalid token: ' + jwtError.message + '. Please login again.' });
        }
    } catch (error) {
        console.log("Manager Auth - Unexpected error:", error);
        res.json({ success: false, message: error.message });
    }
}

export default authManager;
