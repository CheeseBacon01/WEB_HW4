var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sqlite3 = require('sqlite3').verbose();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

var dbPath = path.join(__dirname, 'db', 'sqlite.db');
var db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('無法開啟資料庫:', err.message);
    } else {
        console.log('成功開啟資料庫。');
    }
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 新增API: 新增巧克力價格資料
app.post('/api/insert', (req, res) => {
    const { Date, ProductName, Price, AnnualGrowthRate } = req.body;
    if (!Date || !ProductName || !Price) {
        return res.status(400).json({ error: '缺少必要欄位' });
    }
    // 新增前先檢查是否已有相同日期資料
    const checkSql = `SELECT COUNT(*) as count FROM ChocolatePrices WHERE Date = ?`;
    db.get(checkSql, [Date], (err, row) => {
        if (err) {
            return res.status(500).json({ error: '資料庫錯誤', detail: err.message });
        }
        if (row.count > 0) {
            return res.json({ success: false, message: '已有相同日期資料' });
        }
        const insertSql = `INSERT INTO ChocolatePrices (ProductName, Date, Price, AnnualGrowthRate) VALUES (?, ?, ?, ?)`;
        db.run(insertSql, [ProductName, Date, Price, AnnualGrowthRate], function(err) {
            if (err) {
                return res.status(500).json({ error: '資料庫錯誤', detail: err.message });
            }
            res.json({ success: true, id: this.lastID });
        });
    });
});

// 查詢API: 依日期查詢巧克力價格資料
app.get('/api', (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: '請提供查詢日期 (date)' });
    }
    const sql = `SELECT * FROM ChocolatePrices WHERE Date = ?`;
    db.all(sql, [date], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '資料庫錯誤', detail: err.message });
        }
        res.json({ data: rows });
    });
});

// 查詢API: 依日期區間查詢巧克力價格資料
app.get('/api/range', (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: '請提供查詢區間 (start, end)' });
    }
    const sql = `SELECT * FROM ChocolatePrices WHERE Date >= ? AND Date <= ?`;
    db.all(sql, [start, end], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '資料庫錯誤', detail: err.message });
        }
        res.json({ data: rows });
    });
});

// 查詢API: 依價格區間查詢巧克力價格資料
app.get('/api/price-range', (req, res) => {
    const { min, max } = req.query;
    if (min === undefined || max === undefined) {
        return res.status(400).json({ error: '請提供查詢價格區間 (min, max)' });
    }
    const sql = `SELECT * FROM ChocolatePrices WHERE Price >= ? AND Price <= ?`;
    db.all(sql, [min, max], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '資料庫錯誤', detail: err.message });
        }
        res.json({ data: rows });
    });
});

module.exports = app;
