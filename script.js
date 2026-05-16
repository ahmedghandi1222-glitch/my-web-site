const firebaseConfig = {
    apiKey: "AIzaSyBV5jneaIKetpViUC4vDyjIpySY66fujlA",
    authDomain: "sagjoy-store.firebaseapp.com",
    projectId: "sagjoy-store",
    storageBucket: "sagjoy-store.firebasestorage.app",
    messagingSenderId: "132082956166",
    appId: "1:132082956166:web:485c9ad9495bf21238de07",
    measurementId: "G-YJ6VKKNM8G",
    databaseURL: "https://sagjoy-store-default-rtdb.firebaseio.com"
};

let database = null;
let isFirebaseReady = false;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseReady = true;
    } else {
        console.warn("Firebase SDK not loaded. Using Local Storage fallback.");
    }
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// Helper to create a timeout promise
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms));

const DB = {
    async get(collection) {
        if (isFirebaseReady && database) {
            try {
                // Wait for either the database to respond or 3 seconds to pass
                const snapshot = await Promise.race([
                    database.ref(`sj_store/${collection}`).once('value'),
                    timeout(3000)
                ]);
                const data = snapshot.val();
                
                // Keep local storage in sync as a backup
                if (data) localStorage.setItem(`sj_store_${collection}`, JSON.stringify(data));
                
                return data || [];
            } catch(e) {
                console.warn(`Firebase get error or timeout for ${collection}. Falling back to Local Storage.`, e.message);
                isFirebaseReady = false; // Disable Firebase for subsequent calls to speed things up
            }
        }
        // Local Storage Fallback
        const localData = localStorage.getItem(`sj_store_${collection}`);
        return localData ? JSON.parse(localData) : [];
    },
    
    async set(collection, data) {
        // Always save to local storage as fallback/backup
        localStorage.setItem(`sj_store_${collection}`, JSON.stringify(data));

        if (isFirebaseReady && database) {
            try {
                await Promise.race([
                    database.ref(`sj_store/${collection}`).set(data),
                    timeout(3000)
                ]);
            } catch(e) {
                console.warn(`Firebase set error or timeout for ${collection}. Falling back to Local Storage.`, e.message);
                isFirebaseReady = false; // Disable Firebase to prevent hanging later
            }
        }
    },
    // Entity specific methods
    async getUsers() { return this.get('users'); },
    async saveUsers(users) { return this.set('users', users); },
    
    async getProducts() { return this.get('products'); },
    async saveProducts(products) { return this.set('products', products); },
    
    async getCategories() { return this.get('categories'); },
    async saveCategories(categories) { return this.set('categories', categories); },
    
    async getBrands() { return this.get('brands'); },
    async saveBrands(brands) { return this.set('brands', brands); },

    async getBoxProducts() { return this.get('boxProducts'); },
    async saveBoxProducts(boxProducts) { return this.set('boxProducts', boxProducts); },

    async getOrders() { return this.get('orders'); },
    async saveOrders(orders) { return this.set('orders', orders); }
};

