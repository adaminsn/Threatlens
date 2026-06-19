// src/services/emailService.js
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// KONFIGURASI SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// GENERATE TOKEN VERIFIKASI EMAIL
const generateVerificationToken = (email) => {
    return jwt.sign(
        { email: email, type: 'email_verification' },
        process.env.JWT_SECRET || 'threatlens_secret_key',
        { expiresIn: process.env.JWT_EXPIRATION_EMAIL || '1d' }
    );
};

// SEND VERIFICATION EMAIL
const sendVerificationEmail = async (email, username) => {
    try {
        const token = generateVerificationToken(email);
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

        console.log('📧 VERIFICATION EMAIL (DEVELOPMENT)');
        console.log(`To: ${email}`);
        console.log(`Username: ${username}`);
        console.log(`Verification Link: ${verificationUrl}`);
        console.log('=================================');

        if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
            const mailOptions = {
                from: `"ThreatLens" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Verifikasi Email Anda - ThreatLens',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #ff2d2d;">Welcome to ThreatLens, ${username}! 👋</h2>
                        <p>Terima kasih telah mendaftar. Silakan verifikasi alamat email Anda untuk mulai menggunakan platform.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #ff2d2d; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Verifikasi Email
                            </a>
                        </div>
                        <p>Link ini akan kadaluarsa dalam 24 jam.</p>
                        <p style="color: #999; font-size: 12px;">Jika Anda tidak melakukan pendaftaran, abaikan email ini.</p>
                    </div>
                `
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent:', info.messageId);
        } else {
            console.log('⚠️ SMTP not configured. Using development mode (link printed above).');
        }

        return { success: true, token, verificationUrl };
    } catch (error) {
        console.error('❌ Error sending verification email:', error.message);
        return { success: false, error: error.message };
    }
};

// SEND RESET PASSWORD EMAIL
const sendResetPasswordEmail = async (email, username, resetToken) => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/pages/reset_password.html?token=${resetToken}`;

        console.log('RESET PASSWORD EMAIL (DEVELOPMENT)');
        console.log(`To: ${email}`);
        console.log(`Username: ${username}`);
        console.log(`Reset Link: ${resetUrl}`);
        console.log('=================================');

        if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
            const mailOptions = {
                from: `"ThreatLens Security" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Reset Password - ThreatLens',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #ff2d2d;">🔐 Reset Password</h2>
                        <p>Halo <strong>${username}</strong>,</p>
                        <p>Kami menerima permintaan untuk mereset password akun ThreatLens Anda.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #ff2d2d; color: white; padding: 12px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Reset Password Sekarang
                            </a>
                        </div>
                        <p>Atau copy link berikut: <br>
                        <a href="${resetUrl}" style="color: #ff2d2d; word-break: break-all;">${resetUrl}</a></p>
                        <p><strong>⚠️ Link ini hanya berlaku 1 jam.</strong></p>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px;">
                            Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tetap aman.
                        </p>
                    </div>
                `
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Reset password email sent:', info.messageId);
        } else {
            console.log('⚠️ SMTP not configured. Reset link printed above (development mode).');
        }

        return { success: true, resetUrl };
    } catch (error) {
        console.error('❌ Error sending reset email:', error.message);
        return { success: false, error: error.message };
    }
};

// SEND LOGIN NOTIFICATION EMAIL
const sendLoginNotificationEmail = async (email, username, ip, device, location = 'Unknown') => {
    try {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const changePasswordUrl = `${baseUrl}/pages/login.html`;

        console.log('LOGIN NOTIFICATION (DEVELOPMENT)');
        console.log(`To: ${email}`);
        console.log(`Username: ${username}`);
        console.log(`IP Address: ${ip}`);
        console.log(`Device: ${device}`);
        console.log(`Location: ${location}`);
        console.log('=================================');

        if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
            const mailOptions = {
                from: `"ThreatLens Security" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '🔐 Login Alert - ThreatLens',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #ff2d2d;">🔐 Login Alert</h2>
                        <p>Halo <strong>${username}</strong>,</p>
                        <p>Akun Anda baru saja login dari perangkat baru:</p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <p style="margin: 5px 0;"><strong>📱 Perangkat:</strong> ${device}</p>
                            <p style="margin: 5px 0;"><strong>🌐 IP Address:</strong> ${ip}</p>
                            <p style="margin: 5px 0;"><strong>📍 Lokasi:</strong> ${location}</p>
                            <p style="margin: 5px 0;"><strong>🕐 Waktu:</strong> ${new Date().toLocaleString('id-ID')}</p>
                        </div>
                        <p>Jika ini Anda, abaikan email ini.</p>
                        <div style="background: #fff3f3; border-left: 4px solid #ff2d2d; padding: 15px; margin: 15px 0;">
                            <p style="color: #ff2d2d; margin: 0;"><strong>⚠️ Jika bukan Anda, segera ubah password Anda!</strong></p>
                        </div>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="${changePasswordUrl}" 
                               style="background-color: #ff2d2d; color: white; padding: 10px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Ubah Password Sekarang
                            </a>
                        </div>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px;">© 2024 ThreatLens — See Through Every Threat</p>
                    </div>
                `
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Login notification email sent:', info.messageId);
        } else {
            console.log('⚠️ SMTP not configured. Login notification printed above (development mode).');
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error sending login notification:', error.message);
        return { success: false, error: error.message };
    }
};

// RESEND VERIFICATION EMAIL
const resendVerificationEmail = async (email, username) => {
    return await sendVerificationEmail(email, username);
};

// EXPORT MODULE
module.exports = { 
    sendVerificationEmail, 
    resendVerificationEmail,
    generateVerificationToken,
    sendResetPasswordEmail,
    sendLoginNotificationEmail
};