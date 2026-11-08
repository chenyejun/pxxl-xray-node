// Fetch the latest official Xray-core release, unpack the linux-64 binary.
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API = 'https://api.github.com/repos/XTLS/Xray-core/releases/latest';

function getJson(u) {
  return new Promise((resolve, reject) => {
    https.get(u, { headers: { 'User-Agent': 'pxxl-node-setup' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return getJson(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function download(u, file) {
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(file);
    https.get(u, { headers: { 'User-Agent': 'pxxl-node-setup' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        f.close();
        return download(res.headers.location, file).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      res.pipe(f);
      f.on('finish', () => f.close(resolve));
    }).on('error', reject);
  });
}

(async () => {
  const dir = __dirname;
  const bin = path.join(dir, 'xray');
  const zip = path.join(dir, 'xray.zip');
  if (!fs.existsSync(bin)) {
    const rel = await getJson(API);
    const asset = (rel.assets || []).find((a) => a.name === 'Xray-linux-64.zip');
    if (!asset) throw new Error('Xray-linux-64.zip not found in latest release');
    console.log('downloading', rel.tag_name, asset.browser_download_url);
    await download(asset.browser_download_url, zip);
    execSync('python3 -c "import zipfile; zipfile.ZipFile(\'xray.zip\').extractall(\'.\')" && mv -f xray xray-bin && chmod +x xray-bin && rm -f xray.zip', { cwd: dir, stdio: 'inherit' });
    fs.renameSync(path.join(dir, 'xray-bin'), bin);
  }
  for (const f of ['geoip.dat', 'geosite.dat']) {
    if (!fs.existsSync(path.join(dir, f))) throw new Error('missing ' + f);
  }
  console.log('setup ok');
})().catch((e) => { console.error(e); process.exit(1); });
