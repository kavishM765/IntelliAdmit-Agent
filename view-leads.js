import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs'; // Move this to the top!

dotenv.config();

async function showMeTheData() {
    console.log("📡 Connecting to Aiven to fetch leads...");
    
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const [rows] = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
        
        if (rows.length === 0) {
            console.log("⚠️ The table is empty. Try submitting a lead on your Vercel site first!");
        } else {
            console.log("✅ DATA FOUND:");
            console.table(rows); // Beautiful terminal table
            
            // Save to file
            fs.writeFileSync('leads_backup.json', JSON.stringify(rows, null, 2));
            console.log("💾 SUCCESS: Data saved to leads_backup.json!");
        }
    } catch (error) {
        console.error("❌ ERROR FETCHING DATA:", error.message);
    } finally {
        process.exit();
    }
}

showMeTheData();