# 🎓 IntelliAdmit Agent

### Multimodal AI Admissions Assistant for SNS College of Technology

[![Live Website](https://img.shields.io/badge/Demo-Live_on_Vercel-blueviolet)](https://intelliadmit-agent.vercel.app)
[![Backend Status](https://img.shields.io/badge/Backend-Google_Cloud_Run-4285F4)](https://intelliadmit-agent-285254614141.europe-west1.run.app)
[![Challenge Category](https://img.shields.io/badge/Challenge-Creative_Storyteller-D11261)](#)

---

## 🏗️ Full-Stack Cloud Architecture

IntelliAdmit is a fault-tolerant, full-stack AI application. It uses a secured WebSocket connection (`wss://`) for real-time chat, a Node.js backend on Google Cloud Run, Gemini 2.5 Flash for multimodal intelligence, and Aiven for robust lead storage in a cloud MySQL database.

![IntelliAdmit Architecture Diagram]<img width="1021" height="361" alt="architecture_diagram" src="https://github.com/user-attachments/assets/67f75a30-1ef2-45d6-b8e7-c1d70d1b3ef0" />


---

## 🌟 Key Features (Creative Storyteller Category)

* **Native Multimodal Intelligence:** Leveraging Gemini 2.5 Flash to act as a "Creative Director," the agent provides rich, interleaved output, automatically weaving relevant images of the campus, labs, and storyboards into the text conversation.
* **Real-time Tool Calling (Function Calling):** The agent automatically identifies when a student is ready to apply and uses a defined `saveInquiry` tool to push Name, Phone, Email, and Preferred Stream directly to the Aiven Cloud MySQL database.
* **Double Automated Email System:** Upon successful lead capture, Nodemailer triggers two beautiful HTML emails:
    1.  **Confirmation:** Sent to the student.
    2.  **Lead Alert:** Instant notification sent to the Admission Admin.
* **Fault-Tolerant Fallback System:** A critical reliability feature that intercepts user emails in real-time, even if the AI API hiccups or rate limits, ensuring no lead is ever lost.

---

## 🛠️ Technology Stack

* **Frontend:** React, Vite, WebSockets, JavaScript (Hosted on Vercel).
* **Backend:** Node.js, Express, `ws` (WebSockets), Nodemailer, JavaScript (Hosted on Google Cloud Run).
* **AI Model:** Google Gemini 2.5 Flash (`gemini-2.5-flash`).
* **Database:** Aiven Cloud MySQL.
* **Environment:** Securing credentials using `.env` locally and Google Cloud environment variables in production.

---

## 🚀 Spin-Up Instructions (Reproducibility)

Follow these steps to run the complete Full-Stack IntelliAdmit Agent architecture locally.

### Prerequisites

* Node.js (v18 or higher)
* A Gemini API Key (from Google AI Studio)
* A local MySQL Database (or Cloud MySQL instance)
* A Gmail Account (and a 16-digit App Password)

### 1. Database Setup (MySQL)

Connect to your MySQL instance and run the following command to create the necessary schema and table:

```sql
CREATE DATABASE intelliadmit_db;
USE intelliadmit_db;

CREATE TABLE leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    course_interest VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Backend Setup

```bash
# Clone the repository
git clone [https://github.com/kavishM765/IntelliAdmit-Agent.git](https://github.com/kavishM765/IntelliAdmit-Agent.git)
cd IntelliAdmit-Agent

# Install dependencies in the root directory
npm install
```

Create a `.env` file in the root directory and add the following, filling in your specific details:

```env
PORT=8080
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=localhost 
DB_USER=root      
DB_PASS=your_db_password 
DB_NAME=intelliadmit_db
DB_PORT=3306      
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_digit_app_password_here
```

**Run the Backend:**
```bash
node server.js
```

### 3. Frontend Setup

```bash
# Navigate to the frontend folder
cd frontend
npm install
```

**Run the Frontend:**
```bash
npm run dev
```
The system is now running fully on your local environment, talking to Gemini and saving inquiries to your MySQL database.

---

## 🖥️ Google Cloud Service Use

This project’s **backend** is hosted on **Google Cloud Run** (`intelliadmit-agent`). It provides the scalable compute layer necessary for handling real-time WebSocket connections and securely integrating with the Gemini API via the `@google/genai` SDK. Environment variables are managed directly within the Cloud Run service configuration to protect production credentials.

![GCP Logs Proof]<img width="1598" height="735" alt="gcp_logs_proof" src="https://github.com/user-attachments/assets/215b6c1d-d4ee-4266-a9d0-62a916c2a6f9" />


---

## 📊 Hackathon Submission Summary

* **Summary of features:** A fully autonomous, fault-tolerant admissions agent providing interleaved multimodal output (text + context-aware images).
* **Data sources:** Gemini 2.5 Flash Knowledge Base + Real-time Student Data.
* **Key findings:** Securing real-time (`ws`) connections in a serverless cloud environment (GCP Run) requires careful port management and secure WebSocket (`wss://`) architecture.

**Pro-Tip for Judges:** You can view the active production architecture, database integration, and Gemini tool calling flow by clicking the 'Logs' tab in our Google Cloud Run deployment console recording.

*This project was built for the purposes of entering the Gemini Live API Developer Challenge.*
