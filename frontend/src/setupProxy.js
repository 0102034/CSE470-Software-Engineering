const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
      xfwd: true,
      onProxyRes: function(proxyRes, req, res) {
        // Add CORS headers
        proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
      },
    })
  );
  
  // Socket.IO proxy
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      ws: true,
      secure: false,
    })
  );
};
