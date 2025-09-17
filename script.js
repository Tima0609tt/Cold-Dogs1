// Mobile Navigation Toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Quantity Modal Variables
let quantityModal, quantityCloseBtn, selectedProductName, selectedProductPrice, quantityValue, totalPrice;
let currentProductData = null;
let currentQuantity = 1;

// Initialize quantity modal
function initializeQuantityModal() {
    quantityModal = document.getElementById('quantityModal');
    quantityCloseBtn = document.getElementById('quantityCloseBtn');
    selectedProductName = document.getElementById('selectedProductName');
    selectedProductPrice = document.getElementById('selectedProductPrice');
    quantityValue = document.getElementById('quantityValue');
    totalPrice = document.getElementById('totalPrice');

    // Event listeners
    if (quantityCloseBtn) quantityCloseBtn.addEventListener('click', closeQuantityModal);
    window.addEventListener('click', (e) => { if (e.target === quantityModal) closeQuantityModal(); });

    // Quantity controls
    document.getElementById('decreaseQty').addEventListener('click', () => changeQuantity(-1));
    document.getElementById('increaseQty').addEventListener('click', () => changeQuantity(1));

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setQuantity(parseInt(this.dataset.qty));
        });
    });

    // Action buttons
    document.getElementById('confirmAddToCart').addEventListener('click', confirmAddToCart);
    document.getElementById('cancelAddToCart').addEventListener('click', closeQuantityModal);
}

function openQuantityModal(productData) {
    if (!quantityModal) return;

    currentProductData = productData;
    currentQuantity = 1;

    // Update modal content
    selectedProductName.textContent = productData.name;
    selectedProductPrice.textContent = `Цена: ${productData.price}`;
    quantityValue.textContent = currentQuantity;
    updateTotalPrice();

    // Reset active preset
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.preset-btn[data-qty="1"]').classList.add('active');

    quantityModal.style.display = 'block';
}

function closeQuantityModal() {
    if (!quantityModal) return;
    quantityModal.style.display = 'none';
    currentProductData = null;
}

function changeQuantity(delta) {
    const newQuantity = currentQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= 99) {
        setQuantity(newQuantity);
    }
}

function setQuantity(qty) {
    currentQuantity = qty;
    quantityValue.textContent = currentQuantity;
    updateTotalPrice();

    // Update active preset
    document.querySelectorAll('.preset-btn').forEach(btn => {
        if (parseInt(btn.dataset.qty) === qty) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateTotalPrice() {
    if (!currentProductData) return;

    const price = parsePrice(currentProductData.price);
    const total = price * currentQuantity;
    totalPrice.textContent = `₽${total.toLocaleString()}`;
}

function parsePrice(priceString) {
    // Extract number from price string like "₽130" or "₽1,200"
    const match = priceString.match(/₽([\d,]+)/);
    if (match) {
        return parseInt(match[1].replace(/,/g, ''));
    }
    return 0;
}

function confirmAddToCart() {
    if (!currentProductData) return;

    // Add to cart logic here
    const userId = localStorage.getItem('user_id');
    if (userId) {
        // User is logged in - create order
        addToCartLoggedIn(currentProductData, currentQuantity);
    } else {
        // User not logged in
        addToCartNotLoggedIn(currentProductData, currentQuantity);
    }

    closeQuantityModal();
}

async function addToCartLoggedIn(productData, quantity) {
    try {
        const userId = localStorage.getItem('user_id');
        const result = await window.browserDB.createOrder({
            userId: parseInt(userId),
            productName: productData.name,
            price: productData.price,
            period: productData.period || 'Одноразовая покупка',
            status: 'completed',
            quantity: quantity
        });

        if (result) {
            showNotification(`Добавлено в корзину: ${productData.name} x${quantity}`);
        } else {
            throw new Error('Ошибка создания заказа');
        }
    } catch (error) {
        showNotification('Ошибка добавления в корзину. Попробуйте позже.', 'error');
    }
}

function addToCartNotLoggedIn(productData, quantity) {
    showNotification(`Вы выбрали: ${productData.name} x${quantity} за ${totalPrice.textContent}. Войдите в систему для оформления заказа!`);
}

// Add to cart functionality
document.querySelectorAll('.product-button').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();

        const productCard = this.closest('.product-card');
        const productName = productCard.querySelector('.product-title').textContent;
        const priceOptions = productCard.querySelectorAll('.price-option');

        let productData = {
            name: productName,
            price: '',
            period: ''
        };

        if (priceOptions.length > 0) {
            // Product with multiple price options - use first one as default
            const firstOption = priceOptions[0];
            productData.price = firstOption.querySelector('.price').textContent;
            productData.period = firstOption.querySelector('.price-period').textContent;
        } else {
            // Single price product
            const priceElement = productCard.querySelector('.price');
            if (priceElement) {
                productData.price = priceElement.textContent;
            }
        }

        // Open quantity modal
        openQuantityModal(productData);
    });
});

