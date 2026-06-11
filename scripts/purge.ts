import { runMigrations, closeDb } from '../src/storage'
import { PurgeJob }               from '../src/storage/PurgeJob'

async function main() {
  await runMigrations()
  const job = new PurgeJob()
  await job.run()
  await closeDb()
}

main().catch(e => { console.error('[purge] Failed:', e); process.exit(1) })
