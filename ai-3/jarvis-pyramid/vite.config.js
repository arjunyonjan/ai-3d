export default {
  server: {
    proxy: {
      '/api/speak': 'http://localhost:8080',
      '/api/reason': 'http://localhost:8080',
    },
  },
};
