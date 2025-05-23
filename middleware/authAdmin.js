import jwt from "jsonwebtoken";

// admin authentication middleware
const authAdmin = async (req, res, next) => {
    try {
        // Check for token in different formats/cases
        const atoken = req.headers.atoken || req.headers.aToken || req.headers.ATOKEN ||
                      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
                       ? req.headers.authorization.split(' ')[1] : null);

        console.log("Admin Auth - Headers received:", req.headers);
        console.log("Admin Auth - Token extracted:", atoken);

        if (!atoken) {
            return res.json({ success: false, message: 'Not Authorized Login Again' })
        }

        const token_decode = jwt.verify(atoken, process.env.JWT_SECRET)

        // Check if token is from unified login (has role property)
        if (typeof token_decode === 'object' && token_decode.role === 'admin') {
            // Token from unified login

            // Check if it's a legacy admin token
            if (token_decode.isLegacyAdmin) {
                console.log("Admin Auth - Using legacy admin token with email:", token_decode.email);
                // Set the email in the request body for the controller to use
                req.body.adminEmail = token_decode.email;
                next();
            }
            // Regular admin token with ID
            else if (token_decode.id) {
                req.body.adminId = token_decode.id;
                console.log("Admin Auth - Added adminId to request:", token_decode.id);
                next();
            }
            // Admin token without ID (shouldn't happen, but just in case)
            else {
                console.log("Admin Auth - Admin token without ID");
                next();
            }
        }
        // Check if token is from original admin login (old format)
        else if (token_decode === process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            // Token from original admin login
            // For legacy admin login, we don't have an ID
            console.log("Admin Auth - Using legacy admin login (old format)");
            next();
        } else {
            console.log("Admin Auth - Invalid token format:", typeof token_decode);
            return res.json({ success: false, message: 'Not Authorized Login Again' });
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export default authAdmin;