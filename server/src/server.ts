import { ConfigError } from './lib/ConfigError.js'

// Configuration is validated as soon as `./config/env.js` is evaluated (it's
// imported transitively by `./app.js`), so that import is done dynamically
// here and wrapped in a try/catch — a missing/blank Supabase credential
// prints one clear message and exits instead of crashing with a raw stack
// trace.
async function main() {
  const { createApp } = await import('./app.js')
  const { env } = await import('./config/env.js')

  const app = createApp()

  app.listen(env.port, env.host, () => {
    console.log(`API server listening on http://${env.host}:${env.port} (${env.nodeEnv})`)
  })
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(`\nServer configuration error: ${error.message}\n`)
    process.exit(1)
  }
  throw error
})
