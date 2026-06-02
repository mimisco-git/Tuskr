/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PACKAGE_ID:      string
  readonly VITE_MARKETPLACE_ID:  string
  readonly VITE_NETWORK:         string
  readonly VITE_GROQ_API_KEY:    string
  readonly VITE_GOOGLE_CLIENT_ID:string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}
