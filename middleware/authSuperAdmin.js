import jwt from "jsonwebtoken";

// super admin authentication middleware
const authSuperAdmin = async (req, res, next) => {
    try {
        console.log("Auth headers:", req.headers);

        // Check for token in different header formats
        const admintoken = req.headers.admintoken || req.headers.authorization?.split(' ')[1];

        console.log("Admin token extracted:", admintoken);

        if (!admintoken) {
            console.log("No admin token found in headers");
            return res.json({ success: false, message: 'Not Authorized Login Again' });
        }

        try {
            const token_decode = jwt.verify(admintoken, process.env.JWT_SECRET);
            console.log("Token decoded:", token_decode);

            // Check if token is from admin login (has role property)
            if (typeof token_decode === 'object' && token_decode.role === 'admin') {
                // Valid admin token
                console.log("Valid admin token, proceeding to next middleware");
                next();
            } else {
                console.log("Token does not have admin role:", token_decode);
                return res.json({ success: false, message: 'Not Authorized Login Again' });
            }
        } catch (jwtError) {
            console.log("JWT verification error:", jwtError);
            return res.json({ success: false, message: 'Invalid token' });
        }
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.json({ success: false, message: error.message });
    }
}

export default authSuperAdmin;
