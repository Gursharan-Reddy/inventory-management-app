const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                unit TEXT,
                category TEXT,
                brand TEXT,
                stock INTEGER NOT NULL DEFAULT 0,
                status TEXT,
                image TEXT
            );`);

            db.run(`CREATE TABLE IF NOT EXISTS inventory_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                old_quantity INTEGER,
                new_quantity INTEGER,
                change_date TEXT,
                user_info TEXT DEFAULT 'System/Admin',
                FOREIGN KEY(product_id) REFERENCES products(id)
            );`);
            console.log("Database tables initialized.");
        });
    }
});

app.db = db;

const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
    res.send('Inventory Management API Running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});