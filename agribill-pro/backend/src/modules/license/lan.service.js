const os = require('os');
const QRCode = require('qrcode');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

async function getLanQrBase64(port) {
  const ip = getLocalIp();
  const frontendPort = port || Number(process.env.FRONTEND_PORT) || 3000;
  const url = `http://${ip}:${frontendPort}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
  return { url, qr: dataUrl };
}

module.exports = { getLocalIp, getLanQrBase64 };
