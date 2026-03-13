import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function makeTable() {
    console.log("⏳ Connecting to Aiven Database...");
    
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS, 
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                course_interest VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ SUCCESS: The 'leads' table has been created in Aiven!");
    } catch (error) {
        console.error("❌ ERROR CREATING TABLE:", error.message);
    } finally {
        process.exit();
    }
}

makeTable();