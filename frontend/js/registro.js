document.addEventListener('DOMContentLoaded', () => {

  const formRegistro = document.getElementById('form-registro-lector');
  const btnVolverLogin = document.getElementById('btn-volver-login');
  const btnCrearCuenta = document.getElementById('btn-crear-cuenta');

  // 1. Registrar un nuevo lector
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

    // Evitar enviar dos veces el formulario mientras se procesa
    btnCrearCuenta.disabled = true;
    btnCrearCuenta.textContent = 'Creando cuenta...';

    try {

      const res = await peticionAPI('/auth/registro', 'POST', payload);

      if (res.ok) {

        // Guardar los datos de la sesión
        localStorage.setItem('token', res.data.token);

        localStorage.setItem(
          'usuario',
          JSON.stringify(res.data.usuario)
        );

        localStorage.setItem('tipo_cuenta', 'usuario');

        alert('Registro exitoso. ¡Bienvenido a la Biblioteca Universitaria!');

        // Redirigir al catálogo
        window.location.href = 'catalogo.html';

      } else {

        alert(
          res.error?.mensaje ||
          'No se pudo completar el registro.'
        );

      }

    } catch (error) {

      console.error('Error durante el registro:', error);

      alert(
        'No se pudo conectar con el servidor. Inténtalo nuevamente.'
      );

    } finally {

      // Reactivar el botón si la página sigue abierta
      btnCrearCuenta.disabled = false;
      btnCrearCuenta.textContent = 'Crear Cuenta';

    }

  });


  // 2. Volver al inicio de sesión
  btnVolverLogin.addEventListener('click', () => {

    window.location.href = 'index.html';

  });

});