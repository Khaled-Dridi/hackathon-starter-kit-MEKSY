module.exports = {
  '/api': {
    target: process.env['BACKEND_HOST'] || 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    pathRewrite: { '^/api': '' }
  }
};
