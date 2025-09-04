// logger.js
// (Optional) This file can be imported by other modules to write structured logs using the same append method.
const fs = require('fs');
const path = require('path');
const LOG_PATH = path.join(__dirname, 'logs.jsonl');

function appendLog(obj){
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n');
  } catch (e) {}
}

module.exports = { appendLog };