// CTA Button functionality
document.querySelector('.cta-button').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('#products').scrollIntoView({
        behavior: 'smooth'
    });
});

// Contact form submission
const contactFormEl = document.querySelector('.contact-form');
if (contactFormEl) contactFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(this);
    const name = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    const message = this.querySelector('textarea').value;
    
    // Simple validation
    if (!name || !email || !message) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    // Simulate form submission
    const submitButton = this.querySelector('.submit-button');
    const originalText = submitButton.innerHTML;
    
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    submitButton.disabled = true;
    
    setTimeout(() => {
        submitButton.innerHTML = '<i class="fas fa-check"></i> Отправлено!';
        showNotification('Сообщение успешно отправлено!');
        
        // Reset form
        this.reset();
        
        setTimeout(() => {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }, 2000);
    }, 1500);
});

// =====================
// Auth Modal Logic
// =====================
let authModal, openLoginBtn, openRegisterBtn, authCloseBtn, authTitle, authForm, authSubmitBtn, switchToLogin, authSwitchText;
let isLoginMode = false;

function initializeAuthModal() {
    authModal = document.getElementById('authModal');
    openLoginBtn = document.getElementById('openLoginBtn');
    openRegisterBtn = document.getElementById('openRegisterBtn');
    authCloseBtn = document.getElementById('authCloseBtn');
    authTitle = document.getElementById('authTitle');
    authForm = document.getElementById('authForm');
    authSubmitBtn = document.getElementById('authSubmitBtn');
    switchToLogin = document.getElementById('switchToLogin');
    authSwitchText = document.getElementById('authSwitchText');
}

function openAuthModal(loginMode = false) {
    isLoginMode = loginMode;
    if (!authModal) {
        return;
    }
    authModal.style.display = 'block';
    if (loginMode) {
        authTitle.textContent = 'Вход';
        authSubmitBtn.textContent = 'Войти';
        authSwitchText.innerHTML = 'Нет аккаунта? <a href="#" id="switchToLogin">Зарегистрироваться</a>';
    } else {
        authTitle.textContent = 'Регистрация';
        authSubmitBtn.textContent = 'Зарегистрироваться';
        authSwitchText.innerHTML = 'Уже есть аккаунт? <a href="#" id="switchToLogin">Войти</a>';
    }
}

function closeAuthModal() {
    if (!authModal) return;
    authModal.style.display = 'none';
}

function setupAuthEventListeners() {
    if (openLoginBtn) {
        openLoginBtn.addEventListener('click', () => {
            openAuthModal(true);
        });
    }

    if (openRegisterBtn) {
        openRegisterBtn.addEventListener('click', () => {
            openAuthModal(false);
        });
    }
    
    if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
    window.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });
}

// Delegate switch link clicks because we re-render innerHTML
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'switchToLogin') {
        e.preventDefault();
        openAuthModal(!isLoginMode);
    }
});

