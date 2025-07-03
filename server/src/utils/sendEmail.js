const nodemailer = require('nodemailer');
const logger = require('@utils/logger');
const config = require('@config/envConfig');

let transporter;

if (process.env.NODE_ENV === 'production') {
  // Production configuration with real SMTP
  transporter = nodemailer.createTransport({
    service: config.email.service,
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  transporter.verify()
    .then(() => {
      logger.info('SMTP server is ready to take our messages');
    })
    .catch((error) => {
      logger.error('SMTP connection error:', error);
      throw new Error(`SMTP connection failed: ${error.message}`);
    });
} else {
  // Development configuration - logs email to console
  transporter = {
    sendMail: (mailOptions) => {
      logger.info('Email would be sent in production:');
      logger.info('To:', mailOptions.to);
      logger.info('Subject:', mailOptions.subject);
      logger.info('Text:', mailOptions.text || 'No text content');
      if (mailOptions.html) {
        logger.info('HTML content available');
      }
      return Promise.resolve({
        messageId: 'dev-message-id',
        envelope: {
          from: 'noreply@example.com',
          to: mailOptions.to
        },
        response: '250 Message accepted for delivery'
      });
    }
  };
  logger.info('Development email service initialized - no emails will be sent');
}

const sendEmail = async ({ email, subject = 'No Subject', message, html }) => {
  try {
    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: email,
      subject,
      text: message,
      html: html || message
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
