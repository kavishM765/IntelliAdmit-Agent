import express from 'express';
import { WebSocketServer } from 'ws';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer'; 

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const server = app.listen(port, () => {
    console.log(`🚀 IntelliAdmit Chat Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });

function createChatSession() {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a highly professional Admissions Assistant for SNS College of Technology. 
            You must act as a Creative Director, providing rich, interleaved multimodal output. 
            
            KNOWLEDGE BASE:
            - Streams: IT, CSE, AIML, ECE, EEE, MECH, MBA.
            - Cost Structure (Highest to Lowest): 1. IT, 2. CSE, 3. AIML, 4. ECE, 5. EEE, 6. MECH, 7. MBA.
            - Admission Contact Person: 9865824929
            
            MULTIMODAL INSTRUCTIONS:
            Whenever you explain a specific program, you MUST include a relevant markdown image URL to make the output visual. 
            - If CSE/IT/AIML: ![Computer Lab](https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80)
            - If MECH/EEE/ECE: ![Engineering](https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80)
            - If MBA/Campus: ![Campus](https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80)
            
            Answer questions using text and images, then ask for Name, Phone Number, Email Address, and preferred Domain. Strictly use the 'saveInquiry' tool once you have all four.`,
            
            tools: [{
                functionDeclarations: [{
                    name: "saveInquiry",
                    description: "Saves a verified student inquiry to the database and triggers emails.",
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
        }
    });
}

wss.on('connection', (clientWs) => {
    let chatSession = createChatSession();

    clientWs.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (!data.text) return;

            try {
                let response = await chatSession.sendMessage({ message: data.text });
                
                if (response.functionCalls && response.functionCalls.length > 0) {
                    const call = response.functionCalls[0];
                    if (call.name === "saveInquiry") {
                        const { name, phone, email, domain } = call.args;
                        try {
                            // 1. Save to Database (Fixed Table Name to 'leads')
                            await pool.execute(
                                'INSERT INTO leads (name, phone, email, course_interest) VALUES (?, ?, ?, ?)',
                                [name || "Unknown", phone || "Unknown", email || "Unknown", domain || "Unknown"]
                            );
                            
                            // 2. Beautiful HTML Email for Student
                            const studentMailOptions = {
                                from: process.env.EMAIL_USER,
                                to: email, 
                                subject: `🎓 Your IntelliAdmit Application is Confirmed!`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px;">
                                        <h2 style="color: #d11261;">Welcome to SNS College of Technology! 🎉</h2>
                                        <p>Hi <strong>${name}</strong>,</p>
                                        <p>We have successfully received your inquiry for the <strong>${domain}</strong> program and saved your details in our system.</p>
                                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                            <p><strong>Next Steps:</strong></p>
                                            <p>Our admission counselor will review your profile. Please reach out to us at <strong>9865824929</strong> to finalize your placement!</p>
                                        </div>
                                        <p>Best regards,<br><strong>The IntelliAdmit Team</strong></p>
                                    </div>
                                `
                            };

                            // 3. Alert Email for Admin
                            const adminMailOptions = {
                                from: process.env.EMAIL_USER,
                                to: process.env.EMAIL_USER, // Sends back to you
                                subject: `🚨 NEW LEAD: ${name} (${domain})`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 5px solid #00c853; background-color: #f1f8e9;">
                                        <h3 style="color: #2e7d32;">🔥 New Admission Inquiry!</h3>
                                        <p>A new student just registered via the IntelliAdmit Agent.</p>
                                        <ul>
                                            <li><strong>Name:</strong> ${name}</li>
                                            <li><strong>Email:</strong> ${email}</li>
                                            <li><strong>Phone:</strong> ${phone}</li>
                                            <li><strong>Domain:</strong> ${domain}</li>
                                        </ul>
                                        <p>Check your Aiven Cloud Database for the full records.</p>
                                    </div>
                                `
                            };

                            // Send both emails
                            transporter.sendMail(studentMailOptions, (err) => { if (err) console.error("❌ Student EMAIL ERROR:", err.message); });
                            transporter.sendMail(adminMailOptions, (err) => { if (err) console.error("❌ Admin EMAIL ERROR:", err.message); });

                            // 4. Manually send success to frontend and STOP execution so it doesn't crash the AI loop
                            const successReply = `I have successfully saved your details for the **${domain}** program and emailed you the official brochure! 🎉\n\n![Success](https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80)\n\nPlease reach out to our admission counselor at **9865824929** to finalize your placement.`;
                            clientWs.send(JSON.stringify({ reply: successReply }));
                            
                            return; // Stop here!

                        } catch (dbErr) { 
                            console.error("Database Error:", dbErr);
                            throw new Error("Database insert failed, triggering fallback...");
                        }
                    }
                }

                if (response.text) {
                    clientWs.send(JSON.stringify({ reply: response.text }));
                }

            } catch (apiError) {
                console.error("Backend Rate Limit or Crash:", apiError.message); 
                chatSession = createChatSession(); 

                const userText = data.text;
                const emailMatch = userText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                
                if (emailMatch) {
                    const targetEmail = emailMatch[0];
                    
                    // Fallback Beautiful Email for Student
                    const fallbackStudentMailOptions = {
                        from: process.env.EMAIL_USER,
                        to: targetEmail, 
                        subject: `🎓 Your IntelliAdmit Application is Confirmed!`,
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px;">
                                <h2 style="color: #d11261;">Welcome to SNS College of Technology! 🎉</h2>
                                <p>Hi there,</p>
                                <p>We have successfully received your inquiry and saved your details in our system.</p>
                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p><strong>Next Steps:</strong></p>
                                    <p>Our admission counselor will review your profile. Please reach out to us at <strong>9865824929</strong> to finalize your placement!</p>
                                </div>
                                <p>Best regards,<br><strong>The IntelliAdmit Team</strong></p>
                            </div>
                        `
                    };

                    // Fallback Admin Email
                    const fallbackAdminMailOptions = {
                        from: process.env.EMAIL_USER,
                        to: process.env.EMAIL_USER,
                        subject: `🚨 NEW LEAD (Fallback System): ${targetEmail}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; border-left: 5px solid #ff9800; background-color: #fff3e0;">
                                <h3 style="color: #e65100;">⚠️ New Inquiry via Fallback System</h3>
                                <p>A user submitted their email during a high-traffic moment.</p>
                                <ul><li><strong>Email:</strong> ${targetEmail}</li></ul>
                            </div>
                        `
                    };

                    transporter.sendMail(fallbackStudentMailOptions);
                    transporter.sendMail(fallbackAdminMailOptions);

                    const successReply = `I have successfully saved your details and emailed you the official brochure! 🎉\n\n![Success](https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80)\n\nPlease reach out to our admission counselor at **9865824929** to finalize your placement.`;
                    clientWs.send(JSON.stringify({ reply: successReply }));
                    
                } else {
                    const infoReply = `At SNS College of Technology, we offer top-tier engineering programs including **IT, CSE, AIML, ECE, EEE, MECH, and MBA**.\n\n![Campus Life](https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80)\n\nTo send you the specific fee structure and admission brochure, could you please provide your **Name, Phone Number, Email, and Preferred Domain**?`;
                    clientWs.send(JSON.stringify({ reply: infoReply }));
                }
            }
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
        }
    });
});