/**
 * Angular dev-server proxy.
 *
 * Two rules:
 *   /api/*   → backend (with the /api prefix stripped). Used by HttpClient
 *              calls from Angular code.
 *   /files/* → backend, NO prefix rewrite. Used by browsers fetching
 *              uploaded images via <img src="/files/{uuid}">. The backend
 *              serves these at /files/{uuid} directly; if we routed them
 *              through /api/files/* the URL wouldn't match what the upload
 *              endpoint returns, and we'd need the backend to know about
 *              the dev proxy prefix (which it shouldn't).
 *
 * In prod, the reverse proxy in front of both services routes both /api
 * and /files to the backend, so the same URLs work everywhere.
 */
module.exports = {
  '/api': {
    target: process.env['BACKEND_HOST'] || 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/api': '' }
  },
  '/files': {
    target: process.env['BACKEND_HOST'] || 'http://localhost:8080',
    secure: false,
    changeOrigin: true
  }
};
