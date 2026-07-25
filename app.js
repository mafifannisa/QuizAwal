document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const endScreen = document.getElementById('end-screen');
    
    const studentNameInput = document.getElementById('student-name');
    const studentAbsenInput = document.getElementById('student-absen');
    const studentKelasInput = document.getElementById('student-kelas');
    const btnStart = document.getElementById('btn-start');
    const btnSubmit = document.getElementById('btn-submit');
    const btnRestart = document.getElementById('btn-restart');
    
    const timeDisplay = document.getElementById('time-display');
    const questionNumberEl = document.getElementById('question-number');
    const currentScoreEl = document.getElementById('current-score');
    const questionText = document.getElementById('question-text');
    const answerInput = document.getElementById('answer-input');
    const feedbackEl = document.getElementById('feedback');
    
    const finalScoreEl = document.getElementById('final-score');
    const correctCountEl = document.getElementById('correct-count');
    const wrongCountEl = document.getElementById('wrong-count');

    // Game State
    let timer;
    let timeLeft;
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let currentAnswer = '';
    let isWaiting = false;
    let currentScreenId = 'start-screen';
    let studentName = '';
    let studentAbsen = '';
    let studentKelas = '';
    let currentQuestionIndex = 1;
    let detailedAnswers = [];
    let currentQuestionText = '';
    const TOTAL_QUESTIONS = 10;
    const TIME_PER_QUESTION = 120; // 2 minutes

    // State Persistence
    function saveState() {
        if (currentScreenId === 'start-screen') {
            sessionStorage.removeItem('quizState');
            return;
        }

        const state = {
            timeLeft,
            score,
            correctCount,
            wrongCount,
            currentAnswer,
            questionHTML: questionText.innerHTML,
            currentScreenId,
            studentName,
            studentAbsen,
            studentKelas,
            currentQuestionIndex,
            detailedAnswers,
            currentQuestionText
        };
        sessionStorage.setItem('quizState', JSON.stringify(state));
    }

    function loadState() {
        const saved = sessionStorage.getItem('quizState');
        if (saved) {
            const state = JSON.parse(saved);
            timeLeft = state.timeLeft;
            score = state.score;
            correctCount = state.correctCount;
            wrongCount = state.wrongCount;
            currentAnswer = state.currentAnswer;
            currentScreenId = state.currentScreenId;
            studentName = state.studentName || '';
            studentAbsen = state.studentAbsen || '';
            studentKelas = state.studentKelas || '';
            currentQuestionIndex = state.currentQuestionIndex || 1;
            detailedAnswers = state.detailedAnswers || [];
            currentQuestionText = state.currentQuestionText || '';
            
            if (studentName) studentNameInput.value = studentName;
            if (studentAbsen) studentAbsenInput.value = studentAbsen;
            if (studentKelas) studentKelasInput.value = studentKelas;
            
            if (currentScreenId === 'quiz-screen') {
                if (questionNumberEl) questionNumberEl.textContent = currentQuestionIndex;
                currentScoreEl.textContent = score;
                questionText.innerHTML = state.questionHTML;
                updateTimeDisplay();
                showScreen(quizScreen);
                startTimer();
            } else if (currentScreenId === 'end-screen') {
                finalScoreEl.textContent = score;
                correctCountEl.textContent = correctCount;
                wrongCountEl.textContent = wrongCount;
                showScreen(endScreen);
            }
        }
    }

    function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            if (isWaiting) return;
            
            timeLeft--;
            updateTimeDisplay();
            saveState();
            
            if (timeLeft <= 0) {
                handleTimeout();
            }
        }, 1000);
    }

    function handleTimeout() {
        isWaiting = true;
        wrongCount++;
        feedbackEl.textContent = `Waktu Habis! Jawaban: ${currentAnswer}`;
        feedbackEl.className = 'feedback wrong';
        
        setTimeout(() => {
            nextQuestion();
        }, 1500);
    }

    function nextQuestion() {
        if (currentQuestionIndex >= TOTAL_QUESTIONS) {
            endGame();
        } else {
            currentQuestionIndex++;
            if (questionNumberEl) questionNumberEl.textContent = currentQuestionIndex;
            generateQuestion();
        }
    }

    // Switch screens with animation
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            setTimeout(() => { if(!s.classList.contains('active')) s.style.display = 'none'; }, 400);
        });
        screen.style.display = 'block';
        setTimeout(() => screen.classList.add('active'), 10);
        currentScreenId = screen.id;
    }

    // Helper: GCD for fractions
    function gcd(a, b) {
        return b ? gcd(b, a % b) : Math.abs(a);
    }
    
    // Helper: Simplify fraction
    function simplifyFraction(num, den) {
        if (den === 0) return 'undefined';
        const common = gcd(num, den);
        num = num / common;
        den = den / common;
        if (den < 0) { num = -num; den = -den; }
        return den === 1 ? `${num}` : `${num}/${den}`;
    }

    // Generate Question
    function generateQuestion() {
        const types = ['integer', 'decimal', 'fraction'];
        const type = types[Math.floor(Math.random() * types.length)];
        const ops = ['+', '-', '*', '/'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        
        let qText = '';
        let ans = '';
        let note = '';

        if (type === 'integer') {
            let a = Math.floor(Math.random() * 20) + 1;
            let b = Math.floor(Math.random() * 20) + 1;
            
            // For division, ensure nice numbers (no remainders)
            if (op === '/') {
                a = a * b; // Now a/b will definitely be an integer
            }
            
            qText = `${a} ${op.replace('*','×').replace('/','÷')} ${b}`;
            
            let rawAns;
            switch(op) {
                case '+': rawAns = a + b; break;
                case '-': rawAns = a - b; break;
                case '*': rawAns = a * b; break;
                case '/': rawAns = a / b; break;
            }
            ans = rawAns.toString();
        } 
        else if (type === 'decimal') {
            let a = (Math.random() * 10).toFixed(1);
            let b = (Math.random() * 10).toFixed(1);
            if (op === '/') {
                b = (Math.random() * 9 + 1).toFixed(1); // prevent divide by zero
            }
            
            // calc safely
            let aNum = parseFloat(a);
            let bNum = parseFloat(b);
            let rawAns;
            switch(op) {
                case '+': rawAns = aNum + bNum; break;
                case '-': rawAns = aNum - bNum; break;
                case '*': rawAns = aNum * bNum; break;
                case '/': rawAns = aNum / bNum; break;
            }
            
            // Allow up to 2 decimal places in the answer
            ans = parseFloat(rawAns.toFixed(2)).toString();
            
            qText = `${a} ${op.replace('*','×').replace('/','÷')} ${b}`;
            if (op === '/' || op === '*') {
                note = '<span class="decimal-note">(Bulatkan maks 2 desimal)</span>';
            }
        }
        else if (type === 'fraction') {
            let n1 = Math.floor(Math.random() * 5) + 1;
            let d1 = Math.floor(Math.random() * 4) + 2;
            let n2 = Math.floor(Math.random() * 5) + 1;
            let d2 = Math.floor(Math.random() * 4) + 2;
            
            qText = `${n1}/${d1} ${op.replace('*','×').replace('/','÷')} ${n2}/${d2}`;
            
            let resN, resD;
            switch(op) {
                case '+':
                    resN = n1 * d2 + n2 * d1;
                    resD = d1 * d2;
                    break;
                case '-':
                    resN = n1 * d2 - n2 * d1;
                    resD = d1 * d2;
                    break;
                case '*':
                    resN = n1 * n2;
                    resD = d1 * d2;
                    break;
                case '/':
                    resN = n1 * d2;
                    resD = d1 * n2;
                    break;
            }
            ans = simplifyFraction(resN, resD);
        }
        
        questionText.innerHTML = qText + note;
        currentAnswer = ans;
        currentQuestionText = qText;
        
        timeLeft = TIME_PER_QUESTION;
        updateTimeDisplay();
        
        feedbackEl.textContent = '';
        answerInput.value = '';
        isWaiting = false;
        saveState();
        answerInput.focus();
    }

    // Start Game
    btnStart.addEventListener('click', async () => {
        studentName = studentNameInput.value.trim().toUpperCase();
        studentAbsen = studentAbsenInput.value.trim();
        studentKelas = studentKelasInput.value.trim().toUpperCase();
        if (!studentName || !studentAbsen || !studentKelas) {
            Swal.fire({
                icon: 'warning',
                title: 'Data Belum Lengkap',
                text: 'Silakan masukkan Nama, Nomor Absen, dan Kelas Anda sebelum memulai ujian!',
                confirmButtonColor: 'var(--primary)'
            }).then(() => {
                if (!studentName) studentNameInput.focus();
                else if (!studentAbsen) studentAbsenInput.focus();
                else studentKelasInput.focus();
            });
            return;
        }

        btnStart.disabled = true;
        btnStart.textContent = 'Mengecek...';

        try {
            const response = await fetch(`/api/check?name=${encodeURIComponent(studentName)}&absen=${encodeURIComponent(studentAbsen)}&kelas=${encodeURIComponent(studentKelas)}`);
            const data = await response.json();
            
            if (data.exists) {
                Swal.fire({
                    icon: 'error',
                    title: 'Akses Ditolak',
                    text: 'Siswa dengan nama dan nomor absen ini sudah pernah menyelesaikan ujian. Anda tidak dapat mengulang!',
                    confirmButtonColor: 'var(--danger)'
                });
                btnStart.disabled = false;
                btnStart.textContent = 'Mulai Ujian';
                return;
            }
        } catch (error) {
            console.error('Error mengecek status siswa:', error);
        }

        btnStart.disabled = false;
        btnStart.textContent = 'Mulai Ujian';

        score = 0;
        correctCount = 0;
        wrongCount = 0;
        currentQuestionIndex = 1;
        detailedAnswers = [];
        if (questionNumberEl) questionNumberEl.textContent = currentQuestionIndex;
        
        currentScoreEl.textContent = score;
        feedbackEl.textContent = '';
        answerInput.value = '';
        isWaiting = false;
        
        generateQuestion();
        showScreen(quizScreen);
        
        // Timeout to let screen transition finish before focus
        setTimeout(() => answerInput.focus(), 400);
        
        startTimer();
        saveState();
    });
    
    function updateTimeDisplay() {
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${m}:${s}`;
        
        if (timeLeft <= 10) {
            timeDisplay.style.color = 'var(--danger)';
        } else {
            timeDisplay.style.color = 'var(--secondary)';
        }
    }
    
    // Submit Answer
    function submitAnswer() {
        if (isWaiting) return;
        
        let userAns = answerInput.value.trim();
        if (userAns === '') return;
        
        // normalize user answer (handle comma as decimal point)
        userAns = userAns.replace(',', '.');
        
        let isCorrect = false;
        let isPartial = false;
        
        if (currentAnswer.includes('/')) {
            // Check fraction string explicitly
            if (userAns === currentAnswer) {
                isCorrect = true;
            } else if (userAns.includes('/')) {
                const partsU = userAns.split('/');
                const partsC = currentAnswer.split('/');
                if (partsU.length === 2 && partsC.length === 2) {
                    const uNum = parseFloat(partsU[0]);
                    const uDen = parseFloat(partsU[1]);
                    const cNum = parseFloat(partsC[0]);
                    const cDen = parseFloat(partsC[1]);
                    if (!isNaN(uNum) && !isNaN(uDen) && uDen !== 0 && cDen !== 0 && (uNum / uDen === cNum / cDen)) {
                        isPartial = true;
                    }
                }
            }
        } else {
            // Check numeric value for integers/decimals
            isCorrect = (parseFloat(userAns) === parseFloat(currentAnswer));
        }

        if (isCorrect) {
            score += 10;
            correctCount++;
            feedbackEl.textContent = 'Benar! +10';
            feedbackEl.className = 'feedback correct';
        } else if (isPartial) {
            score += 5;
            correctCount++;
            feedbackEl.textContent = 'Benar (Belum Sederhana)! +5';
            feedbackEl.className = 'feedback partial';
        } else {
            score -= 2; // Penalty for wrong answer
            wrongCount++;
            feedbackEl.textContent = `Salah! Jawaban: ${currentAnswer}`;
            feedbackEl.className = 'feedback wrong';
        }
        
        detailedAnswers.push({
            questionText: currentQuestionText,
            studentAnswer: userAns,
            correctAnswer: currentAnswer,
            isCorrect: isCorrect || isPartial
        });
        
        currentScoreEl.textContent = score;
        isWaiting = true;
        saveState();
        
        setTimeout(() => {
            nextQuestion();
        }, 1500);
    }
    
    btnSubmit.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });
    
    // End Game
    function endGame() {
        clearInterval(timer);
        finalScoreEl.textContent = score;
        correctCountEl.textContent = correctCount;
        wrongCountEl.textContent = wrongCount;
        showScreen(endScreen);
        saveState();
        
        fetch('/api/results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: studentName,
                absen: studentAbsen,
                kelas: studentKelas,
                score: score,
                correctCount: correctCount,
                wrongCount: wrongCount,
                answers: detailedAnswers
            })
        }).catch(err => console.error('Error saving result:', err));
    }
    
    // Restart
    btnRestart.addEventListener('click', () => {
        showScreen(startScreen);
        saveState();
    });

    // Load state on startup
    loadState();
});
