const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const upload = multer({ dest: 'uploads/' });

router.use((req, res, next) => {
    req.db = req.app.db;
    next();
});

const productValidationRules = [
    body('name').isLength({ min: 1 }).trim().withMessage('Name is required.'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer.')
];

router.post('/', productValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, unit, category, brand, stock, image } = req.body;
    const newStock = parseInt(stock) || 0;
    const status = newStock === 0 ? 'Out of Stock' : 'In Stock';

    req.db.get('SELECT id FROM products WHERE name = ?', [name], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            return res.status(409).json({ message: 'Product name already exists.' });
        }

        req.db.run(
            `INSERT INTO products (name, unit, category, brand, stock, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, unit || '', category || '', brand || '', newStock, status, image || '',],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                req.db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, newProduct) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json(newProduct);
                });
            }
        );
    });
});

router.get('/', (req, res) => {
    const { name, category } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (name) {
        sql += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }

    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }

    req.db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

router.get('/:id/history', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM inventory_history WHERE product_id = ? ORDER BY change_date DESC';

    req.db.all(sql, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

router.put('/:id', productValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, unit, category, brand, stock, image } = req.body;
    const newStock = parseInt(stock);

    req.db.get('SELECT stock FROM products WHERE id = ?', [id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const oldStock = product.stock;

        req.db.run(
            `UPDATE products SET name = ?, unit = ?, category = ?, brand = ?, stock = ?, status = ?, image = ? WHERE id = ?`,
            [name, unit || '', category || '', brand || '', newStock, newStock === 0 ? 'Out of Stock' : 'In Stock', image || '', id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                if (oldStock !== newStock) {
                    req.db.run(
                        'INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date) VALUES (?, ?, ?, ?)',
                        [id, oldStock, newStock, new Date().toISOString()],
                        (historyErr) => {
                            if (historyErr) console.error("History tracking error:", historyErr.message);
                        }
                    );
                }

                req.db.get('SELECT * FROM products WHERE id = ?', [id], (err, updatedProduct) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(updatedProduct);
                });
            }
        );
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    req.db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully', id });
    });
});

router.post('/import', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let addedCount = 0;
            let skippedCount = 0;
            const duplicates = [];

            const processProduct = (product) => {
                return new Promise((resolve) => {
                    const { name, unit, category, brand, stock, image } = product;
                    const stockValue = parseInt(stock) || 0;
                    const status = stockValue > 0 ? 'In Stock' : 'Out of Stock';

                    req.db.get('SELECT id FROM products WHERE name = ?', [name], (err, row) => {
                        if (err) {
                            console.error(`Database error for ${name}: ${err.message}`);
                            skippedCount++;
                            return resolve();
                        }
                        
                        if (row) {
                            skippedCount++;
                            duplicates.push({ name: name, existingId: row.id });
                            return resolve();
                        }

                        req.db.run(
                            `INSERT INTO products (name, unit, category, brand, stock, status, image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [name, unit || '', category || '', brand || '', stockValue, status, image || ''],
                            (insertErr) => {
                                if (insertErr) {
                                    console.error(`Insert error for ${name}: ${insertErr.message}`);
                                    skippedCount++;
                                } else {
                                    addedCount++;
                                }
                                resolve();
                            }
                        );
                    });
                });
            };

            for (const product of results) {
                await processProduct(product);
            }

            fs.unlinkSync(filePath); 

            res.json({ 
                message: 'CSV import complete.', 
                added: addedCount, 
                skipped: skippedCount, 
                duplicates: duplicates 
            });
        });
});

router.get('/export', (req, res) => {
    req.db.all('SELECT name, unit, category, brand, stock, status, image FROM products', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (rows.length === 0) {
             return res.status(200).send('name,unit,category,brand,stock,status,image\n');
        }

        const headers = Object.keys(rows[0]).join(',');
        const data = rows.map(row => 
            Object.values(row).map(value => 
                `"${value === null ? '' : String(value).replace(/"/g, '""')}"`
            ).join(',')
        ).join('\n');
        
        const csvData = `${headers}\n${data}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
        res.status(200).send(csvData);
    });
});

module.exports = router;