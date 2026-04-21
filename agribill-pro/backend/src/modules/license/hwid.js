const { machineIdSync } = require('node-machine-id');

function getHwid() {
  return machineIdSync({ original: true });
}

module.exports = { getHwid };
