/**
 * Levanta un PostgreSQL local embebido para desarrollo, sin necesidad de instalar
 * PostgreSQL ni Docker. Los datos persisten en backend/.pgdata.
 *
 * Uso:  npm run db:local   (dejar la terminal abierta; Ctrl+C para detener)
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '../.pgdata');
const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'convive',
    port: PORT,
    persistent: true,
  });

  const firstRun = !fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
  if (firstRun) {
    console.log('Inicializando el clúster de PostgreSQL en', DATA_DIR);
    await pg.initialise();
  }
  await pg.start();

  if (firstRun) {
    await pg.createDatabase('convive');
    console.log('Base de datos "convive" creada.');
  }

  console.log(`PostgreSQL local escuchando en el puerto ${PORT}.`);
  console.log(`DATABASE_URL="postgresql://postgres:convive@localhost:${PORT}/convive?schema=public"`);
  console.log('Presione Ctrl+C para detenerlo.');

  const stop = async () => {
    console.log('\nDeteniendo PostgreSQL...');
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('No fue posible iniciar PostgreSQL local:', err);
  process.exit(1);
});
