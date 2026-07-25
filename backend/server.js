const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Melayani file HTML statis (index.html, admin.html, dll) yang ada di folder luar
app.use(express.static(path.join(__dirname, '../')));

let db;

async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            absen TEXT NOT NULL,
            score INTEGER NOT NULL,
            correct_count INTEGER NOT NULL,
            wrong_count INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            question_text TEXT,
            student_answer TEXT,
            correct_answer TEXT,
            is_correct BOOLEAN,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
    `);
    
    // Ensure foreign keys are enabled
    await db.get('PRAGMA foreign_keys = ON');
}

initDB().catch(console.error);

// Check if student already exists
app.get('/api/check', async (req, res) => {
    try {
        const { name, absen } = req.query;
        if (!name || !absen) {
            return res.status(400).json({ error: 'Name and absen are required' });
        }
        const row = await db.get('SELECT id FROM sessions WHERE absen = ?', [absen]);
        res.json({ exists: !!row });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to check data' });
    }
});

// Get all results
app.get('/api/results', async (req, res) => {
    try {
        const sessions = await db.all('SELECT * FROM sessions ORDER BY timestamp DESC');
        const answers = await db.all('SELECT * FROM answers');
        
        // Combine them
        const result = sessions.map(session => {
            return {
                ...session,
                answers: answers.filter(a => a.session_id === session.id)
            };
        });
        
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Save a new result
app.post('/api/results', async (req, res) => {
    try {
        const newResult = req.body;
        // Basic validation
        if (!newResult.name || !newResult.absen) {
            return res.status(400).json({ error: 'Name and absen are required' });
        }
        
        const row = await db.get('SELECT id FROM sessions WHERE absen = ?', [newResult.absen]);
        if (row) {
            return res.status(403).json({ error: 'Student already took the exam' });
        }
        
        const insertSession = await db.run(
            'INSERT INTO sessions (name, absen, score, correct_count, wrong_count) VALUES (?, ?, ?, ?, ?)',
            [newResult.name, newResult.absen, newResult.score, newResult.correctCount, newResult.wrongCount]
        );
        
        const sessionId = insertSession.lastID;
        
        if (newResult.answers && Array.isArray(newResult.answers)) {
            const stmt = await db.prepare('INSERT INTO answers (session_id, question_text, student_answer, correct_answer, is_correct) VALUES (?, ?, ?, ?, ?)');
            for (let ans of newResult.answers) {
                await stmt.run(sessionId, ans.questionText, ans.studentAnswer, ans.correctAnswer, ans.isCorrect);
            }
            await stmt.finalize();
        }
        
        res.status(201).json({ message: 'Result saved successfully', id: sessionId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Clear all results (for admin)
app.delete('/api/results', async (req, res) => {
    try {
        await db.run('DELETE FROM sessions');
        await db.run('DELETE FROM answers');
        res.json({ message: 'All results cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

// Delete a specific result by ID
app.delete('/api/results/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM sessions WHERE id = ?', [id]);
        await db.run('DELETE FROM answers WHERE session_id = ?', [id]);
        res.json({ message: 'Result deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
