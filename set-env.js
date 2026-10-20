const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.ts');
const targetDevPath = path.join(__dirname, 'src', 'environments', 'environment.development.ts');

const isLocalDev = process.env.LOCAL_DEV === 'true' || process.argv.includes('--dev');
const isProd = !isLocalDev;
let rawApiUrl = process.env.API_URL;
if (!rawApiUrl) {
  rawApiUrl = isProd ? 'https://almotamayezon.com/api' : 'http://localhost:5005/api';
}

// Trim whitespace
rawApiUrl = rawApiUrl.trim();

// Remove trailing slashes
while (rawApiUrl.endsWith('/')) {
  rawApiUrl = rawApiUrl.slice(0, -1);
}

// Ensure it ends with /api
let apiUrl = rawApiUrl;
if (!apiUrl.toLowerCase().endsWith('/api')) {
  apiUrl = apiUrl + '/api';
}

// Ensure target directory exists
const dir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const envConfigFile = `export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl}'
};
`;

console.log('Generating environment files...');
fs.writeFileSync(targetPath, envConfigFile, 'utf8');
fs.writeFileSync(targetDevPath, envConfigFile, 'utf8');
console.log(`Environment files generated successfully with apiUrl: ${apiUrl}`);
