/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_DATABASE_URL: string
  readonly VITE_NEON_API_KEY: string
  readonly VITE_NEON_PROJECT_ID: string
  readonly VITE_NEON_BRANCH_ID: string
  readonly VITE_NEON_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}