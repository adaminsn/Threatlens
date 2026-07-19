// src/services/emailService.js
// NOTE: env vars sudah diinjeksikan oleh dotenvx di server.js
// JANGAN tambahkan require('dotenv').config() di sini

const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// ─── KONFIGURASI SMTP ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',   // true → port 465, false → STARTTLS 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false   // agar tidak gagal di self-signed cert / dev env
    }
});

// ─── VERIFIKASI KONEKSI SAAT STARTUP ─────────────────────────────────────────
(async () => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️  [Email] SMTP_USER atau SMTP_PASS tidak dikonfigurasi. Email tidak akan dikirim.');
        return;
    }
    try {
        await transporter.verify();
        console.log(`✅ [Email] SMTP siap: ${process.env.SMTP_USER} @ ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    } catch (err) {
        console.error('❌ [Email] SMTP gagal terkoneksi:', err.message);
        console.error('   Periksa SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS di .env');
    }
})();

// ─── HELPER: apakah SMTP sudah dikonfigurasi? ────────────────────────────────
const isSmtpConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

// ─── HELPER: kirim email dengan penanganan error lengkap ─────────────────────
const sendMail = async (mailOptions) => {
    if (!isSmtpConfigured()) {
        console.warn('⚠️  [Email] SMTP belum dikonfigurasi, email tidak dikirim.');
        return { success: false, reason: 'SMTP_NOT_CONFIGURED' };
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [Email] Terkirim → ${mailOptions.to} | ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('❌ [Email] Gagal kirim ke', mailOptions.to);
        console.error('   Code :', err.code);
        console.error('   Msg  :', err.message);
        if (err.response) console.error('   SMTP :', err.response);
        return { success: false, error: err.message, code: err.code };
    }
};

// ─── GENERATE TOKEN VERIFIKASI EMAIL ─────────────────────────────────────────
const generateVerificationToken = (email) => {
    return jwt.sign(
        { email, type: 'email_verification' },
        process.env.JWT_SECRET || 'threatlens_secret_key',
        { expiresIn: process.env.JWT_EXPIRATION_EMAIL || '1d' }
    );
};

// ─── SEND VERIFICATION EMAIL ─────────────────────────────────────────────────
const sendVerificationEmail = async (email, username) => {
    const token = generateVerificationToken(email);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    console.log('─── [Email] Verification Email ───────────────────────');
    console.log(`   To      : ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Link    : ${verificationUrl}`);
    console.log('──────────────────────────────────────────────────────');

    const result = await sendMail({
        from:    `"ThreatLens" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: 'Verifikasi Email Anda — ThreatLens',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8eaf0; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #ff2d2d; font-size: 28px; margin: 0;">⬡ ThreatLens</h1>
                    <p style="color: #8a90a0; font-size: 12px; margin: 4px 0 0;">See Through Every Threat</p>
                </div>
                <h2 style="color: #e8eaf0;">Selamat Datang, ${username}! 👋</h2>
                <p style="color: #a0a8b8;">Terima kasih telah mendaftar di ThreatLens. Verifikasi email Anda untuk mulai menggunakan platform keamanan siber kami.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verificationUrl}"
                       style="background-color: #ff2d2d; color: white; padding: 14px 32px;
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        ✔ Verifikasi Email Saya
                    </a>
                </div>
                <p style="color: #8a90a0; font-size: 13px;">Atau buka link ini di browser:<br>
                    <a href="${verificationUrl}" style="color: #ff2d2d; word-break: break-all;">${verificationUrl}</a>
                </p>
                <p style="color: #5a6070; font-size: 12px;">Link berlaku 24 jam. Jika Anda tidak mendaftar, abaikan email ini.</p>
                <hr style="border: 1px solid #1a2332; margin: 24px 0;">
                <p style="color: #5a6070; font-size: 11px; text-align: center;">© 2024 ThreatLens — See Through Every Threat</p>
            </div>
        `
    });

    return { success: result.success, token, verificationUrl, ...result };
};

// ─── SEND RESET PASSWORD EMAIL ────────────────────────────────────────────────
const sendResetPasswordEmail = async (email, username, resetToken) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/pages/reset_password.html?token=${resetToken}`;

    console.log('─── [Email] Reset Password Email ─────────────────────');
    console.log(`   To      : ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Link    : ${resetUrl}`);
    console.log('──────────────────────────────────────────────────────');

    const result = await sendMail({
        from:    `"ThreatLens Security" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: '🔐 Reset Password — ThreatLens',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8eaf0; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #ff2d2d; font-size: 28px; margin: 0;">⬡ ThreatLens</h1>
                    <p style="color: #8a90a0; font-size: 12px; margin: 4px 0 0;">Security Alert</p>
                </div>
                <h2 style="color: #e8eaf0;">🔐 Reset Password</h2>
                <p style="color: #a0a8b8;">Halo <strong>${username}</strong>,</p>
                <p style="color: #a0a8b8;">Kami menerima permintaan untuk mereset password akun ThreatLens Anda. Klik tombol di bawah untuk membuat password baru.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}"
                       style="background-color: #ff2d2d; color: white; padding: 14px 32px;
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 16px; display: inline-block;">
                        Reset Password Sekarang
                    </a>
                </div>
                <p style="color: #8a90a0; font-size: 13px;">Atau buka link ini:<br>
                    <a href="${resetUrl}" style="color: #ff2d2d; word-break: break-all;">${resetUrl}</a>
                </p>
                <div style="background: #1a0a0a; border-left: 4px solid #ff2d2d; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #ff6b6b; margin: 0; font-size: 13px;">
                        ⚠️ <strong>Link ini hanya berlaku 1 jam.</strong><br>
                        Jika Anda tidak meminta reset password, segera amankan akun Anda.
                    </p>
                </div>
                <hr style="border: 1px solid #1a2332; margin: 24px 0;">
                <p style="color: #5a6070; font-size: 11px; text-align: center;">© 2024 ThreatLens — See Through Every Threat</p>
            </div>
        `
    });

    return { success: result.success, resetUrl, ...result };
};

