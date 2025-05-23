export const getPasswordResetEmailTemplate = (name, resetLink, userType) => {
    const userTypeDisplay = userType === 'user' ? 'Patient' : 
                           userType.charAt(0).toUpperCase() + userType.slice(1);
    
    return {
        subject: `Password Reset Request - ${userTypeDisplay} Account`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #5f6fff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background-color: #5f6fff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We received a request to reset the password for your <strong>${userTypeDisplay}</strong> account.</p>
                        <p>Click the button below to reset your password:</p>
                        <a href="${resetLink}" class="button">Reset Password</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">${resetLink}</p>
                        
                        <div class="warning">
                            <strong>Important:</strong>
                            <ul>
                                <li>This link will expire in 1 hour for security reasons</li>
                                <li>If you didn't request this password reset, please ignore this email</li>
                                <li>For security, never share this link with anyone</li>
                            </ul>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Hello ${name},
            
            We received a request to reset the password for your ${userTypeDisplay} account.
            
            Please click the following link to reset your password:
            ${resetLink}
            
            This link will expire in 1 hour for security reasons.
            
            If you didn't request this password reset, please ignore this email.
            
            Best regards,
            
        `
    };
};
