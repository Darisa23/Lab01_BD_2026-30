document.addEventListener('DOMContentLoaded', () => {

  const formLogin = document.getElementById('form-login');
  const btnRegistrarse = document.getElementById('btn-registrarse');

  // 1. Inicio de sesión
  formLogin.addEventListener('submit', async (e) => {

    e.preventDefault();

    const correo = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value;

    try {

      // Intentar iniciar sesión como lector
      let res = await peticionAPI('/auth/login', 'POST', {
        correo,
        password
      });

      if (res.ok) {

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
        localStorage.setItem('tipo_cuenta', 'usuario');

        window.location.href = 'catalogo.html';
        return;
      }

      // Si no pudo ingresar como lector, intentar como personal
      res = await peticionAPI('/auth/login-personal', 'POST', {
        correo,
        password
      });

      if (res.ok) {

        const usuarioPersonal = res.data.bibliotecario || res.data.usuario;

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('usuario', JSON.stringify(usuarioPersonal));
        localStorage.setItem('tipo_cuenta', 'personal');

        window.location.href = 'prestamos_admin.html';
        return;
      }

      // Si ambos intentos fallan
      alert('Correo o contraseña incorrectos.');

    } catch (error) {

      console.error('Error al iniciar sesión:', error);

      alert('No se pudo conectar con el servidor. Inténtalo nuevamente.');

    }

  });


  // 2. Redirigir al formulario de registro
  btnRegistrarse.addEventListener('click', () => {

    window.location.href = 'registro.html';

  });

});