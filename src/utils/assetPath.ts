/**
 * Resolve a file from public/ so it works both at the site root (Netlify)
 * and under a repository path (GitHub Pages project sites).
 */
export const assetPath = (path: string | undefined) => {
  if (!path) return ''
  const normalized = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${normalized}`
}
