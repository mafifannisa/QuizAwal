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
    
    // Pagination Elements
    const itemsPerPageSelect = document.getElementById('items-per-page-select');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageIndicator = document.getElementById('page-indicator');
    const pageStart = document.getElementById('page-start');
    const pageEnd = document.getElementById('page-end');
    const totalItems = document.getElementById('total-items');

    // Pagination state
    let currentPage = 1;
    let itemsPerPage = 10;
    
    const API_URL = '/api/results';
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        });
    }
    
    // Store data locally for modal access
    let globalData = [];

    function fetchResults() {
        resultsBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Memuat data...</td></tr>';
        
        fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('adminToken');
                    window.location.href = 'login.html';
                    throw new Error('Unauthorized');
                }
                return response.json();
            })
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
            if (totalItems) totalItems.textContent = '0';
            if (pageStart) pageStart.textContent = '0';
            if (pageEnd) pageEnd.textContent = '0';
            if (pageIndicator) pageIndicator.textContent = 'Halaman 1';
            if (btnPrevPage) btnPrevPage.disabled = true;
            if (btnNextPage) btnNextPage.disabled = true;
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
        
        // Pagination logic
        const total = sortedData.length;
        if (itemsPerPageSelect && itemsPerPageSelect.value === 'all') {
            itemsPerPage = total;
        } else if (itemsPerPageSelect) {
            itemsPerPage = parseInt(itemsPerPageSelect.value) || 10;
        }
        
        const maxPage = Math.ceil(total / itemsPerPage);
        if (currentPage > maxPage && maxPage > 0) currentPage = maxPage;
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, total);
        const paginatedData = sortedData.slice(startIndex, endIndex);
        
        // Update Pagination UI
        if (totalItems) totalItems.textContent = total;
        if (pageStart) pageStart.textContent = total === 0 ? 0 : startIndex + 1;
        if (pageEnd) pageEnd.textContent = endIndex;
        if (pageIndicator) pageIndicator.textContent = `Halaman ${currentPage} / ${maxPage || 1}`;
        
        if (btnPrevPage) btnPrevPage.disabled = currentPage === 1;
        if (btnNextPage) btnNextPage.disabled = currentPage === maxPage || maxPage === 0;
        
        paginatedData.forEach(result => {
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
                let isPartial = false;
                if (ans.is_correct && ans.student_answer && ans.correct_answer && String(ans.student_answer).trim() !== String(ans.correct_answer).trim()) {
                    isPartial = true;
                }
                
                let cardClass = ans.is_correct ? (isPartial ? 'partial' : 'correct') : 'wrong';
                let badgeClass = ans.is_correct ? (isPartial ? 'badge-partial' : 'badge-correct') : 'badge-wrong';
                let badgeText = ans.is_correct ? (isPartial ? 'Kurang Tepat' : 'Benar') : 'Salah';
                
                card.className = `answer-card ${cardClass}`;
                
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
                        <span class="badge ${badgeClass}">
                            ${badgeText}
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
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(response => {
                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('adminToken');
                        window.location.href = 'login.html';
                        throw new Error('Unauthorized');
                    }
                    return response.json();
                })
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
    
    sortSelect.addEventListener('change', () => {
        currentPage = 1;
        renderTable();
    });
    
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            itemsPerPage = val === 'all' ? globalData.length : parseInt(val);
            currentPage = 1;
            renderTable();
        });
    }

    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            const maxPage = Math.ceil(globalData.length / itemsPerPage);
            if (currentPage < maxPage) {
                currentPage++;
                renderTable();
            }
        });
    }
    
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
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    .then(response => {
                        if (response.status === 401 || response.status === 403) {
                            localStorage.removeItem('adminToken');
                            window.location.href = 'login.html';
                            throw new Error('Unauthorized');
                        }
                        return response.json();
                    })
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
