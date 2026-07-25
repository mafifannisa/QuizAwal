const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'rahasia_guru_123';
const ADMIN_PASSWORD = 'guru123';

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
            kelas TEXT NOT NULL,
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
    
    // Check if kelas column exists (in case of migrating from older DB)
    const columns = await db.all("PRAGMA table_info(sessions)");
    const hasKelas = columns.some(col => col.name === 'kelas');
    if (!hasKelas) {
        await db.exec("ALTER TABLE sessions ADD COLUMN kelas TEXT DEFAULT '-'");
    }

    // Ensure foreign keys are enabled
    await db.get('PRAGMA foreign_keys = ON');
}

initDB().catch(console.error);

// Middleware Auth
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const token = bearerHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, authData) => {
            if (err) {
                res.sendStatus(403);
            } else {
                next();
            }
        });
    } else {
        res.sendStatus(401);
    }
}

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Password salah' });
    }
});

// Check if student already exists
app.get('/api/check', async (req, res) => {
    try {
        const { name, absen, kelas } = req.query;
        if (!name || !absen || !kelas) {
            return res.status(400).json({ error: 'Nama, absen, dan kelas wajib diisi' });
        }
        const row = await db.get('SELECT id FROM sessions WHERE absen = ? AND kelas = ?', [absen, kelas]);
        res.json({ exists: !!row });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to check data' });
    }
});

// Get all results
app.get('/api/results', verifyToken, async (req, res) => {
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
        if (!newResult.name || !newResult.absen || !newResult.kelas) {
            return res.status(400).json({ error: 'Nama, absen, dan kelas wajib diisi' });
        }
        
        const row = await db.get('SELECT id FROM sessions WHERE absen = ? AND kelas = ?', [newResult.absen, newResult.kelas]);
        if (row) {
            return res.status(403).json({ error: 'Student already took the exam' });
        }
        
        // ANTI-CHEAT: Server calculates score based on answers array
        let calculatedScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        const validAnswers = [];

        if (newResult.answers && Array.isArray(newResult.answers)) {
            for (let ans of newResult.answers) {
                let isCorrectServer = false;
                let isPartialServer = false;
                
                let sa = String(ans.studentAnswer).trim();
                let ca = String(ans.correctAnswer).trim();

                if (sa && ca) {
                    if (sa === ca) {
                        isCorrectServer = true;
                    } else if (ca.includes('/') && sa.includes('/')) {
                        const partsU = sa.split('/');
                        const partsC = ca.split('/');
                        if (partsU.length === 2 && partsC.length === 2) {
                            const uNum = parseFloat(partsU[0]);
                            const uDen = parseFloat(partsU[1]);
                            const cNum = parseFloat(partsC[0]);
                            const cDen = parseFloat(partsC[1]);
                            if (!isNaN(uNum) && !isNaN(uDen) && uDen !== 0 && cDen !== 0 && (uNum / uDen === cNum / cDen)) {
                                isPartialServer = true;
                            }
                        }
                    } else if (!ca.includes('/') && !isNaN(parseFloat(sa)) && parseFloat(sa) === parseFloat(ca)) {
                        isCorrectServer = true;
                    }
                }

                if (isCorrectServer) {
                    calculatedScore += 10;
                    correctCount++;
                } else if (isPartialServer) {
                    calculatedScore += 5;
                    correctCount++;
                } else {
                    calculatedScore -= 2;
                    wrongCount++;
                }

                validAnswers.push({
                    q: ans.questionText,
                    sa: ans.studentAnswer,
                    ca: ans.correctAnswer,
                    ic: isCorrectServer || isPartialServer
                });
            }
        }
        
        const insertSession = await db.run(
            'INSERT INTO sessions (name, absen, kelas, score, correct_count, wrong_count) VALUES (?, ?, ?, ?, ?, ?)',
            [newResult.name, newResult.absen, newResult.kelas, calculatedScore, correctCount, wrongCount]
        );
        
        const sessionId = insertSession.lastID;
        
        if (validAnswers.length > 0) {
            const stmt = await db.prepare('INSERT INTO answers (session_id, question_text, student_answer, correct_answer, is_correct) VALUES (?, ?, ?, ?, ?)');
            for (let ans of validAnswers) {
                await stmt.run(sessionId, ans.q, ans.sa, ans.ca, ans.ic);
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
app.delete('/api/results', verifyToken, async (req, res) => {
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
app.delete('/api/results/:id', verifyToken, async (req, res) => {
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