// Main App Controller
function sagjoyApp() {
    return {
        // App State
        isAppLoading: true,
        isLoading: false,
        currentUser: null,
        currentView: 'store', // 'store', 'auth', 'admin'
        authTab: 'login', // 'login', 'register'
        
        // Notifications
        toast: { show: false, msg: '', type: 'success' },

        // Data Stores
        products: [],
        boxProducts: [],
        categories: [],
        brands: [],
        cart: [],
        orders: [],
        users: [],

        // Customer State
        filters: {
            category: 'all',
            search: '',
            brand: '',
            minPrice: '',
            maxPrice: '',
            sort: 'default'
        },
        showCart: false,
        showProfile: false,
        showProductModal: false,
        selectedProduct: null,
        showMobileFilters: false,
        showReceipt: false,
        receiptOrder: null,

        // Forms
        authForm: { name: '', email: '', password: '', role: 'customer' },
        adminAuthForm: { email: '', password: '' },
        productForm: { id: null, name: '', price: '', brand: '', category: '', image: '', description: '' },
        categoryForm: { id: null, name: '', image: '' },
        brandForm: { id: null, name: '', image: '' },
        boxForm: { id: null, name: '', price: '', category: '', description: '', image: '' },
        profileForm: { name: '', address: '' },

        async init() {
            try {
                // Check session synchronously for immediate UI rendering
                const session = sessionStorage.getItem('sj_session');
                if (session) {
                    this.currentUser = JSON.parse(session);
                    this.currentView = this.currentUser.role === 'admin' ? 'admin' : 'store';
                }

                // Load initial data
                const [prods, cats, brnds, ords, boxes, usrs] = await Promise.all([
                    DB.getProducts(),
                    DB.getCategories(),
                    DB.getBrands(),
                    DB.getOrders(),
                    DB.getBoxProducts(),
                    DB.getUsers()
                ]);
                
                if (prods && prods.length > 0) {
                    this.products = prods;
                } else {
                    this.products = [
                        { id: 'p-1', name: 'Organik Fıstık Ezmesi', price: 89.99, brand: 'Doğal', category: 'Atıştırmalık', image: 'https://images.unsplash.com/photo-1599598425947-3300262108bf?w=500&q=80', description: 'Şekersiz, %100 fıstık ezmesi.' },
                        { id: 'p-2', name: 'Yulaf Bar', price: 24.99, brand: 'Sağlıklı', category: 'Atıştırmalık', image: 'https://images.unsplash.com/photo-1622485507115-46ba022d4f29?w=500&q=80', description: 'Enerji veren doğal yulaf barı.' },
                        { id: 'p-3', name: 'Soğuk Sıkım Meyve Suyu', price: 45.00, brand: 'Doğal', category: 'İçecek', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&q=80', description: 'Taze sıkılmış, katkısız meyve suyu.' }
                    ];
                    await DB.saveProducts(this.products);
                }

                if (cats && cats.length > 0) {
                    this.categories = cats;
                } else {
                    this.categories = [
                        { id: 'c-1', name: 'Atıştırmalık', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=500&q=80' },
                        { id: 'c-2', name: 'İçecek', image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80' },
                        { id: 'c-3', name: 'Tatlı', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&q=80' }
                    ];
                    await DB.saveCategories(this.categories);
                }

                if (brnds && brnds.length > 0) {
                    this.brands = brnds;
                } else {
                    this.brands = [
                        { id: 'b-1', name: 'Doğal', image: '' },
                        { id: 'b-2', name: 'Sağlıklı', image: '' }
                    ];
                    await DB.saveBrands(this.brands);
                }

                this.orders = ords;
                this.users = usrs;

                if (boxes && boxes.length > 0) {
                    this.boxProducts = boxes;
                } else {
                    this.boxProducts = [
                        { id: 'box-1', name: 'Başlangıç Atıştırmalık Kutusu', price: 29.99, category: 'Paket', description: 'Sağlıklı atıştırmalıklara mükemmel bir giriş. En popüler 10 atıştırmalığımızı içerir.' },
                        { id: 'box-2', name: 'Aylık Kutu', price: 49.99, category: 'Abonelik', description: 'Kapınıza teslim edilen seçkin ürünlerimiz. En yüksek beslenme için özel olarak hazırlanmış 20 ürün.' }
                    ];
                    await DB.saveBoxProducts(this.boxProducts);
                }

                // Load local cart
                this.cart = JSON.parse(localStorage.getItem('sj_local_cart')) || [];
                
            } catch (error) {
                this.notify('Mağaza verileri yüklenemedi', 'error');
            } finally {
                this.isAppLoading = false;
            }
        },

        notify(msg, type = 'success') {
            this.toast.msg = msg;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => { this.toast.show = false; }, 3000);
        },

        // --- AUTHENTICATION ---
        async handleRegister() {
            if (!this.authForm.name || !this.authForm.email || !this.authForm.password) {
                return this.notify('Lütfen tüm alanları doldurun', 'error');
            }
            if (this.authForm.password.length < 6) {
                return this.notify('Şifre en az 6 karakter olmalıdır', 'error');
            }

            this.isLoading = true;
            try {
                const users = await DB.getUsers();
                if (users.find(u => u.email === this.authForm.email)) {
                    throw new Error('E-posta zaten kayıtlı');
                }
                const newUser = { ...this.authForm, id: Date.now(), address: '' };
                users.push(newUser);
                await DB.saveUsers(users);
                this.users = users;
                
                this.setSession(newUser);
                this.notify('Hesap başarıyla oluşturuldu!');
                this.currentView = 'store';
            } catch (err) {
                this.notify(err.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async handleLogin() {
            if (!this.authForm.email || !this.authForm.password) {
                return this.notify('Lütfen e-posta ve şifrenizi girin', 'error');
            }

            this.isLoading = true;
            try {
                const users = await DB.getUsers();
                const user = users.find(u => u.email === this.authForm.email && u.password === this.authForm.password);
                
                if (!user) throw new Error('Geçersiz kimlik bilgileri');
                
                this.setSession(user);
                this.notify('Tekrar hoş geldiniz!');
                this.currentView = 'store';
            } catch (err) {
                this.notify(err.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async handleAdminLogin() {
            this.isLoading = true;
            try {
                // Hardcoded admin for demo purposes
                if (this.adminAuthForm.email === 'admin@sagjoy.com' && this.adminAuthForm.password === 'admin123') {
                    const adminUser = { id: 0, name: 'Super Admin', email: 'admin@sagjoy.com', role: 'admin' };
                    this.setSession(adminUser);
                    this.notify('Yönetici erişimi verildi');
                    this.currentView = 'admin';
                } else {
                    throw new Error('Geçersiz yönetici kimlik bilgileri');
                }
            } catch (err) {
                this.notify(err.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        setSession(user) {
            this.currentUser = user;
            sessionStorage.setItem('sj_session', JSON.stringify(user));
            if (user) {
                this.profileForm.name = user.name;
                this.profileForm.address = user.address;
            }
        },

        logout() {
            this.currentUser = null;
            sessionStorage.removeItem('sj_session');
            this.currentView = 'store';
            this.notify('Başarıyla çıkış yapıldı');
        },

        async updateProfile() {
            this.isLoading = true;
            try {
                const users = await DB.getUsers();
                const idx = users.findIndex(u => u.id === this.currentUser.id);
                if (idx > -1) {
                    users[idx].name = this.profileForm.name;
                    users[idx].address = this.profileForm.address;
                    await DB.saveUsers(users);
                    this.users = users;
                }
                
                this.currentUser.name = this.profileForm.name;
                this.currentUser.address = this.profileForm.address;
                this.setSession(this.currentUser);
                
                this.showProfile = false;
                this.notify('Profil güncellendi!');
            } catch (e) {
                this.notify('Profil güncellenemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // --- STORE & CART ---
        get sortedCategories() {
            return [...this.categories].sort((a, b) => a.name.localeCompare(b.name));
        },

        get activeBrands() {
            return [...this.brands].sort((a, b) => a.name.localeCompare(b.name));
        },

        get filteredProducts() {
            let result = this.products.filter(p => {
                const f = this.filters;
                const matchCat = f.category === 'all' || p.category === f.category;
                const matchSearch = p.name.toLowerCase().includes(f.search.toLowerCase());
                const matchBrand = f.brand === '' || p.brand === f.brand;
                const matchMin = f.minPrice === '' || p.price >= Number(f.minPrice);
                const matchMax = f.maxPrice === '' || p.price <= Number(f.maxPrice);
                return matchCat && matchSearch && matchBrand && matchMin && matchMax;
            });

            switch (this.filters.sort) {
                case 'price_asc': result.sort((a, b) => a.price - b.price); break;
                case 'price_desc': result.sort((a, b) => b.price - a.price); break;
                case 'name_asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
                case 'name_desc': result.sort((a, b) => b.name.localeCompare(a.name)); break;
            }
            return result;
        },

        get displayItems() {
            const products = [...this.filteredProducts];
            const boxes = [...this.boxProducts].map(b => ({ ...b, isBox: true }));
            const items = [];
            
            const interval = 4;
            let pIndex = 0;
            let bIndex = 0;
            
            while(pIndex < products.length || bIndex < boxes.length) {
                for(let i = 0; i < interval && pIndex < products.length; i++) {
                    items.push(products[pIndex++]);
                }
                if (bIndex < boxes.length) {
                    items.push(boxes[bIndex++]);
                }
            }
            return items;
        },

        get cartTotal() {
            return this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        },

        addToCart(product) {
            if (!this.currentUser || this.currentUser.role === 'admin') {
                this.currentView = 'auth';
                return this.notify('Alışveriş yapmak için lütfen giriş yapın', 'error');
            }
            const existing = this.cart.find(i => i.id === product.id);
            if (existing) {
                existing.qty++;
            } else {
                this.cart.push({ ...product, qty: 1 });
            }
            this.saveCart();
            this.notify('Sepete eklendi!');
        },

        async buyNow(product) {
            if (!this.currentUser || this.currentUser.role === 'admin') {
                this.currentView = 'auth';
                return this.notify('Doğrudan satın almak için lütfen giriş yapın', 'error');
            }
            if (!this.currentUser.address) {
                this.currentView = 'profile';
                return this.notify('Doğrudan satın almayı tamamlamak için lütfen bir teslimat adresi ekleyin', 'warning');
            }
            if (product.price < 200) {
                return this.notify('Sipariş verebilmek için ürün tutarının ₺200\'dan fazla olması gerekmektedir.', 'error');
            }

            this.isLoading = true;
            try {
                const newOrder = {
                    id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    userId: this.currentUser.id,
                    customerName: this.currentUser.name,
                    address: this.currentUser.address,
                    items: [{ ...product, qty: 1 }],
                    total: product.price,
                    date: new Date().toISOString(),
                    status: 'İşleniyor'
                };
                
                this.orders.unshift(newOrder);
                await DB.saveOrders(this.orders);
                
                this.receiptOrder = newOrder;
                this.showReceipt = true;
                this.notify('Doğrudan satın alma başarılı! 🎉');
            } catch (e) {
                this.notify('Satın alma başarısız oldu. Tekrar deneyin.', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        updateCartQty(index, delta) {
            this.cart[index].qty += delta;
            if (this.cart[index].qty <= 0) {
                this.cart.splice(index, 1);
            }
            this.saveCart();
        },

        saveCart() {
            localStorage.setItem('sj_local_cart', JSON.stringify(this.cart));
        },

        async checkout() {
            if (!this.currentUser.address) {
                this.showProfile = true;
                this.showCart = false;
                return this.notify('Lütfen önce bir teslimat adresi belirtin', 'error');
            }
            if (this.cartTotal < 200) {
                return this.notify('Sipariş verebilmek için sepet tutarının ₺200\'dan fazla olması gerekmektedir.', 'error');
            }

            this.isLoading = true;
            try {
                const newOrder = {
                    id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    userId: this.currentUser.id,
                    customerName: this.currentUser.name,
                    address: this.currentUser.address,
                    items: [...this.cart],
                    total: this.cartTotal,
                    date: new Date().toISOString(),
                    status: 'İşleniyor'
                };
                
                this.orders.unshift(newOrder);
                await DB.saveOrders(this.orders);
                
                this.cart = [];
                this.saveCart();
                this.showCart = false;
                
                this.receiptOrder = newOrder;
                this.showReceipt = true;
                this.notify('Sipariş başarıyla verildi! 🎉');
            } catch (e) {
                this.notify('Ödeme başarısız oldu. Tekrar deneyin.', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // --- MY ORDERS ---
        get myOrders() {
            if (!this.currentUser) return [];
            return this.orders.filter(o => o.userId === this.currentUser.id || o.userId === this.currentUser.email);
        },

        async cancelMyOrder(id) {
            if (!confirm('Siparişinizi iptal etmek istediğinize emin misiniz?')) return;
            this.isLoading = true;
            try {
                const idx = this.orders.findIndex(o => o.id === id);
                if (idx > -1) {
                    this.orders[idx].status = 'İptal Edildi';
                    await DB.saveOrders(this.orders);
                    this.notify('Sipariş iptal edildi');
                }
            } catch (e) {
                this.notify('Sipariş iptal edilemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async modifyMyOrder(id) {
            const idx = this.orders.findIndex(o => o.id === id);
            if (idx === -1) return;
            const orderToModify = this.orders[idx];
            
            if (orderToModify.status !== 'İşleniyor') {
                return this.notify('Sadece işlenmekte olan siparişler düzenlenebilir', 'error');
            }

            if (!confirm('Siparişi düzenlemek için mevcut sipariş iptal edilecek ve ürünler sepete eklenecektir. Onaylıyor musunuz?')) return;
            
            this.isLoading = true;
            try {
                orderToModify.items.forEach(item => {
                    const existing = this.cart.find(i => i.id === item.id);
                    if (existing) {
                        existing.qty += item.qty;
                    } else {
                        this.cart.push({ ...item });
                    }
                });
                this.saveCart();

                this.orders[idx].status = 'İptal Edildi';
                await DB.saveOrders(this.orders);
                
                this.showProfile = false;
                this.showCart = true;
                this.notify('Sipariş iptal edildi, ürünler sepete eklendi');
            } catch (e) {
                this.notify('Sipariş düzenlenemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        // --- ADMIN DASHBOARD ---
        get adminStats() {
            return {
                totalSales: this.orders.reduce((sum, o) => sum + o.total, 0),
                totalOrders: this.orders.length,
                totalProducts: this.products.length,
                pendingOrders: this.orders.filter(o => o.status === 'Processing').length
            }
        },

        handleImageUpload(e, target) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (target === 'product') this.productForm.image = event.target.result;
                if (target === 'category') this.categoryForm.image = event.target.result;
                if (target === 'brand') this.brandForm.image = event.target.result;
                if (target === 'box') this.boxForm.image = event.target.result;
            };
            reader.readAsDataURL(file);
        },

        async saveProduct() {
            if (!this.productForm.name || !this.productForm.price || !this.productForm.category) {
                return this.notify('Gerekli alanları doldurun', 'error');
            }
            this.isLoading = true;
            try {
                if (this.productForm.id) {
                    // Update
                    const idx = this.products.findIndex(p => p.id === this.productForm.id);
                    this.products[idx] = { ...this.productForm };
                } else {
                    // Create
                    this.products.push({ ...this.productForm, id: Date.now() });
                }
                await DB.saveProducts(this.products);
                this.resetProductForm();
                this.notify('Ürün başarıyla kaydedildi');
            } catch (e) {
                this.notify('Ürün kaydedilemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteProduct(id) {
            if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
            this.isLoading = true;
            try {
                this.products = this.products.filter(p => p.id !== id);
                await DB.saveProducts(this.products);
                this.notify('Ürün silindi');
            } catch (e) {
                this.notify('Silme başarısız', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        editProduct(p) {
            this.productForm = { ...p };
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        resetProductForm() {
            this.productForm = { id: null, name: '', price: '', brand: '', category: '', image: '', description: '' };
        },

        editCategory(c) {
            this.categoryForm = { ...c };
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        resetCategoryForm() {
            this.categoryForm = { id: null, name: '', image: '' };
        },

        async saveCategory() {
            if (!this.categoryForm.name) return this.notify('İsim gereklidir', 'error');
            this.isLoading = true;
            try {
                if (this.categoryForm.id) {
                    const idx = this.categories.findIndex(c => c.id === this.categoryForm.id);
                    this.categories[idx] = { ...this.categoryForm };
                } else {
                    this.categories.push({ ...this.categoryForm, id: Date.now() });
                }
                await DB.saveCategories(this.categories);
                this.resetCategoryForm();
                this.notify('Kategori başarıyla kaydedildi');
            } catch (e) {
                this.notify('Kategori kaydedilemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteCategory(id) {
            if (!confirm('Bu kategoriyi silmek istiyor musunuz?')) return;
            this.isLoading = true;
            try {
                this.categories = this.categories.filter(c => c.id !== id);
                await DB.saveCategories(this.categories);
                this.notify('Kategori silindi');
            } catch (e) {
                this.notify('Silme başarısız', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        editBrand(b) {
            this.brandForm = { ...b };
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        resetBrandForm() {
            this.brandForm = { id: null, name: '', image: '' };
        },

        async saveBrand() {
            if (!this.brandForm.name) return this.notify('Marka adı gereklidir', 'error');
            this.isLoading = true;
            try {
                if (this.brandForm.id) {
                    const idx = this.brands.findIndex(b => b.id === this.brandForm.id);
                    this.brands[idx] = { ...this.brandForm };
                } else {
                    this.brands.push({ ...this.brandForm, id: Date.now() });
                }
                await DB.saveBrands(this.brands);
                this.resetBrandForm();
                this.notify('Marka başarıyla kaydedildi!');
            } catch (e) {
                this.notify('Marka kaydedilemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteBrand(id) {
            if (!confirm('Bu markayı silmek istiyor musunuz?')) return;
            this.isLoading = true;
            try {
                this.brands = this.brands.filter(b => b.id !== id);
                await DB.saveBrands(this.brands);
                this.notify('Marka silindi');
            } catch (e) {
                this.notify('Silme başarısız', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        editBox(b) {
            this.boxForm = { ...b };
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        resetBoxForm() {
            this.boxForm = { id: null, name: '', price: '', category: '', description: '', image: '' };
        },

        async saveBox() {
            if (!this.boxForm.name || !this.boxForm.price) return this.notify('İsim ve Fiyat gereklidir', 'error');
            this.isLoading = true;
            try {
                if (this.boxForm.id) {
                    const idx = this.boxProducts.findIndex(b => b.id === this.boxForm.id);
                    this.boxProducts[idx] = { ...this.boxForm };
                } else {
                    this.boxProducts.push({ ...this.boxForm, id: Date.now() });
                }
                await DB.saveBoxProducts(this.boxProducts);
                this.resetBoxForm();
                this.notify('Kutu başarıyla kaydedildi!');
            } catch (e) {
                this.notify('Kutu kaydedilemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteBox(id) {
            if (!confirm('Bu kutuyu silmek istiyor musunuz?')) return;
            this.isLoading = true;
            try {
                this.boxProducts = this.boxProducts.filter(b => b.id !== id);
                await DB.saveBoxProducts(this.boxProducts);
                this.notify('Kutu silindi');
            } catch (e) {
                this.notify('Silme başarısız', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteOrder(id) {
            if (!confirm('Bu siparişi kalıcı olarak silmek istiyor musunuz?')) return;
            this.isLoading = true;
            try {
                this.orders = this.orders.filter(o => o.id !== id);
                await DB.saveOrders(this.orders);
                this.notify('Sipariş silindi');
            } catch (e) {
                this.notify('Sipariş silinemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async updateOrderStatus(id, newStatus) {
            this.isLoading = true;
            try {
                const idx = this.orders.findIndex(o => o.id === id);
                this.orders[idx].status = newStatus;
                await DB.saveOrders(this.orders);
                this.notify(`Sipariş ${newStatus} olarak işaretlendi`);
            } catch (e) {
                this.notify('Sipariş güncellenemedi', 'error');
            } finally {
                this.isLoading = false;
            }
        }
    };
}