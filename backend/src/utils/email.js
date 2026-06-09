const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Choose provider: SendGrid, SMTP (Gmail/Mailtrap), or Mock (development)
const useSendGrid = !!process.env.SENDGRID_API_KEY;
const useMock = process.env.EMAIL_MODE === 'mock';

if (useSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('Email provider: SendGrid');
} else if (useMock) {
  console.log('Email provider: Mock (console logging) - for development only');
} else {
  // Initialize SMTP transporter
  var transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Verify transporter at startup
  transporter.verify()
    .then(() => {
      console.log('SMTP transporter verified');
    })
    .catch(err => {
      console.error(
        'SMTP verification error:',
        err && err.message ? err.message : err
      );
    });
}

// Send a generic email
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const from =
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      'noreply@digitalhealthrecord.com';

    if (useMock) {
      console.log('📧 [MOCK EMAIL]');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      return {
        success: true,
        message: 'Email logged to console (mock mode)'
      };
    }

    if (useSendGrid) {
      const msg = { to, from, subject, text, html };
      const res = await sgMail.send(msg);

      return {
        success: true,
        message: 'Email sent via SendGrid',
        res
      };
    }

    const mailOptions = {
      from,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Email sent via SMTP',
      info
    };

  } catch (error) {
    console.error(
      'Email sending error:',
      error && error.message ? error.message : error
    );

    throw error;
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  const subject = 'Your One-Time Password (OTP) for Digital Health Record';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email</h2>

      <p>Your One-Time Password (OTP) is:</p>

      <div style="
        background-color: #f0f0f0;
        padding: 20px;
        text-align: center;
        border-radius: 5px;
        margin: 20px 0;
      ">
        <h1 style="
          color: #2563eb;
          letter-spacing: 5px;
          margin: 0;
        ">
          ${otp}
        </h1>
      </div>

      <p style="color: #666;">
        This OTP is valid for 10 minutes.
        Please do not share it with anyone.
      </p>

      <p style="color: #999; font-size: 12px;">
        If you didn't request this OTP,
        please ignore this email.
      </p>
    </div>
  `;

  const text = `Your OTP is: ${otp}. Valid for 10 minutes.`;

  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

// Send Login Notification email
const sendLoginNotification = async (email) => {
  const subject = 'Successful Login - Digital Health Record';

  const now = new Date().toLocaleString();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Login Detected</h2>

      <p>Hello,</p>

      <p>
        Your account was successfully logged into at
        <strong>${now}</strong>.
      </p>

      <p style="color: #666;">
        If this was you, you can safely ignore this email.
        If you did not authorize this login,
        please contact support immediately.
      </p>

      <hr style="
        border: none;
        border-top: 1px solid #eee;
        margin: 20px 0;
      " />

      <p style="color: #999; font-size: 12px;">
        Digital Health Record Security Team
      </p>
    </div>
  `;

  const text =
    `New login to your Digital Health Record account at ${now}.`;

  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

module.exports = {
  sendOTPEmail,
  sendLoginNotification,
  sendEmail
};