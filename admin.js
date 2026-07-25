document.addEventListener('DOMContentLoaded', () => {
    const resultsBody = document.getElementById('results-body');
    const btnRefresh = document.getElementById('btn-refresh');
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');
    const sortSelect = document.getElementById('sort-select');
    
    // Modal Elements
    const detailModal = document.getElementById('detail-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalStudentName = document.getElementById('modal-student-name');
    const modalAnswersContainer = document.getElementById('modal-answers-container');
    
    const API_URL = '/api/results';
    
    // Store data locally for modal access
    let globalData = [];

    function fetchResults() {
        resultsBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Memuat data...</td></tr>';
        
        fetch(API_URL)
            .then(response => response.json())
            .then(data => {
                globalData = data;
                renderTable();
            })
            .catch(error => {
                console.error('Error fetching results:', error);
                resultsBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">Gagal memuat data dari server. Pastikan server berjalan.</td></tr>';
            });
    }

    function renderTable() {
        resultsBody.innerHTML = '';
        
        if (globalData.length === 0) {
            resultsBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">Belum ada data nilai.</td></tr>';
            return;
        }
        
        // Urutkan data berdasarkan pilihan
        const sortMethod = sortSelect.value;
        const sortedData = [...globalData].sort((a, b) => {
            if (sortMethod === 'time-desc') {
                return new Date(b.timestamp) - new Date(a.timestamp);
            } else if (sortMethod === 'time-asc') {
                return new Date(a.timestamp) - new Date(b.timestamp);
            } else if (sortMethod === 'score-desc') {
                return b.score - a.score;
            } else if (sortMethod === 'score-asc') {
                return a.score - b.score;
            }
        });
        
        sortedData.forEach(result => {
            const tr = document.createElement('tr');
            
            const dateObj = new Date(result.timestamp);
            const timeStr = `${dateObj.toLocaleDateString('id-ID')} ${dateObj.toLocaleTimeString('id-ID')}`;
            
            tr.innerHTML = `
                <td><span style="font-size: 0.9em; color: var(--text-muted);">${timeStr}</span></td>
                <td style="font-weight: 600;">${result.absen || '-'}</td>
                <td style="font-weight: 600;">${result.name}</td>
                <td style="color: var(--success-dark); font-weight: 700;">${result.correct_count}</td>
                <td style="color: var(--danger-dark); font-weight: 700;">${result.wrong_count}</td>
                <td style="color: var(--primary-dark); font-weight: 800; font-size: 1.1em;">${result.score}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-view" data-id="${result.id}">Detail</button>
                        <button class="btn-icon btn-delete-single" data-id="${result.id}" title="Hapus Data Ini">
                            <i class="fas fa-trash-alt" style="pointer-events: none;"></i>
                        </button>
                    </div>
                </td>
            `;
            resultsBody.appendChild(tr);
        });
    }

    function openModal(sessionId) {
        const session = globalData.find(s => s.id == sessionId);
        if (!session) return;
        
        modalStudentName.textContent = session.name;
        modalAnswersContainer.innerHTML = '';
        
        if (!session.answers || session.answers.length === 0) {
            modalAnswersContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Tidak ada detail jawaban tersedia untuk sesi ini.</p>';
        } else {
            session.answers.forEach((ans, index) => {
                const card = document.createElement('div');
                card.className = `answer-card ${ans.is_correct ? 'correct' : 'wrong'}`;
                
                card.innerHTML = `
                    <div class="q-num">Pertanyaan ${index + 1}</div>
                    <div class="q-text">${ans.question_text}</div>
                    <div class="ans-row">
                        <span class="ans-label">Jawaban Siswa:</span>
                        <span class="ans-value">${ans.student_answer || '-'}</span>
                    </div>
                    <div class="ans-row">
                        <span class="ans-label">Kunci Jawaban:</span>
                        <span class="ans-value">${ans.correct_answer}</span>
                    </div>
                    <div style="margin-top: 10px; text-align: right;">
                        <span class="badge ${ans.is_correct ? 'badge-correct' : 'badge-wrong'}">
                            ${ans.is_correct ? 'Benar' : 'Salah'}
                        </span>
                    </div>
                `;
                modalAnswersContainer.appendChild(card);
            });
        }
        
        detailModal.classList.add('active');
    }

    function closeModal() {
        detailModal.classList.remove('active');
    }

    function clearResults() {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Tindakan ini akan menghapus semua data nilai siswa dan tidak dapat dibatalkan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger-color)',
            cancelButtonColor: '#cbd5e0',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(API_URL, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(() => {
                    fetchResults();
                    Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
                })
                .catch(error => {
                    console.error('Error clearing results:', error);
                    Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
                });
            }
        });
    }

    function exportToExcel() {
        if (!window.XLSX) {
            Swal.fire('Error', 'Library Excel belum dimuat, silakan periksa koneksi internet Anda.', 'error');
            return;
        }
        
        // Prepare detailed data for Excel instead of just the HTML table
        const excelData = [];
        globalData.forEach(session => {
            const dateObj = new Date(session.timestamp);
            const timeStr = `${dateObj.toLocaleDateString('id-ID')} ${dateObj.toLocaleTimeString('id-ID')}`;
            
            excelData.push({
                'Waktu Selesai': timeStr,
                'No. Absen': session.absen,
                'Nama Siswa': session.name,
                'Jml Benar': session.correct_count,
                'Jml Salah': session.wrong_count,
                'Nilai Total': session.score
            });
        });
        
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap_Nilai");
        XLSX.writeFile(wb, "Rekap_Nilai_Ujian_Matematika.xlsx");
    }

    btnRefresh.addEventListener('click', fetchResults);
    btnClear.addEventListener('click', clearResults);
    btnExport.addEventListener('click', exportToExcel);
    sortSelect.addEventListener('change', renderTable);
    
    btnCloseModal.addEventListener('click', closeModal);
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeModal();
    });

    // Event delegation untuk tombol hapus satuan dan tombol detail
    resultsBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-single')) {
            const id = e.target.getAttribute('data-id');
            
            Swal.fire({
                title: 'Hapus data ini?',
                text: "Data nilai siswa ini akan dihapus secara permanen!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#f56565',
                cancelButtonColor: '#cbd5e0',
                confirmButtonText: 'Ya, Hapus!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`${API_URL}/${encodeURIComponent(id)}`, {
                        method: 'DELETE'
                    })
                    .then(response => response.json())
                    .then(() => {
                        fetchResults();
                        Swal.fire('Terhapus!', 'Data siswa berhasil dihapus.', 'success');
                    })
                    .catch(error => {
                        console.error('Error deleting single result:', error);
                        Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus data.', 'error');
                    });
                }
            });
        }
        
        if (e.target.classList.contains('btn-view')) {
            const id = e.target.getAttribute('data-id');
            openModal(id);
        }
    });

    // Initial load
    fetchResults();
    
    // Auto-refresh setiap 10 detik
    setInterval(fetchResults, 10000);
});
