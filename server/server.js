const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 EncoderX E-Commerce Server is running at: http://localhost:${PORT}`);
  console.log(`📊 Admin Panel accessible at: http://localhost:${PORT}/#admin`);
  console.log(`📦 REST API Base: http://localhost:${PORT}/api`);
});
