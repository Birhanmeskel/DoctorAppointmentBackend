import nodemailer from 'nodemailer';

const createTransporter = () => {
    // For development, you can use Gmail with app passwords
    // For production, use a proper email service like SendGrid, AWS SES, etc.

    console.log('Creating email transporter with:', {
        user: process.env.EMAIL_USER,
        passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
    });

    return nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER, // Your email
            pass: process.env.EMAIL_PASS  // Your app password (not regular password)
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Alternative configuration for other email services:
    /*
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    */
};

export default createTransporter;
