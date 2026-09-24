const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'records.json');

// 确保数据文件存在
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

// 读取 JSON 数据
function readRecords() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// 写入 JSON 数据
function writeRecords(records) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

// 读取请求体
function getBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API: 获取所有流水
    if (req.url === '/api/records' && req.method === 'GET') {
        const records = readRecords();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(records));
        return;
    }

    // API: 新增一条流水
    if (req.url === '/api/records' && req.method === 'POST') {
        try {
            const body = await getBody(req);
            const record = JSON.parse(body);
            const records = readRecords();
            records.push(record);
            writeRecords(records);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, total: records.length }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // API: 按索引删除单条流水  DELETE /api/records/:index
    const delMatch = req.url.match(/^\/api\/records\/(\d+)$/);
    if (delMatch && req.method === 'DELETE') {
        const index = parseInt(delMatch[1], 10);
        const records = readRecords();
        if (index < 0 || index >= records.length) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: '记录不存在' }));
            return;
        }
        records.splice(index, 1);
        writeRecords(records);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, total: records.length }));
        return;
    }

    // API: 清空所有流水
    if (req.url === '/api/records' && req.method === 'DELETE') {
        writeRecords([]);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // 静态文件服务
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const extname = path.extname(filePath);
    const contentType = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8'
    }[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`服务器运行中: http://localhost:${PORT}`);
    console.log(`数据文件: ${DATA_FILE}`);
});
