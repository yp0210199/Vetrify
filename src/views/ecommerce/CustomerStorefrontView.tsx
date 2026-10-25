import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { productService } from '../../services/productService';
import { ecommerceService } from '../../services/ecommerceService';
import { prescriptionService } from '../../services/prescriptionService';
import { PharmacyProduct } from '../../types/firestore';
import { CustomerAddress, OnlineOrder } from '../../types/ecommerce';
import { 
  ShoppingBag, Search, ShieldCheck, MapPin, CreditCard, Clock, CheckCircle2, 
  AlertCircle, Upload, Plus, Trash2, ArrowRight, Package, Truck, Store, FileText, ChevronRight 
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
  const [uploadedPrescriptionIds, setUploadedPrescriptionIds] = useState<string[]>([]);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'catalogue' | 'orders' | 'prescriptions'>('catalogue');
  const [loading, setLoading] = useState(false);

  const orgId = organization?.id || '';
  const storeId = currentStore?.id || organization?.id || '';
  const customerId = firestoreUser?.uid || 'guest-customer';
  const customerName = firestoreUser?.displayName || currentStaff?.displayName || 'Customer';

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId, storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const pRes = await productService.getProducts(orgId);
      const prodList = Array.isArray(pRes) ? pRes : (pRes.products || []);
      setProducts(prodList.filter(p => p.status === 'active'));

      const addrs = await ecommerceService.getCustomerAddresses(orgId, customerId);
      setAddresses(addrs);
      if (addrs.length > 0 && !selectedAddressId) {
        const def = addrs.find(a => a.isDefault) || addrs[0];
        setSelectedAddressId(def.id);
      }

      const ords = await ecommerceService.getOnlineOrders(orgId, undefined, customerId);
      setOrders(ords);
    } catch (e) {
      console.error('Failed to load store data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: PharmacyProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
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

  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId || !storeId) return;
    setUploadingPrescription(true);
    try {
      const rx = await prescriptionService.createPrescription(
        orgId,
        storeId,
        {
          patientName: customerName,
          patientAge: 30,
          patientGender: 'male',
          patientPhone: '9999999999',
          doctorName: 'Dr. Online',
          doctorRegNo: 'REG12345',
          prescriptionDate: new Date().toISOString().slice(0, 10),
          originalFilename: file.name,
          secureUrl: URL.createObjectURL(file),
          medicines: [],
          status: 'pending',
          createdByUid: customerId,
          createdByName: customerName
        },
        { uid: customerId, displayName: customerName }
      );
      setUploadedPrescriptionIds(prev => [...prev, rx.id]);
      alert('Prescription uploaded successfully & queued for pharmacist verification.');
    } catch (err: any) {
      alert('Prescription upload failed: ' + err.message);
    } finally {
      setUploadingPrescription(false);
    }
  };

  const handleCheckout = async () => {
    if (!orgId || cart.length === 0) return;
    const address = addresses.find(a => a.id === selectedAddressId);
    if (fulfilmentType === 'delivery' && !address) {
      alert('Please select a delivery address.');
      return;
    }

    const needsRx = cart.some(i => i.product.isPrescriptionRequired || i.product.schedule === 'H' || i.product.schedule === 'H1' || i.product.schedule === 'X');
    if (needsRx && uploadedPrescriptionIds.length === 0) {
      alert('Prescription is required for one or more medicines in your cart. Please upload a prescription.');
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
        gstPercent: i.product.gstRate || 12,
        isPrescriptionRequired: Boolean(i.product.isPrescriptionRequired || i.product.schedule),
        schedule: i.product.schedule || ''
      }));

      await ecommerceService.placeOnlineOrder(
        orgId,
        storeId,
        customerId,
        customerName,
        '9999999999',
        orderItems,
        address || { id: 'pickup', fullName: customerName, phone: '9999999999', houseNo: 'Store', street: '', city: '', state: '', postalCode: '', addressType: 'home', isDefault: true, organizationId: orgId, customerId, createdAt: new Date() as any, updatedAt: new Date() as any },
        paymentMode,
        fulfilmentType,
        uploadedPrescriptionIds,
        { uid: customerId, name: customerName }
      );

      setCart([]);
      setIsCartOpen(false);
      setActiveTab('orders');
      loadData();
      alert('Order placed successfully!');
    } catch (err: any) {
      alert('Order placement failed: ' + err.message);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.genericComposition && p.genericComposition.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const subtotal = cart.reduce((acc, i) => acc + (i.product.sellingPrice || i.product.mrp || 100) * i.qty, 0);
  const tax = subtotal * 0.12;
  const grandTotal = Math.round(subtotal + tax);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Store Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1F33] to-[#132C46] text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Vetrify Verified Store</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{currentStore?.name || organization?.name || 'Online Pharmacy'}</h1>
          <p className="text-sm text-slate-300 mt-1">Genuine Medicines & Healthcare Products • Express Home Delivery & Store Pickup</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('catalogue')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'catalogue' ? 'bg-[#0D5C63] text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Shop Catalogue
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-[#0D5C63] text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            My Orders ({orders.length})
          </button>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          {/* Search & Categories */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search medicines, composition, health products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-[#0D5C63] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                >
                  {cat}
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
              const isRx = product.isPrescriptionRequired || product.schedule;

              return (
                <div key={product.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                        {product.category || 'General'}
                      </span>
                      {isRx && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Rx Required
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">{product.productName}</h3>
                    {product.genericComposition && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{product.genericComposition}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Pack: {product.packSize || '1 Unit'}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">₹{price}</span>
                        {hasDiscount && (
                          <span className="text-xs text-slate-400 line-through">₹{product.mrp}</span>
                        )}
                      </div>
                      {hasDiscount && (
                        <span className="text-[10px] font-bold text-emerald-600">{discountPct}% OFF</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="bg-[#0D5C63] hover:bg-[#0a494f] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Order History</h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No online orders placed yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{order.orderNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-bold uppercase bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        {order.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Items: {order.itemsCount} • Total: <strong className="text-slate-900 dark:text-white">₹{order.grandTotal}</strong></p>
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
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#0D5C63]" /> Cart ({cart.reduce((a, b) => a + b.qty, 0)})
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.product.productName}</h4>
                        <p className="text-xs text-slate-500">₹{item.product.sellingPrice || item.product.mrp} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateQty(item.product.id, -1)} className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-xs">-</button>
                        <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                        <button onClick={() => handleUpdateQty(item.product.id, 1)} className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-xs">+</button>
                      </div>
                    </div>
                  ))}

                  {/* Fulfilment Type */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Fulfilment Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setFulfilmentType('delivery')}
                        className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${fulfilmentType === 'delivery' ? 'border-[#0D5C63] bg-[#0D5C63]/10 text-[#0D5C63]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                      >
                        <Truck className="w-4 h-4" /> Home Delivery
                      </button>
                      <button 
                        onClick={() => setFulfilmentType('pickup')}
                        className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${fulfilmentType === 'pickup' ? 'border-[#0D5C63] bg-[#0D5C63]/10 text-[#0D5C63]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                      >
                        <Store className="w-4 h-4" /> Store Pickup
                      </button>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {fulfilmentType === 'delivery' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Delivery Address</label>
                        <button onClick={() => setShowAddressModal(true)} className="text-xs text-[#0D5C63] font-bold hover:underline">+ Add New</button>
                      </div>
                      {addresses.length === 0 ? (
                        <p className="text-xs text-amber-600">No saved addresses found. Please add one.</p>
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

                  {/* Prescription Upload if needed */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Prescription Upload (If Required)</label>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
                      <input type="file" onChange={handlePrescriptionUpload} className="hidden" id="rx-upload" />
                      <label htmlFor="rx-upload" className="cursor-pointer flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-[#0D5C63]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{uploadingPrescription ? 'Uploading...' : 'Click to Upload Prescription'}</span>
                        <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                      </label>
                      {uploadedPrescriptionIds.length > 0 && (
                        <p className="text-xs text-emerald-600 font-bold mt-2">✓ {uploadedPrescriptionIds.length} prescription(s) attached.</p>
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
                      <option value="net_banking">Net Banking</option>
                      <option value="cod">Cash on Delivery (COD)</option>
                      <option value="store_pickup">Pay at Store Pickup</option>
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
                  <span>Estimated GST (12%)</span>
                  <span>₹{tax}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#0D5C63] hover:bg-[#0a494f] text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>Place Secure Order</span>
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Delivery Address</h3>
            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input required value={newAddress.fullName} onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input required value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} placeholder="10-digit mobile number" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">House / Flat No</label>
                  <input required value={newAddress.houseNo} onChange={e => setNewAddress({...newAddress, houseNo: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Street / Area</label>
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
                <button type="submit" className="bg-[#0D5C63] text-white px-4 py-2 rounded-xl text-xs font-bold shadow">Save Address</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
