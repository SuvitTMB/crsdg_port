/**
 * CRSDG 4 ต่อ 4 - Multi-Device Wi-Fi Remote Sync Server
 * Zero external dependencies (Pure Node.js built-in modules: http, fs, path, os)
 * 
 * Usage:
 *   node remote_server.js
 *   node remote_server.js --port 5000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
let PORT = 5500;
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) {
    PORT = parseInt(args[portIdx + 1], 10) || 5500;
} else if (process.env.PORT) {
    PORT = parseInt(process.env.PORT, 10) || 5500;
}

// In-Memory Real-Time State & Command Store
let currentGameState = null;
let currentRemoteCommand = null;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push({ name, ip: net.address });
            }
        }
    }
    return addresses;
}

const server = http.createServer((req, res) => {
    // Enable CORS for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Set-Cookie', 'crsdg_server=1; Path=/; SameSite=Lax');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ==========================================
    // API ENDPOINTS FOR MULTI-DEVICE SYNC
    // ==========================================
    if (pathname === '/api/game-state') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    currentGameState = JSON.parse(body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(currentGameState || {}));
            return;
        }
    }

    if (pathname === '/api/remote-command') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    currentRemoteCommand = JSON.parse(body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(currentRemoteCommand || {}));
            return;
        }
    }

    if (pathname === '/api/upload-member-photo') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const empId = String(data.employeeId || '').trim();
                    const imageBase64 = String(data.imageBase64 || data.photo || '').trim();

                    if (!empId) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing employeeId' }));
                        return;
                    }
                    if (!imageBase64) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing imageBase64' }));
                        return;
                    }

                    // Extract base64 buffer
                    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    let buffer;
                    let ext = '.jpg';
                    if (matches && matches.length === 3) {
                        buffer = Buffer.from(matches[2], 'base64');
                        if (matches[1].includes('png')) ext = '.png';
                        else if (matches[1].includes('webp')) ext = '.webp';
                    } else {
                        buffer = Buffer.from(imageBase64, 'base64');
                    }

                    const targetDir = path.join(__dirname, 'storage', 'Member');
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    const fileName = `${empId}${ext}`;
                    const filePath = path.join(targetDir, fileName);
                    fs.writeFileSync(filePath, buffer);

                    const relativePath = `storage/Member/${fileName}`;
                    const urlPath = `/storage/Member/${fileName}`;

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        employeeId: empId,
                        fileName: fileName,
                        filePath: relativePath,
                        url: urlPath,
                        fileSize: buffer.length
                    }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save photo: ' + e.message }));
                }
            });
            return;
        }
    }

    if (pathname === '/api/upload-team-photo') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const teamId = String(data.teamId || data.id || ('team_' + Date.now())).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
                    const imageBase64 = String(data.imageBase64 || data.photo || data.teamPhoto || '').trim();

                    if (!imageBase64) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing imageBase64' }));
                        return;
                    }

                    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    let buffer;
                    let ext = '.jpg';
                    if (matches && matches.length === 3) {
                        buffer = Buffer.from(matches[2], 'base64');
                        if (matches[1].includes('png')) ext = '.png';
                        else if (matches[1].includes('webp')) ext = '.webp';
                    } else {
                        buffer = Buffer.from(imageBase64, 'base64');
                    }

                    const targetDir = path.join(__dirname, 'storage', 'Team');
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    const fileName = `${teamId}${ext}`;
                    const filePath = path.join(targetDir, fileName);
                    fs.writeFileSync(filePath, buffer);

                    const relativePath = `storage/Team/${fileName}`;
                    const urlPath = `/storage/Team/${fileName}`;

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        teamId: teamId,
                        fileName: fileName,
                        filePath: relativePath,
                        url: urlPath,
                        fileSize: buffer.length
                    }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save team photo: ' + e.message }));
                }
            });
            return;
        }
    }

    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
        return;
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    let filePath = path.join(__dirname, pathname === '/' ? 'game.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found: ' + pathname);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

function startServer(portToTry) {
    server.listen(portToTry, '0.0.0.0', () => {
        console.log('\n================================================================');
        console.log('  🎮 CRSDG 4 ต่อ 4 - Multi-Device Wi-Fi Remote Server  ');
        console.log('================================================================');
        console.log(`\n  🖥️  จอแข่งขันหลัก (Projector / PC):`);
        console.log(`      http://localhost:${portToTry}/game.html`);

        const ips = getLocalIpAddresses();
        if (ips.length > 0) {
            console.log(`\n  📱 จอบังคับรีโมตสำหรับมือถือ / แท็บเล็ต (เปิดบน Wi-Fi เดียวกัน):`);
            ips.forEach(net => {
                console.log(`      [${net.name}]: http://${net.ip}:${portToTry}/remote_crsdg.html`);
            });
        }
        console.log('\n  ⚡ ระบบรองรับทั้ง BroadcastChannel (จอเดียวกัน) และ Wi-Fi Sync (ข้ามอุปกรณ์)');
        console.log('  กด Ctrl + C เพื่อหยุดการทำงาน\n');
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️  Port ${portToTry} มีโปรเซสอื่นใช้งานอยู่ (เช่น Live Server)`);
            if (portToTry === 5500) {
                console.log('🔄 กำลังสลับไปใช้ Port 3000 แทน...');
                startServer(3000);
            } else {
                console.error(`ไม่สามารถเปิดเซิร์ฟเวอร์ได้: Port ${portToTry} ถูกใช้งาน`);
            }
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);

