document.addEventListener('DOMContentLoaded', () => {
    const resultsBody = document.getElementById('results-body');
    const btnRefresh = document.getElementById('btn-refresh');
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');
    const sortSelect = document.getElementById('sort-select');
    
    const API_URL = '/api/results';

    function fetchResults() {
        resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Memuat data...</td></tr>';
        
        fetch(API_URL)
            .then(response => response.json())
            .then(data => {
                resultsBody.innerHTML = '';
                
                if (data.length === 0) {
                    resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Belum ada data nilai.</td></tr>';
                    return;
                }
                
                // Urutkan data berdasarkan pilihan
                const sortMethod = sortSelect.value;
                data.sort((a, b) => {
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
                
                data.forEach(result => {
                    const tr = document.createElement('tr');
                    
                    const dateObj = new Date(result.timestamp);
                    const timeStr = `${dateObj.toLocaleDateString('id-ID')} ${dateObj.toLocaleTimeString('id-ID')}`;
                    
                    const nilaiBenar = result.correctCount * 10;
                    const nilaiSalah = result.wrongCount * -2;
                    
                    tr.innerHTML = `
                        <td>${timeStr}</td>
                        <td style="font-weight: 600;">${result.absen || '-'}</td>
                        <td style="font-weight: 600;">${result.name}</td>
                        <td style="color: #008a39; font-weight: 800; font-size: 1.1em;">${result.correctCount}</td>
                        <td style="color: #d92550; font-weight: 800; font-size: 1.1em;">${result.wrongCount}</td>
                        <td style="color: #008a39; font-weight: 800; font-size: 1.1em;">${nilaiBenar}</td>
                        <td style="color: #d92550; font-weight: 800; font-size: 1.1em;">${nilaiSalah}</td>
                        <td style="color: #4a00e0; font-weight: 900; font-size: 1.2em;">${result.score}</td>
                        <td>
                            <button class="btn-danger btn-delete-single" data-timestamp="${result.timestamp}" style="padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer;" title="Hapus Data Ini">
                                <i class="fas fa-trash-alt" style="pointer-events: none;"></i>
                            </button>
                        </td>
                    `;
                    resultsBody.appendChild(tr);
                });
            })
            .catch(error => {
                console.error('Error fetching results:', error);
                resultsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger);">Gagal memuat data dari server. Pastikan server Node.js berjalan.</td></tr>';
            });
    }

    function clearResults() {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Tindakan ini akan menghapus semua data nilai siswa dan tidak dapat dibatalkan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d92550',
            cancelButtonColor: '#6c757d',
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
        
        const table = document.getElementById('results-table');
        const wb = XLSX.utils.table_to_book(table, {sheet: "Nilai Siswa"});
        XLSX.writeFile(wb, "Rekap_Nilai_Ujian_Matematika.xlsx");
    }

    btnRefresh.addEventListener('click', fetchResults);
    btnClear.addEventListener('click', clearResults);
    btnExport.addEventListener('click', exportToExcel);
    sortSelect.addEventListener('change', fetchResults);

    // Event delegation untuk tombol hapus satuan
    resultsBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-single')) {
            const timestamp = e.target.getAttribute('data-timestamp');
            
            Swal.fire({
                title: 'Hapus data ini?',
                text: "Data nilai siswa ini akan dihapus secara permanen!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d92550',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Ya, Hapus!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`${API_URL}/${encodeURIComponent(timestamp)}`, {
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
    });

    // Initial load
    fetchResults();
    
    // Auto-refresh setiap 10 detik
    setInterval(fetchResults, 10000);
});
