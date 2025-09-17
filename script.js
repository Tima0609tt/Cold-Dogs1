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

// Add to cart functionality
document.querySelectorAll('.product-button').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Add visual feedback
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i> Добавлено!';
        this.style.background = 'var(--accent-gold)';
        this.style.color = 'var(--text-dark)';
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.innerHTML = originalText;
            this.style.background = '';
            this.style.color = '';
        }, 2000);
        
        // Show notification
        showNotification('Товар добавлен в корзину!');
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
            const username = document.getElementById('authUsername').value.trim();
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;

            if (!username || !email || !password) {
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
                    result = await window.browserDB.register(username, email, password);
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
        document.getElementById('profileUsername').textContent = result.user.username;
        document.getElementById('profileEmail').textContent = result.user.email;
        document.getElementById('profileAvatar').textContent = result.user.username.charAt(0).toUpperCase();
        document.getElementById('profileCreatedAt').textContent = new Date(result.user.createdAt).toLocaleDateString('ru-RU');
        document.getElementById('profileLastLogin').textContent = result.user.lastLogin ? 
            new Date(result.user.lastLogin).toLocaleDateString('ru-RU') : 'Никогда';
        document.getElementById('profileOrdersCount').textContent = result.orders.length;

        // Update form fields
        document.getElementById('profileUsernameInput').value = result.user.username;
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
                    <div class="order-product">${order.productName}</div>
                    <div class="order-status ${order.status}">${getStatusText(order.status)}</div>
                </div>
                <div class="order-details">
                    <div class="order-detail">
                        <div class="order-detail-label">Цена</div>
                        <div class="order-detail-value">${order.price}</div>
                    </div>
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
    
    const username = document.getElementById('profileUsernameInput').value.trim();
    const bio = document.getElementById('profileBio').value.trim();

    if (!username) {
        showNotification('Имя пользователя обязательно', 'error');
        return;
    }

    try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        const result = await window.browserDB.updateProfile(parseInt(userId), {
            username,
            profileData: { bio }
        });

        if (!result.success) {
            throw new Error(result.message);
        }

        showNotification('Профиль обновлен');
        await loadUserProfile();
        updateUserUI({ username });

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
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
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

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.product-card, .about-content, .contact-content').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const floatingCard = document.querySelector('.floating-card');
    
    if (hero && floatingCard) {
        const rate = scrolled * -0.5;
        floatingCard.style.transform = `translateY(${rate}px)`;
    }
});

// Add hover effects to product cards
document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
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