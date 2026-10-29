import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { productService } from '../../services/productService';
import { ecommerceService } from '../../services/ecommerceService';
import { PharmacyProduct } from '../../types/firestore';
import { CustomerAddress, OnlineOrder } from '../../types/ecommerce';
import { 
  ShoppingBag, Search, ShieldCheck, MapPin, CreditCard, Clock, CheckCircle2, 
  AlertCircle, Upload, Plus, Trash2, ArrowRight, Package, Truck, Store, FileText, ChevronRight,
  Layers, Compass, Droplet, Sparkles
} from 'lucide-react';

export const CustomerStorefrontView: React.FC = () => {
  const { organization, currentStore, firestoreUser, currentStaff } = useWorkspace();
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{ product: PharmacyProduct; qty: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [newAddress, setNewAddress] = useState<Partial<CustomerAddress>>({
    fullName: firestoreUser?.displayName || '',
    phone: '',
    houseNo: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    addressType: 'home'
  });
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [fulfilmentType, setFulfilmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'card' | 'net_banking' | 'cod' | 'store_pickup'>('upi');
  const [uploadedPlanFiles, setUploadedPlanFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'catalogue' | 'orders'>('catalogue');
  const [loading, setLoading] = useState(false);

  const orgId = organization?.id || '';
  const storeId = currentStore?.id || organization?.id || '';
  const customerId = firestoreUser?.uid || 'guest-customer';
  const customerName = firestoreUser?.displayName || currentStaff?.displayName || 'Customer';

  useEffect(() => {
    loadData();
  }, [orgId, storeId]);

  const loadData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const prodRes = await productService.getProducts(orgId, { pageSize: 100 });
      setProducts(prodRes.products);

      if (customerId && customerId !== 'guest-customer') {
        const addrs = await ecommerceService.getCustomerAddresses(orgId, customerId);
        setAddresses(addrs);
        if (addrs.length > 0) setSelectedAddressId(addrs[0].id);

        const ords = await ecommerceService.getOnlineOrders(orgId, undefined, customerId);
        setOrders(ords);
      }
    } catch (err) {
      console.error('Failed to load storefront data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: PharmacyProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as any);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    try {
      await ecommerceService.saveCustomerAddress(orgId, customerId, newAddress);
      setShowAddressModal(false);
      const addrs = await ecommerceService.getCustomerAddresses(orgId, customerId);
      setAddresses(addrs);
      if (addrs.length > 0) setSelectedAddressId(addrs[addrs.length - 1].id);
      alert('Address saved successfully!');
    } catch (err: any) {
      alert('Failed to save address: ' + err.message);
    }
  };

  const handlePlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlan(true);
    try {
      const planUrl = URL.createObjectURL(file);
      setUploadedPlanFiles(prev => [...prev, { name: file.name, url: planUrl }]);
    } catch (err: any) {
      alert('File selection failed: ' + err.message);
    } finally {
      setUploadingPlan(false);
    }
  };

  const handleCheckout = async () => {
    if (!orgId || cart.length === 0) return;
    const address = addresses.find(a => a.id === selectedAddressId);
    if (fulfilmentType === 'delivery' && !address) {
      alert('Please select or add a delivery address for site dispatch.');
      return;
    }

    try {
      const orderItems = cart.map(i => ({
        productId: i.product.id,
        productName: i.product.productName,
        brand: i.product.brand,
        sku: i.product.sku,
        qty: i.qty,
        unitPrice: i.product.sellingPrice || i.product.mrp || 100,
        discountPercent: 0,
        gstPercent: i.product.gstRate || 18,
        isPrescriptionRequired: false,
        schedule: ''
      }));

      await ecommerceService.placeOnlineOrder(
        orgId,
        storeId,
        customerId,
        customerName,
        '9999999999',
        orderItems,
        address || { 
          id: 'pickup', 
          fullName: customerName, 
          phone: '9999999999', 
          houseNo: 'Showroom Yard Pickup', 
          street: '', 
          city: '', 
          state: '', 
          postalCode: '', 
          addressType: 'warehouse', 
          isDefault: true, 
          organizationId: orgId, 
          customerId, 
          createdAt: new Date() as any, 
          updatedAt: new Date() as any 
        },
        paymentMode,
        fulfilmentType,
        uploadedPlanFiles.map(f => f.name),
        { uid: customerId, name: customerName }
      );

      setCart([]);
      setIsCartOpen(false);
      setActiveTab('orders');
      loadData();
      alert('Order placed successfully! The showroom team will review stock and prepare dispatch.');
    } catch (err: any) {
      alert('Order placement failed: ' + err.message);
    }
  };

  const categories = [
    'all',
    'Tiles & Slabs',
    'Sanitaryware',
    'Faucets & CP',
    'Tile Adhesive & Grout',
    'Pipes & Plumbing',
    'Other/General',
    ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  ].filter((v, i, a) => a.indexOf(v) === i);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const subtotal = cart.reduce((acc, i) => acc + (i.product.sellingPrice || i.product.mrp || 100) * i.qty, 0);
  const tax = Math.round(subtotal * 0.18); // Default 18% GST for tiles & building fixtures
  const grandTotal = Math.round(subtotal + tax);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Store Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1F33] via-[#0A2540] to-[#0066FF] text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-[#00C9A7] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#00E5FF]">Vetrify Verified Showroom</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{currentStore?.name || organization?.name || 'Vetrify Tiles & Architectural Store'}</h1>
          <p className="text-sm text-slate-200 mt-1">
            Vitrified Tiles, Slabs, Sanitaryware, Faucets & Tile Adhesives &bull; Direct Godown Inwards & On-Site Delivery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('catalogue')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'catalogue' ? 'bg-[#0066FF] text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Showroom Catalogue
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-[#0066FF] text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            My Orders ({orders.length})
          </button>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-[#00C9A7] hover:bg-[#00b093] text-[#0B1F33] px-4 py-2 rounded-xl text-sm font-extrabold shadow-md flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart ({cart.reduce((a, b) => a + b.qty, 0)})</span>
          </button>
        </div>
      </div>

      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          {/* Search & Category Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input 
                type="text" 
                placeholder="Search tile models, shade codes, sanitaryware or brands..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#0066FF] text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                >
                  {cat === 'all' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const price = product.sellingPrice || product.mrp || 100;
              const hasDiscount = product.mrp && product.mrp > price;
              const discountPct = hasDiscount ? Math.round(((product.mrp! - price) / product.mrp!) * 100) : 0;

              return (
                <div key={product.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-[#0066FF]">
                        {product.category || 'Tiles & Slabs'}
                      </span>
                      {product.brand && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {product.brand}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">{product.productName}</h3>
                    {product.sku && (
                      <p className="text-xs font-mono text-slate-400 mt-1">SKU: {product.sku}</p>
                    )}
                    <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                      <p>Pack / Unit: <strong className="text-slate-700 dark:text-slate-300">{product.packSize || '1 Box'}</strong></p>
                      {product.hsnCode && <p>HSN Code: <span className="font-mono">{product.hsnCode}</span></p>}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">₹{price}</span>
                        {hasDiscount && (
                          <span className="text-xs text-slate-400 line-through">₹{product.mrp}</span>
                        )}
                      </div>
                      {hasDiscount && (
                        <span className="text-[10px] font-bold text-[#00C9A7]">{discountPct}% OFF</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#0066FF]" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No products found matching your search.</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for other dimensions, shade codes, or categories.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order & Dispatch History</h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#0066FF]" />
              <p>No orders placed yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{order.orderNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-sky-100 text-[#0066FF] dark:bg-sky-950 dark:text-sky-300">
                        {order.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Items: {order.itemsCount} &bull; Total: <strong className="text-slate-900 dark:text-white">₹{order.grandTotal}</strong></p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Payment: <span className="uppercase font-bold">{order.paymentMode}</span> ({order.paymentStatus})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cart & Checkout Slide-over */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-[#0B1F33] text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#00E5FF]" /> Order Cart ({cart.reduce((a, b) => a + b.qty, 0)})
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-300 hover:text-white font-bold text-xl">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#0066FF]" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex-1 mr-3">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{item.product.productName}</h4>
                        <p className="text-[10px] text-slate-400">{item.product.brand || 'Vetrify'} &bull; ₹{item.product.sellingPrice || item.product.mrp || 100} / unit</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateCartQty(item.product.id, -1)} className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">-</button>
                        <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                        <button onClick={() => handleUpdateCartQty(item.product.id, 1)} className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">+</button>
                      </div>
                    </div>
                  ))}

                  {/* Fulfilment Switch */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Fulfilment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => setFulfilmentType('delivery')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${fulfilmentType === 'delivery' ? 'border-[#0066FF] bg-blue-50 dark:bg-blue-950/40 text-[#0066FF]' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}
                      >
                        <Truck className="w-4 h-4" /> Site Delivery
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFulfilmentType('pickup')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all ${fulfilmentType === 'pickup' ? 'border-[#0066FF] bg-blue-50 dark:bg-blue-950/40 text-[#0066FF]' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}
                      >
                        <Store className="w-4 h-4" /> Showroom / Yard Pickup
                      </button>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {fulfilmentType === 'delivery' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Site / Delivery Address</label>
                        <button onClick={() => setShowAddressModal(true)} className="text-xs text-[#0066FF] font-bold flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add New
                        </button>
                      </div>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-amber-600">No saved addresses found. Please add site address.</p>
                      ) : (
                        <select 
                          value={selectedAddressId}
                          onChange={e => setSelectedAddressId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                        >
                          {addresses.map(a => (
                            <option key={a.id} value={a.id}>{a.fullName} - {a.houseNo}, {a.street}, {a.city} ({a.postalCode})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Project Floor Plan / Site Measurement Sheet (Optional) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Floor Plan / Measurement Drawing (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
                      <input type="file" onChange={handlePlanUpload} className="hidden" id="plan-upload" />
                      <label htmlFor="plan-upload" className="cursor-pointer flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-[#0066FF]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {uploadingPlan ? 'Uploading Plan...' : 'Upload Site Layout / CAD / Floor Plan'}
                        </span>
                        <span className="text-[10px] text-slate-400">PDF, DWG, JPG, PNG up to 10MB</span>
                      </label>
                      {uploadedPlanFiles.length > 0 && (
                        <div className="mt-2 text-left space-y-1">
                          {uploadedPlanFiles.map((f, idx) => (
                            <p key={idx} className="text-xs text-[#00C9A7] font-semibold flex items-center gap-1">
                              &bull; {f.name} (Attached)
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payment Method</label>
                    <select 
                      value={paymentMode}
                      onChange={e => setPaymentMode(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    >
                      <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="card">Credit / Debit Card</option>
                      <option value="net_banking">Net Banking / RTGS / NEFT</option>
                      <option value="cod">Cash on Site Delivery</option>
                      <option value="store_pickup">Pay at Showroom Counter</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Estimated GST (18%)</span>
                  <span>₹{tax}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>Confirm & Place Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Site / Delivery Address</h3>
            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact / Site In-Charge Name</label>
                <input required value={newAddress.fullName} onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input required value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} placeholder="10-digit mobile number" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Plot / Site No / Flat</label>
                  <input required value={newAddress.houseNo} onChange={e => setNewAddress({...newAddress, houseNo: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Street / Project Landmark</label>
                  <input required value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">City</label>
                  <input required value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">State</label>
                  <input required value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">PIN Code</label>
                  <input required value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})} placeholder="6 digits" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddressModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" className="bg-[#0066FF] text-white px-4 py-2 rounded-xl text-xs font-bold shadow">Save Site Address</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
