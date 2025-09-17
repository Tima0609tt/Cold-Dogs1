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
                }

                // Create orders store
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('userId', 'userId', { unique: false });
                    orderStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Create news store
                if (!db.objectStoreNames.contains('news')) {
                    const newsStore = db.createObjectStore('news', { keyPath: 'id', autoIncrement: true });
                    newsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    newsStore.createIndex('product', 'product', { unique: false });
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
                quantity: orderData.quantity || 1,
                status: orderData.status || 'pending',
                createdAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve({
                id: request.result,
                ...orderData,
                quantity: orderData.quantity || 1,
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
    async register(email, password) {
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
                email,
                password: hashedPassword
            });

            return {
                success: true,
                user: { id: user.id, email },
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
                user: { id: user.id, email: user.email },
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

    // News operations
    async createNews(newsData) {
        const transaction = this.db.transaction(['news'], 'readwrite');
        const store = transaction.objectStore('news');

        return new Promise((resolve, reject) => {
            const request = store.add({
                ...newsData,
                createdAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve({ id: request.result, ...newsData });
            request.onerror = () => reject(request.error);
        });
    }

    async getAllNews() {
        const transaction = this.db.transaction(['news'], 'readonly');
        const store = transaction.objectStore('news');
        const index = store.index('createdAt');

        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev'); // Most recent first
            const news = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    news.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(news);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getNewsByProduct(product) {
        const transaction = this.db.transaction(['news'], 'readonly');
        const store = transaction.objectStore('news');
        const index = store.index('product');

        return new Promise((resolve, reject) => {
            const request = index.getAll(product);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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

    // Initialize default news
    async initializeDefaultNews() {
        try {
            const existingNews = await this.getAllNews();
            if (existingNews.length === 0) {
                const defaultNews = [
                    {
                        title: "Обновление Fish Bot v2.1",
                        content: "Вышло крупное обновление Fish Bot! Добавлена поддержка новых видов рыбы, улучшена стабильность работы и исправлены все известные баги. Теперь бот работает еще эффективнее!",
                        product: "Fish Bot",
                        image: "https://imagizer.imageshack.com/img924/8665/RWWaE4.jpg",
                        type: "update"
                    },
                    {
                        title: "Новый продукт C+ уже доступен!",
                        content: "Представляем вашему вниманию новый скрипт C+ для максимальной эффективности на каптах. Полная автоматизация процесса, высокая скорость и надежность гарантированы!",
                        product: "C+",
                        image: "https://imagizer.imageshack.com/img924/8665/RWWaE4.jpg",
                        type: "new_product"
                    },
                    {
                        title: "Специальное предложение на Fish Bot",
                        content: "Только на этой неделе скидка 20% на подписку Fish Bot на 7 дней! Не упустите возможность сэкономить и протестировать нашего лучшего бота для рыбалки.",
                        product: "Fish Bot",
                        image: "https://imagizer.imageshack.com/img924/8665/RWWaE4.jpg",
                        type: "promotion"
                    },
                    {
                        title: "Завод скоро выйдет!",
                        content: "Мы активно работаем над новым продуктом 'Завод'. Это будет революционное решение для автоматизации производственных процессов. Следите за обновлениями!",
                        product: "Завод",
                        image: "https://imagizer.imageshack.com/img924/8665/RWWaE4.jpg",
                        type: "announcement"
                    }
                ];

                for (const news of defaultNews) {
                    await this.createNews(news);
                }
            }
        } catch (error) {
            console.error('Error initializing default news:', error);
        }
    }
}

// Create global database instance
window.browserDB = new BrowserDatabase();