// Auth form submit handler
function setupAuthFormHandler() {
    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;

            if (!email || !password) {
                showNotification('Заполните все поля', 'error');
                return;
            }

            try {
                authSubmitBtn.disabled = true;
                authSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

                // Use browser database instead of API
                if (!window.browserDB) {
                    showNotification('База данных не инициализирована. Обновите страницу.', 'error');
                    return;
                }

                let result;
                if (isLoginMode) {
                    result = await window.browserDB.login(email, password);
                } else {
                    result = await window.browserDB.register(email, password);
                }

                if (result.success) {
                    // Store user data in localStorage
                    localStorage.setItem('user_data', JSON.stringify(result.user));
                    localStorage.setItem('user_id', result.user.id);

                    showNotification(result.message);
                    closeAuthModal();
                    updateUserUI(result.user);
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                showNotification(error.message || 'Не удалось выполнить запрос', 'error');
            } finally {
                authSubmitBtn.disabled = false;
                authSubmitBtn.innerHTML = isLoginMode ? 'Войти' : 'Зарегистрироваться';
            }
        });
    }
}

// =====================
// Profile Modal Logic
// =====================
const profileModal = document.getElementById('profileModal');
const openProfileBtn = document.getElementById('openProfileBtn');
const profileCloseBtn = document.getElementById('profileCloseBtn');
const logoutBtn = document.getElementById('logoutBtn');
const profileForm = document.getElementById('profileForm');

let currentUser = null;

// Open profile modal
if (openProfileBtn) openProfileBtn.addEventListener('click', async () => {
    const userId = localStorage.getItem('user_id');
    const userData = localStorage.getItem('user_data');

    if (!userId || !userData) {
        showNotification('Пожалуйста, войдите в систему для доступа к профилю.', 'error');
        return;
    }

    try {
        await loadUserProfile();
        profileModal.style.display = 'block';
    } catch (error) {
        console.error('Ошибка открытия профиля:', error);
        showNotification('Ошибка загрузки профиля. Попробуйте позже.', 'error');
        // Открываем модальное окно даже при ошибке загрузки
        profileModal.style.display = 'block';
    }
});

// Close profile modal
if (profileCloseBtn) profileCloseBtn.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

window.addEventListener('click', (e) => { 
    if (e.target === profileModal) profileModal.style.display = 'none'; 
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load specific tab data
    if (tabName === 'orders') {
        loadUserOrders();
        setupOrderFilters();
    } else if (tabName === 'subscriptions') {
        loadUserSubscriptions();
    }
}

// Load user profile data
async function loadUserProfile() {
    try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        const result = await window.browserDB.getProfile(parseInt(userId));
        
        if (!result.success) {
            throw new Error(result.message);
        }

        currentUser = result.user;

        // Update profile display
        document.getElementById('profileUsername').textContent = result.user.email;
        document.getElementById('profileEmail').textContent = result.user.email;
        document.getElementById('profileAvatar').textContent = result.user.email.charAt(0).toUpperCase();
        document.getElementById('profileCreatedAt').textContent = new Date(result.user.createdAt).toLocaleDateString('ru-RU');
        document.getElementById('profileLastLogin').textContent = result.user.lastLogin ?
            new Date(result.user.lastLogin).toLocaleDateString('ru-RU') : 'Никогда';
        document.getElementById('profileOrdersCount').textContent = result.orders.length;

        // Update form fields
        document.getElementById('profileUsernameInput').value = result.user.email;
        document.getElementById('profileBio').value = result.user.profileData.bio || '';

    } catch (error) {
        showNotification('Ошибка загрузки профиля', 'error');
    }
}

