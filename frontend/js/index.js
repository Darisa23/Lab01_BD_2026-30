document.addEventListener('DOMContentLoaded', () => {
  const formLoginLector = document.getElementById('form-login-lector');
  const formLoginPersonal = document.getElementById('form-login-personal');
  const formRegistro = document.getElementById('form-registro-lector');

  // 1. Login de Lector (POST /auth/login)
  formLoginLector.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value;

    const res = await peticionAPI('/auth/login', 'POST', { correo, password });
    if (res.ok) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      localStorage.setItem('tipo_cuenta', 'usuario');
      window.location.href = 'catalogo.html';
    } else {
      alert(res.error?.mensaje || 'Error al iniciar sesión');
    }
  });

  // 2. Login de Personal (POST /auth/login-personal)
  formLoginPersonal.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('personal-correo').value.trim();
    const password = document.getElementById('personal-password').value;

    const res = await peticionAPI('/auth/login-personal', 'POST', { correo, password });
    if (res.ok) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.bibliotecario || res.data.usuario));
      localStorage.setItem('tipo_cuenta', 'personal');
      window.location.href = 'admin-prestamos.html';
    } else {
      alert(res.error?.mensaje || 'Credenciales de personal inválidas');
    }
  });

  // 3. Registro de Lector (POST /auth/registro)
  formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      codigo: document.getElementById('reg-codigo').value.trim(),
      identificacion: document.getElementById('reg-identificacion').value.trim(),
      nombres: document.getElementById('reg-nombres').value.trim(),
      correo: document.getElementById('reg-correo').value.trim(),
      password: document.getElementById('reg-password').value,
      rol: document.getElementById('reg-rol').value,
      carrera: document.getElementById('reg-carrera').value.trim() || undefined
    };

    const res = await peticionAPI('/auth/registro', 'POST', payload);
    if (res.ok) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
      localStorage.setItem('tipo_cuenta', 'usuario');
      alert('Registro exitoso. Bienvenido al catálogo.');
      window.location.href = 'catalogo.html';
    } else {
      alert(res.error?.mensaje || 'No se pudo completar el registro');
    }
  });
});