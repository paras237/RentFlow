package com.rentalmanagement.rentalservice.service;

import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import com.rentalmanagement.rentalservice.model.Invoice;
import org.springframework.scheduling.annotation.Async;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromEmail;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Async
    public void sendTenantAccessEmail(String to, String magicLink) {
        log.info("Sending tenant access email to {} with magic link: {}", to, magicLink);
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Your Tenant Access Link");
        message.setText("Please use the following link to access your tenant portal: " + magicLink);
        message.setFrom(fromEmail);
        mailSender.send(message);
    }

    public void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        log.info("Inside Email Service - sendHtmlEmail(): {} {} {}", to, subject, htmlContent);
        MimeMessage message = mailSender.createMimeMessage();

        MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(message, true, "UTF-8");
        mimeMessageHelper.setFrom(fromEmail);
        mimeMessageHelper.setTo(to);
        mimeMessageHelper.setSubject(subject);
        mimeMessageHelper.setText(htmlContent, true);
        mailSender.send(message);
    }

    @Async
    public void sendInvoiceCreatedEmail(String to, Invoice invoice) {
        try {
            String subject = "New Invoice Generated - " + invoice.getPeriodStart() + " to " + invoice.getPeriodEnd();
            String magicLink = frontendUrl + "/tenant/login?token=" + invoice.getLease().getAccessToken();

            String htmlContent = String.format(
                    """
                            <h1>New Invoice Generated</h1>
                            <p>Dear Tenant,</p>
                            <p>A new invoice has been generated for your unit.</p>
                            <ul>
                                <li><strong>Amount:</strong> $%.2f</li>
                                <li><strong>Due Date:</strong> %s</li>
                                <li><strong>Period:</strong> %s to %s</li>
                            </ul>
                            <p>
                                <a href="%s" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                                    View & Pay Invoice
                                </a>
                            </p>
                            <p>Or click this link: <a href="%s">%s</a></p>
                            """,
                    invoice.getTotalAmount(), invoice.getDueDate(), invoice.getPeriodStart(),
                    invoice.getPeriodEnd(), magicLink, magicLink, magicLink);
            sendHtmlEmail(to, subject, htmlContent);
        } catch (MessagingException e) {
            log.error("Failed to send invoice email to {}", to, e);
        }
    }

    @Async
    public void sendOtpEmail(String to, String otp) {
        try {
            String subject = "Your RentFlow Verification Code";
            String htmlContent = String.format(
                    """
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #ff4d2e; padding: 20px; text-align: center;">
                            <h2 style="color: white; margin: 0;">RentFlow</h2>
                        </div>
                        <div style="padding: 30px 20px;">
                            <p>Hello,</p>
                            <p>Thank you for registering with RentFlow. Please use the following 6-digit verification code to complete your registration:</p>
                            <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #18181b; border-radius: 6px; margin: 25px 0;">
                                %s
                            </div>
                            <p>This code will expire in 1 hour.</p>
                            <p>If you did not request this, please ignore this email.</p>
                        </div>
                    </div>
                    """, otp);
            sendHtmlEmail(to, subject, htmlContent);
        } catch (MessagingException e) {
            log.error("Failed to send OTP email to {}", to, e);
        }
    }

    @Async
    public void sendAgentInviteEmail(String to, String agentName, String tempPassword) {
        try {
            String subject = "You've been invited to RentFlow";
            String loginUrl = frontendUrl + "/index.html"; // The dashboard login page
            String htmlContent = String.format(
                    """
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #ff4d2e; padding: 20px; text-align: center;">
                            <h2 style="color: white; margin: 0;">RentFlow</h2>
                        </div>
                        <div style="padding: 30px 20px;">
                            <p>Hello %s,</p>
                            <p>You have been invited to join a RentFlow team as a property agent.</p>
                            <p>Your temporary login credentials are:</p>
                            <div style="background-color: #f4f4f5; padding: 15px; margin: 20px 0; border-radius: 6px;">
                                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> %s</p>
                                <p style="margin: 0;"><strong>Temporary Password:</strong> %s</p>
                            </div>
                            <p>
                                <a href="%s" style="display: inline-block; padding: 12px 24px; background-color: #ff4d2e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                    Log In to Dashboard
                                </a>
                            </p>
                            <p style="font-size: 12px; color: #71717a; margin-top: 30px;">
                                Please log in and change your password as soon as possible.
                            </p>
                        </div>
                    </div>
                    """, agentName, to, tempPassword, loginUrl);
            sendHtmlEmail(to, subject, htmlContent);
        } catch (MessagingException e) {
            log.error("Failed to send Agent Invite email to {}", to, e);
        }
    }
}
