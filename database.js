// Browser-based database using IndexedDB
class BrowserDatabase {
    constructor() {
        this.dbName = 'ColdDogsDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create users store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('email', 'email', { unique: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }

                // Create orders store
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('userId', 'userId', { unique: false });
                    orderStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    // User operations
    async createUser(userData) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...userData,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                profileData: {}
            });
            
            request.onsuccess = () => resolve({ id: request.result, ...userData });
            request.onerror = () => reject(request.error);
        });
    }

    async getUserByEmail(email) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('email');
        
        return new Promise((resolve, reject) => {
            const request = index.get(email);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserById(id) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateUser(id, userData) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.put({ id, ...userData });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Order operations
    async createOrder(orderData) {
        const transaction = this.db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');
        
        return new Promise((resolve, reject) => {
            const request = store.add({
                ...orderData,
                status: orderData.status || 'pending',
                createdAt: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve({ 
                id: request.result, 
                ...orderData, 
                status: orderData.status || 'pending' 
            });
            request.onerror = () => reject(request.error);
        });
    }

    async getUserOrders(userId) {
        const transaction = this.db.transaction(['orders'], 'readonly');
        const store = transaction.objectStore('orders');
        const index = store.index('userId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Auth operations
    async register(username, email, password) {
        try {
            // Check if user already exists
            const existingUser = await this.getUserByEmail(email);
            if (existingUser) {
                throw new Error('Пользователь с таким email уже существует');
            }

            // Hash password (simple hash for demo - in production use proper hashing)
            const hashedPassword = await this.hashPassword(password);

            // Create user
            const user = await this.createUser({
                username,
                email,
                password: hashedPassword
            });

            return {
                success: true,
                user: { id: user.id, username, email },
                message: 'Регистрация успешна'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Ошибка регистрации'
            };
        }
    }

    async login(email, password) {
        try {
            const user = await this.getUserByEmail(email);
            if (!user) {
                throw new Error('Неверный email или пароль');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password);
            if (!isValidPassword) {
                throw new Error('Неверный email или пароль');
            }

            // Update last login
            await this.updateUser(user.id, {
                ...user,
                lastLogin: new Date().toISOString()
            });

            return {
                success: true,
                user: { id: user.id, username: user.username, email: user.email },
                message: 'Вход выполнен'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Ошибка входа'
            };
        }
    }

    async getProfile(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            const orders = await this.getUserOrders(userId);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin,
                    profileData: user.profileData || {}
                },
                orders: orders || []
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Ошибка загрузки профиля'
            };
        }
    }

    async updateProfile(userId, profileData) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            await this.updateUser(userId, {
                ...user,
                ...profileData
            });

            return {
                success: true,
                message: 'Профиль обновлен'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Ошибка обновления профиля'
            };
        }
    }

    // Simple password hashing (for demo purposes)
    async hashPassword(password) {
        // Simple hash - in production use proper hashing like bcrypt
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verifyPassword(password, hashedPassword) {
        const hashedInput = await this.hashPassword(password);
        return hashedInput === hashedPassword;
    }
}

// Create global database instance
window.browserDB = new BrowserDatabase();
