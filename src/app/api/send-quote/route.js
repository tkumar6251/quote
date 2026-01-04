import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
    try {
        const { email, pdfBase64 } = await request.json();

        if (!email || !pdfBase64) {
            return NextResponse.json({ error: 'Email and PDF data required' }, { status: 400 });
        }

        // Configure Transporter (Update with real credentials)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: 587,
            secure: false, // true for 465
            auth: {
                user: process.env.SMTP_USER || 'user@example.com',
                pass: process.env.SMTP_PASS || 'password',
            },
        });

        // Send Mail
        await transporter.sendMail({
            from: `"Tejas SD" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
            to: email,
            subject: 'Your Service Quotation',
            text: 'Please find attached the quotation you requested.',
            html: '<b>Please find attached the quotation you requested.</b>',
            attachments: [
                {
                    filename: `Quotation_${Date.now()}.pdf`,
                    content: pdfBase64.split('base64,')[1],
                    encoding: 'base64',
                },
            ],
        });

        return NextResponse.json({ message: 'Email sent successfully' });

    } catch (error) {
        console.error('Email error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
