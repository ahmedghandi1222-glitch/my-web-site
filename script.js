// Mock Backend Service
const DB = {
    async delay(ms = 400) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    async get(collection) {
        await this.delay();
        return JSON.parse(localStorage.getItem(`sj_store_${collection}`)) || [];
    },
    
    async set(collection, data) {
        await this.delay();
        localStorage.setItem(`sj_store_${collection}`, JSON.stringify(data));
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
                const [prods, cats, brnds, ords, boxes] = await Promise.all([
                    DB.getProducts(),
                    DB.getCategories(),
                    DB.getBrands(),
                    DB.getOrders(),
                    DB.getBoxProducts()
                ]);
                
                this.products = prods;
                this.categories = cats;
                this.brands = brnds;
                this.orders = ords;

                if (boxes && boxes.length > 0) {
                    this.boxProducts = boxes;
                } else {
                    this.boxProducts = [
                        { id: 'box-1', name: 'Starter Snack Box', price: 29.99, category: 'Bundle', description: 'A perfect introduction to healthy snacking. Includes 10 of our most popular premium snacks.' },
                        { id: 'box-2', name: 'Premium Monthly Box', price: 49.99, category: 'Subscription', description: 'Our deluxe selection delivered to your door. 20 premium items tailored for peak nutrition.' }
                    ];
                    await DB.saveBoxProducts(this.boxProducts);
                }

                // Load local cart
                this.cart = JSON.parse(localStorage.getItem('sj_local_cart')) || [];
                
            } catch (error) {
                this.notify('Failed to load store data', 'error');
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
                return this.notify('Please fill all fields', 'error');
            }
            if (this.authForm.password.length < 6) {
                return this.notify('Password must be at least 6 characters', 'error');
            }

            this.isLoading = true;
            try {
                const users = await DB.getUsers();
                if (users.find(u => u.email === this.authForm.email)) {
                    throw new Error('Email already registered');
                }
                const newUser = { ...this.authForm, id: Date.now(), address: '' };
                users.push(newUser);
                await DB.saveUsers(users);
                
                this.setSession(newUser);
                this.notify('Account created successfully!');
                this.currentView = 'store';
            } catch (err) {
                this.notify(err.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async handleLogin() {
            if (!this.authForm.email || !this.authForm.password) {
                return this.notify('Please enter email and password', 'error');
            }

            this.isLoading = true;
            try {
                const users = await DB.getUsers();
                const user = users.find(u => u.email === this.authForm.email && u.password === this.authForm.password);
                
                if (!user) throw new Error('Invalid credentials');
                
                this.setSession(user);
                this.notify('Welcome back!');
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
                    this.notify('Admin access granted');
                    this.currentView = 'admin';
                } else {
                    throw new Error('Invalid admin credentials');
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
            this.notify('Logged out successfully');
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
                }
                
                this.currentUser.name = this.profileForm.name;
                this.currentUser.address = this.profileForm.address;
                this.setSession(this.currentUser);
                
                this.showProfile = false;
                this.notify('Profile updated!');
            } catch (e) {
                this.notify('Failed to update profile', 'error');
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
                return this.notify('Please login to shop', 'error');
            }
            const existing = this.cart.find(i => i.id === product.id);
            if (existing) {
                existing.qty++;
            } else {
                this.cart.push({ ...product, qty: 1 });
            }
            this.saveCart();
            this.notify('Added to cart!');
        },

        async buyNow(product) {
            if (!this.currentUser || this.currentUser.role === 'admin') {
                this.currentView = 'auth';
                return this.notify('Please login to purchase directly', 'error');
            }
            if (!this.currentUser.address) {
                this.currentView = 'profile';
                return this.notify('Please add a delivery address to complete direct purchase', 'warning');
            }

            this.isLoading = true;
            try {
                const newOrder = {
                    id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    userId: this.currentUser.email,
                    customerName: this.currentUser.name,
                    address: this.currentUser.address,
                    items: [{ ...product, qty: 1 }],
                    total: product.price,
                    date: new Date().toISOString(),
                    status: 'Processing'
                };
                
                this.orders.unshift(newOrder);
                await DB.saveOrders(this.orders);
                
                this.notify('Direct purchase successful! 🎉');
            } catch (e) {
                this.notify('Purchase failed. Try again.', 'error');
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
                return this.notify('Please provide a shipping address first', 'error');
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
                    status: 'Processing'
                };
                
                this.orders.unshift(newOrder);
                await DB.saveOrders(this.orders);
                
                this.cart = [];
                this.saveCart();
                this.showCart = false;
                this.notify('Order placed successfully! 🎉');
            } catch (e) {
                this.notify('Checkout failed. Try again.', 'error');
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
                return this.notify('Fill required fields', 'error');
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
                this.notify('Product saved successfully');
            } catch (e) {
                this.notify('Failed to save product', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteProduct(id) {
            if (!confirm('Are you sure you want to delete this product?')) return;
            this.isLoading = true;
            try {
                this.products = this.products.filter(p => p.id !== id);
                await DB.saveProducts(this.products);
                this.notify('Product deleted');
            } catch (e) {
                this.notify('Delete failed', 'error');
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
            if (!this.categoryForm.name) return this.notify('Name is required', 'error');
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
                this.notify('Category saved successfully');
            } catch (e) {
                this.notify('Failed to save category', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteCategory(id) {
            if (!confirm('Delete this category?')) return;
            this.isLoading = true;
            try {
                this.categories = this.categories.filter(c => c.id !== id);
                await DB.saveCategories(this.categories);
                this.notify('Category deleted');
            } catch (e) {
                this.notify('Delete failed', 'error');
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
            if (!this.brandForm.name) return this.notify('Brand name is required', 'error');
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
                this.notify('Brand saved successfully!');
            } catch (e) {
                this.notify('Failed to save brand', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteBrand(id) {
            if (!confirm('Delete this brand?')) return;
            this.isLoading = true;
            try {
                this.brands = this.brands.filter(b => b.id !== id);
                await DB.saveBrands(this.brands);
                this.notify('Brand deleted');
            } catch (e) {
                this.notify('Delete failed', 'error');
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
            if (!this.boxForm.name || !this.boxForm.price) return this.notify('Name and Price are required', 'error');
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
                this.notify('Box saved successfully!');
            } catch (e) {
                this.notify('Failed to save box', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteBox(id) {
            if (!confirm('Delete this box?')) return;
            this.isLoading = true;
            try {
                this.boxProducts = this.boxProducts.filter(b => b.id !== id);
                await DB.saveBoxProducts(this.boxProducts);
                this.notify('Box deleted');
            } catch (e) {
                this.notify('Delete failed', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async deleteOrder(id) {
            if (!confirm('Permanently delete this order?')) return;
            this.isLoading = true;
            try {
                this.orders = this.orders.filter(o => o.id !== id);
                await DB.saveOrders(this.orders);
                this.notify('Order deleted');
            } catch (e) {
                this.notify('Failed to delete order', 'error');
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
                this.notify(`Order marked as ${newStatus}`);
            } catch (e) {
                this.notify('Failed to update order', 'error');
            } finally {
                this.isLoading = false;
            }
        }
    };
}