// Load user orders
async function loadUserOrders() {
    try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        const result = await window.browserDB.getProfile(parseInt(userId));
        
        if (!result.success) {
            throw new Error(result.message);
        }

        const ordersList = document.getElementById('ordersList');

        if (result.orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <p>У вас пока нет заказов</p>
                </div>
            `;
            return;
        }

        ordersList.innerHTML = result.orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <div class="order-product">${order.productName} ${order.quantity > 1 ? `x${order.quantity}` : ''}</div>
                    <div class="order-status ${order.status}">${getStatusText(order.status)}</div>
                </div>
                <div class="order-details">
                    <div class="order-detail">
                        <div class="order-detail-label">Цена за единицу</div>
                        <div class="order-detail-value">${order.price}</div>
                    </div>
                    ${order.quantity > 1 ? `
                    <div class="order-detail">
                        <div class="order-detail-label">Количество</div>
                        <div class="order-detail-value">${order.quantity}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">Итого</div>
                        <div class="order-detail-value">₽${(parsePrice(order.price) * order.quantity).toLocaleString()}</div>
                    </div>
                    ` : ''}
                    <div class="order-detail">
                        <div class="order-detail-label">Период</div>
                        <div class="order-detail-value">${order.period}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail-label">Дата заказа</div>
                        <div class="order-detail-value">${new Date(order.createdAt).toLocaleDateString('ru-RU')}</div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        showNotification('Ошибка загрузки заказов', 'error');
    }
}

// Load user subscriptions
async function loadUserSubscriptions() {
    try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        const result = await window.browserDB.getProfile(parseInt(userId));
        
        if (!result.success) {
            throw new Error(result.message);
        }

        // Filter orders to get subscriptions (orders with periods)
        const subscriptions = result.orders.filter(order => 
            order.period && 
            !order.period.includes('Одноразовая') && 
            !order.period.includes('навсегда')
        );

        // Calculate stats
        const activeSubscriptions = subscriptions.filter(sub => sub.status === 'completed').length;
        const totalDays = subscriptions.reduce((total, sub) => {
            if (sub.period.includes('день')) {
                const days = parseInt(sub.period.match(/\d+/)?.[0] || '0');
                return total + days;
            } else if (sub.period.includes('дней')) {
                const days = parseInt(sub.period.match(/\d+/)?.[0] || '0');
                return total + days;
            }
            return total;
        }, 0);

        // Update stats
        document.getElementById('activeSubscriptions').textContent = activeSubscriptions;
        document.getElementById('totalDays').textContent = totalDays;

        const subscriptionsList = document.getElementById('subscriptionsList');

        if (subscriptions.length === 0) {
            subscriptionsList.innerHTML = `
                <div class="empty-subscriptions">
                    <i class="fas fa-crown"></i>
                    <p>У вас пока нет активных подписок</p>
                    <button class="cta-button" onclick="document.querySelector('#products').scrollIntoView({behavior: 'smooth'})">
                        <i class="fas fa-shopping-cart"></i>
                        Купить подписку
                    </button>
                </div>
            `;
            return;
        }

        subscriptionsList.innerHTML = subscriptions.map(subscription => {
            const isActive = subscription.status === 'completed';
            const daysLeft = calculateDaysLeft(subscription);
            const progressPercent = calculateProgress(subscription);
            
            return `
                <div class="subscription-item">
                    <div class="subscription-header">
                        <div class="subscription-product">
                            <i class="fas fa-crown"></i>
                            ${subscription.productName}
                        </div>
                        <div class="subscription-status ${isActive ? 'active' : 'expired'}">
                            ${isActive ? 'Активна' : 'Истекла'}
                        </div>
                    </div>
                    <div class="subscription-details">
                        <div class="subscription-detail">
                            <div class="subscription-detail-label">Цена</div>
                            <div class="subscription-detail-value">${subscription.price}</div>
                        </div>
                        <div class="subscription-detail">
                            <div class="subscription-detail-label">Период</div>
                            <div class="subscription-detail-value">${subscription.period}</div>
                        </div>
                        <div class="subscription-detail">
                            <div class="subscription-detail-label">Дата покупки</div>
                            <div class="subscription-detail-value">${new Date(subscription.createdAt).toLocaleDateString('ru-RU')}</div>
                        </div>
                        ${isActive ? `
                        <div class="subscription-detail">
                            <div class="subscription-detail-label">Осталось дней</div>
                            <div class="subscription-detail-value">${daysLeft}</div>
                        </div>
                        ` : ''}
                    </div>
                    ${isActive ? `
                    <div class="subscription-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">Использовано ${100 - progressPercent}% от подписки</div>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');

    } catch (error) {
        showNotification('Ошибка загрузки подписок', 'error');
    }
}

// Helper functions for subscriptions
function calculateDaysLeft(subscription) {
    const createdDate = new Date(subscription.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (subscription.period.includes('день')) {
        const totalDays = parseInt(subscription.period.match(/\d+/)?.[0] || '0');
        return Math.max(0, totalDays - diffDays);
    } else if (subscription.period.includes('дней')) {
        const totalDays = parseInt(subscription.period.match(/\d+/)?.[0] || '0');
        return Math.max(0, totalDays - diffDays);
    }
    return 0;
}

function calculateProgress(subscription) {
    const createdDate = new Date(subscription.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (subscription.period.includes('день')) {
        const totalDays = parseInt(subscription.period.match(/\d+/)?.[0] || '0');
        return Math.min(100, (diffDays / totalDays) * 100);
    } else if (subscription.period.includes('дней')) {
        const totalDays = parseInt(subscription.period.match(/\d+/)?.[0] || '0');
        return Math.min(100, (diffDays / totalDays) * 100);
    }
    return 0;
}

// Setup order filters
function setupOrderFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter orders
            const filter = btn.dataset.filter;
            filterOrders(filter);
        });
    });
}

// Filter orders by status
function filterOrders(filter) {
    const orderItems = document.querySelectorAll('.order-item');
    
    orderItems.forEach(item => {
        const statusElement = item.querySelector('.order-status');
        if (!statusElement) return;
        
        const status = statusElement.classList.contains('pending') ? 'pending' :
                     statusElement.classList.contains('completed') ? 'completed' :
                     statusElement.classList.contains('cancelled') ? 'cancelled' : 'unknown';
        
        if (filter === 'all' || status === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'В обработке',
        'completed': 'Выполнен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

// Profile form submit
if (profileForm) profileForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('profileUsernameInput').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    if (!email) {
        showNotification('Email обязателен', 'error');
        return;
    }

    try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        const result = await window.browserDB.updateProfile(parseInt(userId), {
            email,
            profileData: { bio }
        });

        if (!result.success) {
            throw new Error(result.message);
        }

        showNotification('Профиль обновлен');
        await loadUserProfile();
        updateUserUI({ email });

    } catch (error) {
        showNotification(error.message || 'Ошибка обновления профиля', 'error');
    }
});

// Logout
if (logoutBtn) logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    updateUserUI(null);
    profileModal.style.display = 'none';
    showNotification('Вы вышли из системы');
});

// Update user UI based on auth status
function updateUserUI(user) {
    const userStatus = document.getElementById('userStatus');
    const authButtons = document.getElementById('authButtons');

    if (user) {
        userStatus.style.display = 'flex';
        authButtons.style.display = 'none';
        document.getElementById('userName').textContent = user.email;
        document.getElementById('userAvatar').textContent = user.email.charAt(0).toUpperCase();
    } else {
        userStatus.style.display = 'none';
        authButtons.style.display = 'flex';
    }
}

// Check auth status on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize database
    try {
        await window.browserDB.init();
    } catch (error) {
        console.error('Database initialization failed:', error);
    }

    // Initialize auth modal
    initializeAuthModal();
    setupAuthEventListeners();
    setupAuthFormHandler();

    // Initialize quantity modal
    initializeQuantityModal();

    const userData = localStorage.getItem('user_data');
    const userId = localStorage.getItem('user_id');

    if (userData && userId) {
        try {
            const user = JSON.parse(userData);
            updateUserUI(user);
        } catch (error) {
            localStorage.removeItem('user_data');
            localStorage.removeItem('user_id');
        }
    }
});

// Notification system
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--accent-gold)' : '#ff4444'};
        color: ${type === 'success' ? 'var(--text-dark)' : 'white'};
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Enhanced scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) rotate(0deg)';
                entry.target.style.filter = 'blur(0px)';
            }, index * 100); // Staggered animation
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.product-card, .about-content, .contact-content, .section-title, .hero-title, .hero-subtitle').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(50px) rotate(2deg)';
    el.style.filter = 'blur(5px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease';
    observer.observe(el);
});

// Add scroll-triggered animations for specific elements
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const windowHeight = window.innerHeight;

    // Animate hero elements on scroll
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const rect = heroTitle.getBoundingClientRect();
        if (rect.top < windowHeight * 0.8) {
            heroTitle.style.transform = 'scale(1.05)';
            heroTitle.style.textShadow = '0 0 30px rgba(218, 165, 32, 0.5)';
        } else {
            heroTitle.style.transform = 'scale(1)';
            heroTitle.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
        }
    }

    // Animate product cards with different effects
    document.querySelectorAll('.product-card').forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < windowHeight * 0.9 && rect.bottom > 0) {
            const progress = (windowHeight - rect.top) / windowHeight;
            card.style.transform = `translateY(${Math.min(0, -15 * progress)}px) scale(${1 + progress * 0.02})`;
        }
    });

    // Add floating animation to footer elements
    const footer = document.querySelector('.footer');
    if (footer) {
        const rect = footer.getBoundingClientRect();
        if (rect.top < windowHeight) {
            const rate = (scrolled - rect.top + windowHeight) * 0.02;
            footer.style.backgroundPositionY = `${rate}px`;
        }
    }
});

// Enhanced parallax effects
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;

    // Hero section parallax
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');
    const heroImage = document.querySelector('.hero-image');
    const floatingCard = document.querySelector('.floating-card');

    if (hero) {
        const rate = scrolled * 0.5;
        hero.style.backgroundPositionY = `${rate * 0.1}px`;
    }

    if (heroContent) {
        const rate = scrolled * -0.3;
        heroContent.style.transform = `translateY(${rate}px)`;
    }

    if (heroImage) {
        const rate = scrolled * -0.2;
        heroImage.style.transform = `translateY(${rate}px)`;
    }

    if (floatingCard) {
        const rate = scrolled * -0.5;
        floatingCard.style.transform = `translateY(${rate}px)`;
    }

    // Products section parallax
    const products = document.querySelector('.products');
    if (products) {
        const rect = products.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const rate = (scrolled - rect.top) * 0.1;
            products.style.backgroundPositionY = `${rate}px`;
        }
    }

    // Contact section parallax
    const contact = document.querySelector('.contact');
    if (contact) {
        const rect = contact.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const rate = (scrolled - rect.top) * -0.05;
            contact.style.transform = `translateY(${rate}px)`;
        }
    }
});

// Enhanced hover effects
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-15px) scale(1.03)';
        this.style.boxShadow = '0 25px 50px rgba(139, 0, 0, 0.2)';
        const icon = this.querySelector('.product-icon');
        if (icon) {
            icon.style.transform = 'scale(1.2) rotate(5deg)';
            icon.style.transition = 'transform 0.3s ease';
        }
    });

    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.15)';
        const icon = this.querySelector('.product-icon');
        if (icon) {
            icon.style.transform = 'scale(1) rotate(0deg)';
        }
    });
});

// Add hover effects to navigation links
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
        this.style.textShadow = '0 2px 4px rgba(218, 165, 32, 0.3)';
    });

    link.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.textShadow = 'none';
    });
});

// Add hover effects to buttons
document.querySelectorAll('.cta-button, .product-button, .nav-auth-btn, .nav-register-btn').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px) scale(1.05)';
        this.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.2)';
    });

    button.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
        this.style.boxShadow = '';
    });
});

// Add click effect to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    .nav-menu.active {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--gradient-primary);
        padding: 2rem;
        box-shadow: 0 4px 20px var(--shadow);
    }
    
    .nav-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .nav-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .nav-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-content i {
        font-size: 1.2rem;
    }
`;
document.head.appendChild(style);


// Initialize particles
document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles.js
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: {
                    value: 80,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: '#DAA520'
                },
                shape: {
                    type: 'circle',
                    stroke: {
                        width: 0,
                        color: '#000000'
                    }
                },
                opacity: {
                    value: 0.5,
                    random: false,
                    anim: {
                        enable: false,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false
                    }
                },
                size: {
                    value: 3,
                    random: true,
                    anim: {
                        enable: false,
                        speed: 40,
                        size_min: 0.1,
                        sync: false
                    }
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#8B0000',
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false,
                    attract: {
                        enable: false,
                        rotateX: 600,
                        rotateY: 1200
                    }
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'repulse'
                    },
                    onclick: {
                        enable: true,
                        mode: 'push'
                    },
                    resize: true
                },
                modes: {
                    grab: {
                        distance: 400,
                        line_linked: {
                            opacity: 1
                        }
                    },
                    bubble: {
                        distance: 400,
                        size: 40,
                        duration: 2,
                        opacity: 8,
                        speed: 3
                    },
                    repulse: {
                        distance: 200,
                        duration: 0.4
                    },
                    push: {
                        particles_nb: 4
                    },
                    remove: {
                        particles_nb: 2
                    }
                }
            },
            retina_detect: true
        });
    }

    // Add loading animation
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Add scroll indicator
    const scrollIndicator = document.createElement('div');
    scrollIndicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
    scrollIndicator.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        color: var(--accent-gold);
        font-size: 2rem;
        animation: bounce 2s infinite;
        cursor: pointer;
        z-index: 1000;
    `;
    
    scrollIndicator.addEventListener('click', () => {
        document.querySelector('#products').scrollIntoView({
            behavior: 'smooth'
        });
    });
    
    document.body.appendChild(scrollIndicator);
    
    // Hide scroll indicator when scrolled
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 100) {
            scrollIndicator.style.opacity = '0';
        } else {
            scrollIndicator.style.opacity = '1';
        }
    });
});

// Add bounce animation
const bounceStyle = document.createElement('style');
bounceStyle.textContent = `
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
        }
        40% {
            transform: translateX(-50%) translateY(-10px);
        }
        60% {
            transform: translateX(-50%) translateY(-5px);
        }
    }
