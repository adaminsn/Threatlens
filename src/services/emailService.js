// src/services/emailService.js
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Konfigurasi transporter SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Fungsi untuk generate token verifikasi
const generateVerificationToken = (email) => {
    return jwt.sign(
        { email: email, type: 'email_verification' },
        process.env.JWT_SECRET || 'threatlens_secret_key',
        { expiresIn: process.env.JWT_EXPIRATION_EMAIL || '1d' }
    );
};

// Fungsi kirim email verifikasi
const sendVerificationEmail = async (email, username) => {
    try {
        const token = generateVerificationToken(email);
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

        // Untuk development, log link ke console
        console.log('VERIFICATION EMAIL (DEVELOPMENT)');
        console.log(`To: ${email}`);
        console.log(`Username: ${username}`);
        console.log(`Verification Link: ${verificationUrl}`);
        console.log('=================================');

        // Cek apakah SMTP dikonfigurasi dengan benar
        if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
            // Kirim email sungguhan
            const mailOptions = {
                from: `"ThreatLens" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Verifikasi Email Anda - ThreatLens',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #ff2d2d;">Welcome to ThreatLens, ${username}! 👋</h2>
                        <p>Terima kasih telah mendaftar. Untuk mulai menggunakan platform kami, 
                        silakan verifikasi alamat email Anda terlebih dahulu.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #ff2d2d; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Verifikasi Email
                            </a>
                        </div>
                        <p>Atau klik link berikut: <br>
                        <a href="${verificationUrl}">${verificationUrl}</a></p>
                        <p>Link ini akan kadaluarsa dalam 24 jam.</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">Jika Anda tidak melakukan pendaftaran, 
                        abaikan email ini.</p>
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
        console.error('❌ Error sending email:', error.message);
        // Tetap return success dengan token untuk development
        return { success: false, error: error.message, token: generateVerificationToken(email) };
    }
};

// Fungsi kirim ulang verifikasi
const resendVerificationEmail = async (email, username) => {
    return await sendVerificationEmail(email, username);
};

module.exports = { sendVerificationEmail, resendVerificationEmail, generateVerificationToken };