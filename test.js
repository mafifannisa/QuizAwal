const http = require('http');

const data = JSON.stringify({
    name: 'CHEATER',
    absen: '99',
    kelas: '9Z',
    score: 100, // Client tries to cheat
    correctCount: 10,
    wrongCount: 0,
    answers: [
        { questionText: "1 + 1", studentAnswer: "3", correctAnswer: "2" } // But they answered wrong
    ]
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/results',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('POST Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
