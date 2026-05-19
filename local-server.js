const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const port = Number.parseInt(process.env.PORT || '8001', 10);
const host = process.env.HOST || '0.0.0.0';
const root = __dirname;
const activeVisitors = new Map();
const activeVisitorTimeout = 15000;
const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/api/active-visitors') {
        updateActiveVisitors(request, response);
        return;
    }

    if (request.method === 'POST' && request.url === '/api/songs') {
        updateSongs(request, response);
        return;
    }

    let requestPath = decodeURIComponent(request.url.split('?')[0]);
    if (requestPath === '/') requestPath = '/index.html';

    const filePath = path.normalize(path.join(root, requestPath));
    if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }

        response.writeHead(200, {
            'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
        });
        response.end(content);
    });
});

function updateActiveVisitors(request, response) {
    readJsonBody(request, response, body => {
        const visitorId = cleanText(body.visitorId);
        if (!visitorId) {
            sendJson(response, 400, { error: 'visitorId is required.' });
            return;
        }

        const now = Date.now();
        activeVisitors.set(visitorId, now);
        pruneActiveVisitors(now);
        sendJson(response, 200, { activeVisitors: activeVisitors.size });
    });
}

function updateSongs(request, response) {
    readJsonBody(request, response, body => {
        if (!Array.isArray(body.songs)) {
            sendJson(response, 400, { error: 'songs must be an array.' });
            return;
        }

        const songsPath = path.join(root, 'data', 'songs.json');
        const payload = JSON.stringify({ songs: body.songs }, null, 2) + '\n';
        fs.writeFile(songsPath, payload, 'utf8', error => {
            if (error) {
                sendJson(response, 500, { error: 'Could not save songs.' });
                return;
            }

            sendJson(response, 200, { saved: true });
        });
    });
}

function pruneActiveVisitors(now) {
    activeVisitors.forEach((lastSeen, visitorId) => {
        if (now - lastSeen > activeVisitorTimeout) {
            activeVisitors.delete(visitorId);
        }
    });
}

function readJsonBody(request, response, callback) {
    let body = '';

    request.on('data', chunk => {
        body += chunk;
        if (body.length > 5000000) request.destroy();
    });

    request.on('end', () => {
        try {
            callback(body ? JSON.parse(body) : {});
        } catch {
            sendJson(response, 400, { error: 'Invalid JSON.' });
        }
    });
}

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function sendJson(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(data));
}

server.listen(port, host, () => {
    const localUrl = `http://127.0.0.1:${port}/`;
    const lanUrls = getLanAddresses().map(address => `http://${address}:${port}/`);

    console.log(`Picky Music Notes is running at ${localUrl}`);
    lanUrls.forEach(url => console.log(`LAN testing URL: ${url}`));
});

function getLanAddresses() {
    return Object.values(os.networkInterfaces())
        .flat()
        .filter(details => details && details.family === 'IPv4' && !details.internal)
        .map(details => details.address);
}
