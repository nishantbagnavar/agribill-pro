const net = require('net');
const os = require('os');
const fs = require('fs');

function getLocalSubnet() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        return parts.slice(0, 3).join('.');
      }
    }
  }
  return null;
}

function probePort(host, port, timeoutMs = 600) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

async function discoverNetworkPrinters() {
  const subnet = getLocalSubnet();
  if (!subnet) return [];

  const CONCURRENCY = 25;
  const found = [];
  const hosts = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

  for (let i = 0; i < hosts.length; i += CONCURRENCY) {
    const batch = hosts.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (host) => {
        const open = await probePort(host, 9100);
        return open ? host : null;
      })
    );
    found.push(...results.filter(Boolean));
  }

  return found.map((host) => ({
    type: 'tcp',
    interface: `tcp://${host}:9100`,
    label: `Network Printer (${host})`,
  }));
}

function discoverUsbPrinters() {
  const candidates = [];

  if (process.platform === 'win32') {
    for (let i = 1; i <= 4; i++) {
      candidates.push({
        type: 'usb',
        interface: `//./USB00${i}`,
        label: `USB Printer ${i} (//./USB00${i})`,
      });
    }
  } else {
    const linuxPaths = ['/dev/usb/lp0', '/dev/usb/lp1', '/dev/usb/lp2', '/dev/ttyUSB0'];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) {
        candidates.push({
          type: 'usb',
          interface: p,
          label: `USB Printer (${p})`,
        });
      }
    }
  }

  return candidates;
}

module.exports = { discoverNetworkPrinters, discoverUsbPrinters };
