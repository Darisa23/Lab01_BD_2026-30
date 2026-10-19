document.addEventListener('DOMContentLoaded', () => {

    const botonTema = document.getElementById('btn-tema');
    const documento = document.documentElement;

    function aplicarTema(tema) {
        documento.setAttribute('data-tema', tema);

        if (botonTema) {
            if (tema === 'oscuro') {
                botonTema.textContent = '☀️';
                botonTema.setAttribute('aria-label', 'Cambiar a modo claro');
            } else {
                botonTema.textContent = '🌙';
                botonTema.setAttribute('aria-label', 'Cambiar a modo oscuro');
            }
        }
    }

    // Cargar el tema guardado
    const temaGuardado = localStorage.getItem('tema') || 'claro';
    aplicarTema(temaGuardado);

    // Escuchar el botón, si existe en esta página
    if (botonTema) {
        botonTema.addEventListener('click', () => {
            const temaActual = documento.getAttribute('data-tema');
            const nuevoTema = temaActual === 'oscuro' ? 'claro' : 'oscuro';

            localStorage.setItem('tema', nuevoTema);
            aplicarTema(nuevoTema);
        });
    }

    const formLogin = document.getElementById('form-login');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const correo = document.getElementById('login-correo').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                // Intentar ingresar como lector
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

                // Intentar ingresar como personal
                res = await peticionAPI('/auth/login-personal', 'POST', {
                    correo,
                    password
                });

                if (res.ok) {
                    const usuarioPersonal =
                        res.data.bibliotecario || res.data.usuario;

                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('usuario', JSON.stringify(usuarioPersonal));
                    localStorage.setItem('tipo_cuenta', 'personal');

                    window.location.href = 'prestamos_admin.html';
                    return;
                }

                alert('Correo o contraseña incorrectos.');

            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                alert('No se pudo conectar con el servidor. Inténtalo nuevamente.');
            }
        });
    }


    const btnRegistrarse = document.getElementById('btn-registrarse');

    if (btnRegistrarse) {
        btnRegistrarse.addEventListener('click', () => {
            window.location.href = 'registro.html';
        });
    }

});