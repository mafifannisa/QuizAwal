document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const btnLogin = document.getElementById('btn-login');

    // Cek jika sudah punya token
    if (localStorage.getItem('adminToken')) {
        window.location.href = 'admin.html';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = passwordInput.value;
        if (!password) return;

        btnLogin.disabled = true;
        btnLogin.textContent = 'Mengecek...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                // Berhasil login
                localStorage.setItem('adminToken', data.token);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Login berhasil, mengalihkan...',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'admin.html';
                });
            } else {
                // Gagal login
                Swal.fire({
                    icon: 'error',
                    title: 'Akses Ditolak',
                    text: data.error || 'Password salah!',
                    confirmButtonColor: '#f56565'
                });
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Login error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Koneksi Gagal',
                text: 'Tidak dapat menghubungi server.'
            });
        } finally {
            btnLogin.disabled = false;
            btnLogin.innerHTML = 'Masuk <i class="fas fa-sign-in-alt"></i>';
        }
    });
});
