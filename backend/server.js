const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'http://localhost:' + PORT;

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// Simple custom logging middleware (writes structured logs to logs.jsonl)
// NOTE: assessment requires using a custom logging middleware rather than console logging.
const LOG_PATH = path.join(__dirname, 'logs.jsonl');
function appendLog(obj){
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + '\\n');
  } catch (e) {
    // swallow write errors (do not use console.log per assessment rule)
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const logEntry = {
    type: 'request_start',
    ts: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    headers: {
      'user-agent': req.headers['user-agent'],
      'referer': req.headers['referer'] || req.headers['referrer'] || null,
      'accept-language': req.headers['accept-language'] || null
    }
  };
  appendLog(logEntry);

  // attach a logger on req for handlers to use
  req.logger = {
    info: (obj) => appendLog(Object.assign({type:'info', ts: new Date().toISOString()}, obj)),
    event: (obj) => appendLog(Object.assign({type:'event', ts: new Date().toISOString()}, obj)),
    error: (obj) => appendLog(Object.assign({type:'error', ts: new Date().toISOString()}, obj))
  };

  res.on('finish', () => {
    const elapsed = Date.now() - start;
    appendLog({ type: 'request_end', ts: new Date().toISOString(), method: req.method, path: req.originalUrl, status: res.statusCode, duration_ms: elapsed });
  });

  next();
});

// Simple file-backed JSON DB for persistence
const DB_PATH = path.join(__dirname, 'db.json');
let DB = { shorturls: {} };
try {
  if (fs.existsSync(DB_PATH)) {
    DB = JSON.parse(fs.readFileSync(DB_PATH));
  } else {
    fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 2));
  }
} catch (e) {
  // ignore read errors
  DB = { shorturls: {} };
}

function persistDB(){
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(DB, null, 2));
  } catch (e) {
    // ignore write errors
  }
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return !!u.hostname;
  } catch (e) {
    return false;
  }
}

function genShortcode(len=6) {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  while (true) {
    id = Array.from(crypto.randomBytes(len)).map(b => alphabet[b % alphabet.length]).join('').slice(0,len);
    if (!DB.shorturls[id]) return id;
    // else collision, retry
  }
}

// POST /shorturls  -> create shortened URL
app.post('/shorturls', (req, res) => {
  const body = req.body || {};
  const url = body.url && String(body.url).trim();
  const validity = Number.isInteger(body.validity) ? body.validity : (typeof body.validity === 'string' && /^\d+$/.test(body.validity) ? parseInt(body.validity,10) : null);
  const shortcodeProvided = body.shortcode && String(body.shortcode).trim();

  if (!url || !isValidUrl(url)) {
    req.logger.error({ action: 'create_shorturl', reason: 'invalid_url', payload: { url } });
    return res.status(400).json({ error: 'Invalid or missing url (must be a valid absolute URL).' });
  }

  const validityMinutes = (validity && Number.isFinite(validity) && validity > 0) ? validity : 30; // default 30 minutes
  if (validity !== null && (!Number.isInteger(validity) || validity <= 0)) {
    req.logger.error({ action: 'create_shorturl', reason: 'invalid_validity', payload: { validity } });
    return res.status(400).json({ error: 'Validity must be a positive integer (minutes).' });
  }

  // validate custom shortcode if provided
  let shortcode = null;
  if (shortcodeProvided) {
    const sc = String(shortcodeProvided);
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(sc)) {
      req.logger.error({ action: 'create_shorturl', reason: 'invalid_shortcode_format', payload: { shortcode: sc } });
      return res.status(400).json({ error: 'Shortcode must be alphanumeric (and - or _) and reasonable length (3-50).' });
    }
    if (DB.shorturls[sc]) {
      req.logger.error({ action: 'create_shorturl', reason: 'shortcode_collision', payload: { shortcode: sc } });
      return res.status(409).json({ error: 'Requested shortcode already in use.' });
    }
    shortcode = sc;
  } else {
    shortcode = genShortcode(6);
  }

  const createdAt = new Date().toISOString();
  const expiry = new Date(Date.now() + validityMinutes * 60 * 1000).toISOString();
  DB.shorturls[shortcode] = {
    shortcode,
    url,
    createdAt,
    expiry,
    validityMinutes,
    clicks: []
  };
  persistDB();

  req.logger.info({ action: 'create_shorturl', shortcode, url, createdAt, expiry, validityMinutes });
  return res.status(201).json({ shortLink: HOST + '/' + shortcode, expiry });
});

// GET /shorturls  -> list all shorturls (for stats page)
app.get('/shorturls', (req, res) => {
  const all = Object.values(DB.shorturls).map(s => ({
    shortcode: s.shortcode,
    shortLink: HOST + '/' + s.shortcode,
    url: s.url,
    createdAt: s.createdAt,
    expiry: s.expiry,
    totalClicks: s.clicks ? s.clicks.length : 0
  }));
  res.json({ data: all });
});

// GET /shorturls/:shortcode -> statistics for single shortcode
app.get('/shorturls/:shortcode', (req, res) => {
  const sc = req.params.shortcode;
  const s = DB.shorturls[sc];
  if (!s) {
    req.logger.error({ action: 'get_stats', shortcode: sc, reason: 'not_found' });
    return res.status(404).json({ error: 'Shortcode not found' });
  }
  res.json({
    shortcode: s.shortcode,
    url: s.url,
    createdAt: s.createdAt,
    expiry: s.expiry,
    totalClicks: s.clicks.length,
    clicks: s.clicks
  });
});

// Redirect route - GET /:shortcode
app.get('/:shortcode', (req, res) => {
  const sc = req.params.shortcode;
  const s = DB.shorturls[sc];
  if (!s) {
    req.logger.error({ action: 'redirect', shortcode: sc, reason: 'not_found' });
    return res.status(404).json({ error: 'Shortcode not found' });
  }
  const now = new Date();
  const expiry = new Date(s.expiry);
  if (now > expiry) {
    req.logger.error({ action: 'redirect', shortcode: sc, reason: 'expired' });
    return res.status(410).json({ error: 'Short link expired' });
  }

  // record click
  const click = {
    ts: new Date().toISOString(),
    referrer: req.get('referer') || req.get('referrer') || null,
    ua: req.get('user-agent') || null,
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    // coarse-grained geo (not calling external APIs) - use accept-language as a proxy
    geo: (req.get('accept-language') || '').split(',')[0] || 'unknown'
  };
  s.clicks.push(click);
  persistDB();
  req.logger.event({ action: 'redirect', shortcode: sc, click });

  // send redirect (302)
  res.redirect(s.url);
});

// health
app.get('/_health', (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.listen(PORT);