const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"ComplaintsHQ" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ComplaintsHQ Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset</h2>

        <p>Your ComplaintsHQ verification code is:</p>

        <h1 style="letter-spacing: 8px;">${otp}</h1>

        <p>This code will expire in 10 minutes.</p>

        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = sendOTPEmail;