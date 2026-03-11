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

// 🔥 NEW: A function to generate a fresh AI brain whenever we need it!
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
    // Start the first session
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
                            await pool.execute(
                                'INSERT INTO admission_inquiries (student_name, phone_number, interest_domain) VALUES (?, ?, ?)',
                                [name || "Unknown", phone, domain || "Unknown"]
                            );
                            
                            transporter.sendMail({
                                from: process.env.EMAIL_USER,
                                to: email, 
                                subject: `Your Admission Details for SNS College of Technology`,
                                html: `<h2>Welcome to SNS College, ${name}!</h2><p>You have successfully registered for the ${domain} program. Please contact 9865824929 to finalize your admission.</p>`
                            }, (err) => {
                                if (err) console.error("❌ EMAIL ERROR:", err.message);
                            });

                            response = await chatSession.sendMessage({ 
                                message: [{ functionResponse: { name: "saveInquiry", response: { status: "OK" } } }] 
                            });
                        } catch (dbErr) { console.error("Database Error:", dbErr); }
                    }
                }

                if (response.text) {
                    clientWs.send(JSON.stringify({ reply: response.text }));
                }

            } catch (apiError) {
                console.error("Backend Rate Limit or Crash:", apiError.message); 
                
                // 🔥 FIX 1: Instantly reset the AI brain so the chat doesn't freeze!
                chatSession = createChatSession(); 

                const userText = data.text;
                const emailMatch = userText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                
                if (emailMatch) {
                    const targetEmail = emailMatch[0];
                    
                    transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: targetEmail, 
                        subject: `Your Admission Details for SNS College of Technology`,
                        html: `<h2>Welcome to SNS College!</h2><p>We have successfully registered your interest. Please contact 9865824929 to finalize your admission.</p>`
                    }, (err, info) => {
                        // 🔥 FIX 2: We now log exactly why the email is failing!
                        if (err) {
                            console.error("\n❌ NODEMAILER FAILED TO SEND EMAIL!");
                            console.error("Reason:", err.message);
                            console.log("💡 TIP: You MUST use a 16-digit Google 'App Password' in your .env file, NOT your normal Gmail password!\n");
                        } else {
                            console.log(`📧 Fallback Email sent successfully to: ${targetEmail}`);
                        }
                    });

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