`;
document.head.appendChild(bounceStyle);

// Product Button Click Handler
document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('product-button')) {
        e.preventDefault();
        
        const productCard = e.target.closest('.product-card');
        const productName = productCard.querySelector('.product-title').textContent;
        const priceOptions = productCard.querySelectorAll('.price-option');
        
        // Check if user is logged in
        const userId = localStorage.getItem('user_id');
        
        if (priceOptions.length > 0) {
            // Show price selection
            let priceOptionsText = 'Выберите период:\n';
            priceOptions.forEach((option, index) => {
                const price = option.querySelector('.price').textContent;
                const period = option.querySelector('.price-period').textContent;
                priceOptionsText += `${index + 1}. ${period} - ${price}\n`;
            });
            
            const selectedOption = prompt(priceOptionsText + '\nВведите номер опции:');
            const optionIndex = parseInt(selectedOption) - 1;
            
            if (optionIndex >= 0 && optionIndex < priceOptions.length) {
                const selectedPrice = priceOptions[optionIndex].querySelector('.price').textContent;
                const selectedPeriod = priceOptions[optionIndex].querySelector('.price-period').textContent;
                
                const userId = localStorage.getItem('user_id');
                if (userId) {
                    // User is logged in - create order
                    try {
                        const result = await window.browserDB.createOrder({
                            userId: parseInt(userId),
                            productName: productName,
                            price: selectedPrice,
                            period: selectedPeriod,
                            status: 'completed' // Auto-complete for demo
                        });

                        if (result) {
                            showNotification(`Заказ создан: ${productName} - ${selectedPeriod} за ${selectedPrice}`);
                        } else {
                            throw new Error('Ошибка создания заказа');
                        }
                    } catch (error) {
                        showNotification('Ошибка создания заказа. Попробуйте позже.', 'error');
                    }
                } else {
                    // User not logged in
                    showNotification(`Вы выбрали: ${productName} - ${selectedPeriod} за ${selectedPrice}. Войдите в систему для оформления заказа!`);
                }
            }
        } else {
            // Single price product
            const price = productCard.querySelector('.price').textContent;
            
            const userId = localStorage.getItem('user_id');
            if (userId) {
                // User is logged in - create order
                try {
                    const result = await window.browserDB.createOrder({
                        userId: parseInt(userId),
                        productName: productName,
                        price: price,
                        period: 'Одноразовая покупка',
                        status: 'completed' // Auto-complete for demo
                    });

                    if (result) {
                        showNotification(`Заказ создан: ${productName} за ${price}`);
                    } else {
                        throw new Error('Ошибка создания заказа');
                    }
                } catch (error) {
                    showNotification('Ошибка создания заказа. Попробуйте позже.', 'error');
                }
            } else {
                // User not logged in
                showNotification(`Вы выбрали: ${productName} за ${price}. Войдите в систему для оформления заказа!`);
            }
        }
    }
});