const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Create users table
function initDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            profile_data TEXT DEFAULT '{}'
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table ready');
        }
    });

    // Create orders table
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            price TEXT NOT NULL,
            period TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating orders table:', err.message);
        } else {
            console.log('Orders table ready');
        }
    });
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Все поля обязательны' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' });
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, row) => {
            if (err) {
                return res.status(500).json({ message: 'Ошибка базы данных' });
            }

            if (row) {
                return res.status(400).json({ message: 'Пользователь с таким email или именем уже существует' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            db.run(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Ошибка создания пользователя' });
                    }

                    // Generate JWT token
                    const token = jwt.sign(
                        { id: this.lastID, username, email },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.json({
                        message: 'Регистрация успешна',
                        token,
                        user: { id: this.lastID, username, email }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email и пароль обязательны' });
        }

        // Find user by email
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Ошибка базы данных' });
            }

            if (!user) {
                return res.status(400).json({ message: 'Неверный email или пароль' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ message: 'Неверный email или пароль' });
            }

            // Update last login
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, username: user.username, email: user.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Вход выполнен',
                token,
                user: { id: user.id, username: user.username, email: user.email }
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get('SELECT id, username, email, created_at, last_login, profile_data FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Ошибка базы данных' });
        }

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Get user orders
        db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, orders) => {
            if (err) {
                return res.status(500).json({ message: 'Ошибка получения заказов' });
            }

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at,
                    last_login: user.last_login,
                    profile_data: JSON.parse(user.profile_data || '{}')
                },
                orders: orders || []
            });
        });
    });
});

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { username, profile_data } = req.body;

    if (!username) {
        return res.status(400).json({ message: 'Имя пользователя обязательно' });
    }

    // Check if username is already taken by another user
    db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId], (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Ошибка базы данных' });
        }

        if (row) {
            return res.status(400).json({ message: 'Имя пользователя уже занято' });
        }

        // Update user
        db.run(
            'UPDATE users SET username = ?, profile_data = ? WHERE id = ?',
            [username, JSON.stringify(profile_data || {}), userId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Ошибка обновления профиля' });
                }

                res.json({ message: 'Профиль обновлен' });
            }
        );
    });
});

// Create order
app.post('/api/orders', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { product_name, price, period } = req.body;

    if (!product_name || !price || !period) {
        return res.status(400).json({ message: 'Все поля заказа обязательны' });
    }

    db.run(
        'INSERT INTO orders (user_id, product_name, price, period) VALUES (?, ?, ?, ?)',
        [userId, product_name, price, period],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Ошибка создания заказа' });
            }

            res.json({
                message: 'Заказ создан',
                order: {
                    id: this.lastID,
                    product_name,
                    price,
                    period,
                    status: 'pending'
                }
            });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});

