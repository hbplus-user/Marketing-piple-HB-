import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Unique per build. Baked into the bundle and also published as /version.json, so a
// tab left open across a deploy can tell it is running old code and reload itself
// (see UpdateBanner). Old code is not just stale UI here — it writes stale data.
const BUILD_ID = Date.now().toString(36)

const versionFile = (): Plugin => ({
  name: 'pipeline-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId: BUILD_ID }),
    })
  },
})

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
  ],
})
