const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { pool, query } = require('../src/config/db');

const parsearArgumentos = () => {
  const args = process.argv.slice(2);

  let nombres = null;
  let correo = null;
  let password = null;

  const argsPosicionales = [];

  for (const arg of args) {
    if (arg.startsWith('--nombre=')) {
      nombres = arg.split('=')[1];
    } else if (arg.startsWith('--correo=')) {
      correo = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      password = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      argsPosicionales.push(arg);
    }
  }

  if (!nombres && argsPosicionales.length > 0) nombres = argsPosicionales[0];
  if (!correo && argsPosicionales.length > 1) correo = argsPosicionales[1];
  if (!password && argsPosicionales.length > 2) password = argsPosicionales[2];

  return { nombres, correo, password };
};

const ejecutar = async () => {
  const { nombres, correo, password } = parsearArgumentos();

  if (!nombres || !correo || !password) {
    console.error('\n[ERROR] Parámetros insuficientes para la creación del administrador.');
    console.log('\nModo de uso:');
    console.log('  node scripts/crear-admin.js <nombres> <correo> <contraseña>');
    console.log('\nEjemplo:');
    console.log('  node scripts/crear-admin.js "Administrador Principal" "admin@biblioteca.edu" "ClaveSegura123*"\n');
    process.exit(1);
  }

  // Validaciones básicas de formato
  const correoLimpio = correo.trim().toLowerCase();
  const nombresLimpios = nombres.trim();

  if (!correoLimpio.includes('@') || !correoLimpio.includes('.')) {
    console.error('\n[ERROR] El correo proporcionado no tiene un formato válido.');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('\n[ERROR] La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  try {
    console.log('[PROCESO] Generando hash de contraseña con bcrypt...');
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    console.log(`[PROCESO] Registrando/actualizando administrador: ${correoLimpio}...`);

    // Consulta con UPSERT sobre la restricción uq_bibliotecarios_correo
    const sql = `
      INSERT INTO bibliotecarios (nombres, correo, password_hash, rol, estado)
      VALUES ($1, $2, $3, 'administrador', 'activo')
      ON CONFLICT (correo)
      DO UPDATE SET
        nombres = EXCLUDED.nombres,
        password_hash = EXCLUDED.password_hash,
        rol = 'administrador',
        estado = 'activo'
      RETURNING id_bibliotecario, nombres, correo, rol, estado;
    `;

    const resultado = await query(sql, [nombresLimpios, correoLimpio, passwordHash]);
    const admin = resultado.rows[0];


    console.log('ADMINISTRADOR CREADO / ACTUALIZADO SATISFACTORIAMENTE');
    console.log('------------------------------------------------------');
    console.log(`  ID:       ${admin.id_bibliotecario}`);
    console.log(`  Nombres:  ${admin.nombres}`);
    console.log(`  Correo:   ${admin.correo}`);
    console.log(`  Rol:      ${admin.rol}`);
    console.log(`  Estado:   ${admin.estado}`);
    console.log('------------------------------------------------------\n');
  } catch (error) {
    console.error('\n[ERROR] Error al registrar el administrador en la base de datos:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

ejecutar();
