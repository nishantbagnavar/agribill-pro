const http = require('http');

const data = JSON.stringify({
  name: 'Urea',
  unit: 'bag',
  category_id: 1,
  purchase_price: 5050,
  selling_price: 60,
  mrp: 70,
  current_stock: 10,
  min_stock_alert: 5,
  gst_rate: 0
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.argv[2]
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
