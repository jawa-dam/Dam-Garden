const api = require('../lib/paypal');

module.exports = function(req, res) {
  const environment = process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    environment
  }));
};
