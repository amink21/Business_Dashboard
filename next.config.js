const os = require('os');

// Opening the dev server from a phone on the same wifi makes the request cross-origin
// from Next's point of view. Allow this machine's own LAN addresses so the check
// keeps working when DHCP hands out a different IP.
const lanOrigins = Object.values(os.networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

/** @type {import('next').NextConfig} */
module.exports = {
  allowedDevOrigins: Array.from(new Set(lanOrigins)),
};
