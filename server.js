import express from 'express';
import { WebSocketServer } from 'ws';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer'; 

dotenv.config();

// 1. Database Connection Pool
const pool = mysql.createPool({
    host: 'intelliadmit-db-kavishkmjtm123.e.aivencloud.com', 
    user: 'avnadmin',                                        
    password: process.env.DB_PASS,                            
    database: 'defaultdb',                                    
    port: 14473,                                              
    ssl: { rejectUnauthorized: false } ,
    family: 4
});

const app = express();
const port = process.env.PORT || 8080;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

const server = app.listen(port, () => {
    console.log(`🚀 IntelliAdmit Chat Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });

// Reverting to the old creation logic that was working
function createChatSession() {
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: `You are a professional Admissions Assistant for SNS College of Technology. 
        Streams: IT, CSE, AIML, ECE, EEE, MECH, MBA.
        Fees (Highest to Lowest): CSE, IT, AIML, ECE, EEE, MECH, MBA.
        Instruction: Use text and images. Once you have Name, Phone, Email, and Domain, use 'saveInquiry'.`
    });

    return model.startChat({
        tools: [{
            functionDeclarations: [{
                name: "saveInquiry",
                description: "Saves verified student inquiry.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING" },
                        phone: { type: "STRING" },
                        email: { type: "STRING" },
                        domain: { type: "STRING" }
                    },
                    required: ["name", "phone", "email", "domain"]
                }
            }]
        }]
    });
}

wss.on('connection', (clientWs) => {
    let chatSession = createChatSession();

    clientWs.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (!data.text) return;

            try {
                const result = await chatSession.sendMessage(data.text);
                const response = result.response;
                
                // FIXED: Use the response.functionCalls() method correctly
                const calls = response.functionCalls();

                if (calls && calls.length > 0) {
                    const call = calls[0];
                    if (call.name === "saveInquiry") {
                        const { name, phone, email, domain } = call.args;

                        try {
                            // 1. Save to Database
                            await pool.execute(
                                'INSERT INTO leads (name, phone, email, course_interest) VALUES (?, ?, ?, ?)',
                                [name, phone, email, domain]
                            );
                            
                            // 2. The Detailed Email Template
                            const studentMailOptions = {
                                from: process.env.EMAIL_USER,
                                to: email, 
                                subject: `Admissions Information - SNS College of Technology`,
                                html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                                    <h2 style="color: #e91e63; border-bottom: 2px solid #e91e63; padding-bottom: 10px;">Welcome to SNS College of Technology! 🎓</h2>
                                    <p>Hello <strong>${name}</strong>,</p>
                                    <p>Thank you for your inquiry. Here are the fee details for our various departments:</p>
                                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
                                        <tr style="background-color: #fce4ec; text-align: left;">
                                            <th style="border: 1px solid #ddd; padding: 10px;">Department</th>
                                            <th style="border: 1px solid #ddd; padding: 10px;">Tuition Fee</th>
                                            <th style="border: 1px solid #ddd; padding: 10px;">Hostel Fee</th>
                                        </tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>CSE</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹1,20,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>IT</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹1,15,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>AIML</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹1,10,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>ECE</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹1,00,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>EEE</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>MECH</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹80,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                        <tr><td style="border: 1px solid #ddd; padding: 10px;"><strong>MBA</strong></td><td style="border: 1px solid #ddd; padding: 10px;">₹70,000</td><td style="border: 1px solid #ddd; padding: 10px;">₹90,000</td></tr>
                                    </table>
                                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #e91e63; margin-top: 20px;">
                                        <p style="margin: 0;"><strong>Admission Office:</strong> +91 9489465755, +91 9865824929</p>
                                    </div>
                                    <p style="margin-top: 25px;">Regards,<br><strong>Admissions Team</strong></p>
                                </div>`
                            };

                            const adminMailOptions = {
                                from: process.env.EMAIL_USER,
                                to: process.env.EMAIL_USER,
                                subject: `🚨 NEW LEAD: ${name}`,
                                text: `Lead captured: ${name}, ${phone}, ${email}, ${domain}`
                            };

                            await transporter.sendMail(studentMailOptions);
                            await transporter.sendMail(adminMailOptions);

                            clientWs.send(JSON.stringify({ reply: `I've saved your details for **${domain}** and sent the fee structure to your email! 🎉` }));
                            return;
                        } catch (err) { console.error("Internal Lead Error:", err); }
                    }
                }

                clientWs.send(JSON.stringify({ reply: response.text() }));

            } catch (apiError) {
                console.error("Gemini Error:", apiError.message);
                clientWs.send(JSON.stringify({ reply: "I'm having a quick connection issue, but please leave your details and I'll send the brochure shortly!" }));
            }
        } catch (err) { console.error("Parse Error:", err); }
    });
});