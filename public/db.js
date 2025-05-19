const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.sa,
  password: process.env.Pa$$w0rd,
  server: process.env.localhost,
  database: process.env.ShoppingAA,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

module.exports = {
  sql, poolConnect, pool
};
