const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'results.json');

app.use(cors());
app.use(express.json());

// Melayani file HTML statis (index.html, admin.html, dll) yang ada di folder luar
app.use(express.static(path.join(__dirname, '../')));

// Helper to read data
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// Helper to write data
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Check if student already exists
app.get('/api/check', (req, res) => {
    try {
        const { name, absen } = req.query;
        if (!name || !absen) {
            return res.status(400).json({ error: 'Name and absen are required' });
        }
        const data = readData();
        const exists = data.some(result => 
            parseInt(result.absen, 10) === parseInt(absen, 10)
        );
        res.json({ exists });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check data' });
    }
});

// Get all results
app.get('/api/results', (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// Save a new result
app.post('/api/results', (req, res) => {
    try {
        const newResult = req.body;
        // Basic validation
        if (!newResult.name || !newResult.absen) {
            return res.status(400).json({ error: 'Name and absen are required' });
        }
        
        const data = readData();
        
        // Cek apakah sudah ada (mencegah cache browser lama)
        const exists = data.some(result => 
            parseInt(result.absen, 10) === parseInt(newResult.absen, 10)
        );
        
        if (exists) {
            return res.status(403).json({ error: 'Student already took the exam' });
        }
        
        newResult.timestamp = new Date().toISOString();
        
        data.push(newResult);
        writeData(data);
        
        res.status(201).json({ message: 'Result saved successfully', result: newResult });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Clear all results (for admin)
app.delete('/api/results', (req, res) => {
    try {
        writeData([]);
        res.json({ message: 'All results cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

// Delete a specific result by timestamp
app.delete('/api/results/:timestamp', (req, res) => {
    try {
        const { timestamp } = req.params;
        const data = readData();
        const newData = data.filter(r => r.timestamp !== timestamp);
        writeData(newData);
        res.json({ message: 'Result deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
