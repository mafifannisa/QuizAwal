const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
    const db = await open({
        filename: path.join(__dirname, 'backend', 'database.sqlite'),
        driver: sqlite3.Database
    });
    const rows = await db.all('SELECT * FROM sessions WHERE name = "CHEATER"');
    console.log(rows);
}
check();
