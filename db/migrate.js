import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { Pool } from '@neondatabase/serverless'

config()

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in .env')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const migrationsDir = join(__dirname, 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), 'utf8')
    const statements = content
      .split(';')
      .map((s) =>
        s
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim(),
      )
      .filter((s) => s.length > 0)

    console.log(`Running migration: ${file}`)
    for (const statement of statements) {
      await pool.query(statement)
    }
    console.log(`  ✓ ${file} complete`)
  }

  await pool.end()
  console.log('All migrations complete.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
