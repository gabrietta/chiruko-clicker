import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = env.VITE_SITE_URL || 'https://chiruko-clicker.netlify.app'

  return {
    plugins: [
      react(),
      {
        name: 'inject-social-site-url',
        transformIndexHtml: (html: string) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    ],
    // GitHub Actions supplies the repository path; local and Netlify builds
    // keep the relative default so they work from the site root.
    base: env.VITE_BASE_PATH || './',
    build: {
      sourcemap: false,
      minify: 'oxc',
    },
  }
})