// ─── SEND LOGIN NOTIFICATION EMAIL ───────────────────────────────────────────
const sendLoginNotificationEmail = async (email, username, ip, device, location = 'Unknown') => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/pages/login.html`;
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    console.log('─── [Email] Login Notification ───────────────────────');
    console.log(`   To      : ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   IP      : ${ip} | Device: ${device}`);
    console.log('──────────────────────────────────────────────────────');

    const result = await sendMail({
        from:    `"ThreatLens Security" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: '🔐 Login Alert — ThreatLens',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e8eaf0; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #ff2d2d; font-size: 28px; margin: 0;">⬡ ThreatLens</h1>
                    <p style="color: #8a90a0; font-size: 12px; margin: 4px 0 0;">Security Alert</p>
                </div>
                <h2 style="color: #e8eaf0;">🔐 Login dari Perangkat Baru</h2>
                <p style="color: #a0a8b8;">Halo <strong>${username}</strong>,</p>
                <p style="color: #a0a8b8;">Akun Anda baru saja diakses dari perangkat yang belum dikenal.</p>
                <div style="background: #111820; border: 1px solid #1a2332; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 6px 0; color: #a0a8b8;"><strong style="color:#e8eaf0;">📱 Perangkat :</strong> ${device}</p>
                    <p style="margin: 6px 0; color: #a0a8b8;"><strong style="color:#e8eaf0;">🌐 IP Address:</strong> ${ip}</p>
                    <p style="margin: 6px 0; color: #a0a8b8;"><strong style="color:#e8eaf0;">📍 Lokasi    :</strong> ${location}</p>
                    <p style="margin: 6px 0; color: #a0a8b8;"><strong style="color:#e8eaf0;">🕐 Waktu     :</strong> ${waktu} WIB</p>
                </div>
                <p style="color: #a0a8b8;">Jika ini adalah Anda, abaikan email ini.</p>
                <div style="background: #1a0a0a; border-left: 4px solid #ff2d2d; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                    <p style="color: #ff6b6b; margin: 0; font-size: 13px;">
                        ⚠️ <strong>Bukan Anda?</strong> Segera ganti password akun Anda!
                    </p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${loginUrl}"
                       style="background-color: #ff2d2d; color: white; padding: 12px 28px;
                              text-decoration: none; border-radius: 8px; font-weight: bold;
                              font-size: 14px; display: inline-block;">
                        Amankan Akun Saya
                    </a>
                </div>
                <hr style="border: 1px solid #1a2332; margin: 24px 0;">
                <p style="color: #5a6070; font-size: 11px; text-align: center;">© 2024 ThreatLens — See Through Every Threat</p>
            </div>
        `
    });

    return { success: result.success, ...result };
};

// ─── RESEND VERIFICATION ──────────────────────────────────────────────────────
const resendVerificationEmail = async (email, username) => {
    return await sendVerificationEmail(email, username);
};

// ─── EXPORT MODULE ────────────────────────────────────────────────────────────
module.exports = {
    sendVerificationEmail,
    resendVerificationEmail,
    generateVerificationToken,
    sendResetPasswordEmail,
    sendLoginNotificationEmail
};