import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { Order, Product, UserSession, Shop, LedgerEntry } from '../types';
import { DEMO_ORDERS, DEMO_PRODUCTS } from '../demoData';
import { motion, AnimatePresence } from 'motion/react';
import { LANGUAGES, TRANSLATIONS, LanguageCode } from '../translations';
import NextOrderLogo from './NextOrderLogo';
import { 
  Plus, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Phone, 
  MapPin, 
  Calendar, 
  Hash, 
  Layers, 
  Paintbrush, 
  DollarSign, 
  ChevronRight, 
  LogOut, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  X, 
  AlertTriangle,
  Sparkles,
  Info,
  SlidersHorizontal,
  PlusCircle,
  FileText,
  ArrowRight,
  Building2,
  Printer,
  Globe,
  Settings,
  ChevronDown,
  Check,
  Image,
  Upload,
  Camera
} from 'lucide-react';
import { BANGLADESH_DISTRICTS, BANGLADESH_THANAS } from '../bangladeshData';

const generateUniqueOrderIdForSubmit = (existingOrders: Order[]): string => {
  const brandCode = 'NO';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let uniqueId = '';
  let attempts = 0;
  
  while (attempts < 100) {
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidateId = brandCode + randomPart;
    if (!existingOrders.some(o => o.id === candidateId)) {
      uniqueId = candidateId;
      break;
    }
    attempts++;
  }
  
  if (!uniqueId) {
    uniqueId = brandCode + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  return uniqueId;
};

interface DashboardProps {
  userSession: UserSession;
  onExitDemo: () => void;
  onUpdateShopName?: (newName: string) => Promise<void> | void;
}

export default function Dashboard({ userSession, onExitDemo, onUpdateShopName }: DashboardProps) {
  const isDemo = userSession.isDemo;

  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('nextorder_app_lang');
    return (saved as LanguageCode) || 'bn';
  });

  const t = (key: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  // Real Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Multiple Shops State
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [showAddShopInput, setShowAddShopInput] = useState(false);
  const [newShopNameInputForm, setNewShopNameInputForm] = useState('');
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  
  // Loading & error handling
  const [loading, setLoading] = useState(!isDemo);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  // Tab control: 'orders' | 'products' | 'ledger'
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'ledger'>('orders');

  // Search and filter operations
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');

  // UI Modals triggers
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Form states - Add Order
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderSize, setOrderSize] = useState('');
  const [orderColor, setOrderColor] = useState('');
  const [orderPrice, setOrderPrice] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(80);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState<'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('pending');
  const [orderDistrict, setOrderDistrict] = useState('');
  const [orderThana, setOrderThana] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [thanaQuery, setThanaQuery] = useState('');
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showThanaDropdown, setShowThanaDropdown] = useState(false);
  const [orderImages, setOrderImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Shop Name Edit states
  const [isEditingShopName, setIsEditingShopName] = useState(false);
  const [newShopNameInput, setNewShopNameInput] = useState('');
  const [isSavingShopName, setIsSavingShopName] = useState(false);

  // Individual Shop Name Edit states
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState('');
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);

  const handleUpdateSingleShopName = async (shopId: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;

    setIsUpdatingShop(true);
    try {
      if (isDemo) {
        const updatedShops = shops.map(s => s.id === shopId ? { ...s, name: cleanName, updatedAt: new Date().toISOString() } : s);
        setShops(updatedShops);
        localStorage.setItem('nextorder_demo_shops', JSON.stringify(updatedShops));
        if (activeShop?.id === shopId) {
          setActiveShop({ ...activeShop, name: cleanName });
        }
      } else {
        await setDoc(doc(db, 'shops', shopId), {
          userId: userSession.uid,
          name: cleanName,
          createdAt: new Date().toISOString(), // Keep track if we don't have it
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        if (activeShop?.id === shopId) {
          setActiveShop(prev => prev ? { ...prev, name: cleanName } : null);
        }
      }
      setEditingShopId(null);
    } catch (err) {
      console.error("Error updating single shop name:", err);
      alert(lang === 'bn' ? 'দোকানের নাম পরিবর্তন করা যায়নি।' : 'Could not change shop name.');
    } finally {
      setIsUpdatingShop(false);
    }
  };

  const handleSaveShopName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newShopNameInput.trim();
    if (!cleanName || !activeShop) return;

    setIsSavingShopName(true);
    try {
      if (isDemo) {
        const updatedShops = shops.map(s => s.id === activeShop.id ? { ...s, name: cleanName, updatedAt: new Date().toISOString() } : s);
        setShops(updatedShops);
        localStorage.setItem('nextorder_demo_shops', JSON.stringify(updatedShops));
        setActiveShop({ ...activeShop, name: cleanName });
      } else {
        await setDoc(doc(db, 'shops', activeShop.id), {
          userId: userSession.uid,
          name: cleanName,
          createdAt: activeShop.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      if (onUpdateShopName) {
        await onUpdateShopName(cleanName);
      }
      setIsEditingShopName(false);
    } catch (err) {
      console.error(err);
      alert(lang === 'bn' ? 'দোকানের নাম পরিবর্তন করা যায়নি।' : 'Could not change shop name.');
    } finally {
      setIsSavingShopName(false);
    }
  };

  const handleCreateShop = async (shopName: string) => {
    const cleanName = shopName.trim();
    if (!cleanName) return;

    setIsCreatingShop(true);
    const newShopId = 'shop_' + Math.random().toString(36).substr(2, 9);
    const newShop: Shop = {
      id: newShopId,
      userId: isDemo ? 'demo' : userSession.uid,
      name: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDemo) {
      const updatedShops = [...shops, newShop];
      setShops(updatedShops);
      localStorage.setItem('nextorder_demo_shops', JSON.stringify(updatedShops));
      
      setActiveShop(newShop);
      localStorage.setItem('nextorder_demo_active_shop_id', newShopId);
      
      setIsCreatingShop(false);
      setShowAddShopInput(false);
      setNewShopNameInputForm('');
    } else {
      try {
        await setDoc(doc(db, 'shops', newShopId), {
          userId: newShop.userId,
          name: newShop.name,
          createdAt: newShop.createdAt,
          updatedAt: newShop.updatedAt
        });
        
        localStorage.setItem(`nextorder_active_shop_id_${userSession.uid}`, newShopId);
        
        setShowAddShopInput(false);
        setNewShopNameInputForm('');
      } catch (err) {
        console.error("Error creating shop in Firestore:", err);
        handleFirestoreError(err, OperationType.WRITE, 'shops');
        alert(lang === 'bn' ? 'দোকান তৈরি করা যায়নি।' : 'Could not create shop.');
      } finally {
        setIsCreatingShop(false);
      }
    }
  };

  // Form states - Add Product
  const [productNameInput, setProductNameInput] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productPrice, setProductPrice] = useState(0);
  const [productSizes, setProductSizes] = useState('');
  const [productColors, setProductColors] = useState('');

  // Ledger (TaliKhata) form and core list states
  const [allLedgerEntries, setAllLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerCustomerName, setLedgerCustomerName] = useState('');
  const [ledgerCustomerPhone, setLedgerCustomerPhone] = useState('');
  const [ledgerType, setLedgerType] = useState<'receive' | 'give'>('receive');
  const [ledgerAmount, setLedgerAmount] = useState<number>(0);
  const [ledgerReason, setLedgerReason] = useState('');
  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<string | null>(null);
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  const resetLedgerForm = () => {
    setLedgerCustomerName('');
    setLedgerCustomerPhone('');
    setLedgerType('receive');
    setLedgerAmount(0);
    setLedgerReason('');
    setLedgerDate(new Date().toISOString().split('T')[0]);
  };

  const handleCreateLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShop) return;

    const trimmedName = ledgerCustomerName.trim();
    const trimmedPhone = ledgerCustomerPhone.trim();
    const trimmedReason = ledgerReason.trim();

    if (!trimmedName || !trimmedPhone || ledgerAmount <= 0) {
      alert(lang === 'bn' ? 'দয়া করে সবগুলো তথ্য সঠিকভাবে পূরণ করুন!' : 'Please fill out all fields correctly!');
      return;
    }

    setIsSavingLedger(true);

    const newEntryId = 'ledger_' + Math.random().toString(36).substring(2, 11);
    const newEntry: LedgerEntry = {
      id: newEntryId,
      userId: isDemo ? 'demo' : userSession.uid,
      shopId: activeShop.id,
      customerName: trimmedName,
      customerPhone: trimmedPhone,
      type: ledgerType,
      amount: Number(ledgerAmount),
      reason: trimmedReason || (lang === 'bn' ? 'সাধারণ বাকি / আদায়' : 'General Credit / Payment'),
      entryDate: ledgerDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDemo) {
      const updatedEntries = [newEntry, ...allLedgerEntries];
      setAllLedgerEntries(updatedEntries);
      localStorage.setItem('nextorder_demo_ledger_entries', JSON.stringify(updatedEntries));
      setIsSavingLedger(false);
      setShowLedgerModal(false);
      resetLedgerForm();
    } else {
      try {
        await setDoc(doc(db, 'ledger', newEntryId), {
          userId: newEntry.userId,
          shopId: newEntry.shopId,
          customerName: newEntry.customerName,
          customerPhone: newEntry.customerPhone,
          type: newEntry.type,
          amount: newEntry.amount,
          reason: newEntry.reason,
          entryDate: newEntry.entryDate,
          createdAt: newEntry.createdAt,
          updatedAt: newEntry.updatedAt
        });
        setShowLedgerModal(false);
        resetLedgerForm();
      } catch (err) {
        console.error("Error creating ledger entry in Firestore:", err);
        handleFirestoreError(err, OperationType.WRITE, 'ledger');
        alert(lang === 'bn' ? 'লেনদেন যোগ করতে সমস্যা হয়েছে!' : 'Error adding ledger entry.');
      } finally {
        setIsSavingLedger(false);
      }
    }
  };

  const handleDeleteLedgerEntry = async (entryId: string) => {
    if (!confirm(lang === 'bn' ? 'আপনি কি এই লেনদেনের হিসাবটি ডিলিট করতে চান?' : 'Are you sure you want to delete this ledger entry?')) return;

    if (isDemo) {
      const updatedEntries = allLedgerEntries.filter(e => e.id !== entryId);
      setAllLedgerEntries(updatedEntries);
      localStorage.setItem('nextorder_demo_ledger_entries', JSON.stringify(updatedEntries));
    } else {
      try {
        await deleteDoc(doc(db, 'ledger', entryId));
      } catch (err) {
        console.error("Error deleting ledger entry:", err);
        handleFirestoreError(err, OperationType.DELETE, `ledger/${entryId}`);
        alert('Could not delete ledger entry.');
      }
    }
  };

  // Local storage caching for interactive Demo Sandboxing
  useEffect(() => {
    if (!isDemo) return;

    // Load demo shops
    const cachedShops = localStorage.getItem('nextorder_demo_shops');
    let demoShopsList: Shop[] = [];
    if (cachedShops) {
      demoShopsList = JSON.parse(cachedShops);
    } else {
      demoShopsList = [
        { id: 'shop-abc', userId: 'demo', name: 'Elite Fashion Store', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'shop-xyz', userId: 'demo', name: 'NextOrder BD Corner', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
      localStorage.setItem('nextorder_demo_shops', JSON.stringify(demoShopsList));
    }
    setShops(demoShopsList);

    // active shop
    const savedActiveShopId = localStorage.getItem('nextorder_demo_active_shop_id');
    let foundShop = demoShopsList.find(s => s.id === savedActiveShopId);
    if (!foundShop) {
      foundShop = demoShopsList[0];
      localStorage.setItem('nextorder_demo_active_shop_id', foundShop.id);
    }
    setActiveShop(foundShop);

    // load demo orders and products
    const cachedOrders = localStorage.getItem('nextorder_demo_orders');
    const cachedProducts = localStorage.getItem('nextorder_demo_products');

    if (cachedOrders && cachedProducts) {
      setAllOrders(JSON.parse(cachedOrders));
      setAllProducts(JSON.parse(cachedProducts));
    } else {
      // Assign legacy items to first demo shop
      const demoProductsTagged = DEMO_PRODUCTS.map(p => ({ ...p, shopId: 'shop-abc' }));
      const demoOrdersTagged = DEMO_ORDERS.map(o => ({ ...o, shopId: 'shop-abc' }));
      setAllOrders(demoOrdersTagged);
      setAllProducts(demoProductsTagged);
      localStorage.setItem('nextorder_demo_orders', JSON.stringify(demoOrdersTagged));
      localStorage.setItem('nextorder_demo_products', JSON.stringify(demoProductsTagged));
    }

    const cachedLedger = localStorage.getItem('nextorder_demo_ledger_entries');
    if (cachedLedger) {
      setAllLedgerEntries(JSON.parse(cachedLedger));
    } else {
      const demoLedger: LedgerEntry[] = [
        {
          id: 'ledger-1',
          userId: 'demo',
          shopId: 'shop-abc',
          customerName: 'Abul Kalam',
          customerPhone: '01711122233',
          type: 'receive',
          amount: 500,
          reason: 'শার্ট ও জিন্স প্যান্ট বাকিতে ক্রয়',
          entryDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'ledger-2',
          userId: 'demo',
          shopId: 'shop-abc',
          customerName: 'Karim Rahman',
          customerPhone: '01822233344',
          type: 'receive',
          amount: 1500,
          reason: 'জ্যাকেট ও গ্যাবার্ডিন প্যান্ট বকেয়া',
          entryDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'ledger-3',
          userId: 'demo',
          shopId: 'shop-abc',
          customerName: 'Abul Kalam',
          customerPhone: '01711122233',
          type: 'give',
          amount: 200,
          reason: 'কিছু অংশ পরিশোধ',
          entryDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setAllLedgerEntries(demoLedger);
      localStorage.setItem('nextorder_demo_ledger_entries', JSON.stringify(demoLedger));
    }

    setLoading(false);
  }, [isDemo]);

  // Real-time Database listeners for Firestore
  useEffect(() => {
    if (isDemo) return;

    setLoading(true);
    const uid = userSession.uid;

    // Real-time listener for user shops
    const shopsPath = 'shops';
    const shopsQuery = query(collection(db, shopsPath), where('userId', '==', uid));
    
    const unsubscribeShops = onSnapshot(shopsQuery, async (snapshot) => {
      const slist: Shop[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        slist.push({
          id: docSnap.id,
          userId: data.userId,
          name: data.name,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      
      if (slist.length === 0) {
        // Automatically create a default shop!
        const defaultShopId = 'shop_' + Math.random().toString(36).substr(2, 9);
        const savedShopName = userSession.displayName || 'আমার দোকান';
        setLoading(true);
        try {
          await setDoc(doc(db, 'shops', defaultShopId), {
            userId: uid,
            name: savedShopName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.error("Error creating default shop:", err);
        } finally {
          setLoading(false);
        }
        return;
      }
      
      // Sort shops chronologically
      slist.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
      
      setShops(slist);
      
      const savedActiveShopId = localStorage.getItem(`nextorder_active_shop_id_${uid}`);
      let foundShop = slist.find(s => s.id === savedActiveShopId);
      if (!foundShop) {
        foundShop = slist[0];
        localStorage.setItem(`nextorder_active_shop_id_${uid}`, foundShop.id);
      }
      setActiveShop(foundShop);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'shops');
      setErrorHeader('Unable to load shop profiles.');
    });

    // Real-time listener for products
    const productsPath = 'products';
    const productsQuery = query(collection(db, productsPath), where('userId', '==', uid));
    
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const plist: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        plist.push({
          id: docSnap.id,
          userId: data.userId,
          shopId: data.shopId,
          name: data.name,
          sku: data.sku,
          price: data.price,
          sizeOptions: data.sizeOptions,
          colorOptions: data.colorOptions,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      plist.sort((a, b) => {
        const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setAllProducts(plist);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, productsPath);
      setErrorHeader('Unable to load products. Connection failed.');
    });

    // Real-time listener for orders
    const ordersPath = 'orders';
    const ordersQuery = query(collection(db, ordersPath), where('userId', '==', uid));
    
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const olist: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        olist.push({
          id: docSnap.id,
          userId: data.userId,
          shopId: data.shopId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          deliveryAddress: data.deliveryAddress,
          productName: data.productName,
          quantity: data.quantity,
          size: data.size,
          color: data.color,
          price: data.price,
          deliveryCharge: data.deliveryCharge !== undefined ? data.deliveryCharge : 80,
          status: data.status,
          notes: data.notes,
          district: data.district,
          thana: data.thana,
          images: data.images,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      olist.sort((a, b) => {
        const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setAllOrders(olist);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, ordersPath);
      setErrorHeader('Unable to load orders. Connection failed.');
      setLoading(false);
    });

    // Real-time listener for ledger entries (TaliKhata)
    const ledgerPath = 'ledger';
    const ledgerQuery = query(collection(db, ledgerPath), where('userId', '==', uid));
    const unsubscribeLedger = onSnapshot(ledgerQuery, (snapshot) => {
      const llist: LedgerEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        llist.push({
          id: docSnap.id,
          userId: data.userId,
          shopId: data.shopId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          type: data.type as 'give' | 'receive',
          amount: data.amount,
          reason: data.reason,
          entryDate: data.entryDate,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      llist.sort((a, b) => {
        const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setAllLedgerEntries(llist);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, ledgerPath);
      setErrorHeader('Unable to load ledger entries.');
    });

    return () => {
      unsubscribeShops();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeLedger();
    };
  }, [isDemo, userSession.uid]);

  // Synchronize orders, products and ledger entries based on selected activeShop
  useEffect(() => {
    if (!activeShop) {
      setOrders([]);
      setProducts([]);
      setLedgerEntries([]);
      return;
    }

    const defaultShopId = shops[0]?.id || activeShop.id;

    const filteredProducts = allProducts.filter(p => {
      const pShopId = p.shopId || defaultShopId;
      return pShopId === activeShop.id;
    });

    const filteredOrders = allOrders.filter(o => {
      const oShopId = o.shopId || defaultShopId;
      return oShopId === activeShop.id;
    });

    const filteredLedger = allLedgerEntries.filter(l => {
      const lShopId = l.shopId || defaultShopId;
      return lShopId === activeShop.id;
    });

    setOrders(filteredOrders);
    setProducts(filteredProducts);
    setLedgerEntries(filteredLedger);
  }, [allProducts, allOrders, allLedgerEntries, activeShop, shops]);

  // Sync state helpers to handle Local Storage updates for Demo Mode
  const updateDemoState = (newOrders: Order[], newProducts: Product[]) => {
    setAllOrders(newOrders);
    setAllProducts(newProducts);
    localStorage.setItem('nextorder_demo_orders', JSON.stringify(newOrders));
    localStorage.setItem('nextorder_demo_products', JSON.stringify(newProducts));
  };

  // Logout routine or return to Authentication Screen
  const handleExit = async () => {
    if (isDemo) {
      onExitDemo();
    } else {
      await signOut(auth);
    }
  };

  // Auto price updater when selected product changes in add-order form
  const handleProductSelectionChange = (selectedName: string) => {
    setProductName(selectedName);
    const chosenProd = products.find(p => p.name === selectedName);
    if (chosenProd) {
      setOrderPrice(chosenProd.price * quantity);
      if (chosenProd.sizeOptions && chosenProd.sizeOptions.length > 0) {
        setOrderSize(chosenProd.sizeOptions[0]);
      } else {
        setOrderSize('');
      }
      if (chosenProd.colorOptions && chosenProd.colorOptions.length > 0) {
        setOrderColor(chosenProd.colorOptions[0]);
      } else {
        setOrderColor('');
      }
    }
  };

  // Quantity multiplier sync
  const handleQuantityChange = (qty: number) => {
    setQuantity(qty);
    const chosenProd = products.find(p => p.name === productName);
    if (chosenProd) {
      setOrderPrice(chosenProd.price * qty);
    }
  };

  // Operation: Add active product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productNameInput || productPrice <= 0) {
      alert('Please enter a valid product name and retail price.');
      return;
    }

    const sizesArr = productSizes.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const colorsArr = productColors.split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const nextProductId = 'prod_' + Math.random().toString(36).substr(2, 9);
    
    const newProductData: Product = {
      id: nextProductId,
      userId: isDemo ? 'demo' : userSession.uid,
      shopId: activeShop?.id || undefined,
      name: productNameInput,
      sku: productSku || 'N/A',
      price: Number(productPrice),
      sizeOptions: sizesArr.length > 0 ? sizesArr : undefined,
      colorOptions: colorsArr.length > 0 ? colorsArr : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDemo) {
      const updatedProducts = [newProductData, ...allProducts];
      updateDemoState(allOrders, updatedProducts);
      setShowProductModal(false);
      resetProductForm();
    } else {
      const pathname = 'products';
      try {
        await setDoc(doc(db, pathname, nextProductId), {
          userId: newProductData.userId,
          shopId: newProductData.shopId || '',
          name: newProductData.name,
          sku: newProductData.sku,
          price: newProductData.price,
          sizeOptions: newProductData.sizeOptions || [],
          colorOptions: newProductData.colorOptions || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setShowProductModal(false);
        resetProductForm();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathname);
        alert('Could not save product into firestore database.');
      }
    }
  };

  // Reset Product inputs
  const resetProductForm = () => {
    setProductNameInput('');
    setProductSku('');
    setProductPrice(0);
    setProductSizes('');
    setProductColors('');
  };

  // Image upload and HTML5 Canvas lightweight compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressedDataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files: File[] = Array.from(e.target.files);
    
    setIsUploadingImages(true);
    const newImages: string[] = [];
    
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    
    setOrderImages(prev => [...prev, ...newImages]);
    setIsUploadingImages(false);
  };

  // Operation: Add client order
  const handleAddOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress || !productName || quantity <= 0 || orderPrice <= 0) {
      alert('Please compile all required order information parameters accurately.');
      return;
    }

    const nextOrderId = generateUniqueOrderIdForSubmit(orders);
    const newOrderData: Order = {
      id: nextOrderId,
      userId: isDemo ? 'demo' : userSession.uid,
      shopId: activeShop?.id || undefined,
      customerName,
      customerPhone,
      deliveryAddress,
      productName,
      quantity: Number(quantity),
      size: orderSize || 'N/A',
      color: orderColor || 'N/A',
      price: Number(orderPrice),
      deliveryCharge: Number(deliveryCharge),
      status: orderStatus,
      notes: orderNotes || '',
      district: orderDistrict || '',
      thana: orderThana || '',
      images: orderImages || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDemo) {
      const updatedOrders = [newOrderData, ...allOrders];
      updateDemoState(updatedOrders, allProducts);
      setShowOrderModal(false);
      resetOrderForm();
    } else {
      const pathname = 'orders';
      try {
        await setDoc(doc(db, pathname, nextOrderId), {
          userId: newOrderData.userId,
          shopId: newOrderData.shopId || '',
          customerName: newOrderData.customerName,
          customerPhone: newOrderData.customerPhone,
          deliveryAddress: newOrderData.deliveryAddress,
          productName: newOrderData.productName,
          quantity: newOrderData.quantity,
          size: newOrderData.size,
          color: newOrderData.color,
          price: newOrderData.price,
          deliveryCharge: newOrderData.deliveryCharge,
          status: newOrderData.status,
          notes: newOrderData.notes || '',
          district: newOrderData.district || '',
          thana: newOrderData.thana || '',
          images: newOrderData.images || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setShowOrderModal(false);
        resetOrderForm();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathname);
        alert('Unable to secure order details into Firebase storage.');
      }
    }
  };

  // Reset Order forms
  const resetOrderForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setProductName('');
    setQuantity(1);
    setOrderSize('');
    setOrderColor('');
    setOrderPrice(0);
    setDeliveryCharge(80);
    setOrderNotes('');
    setOrderStatus('pending');
    setOrderDistrict('');
    setOrderThana('');
    setDistrictQuery('');
    setThanaQuery('');
    setShowDistrictDropdown(false);
    setShowThanaDropdown(false);
    setOrderImages([]);
    setIsUploadingImages(false);
  };

  // Operation: Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    const confirmationMsg = lang === 'bn'
      ? 'আপনি কি নিশ্চিত যে আপনি এই অর্ডারটি চিরতরে মুছে ফেলতে চান?'
      : 'Are you sure you want to permanently delete this order?';
    if (!confirm(confirmationMsg)) return;

    if (isDemo) {
      const updatedOrders = allOrders.filter(o => o.id !== orderId);
      updateDemoState(updatedOrders, allProducts);
      setSelectedOrderDetail(null);
    } else {
      const pathname = `orders/${orderId}`;
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        setSelectedOrderDetail(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, pathname);
        const errorMsg = lang === 'bn' 
          ? 'সার্ভার ত্রুটির কারণে অর্ডার ডিলিট করা যায়নি।' 
          : 'Order deletion routine aborted due to server error.';
        alert(errorMsg);
      }
    }
  };

    // Operation: Delete Product
  const handleDeleteProduct = async (productId: string, name: string) => {
    const confirmationMsg = lang === 'bn'
      ? `আপনি কি নিশ্চিত যে আপনি ক্যাটালগ থেকে "${name}" প্রোডাক্টটি চিরতরে মুছে ফেলতে চান?`
      : `Are you sure you want to completely remove "${name}" from your catalog offerings?`;
    if (!confirm(confirmationMsg)) return;

    if (isDemo) {
      const updatedProducts = allProducts.filter(p => p.id !== productId);
      updateDemoState(allOrders, updatedProducts);
    } else {
      const pathname = `products/${productId}`;
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, pathname);
        const errorMsg = lang === 'bn'
          ? 'প্রোডাক্ট রিমুভ করা যায়নি।'
          : 'Could not execute product removal action.';
        alert(errorMsg);
      }
    }
  };

  // Quick State Status change on order
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
    if (isDemo) {
      const updatedOrders = allOrders.map(o => {
        if (o.id === orderId) {
          return { ...o, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return o;
      });
      updateDemoState(updatedOrders, allProducts);
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
        setSelectedOrderDetail({ ...selectedOrderDetail, status: newStatus, updatedAt: new Date().toISOString() });
      }
    } else {
      const pathname = `orders/${orderId}`;
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
        if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
          setSelectedOrderDetail({ ...selectedOrderDetail, status: newStatus });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, pathname);
        alert('Unable to secure pipeline update.');
      }
    }
  };

  // Data processing formulas
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.price, 0);

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;

  // Render dynamic badge according to status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 font-semibold rounded-full flex items-center w-fit gap-1"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'processing':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs px-2.5 py-1 font-semibold rounded-full flex items-center w-fit gap-1"><SlidersHorizontal className="w-3.5 h-3.5" /> Processing</span>;
      case 'shipped':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 text-xs px-2.5 py-1 font-semibold rounded-full flex items-center w-fit gap-1"><Package className="w-3.5 h-3.5" /> Shipped</span>;
      case 'delivered':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 font-semibold rounded-full flex items-center w-fit gap-1"><CheckCircle className="w-3.5 h-3.5" /> Delivered</span>;
      case 'cancelled':
        return <span className="bg-slate-50 text-slate-500 border border-slate-200 text-xs px-2.5 py-1 font-semibold rounded-full flex items-center w-fit gap-1"><X className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 font-semibold rounded-full">Unknown</span>;
    }
  };

  // Filter and search computation values
  const filteredOrders = orders.filter(order => {
    const queryLower = searchQuery.toLowerCase().trim();
    const cleanQuery = queryLower.startsWith('#') ? queryLower.substring(1) : queryLower;
    
    const matchesSearch = 
      order.customerName.toLowerCase().includes(queryLower) ||
      order.customerPhone.includes(queryLower) ||
      order.productName.toLowerCase().includes(queryLower) ||
      (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(queryLower)) ||
      order.id.toLowerCase().includes(cleanQuery) ||
      (`#${order.id}`).toLowerCase().includes(queryLower);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group ledger entries by unique Customer Phone to track credit history
  const ledgerCustomers = React.useMemo(() => {
    const map: Record<string, { name: string; phone: string; totalReceive: number; totalGive: number; latestDate: string; entries: LedgerEntry[] }> = {};
    
    ledgerEntries.forEach(entry => {
      const key = `${entry.customerPhone.trim()}`;
      if (!map[key]) {
        map[key] = {
          name: entry.customerName,
          phone: entry.customerPhone,
          totalReceive: 0,
          totalGive: 0,
          latestDate: entry.entryDate,
          entries: []
        };
      }
      if (entry.customerName && entry.customerName.trim().length > 0) {
        map[key].name = entry.customerName;
      }
      
      if (entry.type === 'receive') {
        map[key].totalReceive += entry.amount;
      } else {
        map[key].totalGive += entry.amount;
      }
      map[key].entries.push(entry);
      
      if (new Date(entry.entryDate) > new Date(map[key].latestDate)) {
        map[key].latestDate = entry.entryDate;
      }
    });

    return Object.values(map).map(c => {
      c.entries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
      return c;
    });
  }, [ledgerEntries]);

  // Compute ledger dashboard stats for active shop
  const ledgerStats = React.useMemo(() => {
    let activePabo = 0; // They owe us
    let activeDibo = 0; // We owe them
    let totalPaid = 0; // Total collected

    ledgerCustomers.forEach(c => {
      const net = c.totalReceive - c.totalGive;
      if (net > 0) {
        activePabo += net;
      } else if (net < 0) {
        activeDibo += Math.abs(net);
      }
      totalPaid += c.totalGive;
    });

    return {
      totalPabo: activePabo,
      totalDibo: activeDibo,
      totalPaid
    };
  }, [ledgerCustomers]);

  // Filter ledger list based on search term
  const filteredLedgerCustomers = React.useMemo(() => {
    const queryLower = ledgerSearchQuery.toLowerCase().trim();
    if (!queryLower) return ledgerCustomers;

    return ledgerCustomers.filter(c => 
      c.name.toLowerCase().includes(queryLower) || 
      c.phone.includes(queryLower)
    );
  }, [ledgerCustomers, ledgerSearchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-indigo-950 font-sans cursor-default flex flex-col">
      
      {/* Demo Banner Notification */}
      {isDemo && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-indigo-700 text-white py-3 px-4 md:px-8 text-center text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-3 shadow-md relative z-40">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 animate-bounce text-amber-300" />
            You are exploring the NextOrder mode! Register an account to save properties permanently.
          </span>
          <button
            type="button"
            onClick={handleExit}
            className="bg-white text-orange-700 hover:bg-orange-50 transition-all font-bold tracking-tight rounded-lg px-4 py-1.5 uppercase text-xs cursor-pointer flex items-center gap-1"
          >
            Register Live Shop <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header Brand Navigator */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <NextOrderLogo lang={lang} size={44} />
          </div>

          <div className="flex items-center gap-4">
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettingsDropdown(prev => !prev)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all border font-bold text-xs cursor-pointer select-none ${
                  showSettingsDropdown
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-705'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Settings className={`w-4 h-4 shrink-0 transition-transform duration-500 ${showSettingsDropdown ? 'rotate-90 text-indigo-600' : 'text-slate-500'}`} />
                <span>{lang === 'bn' ? 'সেটিংস' : 'Settings'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-250 ${showSettingsDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSettingsDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setShowSettingsDropdown(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 p-4.5 space-y-4 text-left"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-105">
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">
                            {lang === 'bn' ? 'কনফিগারেশন সেটিংস' : 'Configuration Settings'}
                          </span>
                        </div>
                      </div>

                      {/* Language Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {lang === 'bn' ? 'ভাষা নির্বাচন করুন' : 'App Language'}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {LANGUAGES.map((l) => {
                            const isSelected = lang === l.code;
                            return (
                              <button
                                key={l.code}
                                type="button"
                                onClick={() => {
                                  setLang(l.code);
                                  localStorage.setItem('nextorder_app_lang', l.code);
                                }}
                                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 border-transparent text-white shadow-md shadow-indigo-600/10'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-700'
                                }`}
                              >
                                <span className="text-sm shrink-0">{l.flag}</span>
                                <span className="truncate">{l.nativeName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Shops / Business Switcher */}
                      <div className="border border-indigo-100 p-3 rounded-xl bg-indigo-50/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold text-indigo-900/60 uppercase tracking-wider block">
                            {lang === 'bn' ? 'আমার ব্যবসা / দোকানসমূহ' : 'My Businesses / Shops'}
                          </span>
                          {!showAddShopInput && (
                            <button
                              type="button"
                              onClick={() => setShowAddShopInput(true)}
                              className="text-[9.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              {lang === 'bn' ? 'যোগ করুন' : 'Add Shop'}
                            </button>
                          )}
                        </div>

                        {showAddShopInput ? (
                          <div className="space-y-2 bg-white border border-slate-200/60 p-2.5 rounded-lg">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                              {lang === 'bn' ? 'নতুন দোকানের নাম লিখুন:' : 'New Shop Name:'}
                            </span>
                            <div className="flex items-center gap-1.5 font-sans">
                              <input
                                type="text"
                                value={newShopNameInputForm}
                                onChange={(e) => setNewShopNameInputForm(e.target.value)}
                                placeholder={lang === 'bn' ? 'যেমন: এলিট ফ্যাশন' : 'e.g. Elite Fashion'}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                maxLength={40}
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-0.5 font-sans">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddShopInput(false);
                                  setNewShopNameInputForm('');
                                }}
                                className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                              >
                                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                              </button>
                              <button
                                type="button"
                                disabled={isCreatingShop || !newShopNameInputForm.trim()}
                                onClick={() => handleCreateShop(newShopNameInputForm)}
                                className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] uppercase font-bold rounded hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                              >
                                {isCreatingShop ? '...' : (lang === 'bn' ? 'তৈরি' : 'Create')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                            {shops.map((s) => {
                              const isActive = activeShop?.id === s.id;
                              const isEditing = editingShopId === s.id;

                              if (isEditing) {
                                return (
                                  <form
                                    key={s.id}
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleUpdateSingleShopName(s.id, editingShopName);
                                    }}
                                    className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-lg w-full"
                                  >
                                    <input
                                      type="text"
                                      autoFocus
                                      value={editingShopName}
                                      onChange={(e) => setEditingShopName(e.target.value)}
                                      className="flex-grow min-w-0 bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 font-sans"
                                      maxLength={40}
                                    />
                                    <button
                                      type="submit"
                                      disabled={isUpdatingShop || !editingShopName.trim()}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer shrink-0 disabled:opacity-50"
                                      title={lang === 'bn' ? 'সংরক্ষণ' : 'Save'}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingShopId(null)}
                                      className="p-1 text-slate-400 hover:bg-slate-200 rounded cursor-pointer shrink-0"
                                      title={lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </form>
                                );
                              }

                              return (
                                <div
                                  key={s.id}
                                  className={`w-full flex items-center justify-between text-left rounded-lg border transition-all text-xs font-bold font-sans ${
                                    isActive
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveShop(s);
                                      if (isDemo) {
                                        localStorage.setItem('nextorder_demo_active_shop_id', s.id);
                                      } else {
                                        localStorage.setItem(`nextorder_active_shop_id_${userSession.uid}`, s.id);
                                      }
                                    }}
                                    className="flex-1 text-left p-2 flex items-center gap-1.5 min-w-0 cursor-pointer text-xs font-bold font-sans text-inherit bg-transparent border-0"
                                  >
                                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
                                    <span className="truncate leading-tight">{s.name}</span>
                                  </button>
                                  
                                  <div className="flex items-center gap-1 pr-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingShopId(s.id);
                                        setEditingShopName(s.name);
                                      }}
                                      className={`p-1.5 rounded transition-all cursor-pointer ${
                                        isActive 
                                          ? 'text-indigo-250 hover:bg-indigo-700 hover:text-white' 
                                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-650'
                                      }`}
                                      title={lang === 'bn' ? 'দোকানের নাম পরিবর্তন করুন' : 'Edit Shop Name'}
                                    >
                                      <Edit3 className="w-3 h-3 text-inherit shrink-0" />
                                    </button>
                                    {isActive && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Account Profiles */}
                      <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl space-y-1.5 animate-none">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center justify-between">
                          <span>{lang === 'bn' ? 'মার্চেন্ট অ্যাকাউন্ট' : 'Merchant Account'}</span>
                          {isEditingShopName && (
                            <span className="text-[8px] text-indigo-600 font-extrabold uppercase tracking-normal animate-pulse">
                              {lang === 'bn' ? 'সম্পাদনা করা হচ্ছে' : 'Editing'}
                            </span>
                          )}
                        </span>
                        
                        {!isEditingShopName ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center font-bold text-indigo-700 text-xs uppercase shrink-0">
                              {(userSession.displayName || 'M')[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h5 className="text-[11.5px] font-bold text-slate-800 truncate leading-snug">
                                  {userSession.displayName || 'Merchant'}
                                </h5>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setIsEditingShopName(true);
                                    setNewShopNameInput(userSession.displayName || '');
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 active:scale-95 transition-all cursor-pointer shrink-0"
                                  title={lang === 'bn' ? 'দোকানের নাম পরিবর্তন করুন' : 'Edit Shop Name'}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[9.5px] font-mono text-slate-500 truncate leading-none mt-0.5">
                                {userSession.email || 'guest@nextorder.live'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleSaveShopName} className="space-y-2 mt-1">
                            <input
                              type="text"
                              value={newShopNameInput}
                              onChange={(e) => setNewShopNameInput(e.target.value)}
                              placeholder={lang === 'bn' ? 'দোকানের নাম লিখুন' : 'Enter shop name'}
                              required
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                              maxLength={50}
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setIsEditingShopName(false)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-md text-[10px] uppercase transition-all cursor-pointer"
                              >
                                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingShopName || !newShopNameInput.trim()}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md text-[10px] uppercase shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {isSavingShopName ? '...' : <Check className="w-3 h-3" />}
                                {lang === 'bn' ? 'সংরক্ষণ' : 'Save'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>

                      {/* Power action */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsDropdown(false);
                            handleExit();
                          }}
                          className="w-full font-bold py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 hover:border-rose-200 text-rose-600 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>{isDemo ? (lang === 'bn' ? 'নেক্সটঅর্ডার বন্ধ করুন' : 'Exit NextOrder') : (lang === 'bn' ? 'লগ আউট করুন' : 'Logout Store')}</span>
                        </button>
                      </div>

                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </header>

      {errorHeader && (
        <div className="bg-rose-50 border-b border-rose-100 py-3.5 px-4 text-center text-xs text-rose-800 font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorHeader}</span>
        </div>
      )}

      {/* Main Container Contents */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col space-y-8">
        
        {/* Welcome Callout Banner & Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl tracking-wide font-black text-slate-900">
              {activeShop ? activeShop.name : (userSession.displayName || 'Merchant')}! 👋
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {lang === 'bn' ? 'আপনার দোকানের পারফরম্যান্স ট্র্যাক করুন এবং গ্রাহকদের ককুরিয়ার ডেলিভারি পরিচালনা করুন।' : 
               lang === 'es' ? 'Siga el rendimiento de su tienda y gestione las entregas.' : 
               lang === 'ar' ? 'تابع أداء متجرك وإدارة توصيل طلبات العملاء بسهولة.' : 
               lang === 'hi' ? 'अपने स्टोर के प्रदर्शन को ट्रैक करें और ग्राहकों की डिलीवरी प्रबंधित करें।' : 
               lang === 'fr' ? 'Suivez les performances de votre magasin et gérez les livraisons clients.' : 
               lang === 'ur' ? 'اپنے اسٹور کی کارکردگی کو ٹریک کریں اور صارفین کی ڈیلیوری کا انتظام کریں۔' : 
               lang === 'zh' ? '跟踪您的店铺业绩指标并管理客户的快递派送。' : 
               'Track your store performance parameters and manage client deliveries.'}
            </p>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (products.length === 0) {
                  alert(lang === 'bn' ? 'পরামর্শ: ফর্ম পূরণ সহজ করতে প্রোডাক্ট লিস্টে প্রোডাক্ট যোগ করে রাখুন।' : 'Tip: Pre-register stock catalog items to automate form execution.');
                }
                setShowOrderModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs md:text-sm py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer hover:translate-y-[-1px] uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              {t('btnNewOrder')}
            </button>

            <button
              type="button"
              onClick={() => setShowProductModal(true)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs md:text-sm py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:translate-y-[-1px] uppercase tracking-wider"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              {t('btnNewProduct')}
            </button>
          </div>
        </div>

        {/* Dynamic Key Performance Indicators (KPI Cards) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[1, 2, 3, 4, 5].map(idx => (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse flex flex-col gap-3">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-8 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            
            {/* KPI Card: Total Orders */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                <Building2 className="w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t('statsTotalOrders')}</p>
                <h3 className="text-xl font-black mt-0.5 text-slate-900">{orders.length}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'মোট গ্রাহকের অর্ডার' : 'Pending & Fulfilled'}</p>
              </div>
            </div>

            {/* KPI Card: Pending count */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
                <Clock className="w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t('statsPendingOrders')}</p>
                <h3 className="text-xl font-black mt-0.5 text-amber-700">{pendingCount}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'চলমান ডেলিভারি' : 'Active Deliveries'}</p>
              </div>
            </div>

            {/* KPI Card: Delivered Completed */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Delivered / {t('statusDelivered')}</p>
                <h3 className="text-xl font-black mt-0.5 text-emerald-700">{completedCount}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'সফলভাবে ডেলিভারড' : 'Successfully Dispatched'}</p>
              </div>
            </div>

            {/* KPI Card: Total Products */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
                <Package className="w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t('statsActiveProducts')}</p>
                <h3 className="text-xl font-black mt-0.5 text-blue-700">{products.length}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{lang === 'bn' ? 'ক্যাটালগ আইটেম' : 'Active Offerings'}</p>
              </div>
            </div>

            {/* KPI Card: Revenue */}
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl p-5 shadow-lg flex items-center space-x-4 text-white">
              <div className="p-3 bg-indigo-800 border border-indigo-700 rounded-xl text-emerald-400">
                <TrendingUp className="w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-300 tracking-widest uppercase">{t('statsCompletedSales')}</p>
                <h3 className="text-xl font-black mt-0.5 text-emerald-400">৳ {totalRevenue.toLocaleString()}</h3>
                <p className="text-[10px] text-indigo-300/80 mt-1">{lang === 'bn' ? 'বাতিল ছাড়া সফল ভ্যালু' : 'Net of Cancellations'}</p>
              </div>
            </div>

          </div>
        )}

        {/* Dynamic Navigation Tabs */}
        <div className="flex bg-slate-200/60 border border-slate-200/30 p-1.5 rounded-2xl max-w-md w-full">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t('orders')} ({orders.length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t('products')} ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t('ledger')} ({ledgerEntries.length})
          </button>
        </div>

        {/* Tab View: Orders Manager */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            
            {/* Search filtering toolbar */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-center gap-4">
              
              <div className="relative w-full lg:w-4/12">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full text-xs pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Status Selectors */}
              <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto lg:ml-auto">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> {lang === 'bn' ? 'আদেশ স্টেজ:' : 'Stage:'}
                </span>
                {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase cursor-pointer ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st === 'all' ? t('statusAll') : t('status' + st.charAt(0).toUpperCase() + st.slice(1))}
                  </button>
                ))}
              </div>

            </div>

            {/* List / Table displays */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">{t('loadingData')}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-16 text-center max-w-md mx-auto">
                <div className="bg-indigo-50/60 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Building2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">{t('noOrdersFound')}</h4>
                <p className="text-xs text-slate-500 mt-2">
                  {searchQuery || statusFilter !== 'all' 
                    ? (lang === 'bn' ? 'কোনো কুরিয়ার ডেটা মেলেনি।' : 'No store details fit the filtered criteria values.') 
                    : t('createFirstOrder')}
                </p>
                {(!searchQuery && statusFilter === 'all') && (
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(true)}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer uppercase tracking-wider"
                  >
                    {t('btnNewOrder')}
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-100 tracking-widest uppercase">
                      <th className="py-4 px-6 text-indigo-950/80">{lang === 'bn' ? 'অর্ডার আইডি ও তারিখ' : 'Order Ref & Date'}</th>
                      <th className="py-4 px-6 text-indigo-950/80">{lang === 'bn' ? 'গ্রাহকের বিবরণ' : 'Recipient details'}</th>
                      <th className="py-4 px-6 text-indigo-950/80">{lang === 'bn' ? 'প্রোডাক্ট বিবরণ' : 'Product item'}</th>
                      <th className="py-4 px-6 text-indigo-950/80">{lang === 'bn' ? 'সাইজ ও কালার' : 'Size & Variant'}</th>
                      <th className="py-4 px-6 text-indigo-950/80">{t('colPaidAmt')}</th>
                      <th className="py-4 px-6 text-indigo-950/80">{lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Courier Address'}</th>
                      <th className="py-4 px-6 text-indigo-950/80">{lang === 'bn' ? 'ডেলিভারি স্ট্যাটাস' : 'Fulfillment Status'}</th>
                      <th className="py-4 px-6 text-center text-indigo-950/80">{t('colAction')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredOrders.map(order => (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrderDetail(order)}
                        className="hover:bg-slate-100/70 border-b border-slate-100/50 transition-all group cursor-pointer"
                        title="Click to render automated parcel slip & label detail"
                      >
                        {/* Date ID */}
                        <td className="py-4.5 px-6 font-medium whitespace-nowrap">
                          <span className="text-slate-800 block font-semibold">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-indigo-650 font-bold font-mono tracking-wider block mt-0.5">#{order.id.toUpperCase()}</span>
                        </td>

                        {/* Customer */}
                        <td className="py-4.5 px-6 font-semibold text-slate-900">
                          <div className="flex flex-col">
                            <span>{order.customerName}</span>
                            <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 flex-shrink-0 text-slate-400" /> {order.customerPhone}</span>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="py-4.5 px-6 whitespace-nowrap font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{order.productName}</span>
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono">x{order.quantity}</span>
                            {order.images && order.images.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-150 text-emerald-850 px-1.5 py-0.5 rounded-md font-extrabold font-sans" title={`${order.images.length} photos added`}>
                                <Image className="w-3 h-3 text-emerald-700 shrink-0" />
                                {order.images.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Size / Color */}
                        <td className="py-4.5 px-6 whitespace-nowrap">
                          <div className="flex gap-1">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-bold font-mono">Size: {order.size}</span>
                            <span className="text-[10px] bg-indigo-50/50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold font-mono">Col: {order.color}</span>
                          </div>
                        </td>

                        {/* Total Price */}
                        <td className="py-4.5 px-6 font-bold text-slate-900 whitespace-nowrap font-mono">
                          ৳ {(order.price + (order.deliveryCharge || 0)).toLocaleString()}
                          <span className="block text-[8px] font-mono font-medium text-slate-400 normal-case mt-0.5">(ProductSub: ৳{order.price.toLocaleString()})</span>
                        </td>

                        {/* Delivery Address */}
                        <td className="py-4.5 px-6 max-w-xs truncate text-slate-500 font-medium font-mono" title={order.deliveryAddress}>
                          {order.district ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1 text-[11px] text-indigo-950 font-bold">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                {order.thana ? `${order.thana}, ` : ''}{order.district}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal truncate block pl-4.5">
                                {order.deliveryAddress}
                              </span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px]"><MapPin className="w-3" /> {order.deliveryAddress}</span>
                          )}
                        </td>

                        {/* Status - Instant dropdown selector */}
                        <td className="py-4.5 px-6 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block" title="Select status pipeline">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                              className={`text-[10px] px-3 py-1.5 font-bold rounded-full border cursor-pointer hover:shadow-xs transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/10 appearance-none pr-7.5 uppercase tracking-wide ${
                                order.status === 'pending' ? 'bg-amber-50 text-amber-850 border-amber-200' :
                                order.status === 'processing' ? 'bg-indigo-50 text-indigo-850 border-indigo-200' :
                                order.status === 'shipped' ? 'bg-blue-50 text-blue-850 border-blue-200' :
                                order.status === 'delivered' ? 'bg-emerald-50 text-emerald-850 border-emerald-200' :
                                'bg-slate-50 text-slate-550 border-slate-200'
                              }`}
                            >
                              <option value="pending" className="bg-white text-amber-800 font-bold">🕒 Pending</option>
                              <option value="processing" className="bg-white text-indigo-800 font-bold">⚙️ Processing</option>
                              <option value="shipped" className="bg-white text-blue-800 font-bold">📦 Shipped</option>
                              <option value="delivered" className="bg-white text-emerald-800 font-bold">✅ Delivered</option>
                              <option value="cancelled" className="bg-white text-slate-500 font-bold">❌ Cancelled</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                              </svg>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4.5 px-6 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            
                            <button
                              type="button"
                              onClick={() => setSelectedOrderDetail(order)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                              title={lang === 'bn' ? 'অর্ডার ওয়ার্কস্পেস এবং বিবরণ দেখুন' : 'Inspect Details'}
                            >
                              <FileText className="w-4.5 h-4.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title={lang === 'bn' ? 'অর্ডার রেকর্ড মুছে ফেলুন' : 'Delete Item Record'}
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* List count aggregate statistics */}
            <div className="p-4.5 border-t border-slate-100 bg-slate-50/30 text-[10px] font-bold tracking-wider text-slate-400 flex justify-between uppercase">
              <span>Presenting {filteredOrders.length} active order database lines</span>
              <span>Secure Cloud Connected</span>
            </div>

          </div>
        )}

        {/* Tab View: Product Catalog */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {lang === 'bn' ? 'প্রোডাক্ট ক্যাটালগ সেটআপ' : 'Configure Offerings Catalog'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'bn' ? 'অর্ডার ফর্ম স্বয়ংক্রিয়ভাবে পূর্ণ করতে আপনার ব্যবসায়িক প্রোডাক্ট তালিকাভুক্ত করুন।' : 'Pre-configure your business inventory to auto-populate customer order values.'}
                </p>
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs md:text-sm py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all uppercase tracking-wider h-fit"
              >
                <Plus className="w-4 h-4" /> {t('btnNewProduct')}
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400">{t('loadingData')}</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center max-w-sm mx-auto">
                <div className="bg-blue-50 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Package className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">{t('noProductsFound')}</h4>
                <p className="text-xs text-slate-500 mt-2">
                  {lang === 'bn' ? 'প্রোডাক্টের সাইজ এবং কালার যুক্ত করা ডেলিভারি ও অর্ডারিং গতিময় করতে সাহায্য করে।' : 'Setting up sizes and color matrices helps auto-populate delivery pricing.'}
                </p>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="mt-4 bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow cursor-pointer hover:bg-indigo-700 uppercase tracking-wider"
                >
                  {t('btnNewProduct')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <div 
                    key={product.id} 
                    className="bg-slate-50 rounded-2xl p-5 border border-slate-200/50 hover:bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-indigo-950/5 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase">
                          SKU: {product.sku || 'N/A'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="p-1 border border-slate-200 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-indigo-700 transition-colors">
                        {product.name}
                      </h4>
                      
                      <p className="text-[15px] font-black text-slate-900 mt-1 font-mono">
                        ৳ {product.price.toLocaleString()} <span className="text-[9px] text-slate-400 font-medium">/ Unit</span>
                      </p>

                      {/* Variants indicators */}
                      <div className="mt-4 pt-3.5 border-t border-slate-200/60 space-y-2">
                        {product.sizeOptions && product.sizeOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[9px] font-bold text-slate-400 mr-1 uppercase">{lang === 'bn' ? 'সাইজ:' : 'Sizes:'}</span>
                            {product.sizeOptions.map(sz => (
                              <span key={sz} className="text-[10px] bg-slate-200/60 font-semibold px-2 py-0.5 rounded text-slate-700 font-mono">{sz}</span>
                            ))}
                          </div>
                        )}

                        {product.colorOptions && product.colorOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[9px] font-bold text-slate-400 mr-1 uppercase">{lang === 'bn' ? 'কালার:' : 'Colors:'}</span>
                            {product.colorOptions.map(cl => (
                              <span key={cl} className="text-[10px] bg-indigo-50 text-indigo-800 font-semibold px-2 py-0.5 rounded font-mono">{cl}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono mt-4 pt-2 text-right">
                      Registered: {new Date(product.createdAt).toLocaleDateString('en-US')}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab View: TaliKhata Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* Header / Intro section */}
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
                <FileText className="w-96 h-96" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-indigo-950 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full font-mono shadow-sm">
                      TaliKhata (বাকির খাতা)
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black mt-2 font-sans tracking-tight">
                    {lang === 'bn' ? 'ব্যবসায়িক দেনা-পাওনার হিসাব' : 'Business Credit & Debt Ledger'}
                  </h3>
                  <p className="text-xs text-indigo-200/95 mt-1.5 max-w-xl font-medium leading-relaxed">
                    {lang === 'bn' ? 'আপনার দোকানের কাস্টমারদের বকেয়া বাকি এবং আদায়ের হিসাব রাখুন এক জায়গায়। এক কাস্টমারের নামে যতবার খুশি লেনদেন এন্ট্রি দিয়ে মোট পাওনা একত্রিত হিসাব দেখুন।' : 'Keep track of all customer credits, dues and collections easily. Record multiple due entries under the same customer to see aggregated calculations.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetLedgerForm();
                    setShowLedgerModal(true);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs md:text-sm py-3 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <PlusCircle className="w-5 h-5 text-indigo-950" />
                  <span>{lang === 'bn' ? 'নতুন লেনদেন লিখুন' : 'New Ledger Entry'}</span>
                </button>
              </div>
            </div>

            {/* Quick Stats overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 font-bold flex items-center justify-center text-lg flex-shrink-0 font-mono">
                  ৳
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">{lang === 'bn' ? 'মোট পাওনা (বাকি)' : 'Total Receivable'}</p>
                  <h4 className="text-lg md:text-xl font-black text-rose-600 mt-1.5 font-mono leading-none">
                    ৳ {ledgerStats.totalPabo.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1.5">{lang === 'bn' ? 'যা কাস্টমারদের কাছে পাবেন' : 'Owed by active clients'}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-500 font-bold flex items-center justify-center text-lg flex-shrink-0 font-mono">
                  ৳
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">{lang === 'bn' ? 'অন্যকে পরিশোধ / দেনা' : 'Total Payable'}</p>
                  <h4 className="text-lg md:text-xl font-black text-sky-600 mt-1.5 font-mono leading-none">
                    ৳ {ledgerStats.totalDibo.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1.5">{lang === 'bn' ? 'যা কাস্টমারদের ফেরত দিতে হবে' : 'Overpaid collections'}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 font-bold flex items-center justify-center text-lg flex-shrink-0 font-mono">
                  ৳
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">{lang === 'bn' ? 'মোট আদায়কৃত (জমা)' : 'Total Collected'}</p>
                  <h4 className="text-lg md:text-xl font-black text-emerald-600 mt-1.5 font-mono leading-none">
                    ৳ {ledgerStats.totalPaid.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1.5">{lang === 'bn' ? 'মোট পরিশোধিত বিল' : 'Settled dues history'}</p>
                </div>
              </div>
            </div>

            {/* Main Interactive Split panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Customers List */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-5 flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ledgerSearchQuery}
                      onChange={(e) => setLedgerSearchQuery(e.target.value)}
                      placeholder={lang === 'bn' ? 'নাম বা মোবাইল ফোন দিয়ে খুঁজুন...' : 'Search customer name or phone...'}
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                    />
                    {ledgerSearchQuery && (
                      <button 
                        onClick={() => setLedgerSearchQuery('')}
                        className="text-[10px] text-red-500 hover:underline absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {lang === 'bn' ? 'মুছুন' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {filteredLedgerCustomers.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs">
                      {ledgerSearchQuery 
                        ? (lang === 'bn' ? 'ম্যাচিং কোনো কাস্টমার রেকর্ড পাওয়া যায়নি।' : 'No matching customer found.')
                        : (lang === 'bn' ? 'এখনো কোনো লেনদেন হিসাব যোগ করা হয়নি।' : 'No customer records yet.')}
                    </div>
                  ) : (
                    filteredLedgerCustomers.map(customer => {
                      const netBalance = customer.totalReceive - customer.totalGive;
                      const isSelected = selectedLedgerCustomer === customer.phone;

                      return (
                        <button
                          key={customer.phone}
                          type="button"
                          onClick={() => {
                            setSelectedLedgerCustomer(customer.phone);
                            // Pre-fill modal states if user opens the general modal later
                            setLedgerCustomerName(customer.name);
                            setLedgerCustomerPhone(customer.phone);
                          }}
                          className={`w-full p-4 flex items-center justify-between text-left transition-all ${
                            isSelected 
                              ? 'bg-indigo-50/70 border-l-4 border-indigo-600' 
                              : 'hover:bg-slate-50/50 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {customer.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono font-medium">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {lang === 'bn' ? `${customer.entries.length}টি লেনদেনের ইতিহাস` : `${customer.entries.length} transaction entries`}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                            {netBalance > 0 ? (
                              <span className="text-[11px] font-black font-mono text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1 leading-none">
                                {lang === 'bn' ? 'পাবেন ৳' : 'Recv ৳'} {netBalance.toLocaleString()}
                              </span>
                            ) : netBalance < 0 ? (
                              <span className="text-[11px] font-black font-mono text-sky-600 bg-sky-55 border border-sky-100 rounded-lg px-2 py-1 leading-none">
                                {lang === 'bn' ? 'দেনা ৳' : 'Give ৳'} {Math.abs(netBalance).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 leading-none uppercase">
                                {lang === 'bn' ? 'পরিশোধিত' : 'Settled'}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono">
                              {customer.latestDate}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Customer Details history */}
              <div className="lg:col-span-7">
                {(() => {
                  const activeCustomer = ledgerCustomers.find(c => c.phone === selectedLedgerCustomer);
                  if (!activeCustomer) {
                    return (
                      <div className="bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                        <div className="bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-slate-400 animate-bounce" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {lang === 'bn' ? 'কোনো গ্রাহক সিলেক্ট করা হয়নি' : 'No Customer Selected'}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                          {lang === 'bn' ? 'বাম পাশের তালিকা থেকে যেকোনো কাস্টমার নামের উপর ক্লিক করে তার বকেয়া এবং আদায়ের বিস্তারিত লেজার বই দেখুন।' : 'Click on a customer from the left list to view their complete credit timeline.'}
                        </p>
                      </div>
                    );
                  }

                  const customerNet = activeCustomer.totalReceive - activeCustomer.totalGive;

                  return (
                    <div className="space-y-6">
                      {/* Customer Summary / Quick Info Card */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                          <div>
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-mono font-black uppercase">
                              Active Case Summary
                            </span>
                            <h4 className="text-sm font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
                              {activeCustomer.name}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5 font-medium">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {activeCustomer.phone}
                            </p>
                          </div>
                          
                          <div className="text-left sm:text-right flex flex-col sm:items-end">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">{lang === 'bn' ? 'বর্তমান নেট স্থিতি' : 'Net Account Status'}</span>
                            <div className="mt-1.5">
                              {customerNet > 0 ? (
                                <p className="text-lg font-black font-mono text-rose-600 leading-none">
                                  {lang === 'bn' ? 'পাবেন ৳' : 'Receivable ৳'} {customerNet.toLocaleString()}
                                </p>
                              ) : customerNet < 0 ? (
                                <p className="text-lg font-black font-mono text-sky-600 leading-none">
                                  {lang === 'bn' ? 'দেনা ৳' : 'Payable ৳'} {Math.abs(customerNet).toLocaleString()}
                                </p>
                              ) : (
                                <p className="text-lg font-black text-emerald-600 flex items-center gap-1 leading-none">
                                  <CheckCircle className="w-5 h-5 text-emerald-500" /> {lang === 'bn' ? 'পরিশোধিত' : 'Fully Settled'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline QUICK TRANSACTION form (Handles: "ekjon ar theke joto bar baki nibe toto bar likhe rakte parbe") */}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const targetInput = e.currentTarget.elements.namedItem('quickAmount') as HTMLInputElement;
                            const targetReason = e.currentTarget.elements.namedItem('quickReason') as HTMLInputElement;
                            const targetType = e.currentTarget.elements.namedItem('quickType') as HTMLSelectElement;
                            const targetDate = e.currentTarget.elements.namedItem('quickDate') as HTMLInputElement;

                            const amt = Number(targetInput.value);
                            const rsn = targetReason.value.trim() || '';
                            const typ = targetType.value as 'receive' | 'give';
                            const dt = targetDate.value || new Date().toISOString().split('T')[0];

                            if (!amt || amt <= 0) {
                              alert(lang === 'bn' ? 'দয়া করে সঠিক অংক লিখুন!' : 'Please fill a valid amount!');
                              return;
                            }

                            setIsSavingLedger(true);

                            const newEntryId = 'ledger_' + Math.random().toString(36).substring(2, 11);
                            const newEntry: LedgerEntry = {
                              id: newEntryId,
                              userId: isDemo ? 'demo' : userSession.uid,
                              shopId: activeShop.id,
                              customerName: activeCustomer.name,
                              customerPhone: activeCustomer.phone,
                              type: typ,
                              amount: amt,
                              reason: rsn || (typ === 'receive' ? (lang === 'bn' ? 'সাধারণ বাকি' : 'General Credit') : (lang === 'bn' ? 'জমা / পরিশোধ' : 'Payment Collection')),
                              entryDate: dt,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            };

                            if (isDemo) {
                              const updatedEntries = [newEntry, ...allLedgerEntries];
                              setAllLedgerEntries(updatedEntries);
                              localStorage.setItem('nextorder_demo_ledger_entries', JSON.stringify(updatedEntries));
                              setIsSavingLedger(false);
                              targetInput.value = '';
                              targetReason.value = '';
                            } else {
                              try {
                                await setDoc(doc(db, 'ledger', newEntryId), newEntry);
                                targetInput.value = '';
                                targetReason.value = '';
                              } catch (err) {
                                console.error("Error Quick Add Ledger:", err);
                                alert('Error adding entry list');
                              } finally {
                                setIsSavingLedger(false);
                              }
                            }
                          }}
                          className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-xs space-y-3"
                        >
                          <h5 className="font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                            <Plus className="w-4 h-4 text-indigo-600" />
                            {lang === 'bn' ? `এই গ্রাহকের জন্য আরেকটি লেনদেন যোগ করুন` : `Record another transaction for ${activeCustomer.name}`}
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-semibold leading-none">{lang === 'bn' ? 'লেনদেনের ধরণ' : 'Type'}</label>
                              <select
                                name="quickType"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium cursor-pointer text-xs"
                              >
                                <option value="receive">{lang === 'bn' ? 'বাকি নিয়েছেন' : 'Took Due (Recv)'}</option>
                                <option value="give">{lang === 'bn' ? 'জমা / পরিশোধ' : 'Paid (Give)'}</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-semibold leading-none">{lang === 'bn' ? 'টাকার পরিমাণ *' : 'Amount (৳) *'}</label>
                              <input
                                type="number"
                                required
                                name="quickAmount"
                                placeholder="e.g. 500"
                                min="1"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-xs font-mono"
                              />
                            </div>

                            <div className="space-y-1 sm:col-span-1">
                              <label className="text-[10px] text-slate-500 uppercase font-semibold leading-none">{lang === 'bn' ? 'লেনদেনের তারিখ' : 'Date'}</label>
                              <input
                                type="date"
                                required
                                name="quickDate"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-xs font-mono"
                              />
                            </div>

                            <div>
                              <button
                                type="submit"
                                disabled={isSavingLedger}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-center cursor-pointer transition-all disabled:opacity-50 text-xs"
                              >
                                {isSavingLedger ? '...' : (lang === 'bn' ? 'যুক্ত করুন' : 'Add Entry')}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <label className="text-[10px] text-slate-500 uppercase font-semibold leading-none">{lang === 'bn' ? 'লেনদেনের কারণ / বিবরণ (যেমন: শার্ট বাকি / বকেয়া বিল শোধ)' : 'Transaction Reason/Details'}</label>
                            <input
                              type="text"
                              name="quickReason"
                              placeholder={lang === 'bn' ? 'যেমন: শার্ট বাকি বা ক্যাশ শোধ' : 'e.g. Bought shirt or Bkash cash collection'}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-xs text-sans"
                            />
                          </div>
                        </form>
                      </div>

                      {/* Transaction entries timeline */}
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            {lang === 'bn' ? 'লেনদেনের সম্পূর্ণ খতিয়ান' : 'Complete Credit Timeline'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium leading-none">
                            {lang === 'bn' ? 'মোট লেনদেন:' : 'Transactions:'} {activeCustomer.entries.length}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-600">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50">
                                <th className="p-2 px-3">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                                <th className="p-2">{lang === 'bn' ? 'বিবরণ' : 'Description'}</th>
                                <th className="p-2">{lang === 'bn' ? 'ধরণ' : 'Type'}</th>
                                <th className="p-2 text-right">{lang === 'bn' ? 'টাকা (৳)' : 'Amount'}</th>
                                <th className="p-2 text-center w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-xs">
                              {activeCustomer.entries.map(entry => (
                                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-2 px-3 font-mono text-slate-500 whitespace-nowrap">{entry.entryDate}</td>
                                  <td className="p-2 text-slate-900 leading-normal max-w-[180px] break-words font-sans">
                                    {entry.reason}
                                  </td>
                                  <td className="p-2">
                                    {entry.type === 'receive' ? (
                                      <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 rounded px-1.5 py-0.5 uppercase whitespace-nowrap leading-none">
                                        {lang === 'bn' ? 'বাকি (Due)' : 'Due'}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 uppercase whitespace-nowrap leading-none">
                                        {lang === 'bn' ? 'জমা (Paid)' : 'Paid'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                                    ৳ {entry.amount.toLocaleString()}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLedgerEntry(entry.id)}
                                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                                      title={lang === 'bn' ? 'ডিলিট করুন' : 'Delete Entry'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Design copyright and contact */}
      <footer className="bg-indigo-950 text-indigo-300 py-8 text-center text-xs mt-12 border-t border-indigo-900 font-vincendo tracking-wider">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} NextOrder Software &bull; All Rights Reserved.</p>
          <p className="font-mono text-[9px] text-indigo-400 uppercase tracking-widest">Powered by Secure Firebase Realtime Database Engine</p>
        </div>
      </footer>

      {/* ================= MODAL: CREATE ORDER ================= */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-lg border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 p-2 rounded-xl text-indigo-650">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-vincendo font-black text-slate-900">Create New Customer Order</h3>
                    <p className="text-[11px] text-slate-400 font-vincendo">Please render accurate consumer credentials</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-755 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddOrderSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Receiver Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Customer Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g., +123456789 or 017..."
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* Bangladesh District and Thana Select */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* District Dropdown */}
                  <div className="space-y-1 relative">
                    <label className="text-[11px] text-slate-500 flex justify-between">
                      <span>{lang === 'bn' ? 'জেলা নির্ধারণ করুন *' : 'Select District *'}</span>
                      {orderDistrict && (
                        <button 
                          type="button" 
                          onClick={() => { setOrderDistrict(''); setOrderThana(''); setDeliveryAddress(''); }}
                          className="text-[9px] text-red-500 hover:underline"
                        >
                          {lang === 'bn' ? 'মুছুন' : 'Clear'}
                        </button>
                      )}
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowDistrictDropdown(!showDistrictDropdown);
                        setShowThanaDropdown(false);
                      }}
                      className="w-full text-left pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-xs flex justify-between items-center transition-all min-h-[38px] cursor-pointer"
                    >
                      <span className={orderDistrict ? "text-slate-900 font-bold" : "text-slate-400"}>
                        {(() => {
                          if (!orderDistrict) return lang === 'bn' ? 'জেলা খুঁজুন/নির্বাচন করুন' : 'Search & select district';
                          const dist = BANGLADESH_DISTRICTS.find(d => d.name === orderDistrict);
                          return dist ? `${dist.name} (${dist.bnName})` : orderDistrict;
                        })()}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </button>

                    {showDistrictDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                        <div className="sticky top-0 bg-white pb-1.5 pt-0.5 px-0.5 border-b border-slate-100 mb-1 z-10">
                          <input
                            type="text"
                            placeholder={lang === 'bn' ? 'জেলার নাম টাইপ করুন...' : 'Type district name...'}
                            value={districtQuery}
                            onChange={(e) => setDistrictQuery(e.target.value)}
                            className="w-full text-xs pl-2.5 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="space-y-0.5 overflow-y-auto max-h-36">
                          {(() => {
                            const filtered = BANGLADESH_DISTRICTS.filter(d => 
                              d.name.toLowerCase().includes(districtQuery.toLowerCase()) ||
                              d.bnName.toLowerCase().includes(districtQuery.toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return <div className="text-[10px] text-slate-400 py-2 text-center">{lang === 'bn' ? 'কোনো জেলা পাওয়া যায়নি' : 'No districts found'}</div>;
                            }
                            return filtered.map(d => {
                              const isSelected = orderDistrict === d.name;
                              return (
                                <button
                                  type="button"
                                  key={d.name}
                                  onClick={() => {
                                    setOrderDistrict(d.name);
                                    setOrderThana('');
                                    setDistrictQuery('');
                                    setShowDistrictDropdown(false);
                                    setDeliveryAddress(prev => {
                                      if (!prev.trim() || prev.startsWith('Thana:')) {
                                        return `Thana: (Please select), District: ${d.name}`;
                                      }
                                      return prev;
                                    });
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white font-bold' 
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{d.name} ({d.bnName})</span>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thana Dropdown */}
                  <div className="space-y-1 relative">
                    <label className="text-[11px] text-slate-500 flex justify-between">
                      <span>{lang === 'bn' ? 'থানা নির্ধারণ করুন *' : 'Select Thana *'}</span>
                    </label>

                    <button
                      type="button"
                      disabled={!orderDistrict}
                      onClick={() => {
                        setShowThanaDropdown(!showThanaDropdown);
                        setShowDistrictDropdown(false);
                      }}
                      className={`w-full text-left pl-3 pr-8 py-2.5 border rounded-xl focus:outline-none focus:border-indigo-500 font-semibold text-xs flex justify-between items-center transition-all min-h-[38px] ${
                        orderDistrict 
                          ? 'bg-slate-50 hover:bg-slate-100/50 border-slate-200 cursor-pointer' 
                          : 'bg-slate-100/50 border-slate-200/60 cursor-not-allowed text-slate-400'
                      }`}
                    >
                      <span className={orderThana ? "text-slate-900 font-bold" : "text-slate-400"}>
                        {(() => {
                          if (!orderDistrict) return lang === 'bn' ? 'প্রথমে জেলা সিলেক্ট করুন' : 'Select district first';
                          if (!orderThana) return lang === 'bn' ? 'থানা খুঁজুন/নির্বাচন করুন' : 'Search & select thana';
                          const thanas = BANGLADESH_THANAS[orderDistrict] || [];
                          const th = thanas.find(t => t.name === orderThana);
                          return th ? `${th.name} (${th.bnName})` : orderThana;
                        })()}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </button>

                    {showThanaDropdown && orderDistrict && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1.5 space-y-1">
                        <div className="sticky top-0 bg-white pb-1.5 pt-0.5 px-0.5 border-b border-slate-100 mb-1 z-10">
                          <input
                            type="text"
                            placeholder={lang === 'bn' ? 'থানার নাম টাইপ করুন...' : 'Type thana name...'}
                            value={thanaQuery}
                            onChange={(e) => setThanaQuery(e.target.value)}
                            className="w-full text-xs pl-2.5 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="space-y-0.5 overflow-y-auto max-h-36">
                          {(() => {
                            const thanaList = BANGLADESH_THANAS[orderDistrict] || [];
                            const filtered = thanaList.filter(t => 
                              t.name.toLowerCase().includes(thanaQuery.toLowerCase()) ||
                              t.bnName.toLowerCase().includes(thanaQuery.toLowerCase())
                            );
                            if (filtered.length === 0) {
                              return <div className="text-[10px] text-slate-400 py-2 text-center">{lang === 'bn' ? 'কোনো থানা পাওয়া যায়নি' : 'No thanas found'}</div>;
                            }
                            return filtered.map(t => {
                              const isSelected = orderThana === t.name;
                              return (
                                <button
                                  type="button"
                                  key={t.name}
                                  onClick={() => {
                                    setOrderThana(t.name);
                                    setThanaQuery('');
                                    setShowThanaDropdown(false);
                                    setDeliveryAddress(prev => {
                                      const distInfo = BANGLADESH_DISTRICTS.find(d => d.name === orderDistrict);
                                      const distStr = distInfo ? `${distInfo.name} (${distInfo.bnName})` : orderDistrict;
                                      const thanaStr = `${t.name} (${t.bnName})`;
                                      
                                      if (!prev || prev.trim() === '' || prev.startsWith('Thana:')) {
                                        return `Thana: ${thanaStr}, District: ${distStr}. (Holding/Road details here...)`;
                                      }
                                      return prev;
                                    });
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-600 text-white font-bold' 
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{t.name} ({t.bnName})</span>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery address */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">{lang === 'bn' ? 'বিস্তারিত হোল্ডিং নম্বর ও রোড এড্রেস *' : 'Detailed Address (Holding, Area, Customer details) *'}</label>
                  <textarea
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={2}
                    placeholder="Enter street, building, city, and local area landmarks..."
                    className="w-full text-xs pl-3 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                {/* Product Select catalog list */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Select Inventory Product *</label>
                    {products.length > 0 ? (
                      <select
                        required
                        value={productName}
                        onChange={(e) => handleProductSelectionChange(e.target.value)}
                        className="w-full pl-3 pr-2 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="">Select Catalog Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.name}>{p.name} (৳{p.price})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Write customized product name"
                        className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Purchase Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(Number(e.target.value))}
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Sizes and Colors definitions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Select Size Variant *</label>
                    {(() => {
                      const selectedProd = products.find(p => p.name === productName);
                      if (selectedProd && selectedProd.sizeOptions && selectedProd.sizeOptions.length > 0) {
                        const options = [...selectedProd.sizeOptions];
                        if (orderSize && !options.includes(orderSize)) {
                          options.push(orderSize);
                        }
                        return (
                          <select
                            value={orderSize}
                            onChange={(e) => setOrderSize(e.target.value)}
                            className="w-full pl-3 pr-2 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                          >
                            {options.map(sz => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                        );
                      }
                      return (
                        <input
                          type="text"
                          required
                          value={orderSize}
                          onChange={(e) => setOrderSize(e.target.value)}
                          placeholder="e.g. XL, 34, Medium"
                          className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      );
                    })()}
                    {/* Standard Size quick-select chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((sz) => {
                        const isChosen = orderSize.toUpperCase() === sz;
                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => setOrderSize(sz)}
                            className={`text-[10px] h-6 px-1.5 rounded-lg font-bold transition-all border cursor-pointer select-none ${
                              isChosen
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-110'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Select Theme Color *</label>
                    {(() => {
                      const selectedProd = products.find(p => p.name === productName);
                      if (selectedProd && selectedProd.colorOptions && selectedProd.colorOptions.length > 0) {
                        return (
                          <select
                            value={orderColor}
                            onChange={(e) => setOrderColor(e.target.value)}
                            className="w-full pl-3 pr-2 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                          >
                            {selectedProd.colorOptions.map(cl => (
                              <option key={cl} value={cl}>{cl}</option>
                            ))}
                          </select>
                        );
                      }
                      return (
                        <input
                          type="text"
                          required
                          value={orderColor}
                          onChange={(e) => setOrderColor(e.target.value)}
                          placeholder="e.g. Cobalt, Noir, Crimson"
                          className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      );
                    })()}
                  </div>
                </div>

                {/* Total Price & Initial Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-indigo-950 font-extrabold flex items-center gap-0.5"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Aggregate Product Subtotal (৳) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(Number(e.target.value))}
                      className="w-full pl-3 pr-3 py-2.5 bg-indigo-50/40 focus:bg-white border border-indigo-200 font-bold text-slate-900 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Fulfillment Status Stage</label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value as any)}
                      className="w-full pl-3 pr-2 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none font-semibold uppercase tracking-wide"
                    >
                      <option value="pending">🕒 Pending</option>
                      <option value="processing">⚙️ Processing</option>
                      <option value="shipped">📦 Shipped</option>
                      <option value="delivered">✅ Delivered</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Charge Setup */}
                <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-slate-700">
                    <span className="font-extrabold flex items-center gap-1 text-indigo-950 uppercase tracking-wider">📦 Shipping Surcharge Fee</span>
                    <span className="font-mono text-slate-600 font-extrabold">৳ {deliveryCharge}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryCharge(80)}
                      className={`py-1.5 px-1 rounded-lg text-[10.5px] select-none text-center font-bold border transition-all cursor-pointer ${
                        deliveryCharge === 80
                          ? 'bg-indigo-600 text-white border-transparent shadow-xs'
                          : 'bg-white text-slate-650 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      ৳80 (City Line)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryCharge(150)}
                      className={`py-1.5 px-1 rounded-lg text-[10.5px] select-none text-center font-bold border transition-all cursor-pointer ${
                        deliveryCharge === 150
                          ? 'bg-indigo-600 text-white border-transparent shadow-xs'
                          : 'bg-white text-slate-650 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      ৳150 (Outskirts)
                    </button>
                    <input
                      type="number"
                      placeholder="Custom fee"
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                      className="py-1 px-2 rounded-lg text-[10.5px] text-center font-bold border bg-white border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/50 flex justify-between items-center text-[11px] font-black uppercase tracking-wide">
                    <span className="text-slate-500">Total Collectable Cash-On-Delivery:</span>
                    <span className="text-indigo-700 font-mono text-xs">৳ {(Number(orderPrice) + Number(deliveryCharge)).toLocaleString()}</span>
                  </div>
                </div>

                {/* Product Photo Upload Section */}
                <div className="bg-slate-50 border border-slate-200/50 p-4.5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                      <Camera className="w-4 h-4 text-indigo-600" />
                      {lang === 'bn' ? 'প্রোডাক্ট ছবি যুক্ত করুন (ঐচ্ছিক)' : 'Product Photos (Optional)'}
                    </label>
                    <span className="text-[9.5px] font-mono font-bold text-slate-400">
                      {orderImages.length} {lang === 'bn' ? 'ছবি' : 'images'}
                    </span>
                  </div>

                  {/* Drag and Drop Input Area */}
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-white transition-all group">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImages}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all" />
                      <p className="text-xs font-bold text-slate-705 group-hover:text-indigo-600">
                        {isUploadingImages 
                          ? (lang === 'bn' ? 'ছবি ওয়ান-বাই-ওয়ান সাইজ ছোট হচ্ছে...' : 'Processing/Compressing photos...') 
                          : (lang === 'bn' ? 'নতুন ছবি আপলোড করতে ক্লিক করুন' : 'Click to select / upload photos')}
                      </p>
                      <span className="text-[9px] text-slate-400 block font-normal">
                        {lang === 'bn' ? 'একসাথে একাধিক ছবি সিলেক্ট করা সম্ভব' : 'Supports multiple pictures, auto-optimized'}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Row */}
                  {orderImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {orderImages.map((imgBase64, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-slate-100 cursor-zoom-in" title={lang === 'bn' ? 'ছবি ওয়ান-বাই-ওয়ান বড় করে দেখতে ক্লিক করুন' : 'Click to preview'}>
                          <img
                            src={imgBase64}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover select-none"
                            referrerPolicy="no-referrer"
                            onClick={() => setPreviewImage(imgBase64)}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-all scale-90 opacity-100 sm:opacity-0 group-hover:opacity-100 cursor-pointer z-20"
                            title={lang === 'bn' ? 'ছবিটি ডিলিট করুন' : 'Delete photo'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional custom notes */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Fulfillment Directives / Instructions (Optional)</label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="e.g., Wrap as gift, call recipient prior to shipment..."
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
                  />
                </div>

                {/* Form Buttons */}
                <button
                  type="submit"
                  disabled={isUploadingImages}
                  className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition-all border border-transparent cursor-pointer text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
                    isUploadingImages 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isUploadingImages ? (lang === 'bn' ? 'ছবি প্রসেস হচ্ছে...' : 'Processing images...') : (lang === 'bn' ? 'অর্ডার রেকর্ড সাবমিট করুন' : 'Register Store Order')}
                </button>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADD LEDGER ENTRY ================= */}
      <AnimatePresence>
        {showLedgerModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700">
                    <FileText className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {lang === 'bn' ? 'নতুন লেনদেনের হিসাব লিখুন' : 'New Credit / Debt Record'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {lang === 'bn' ? 'তালিখাতার প্রতিটি তথ্য নির্ভুলভাবে লিখে রাখুন।' : 'Fill out exact credentials to persist in TaliKhata books'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLedgerModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleCreateLedgerEntry} className="p-6 space-y-4 text-xs font-semibold">
                
                {/* Form fields */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 uppercase">{lang === 'bn' ? 'কাস্টমার / পার্টির নাম *' : 'Party / Customer Name *'}</label>
                  <input
                    type="text"
                    required
                    value={ledgerCustomerName}
                    onChange={(e) => setLedgerCustomerName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: আবুল কালাম' : 'e.g., Abul Kalam'}
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium font-sans text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 uppercase">{lang === 'bn' ? 'মোবাইল ফোন নম্বর *' : 'Customer Phone Number *'}</label>
                  <input
                    type="tel"
                    required
                    value={ledgerCustomerPhone}
                    onChange={(e) => setLedgerCustomerPhone(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: ০১৭১১২২২৩৩৪' : 'e.g., 01711122233'}
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 uppercase">{lang === 'bn' ? 'লেনদেনের ধরন *' : 'Transaction Type *'}</label>
                    <select
                      value={ledgerType}
                      onChange={(e) => setLedgerType(e.target.value as 'receive' | 'give')}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium cursor-pointer text-xs"
                    >
                      <option value="receive">{lang === 'bn' ? 'পাবো / বাকি (Receivable)' : 'Due (Receivable)'}</option>
                      <option value="give">{lang === 'bn' ? 'দিলো / আদায় (Payment)' : 'Paid (Payment)'}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 uppercase">{lang === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount in Taka (৳) *'}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={ledgerAmount || ''}
                      onChange={(e) => setLedgerAmount(Number(e.target.value))}
                      placeholder="e.g. 1200"
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 uppercase">{lang === 'bn' ? 'লেনদেনের তারিখ *' : 'Transaction Date *'}</label>
                  <input
                    type="date"
                    required
                    value={ledgerDate}
                    onChange={(e) => setLedgerDate(e.target.value)}
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 uppercase">{lang === 'bn' ? 'বিবরণ / কেন বাকি নিলেন' : 'Reason / Item Details'}</label>
                  <textarea
                    rows={2}
                    value={ledgerReason}
                    onChange={(e) => setLedgerReason(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: ২ কালার কাপড়ের শার্ট বাকিতে ক্রয় করেছেন।' : 'e.g. Bought 2 cotton shirts on credit.'}
                    className="w-full pl-3 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium font-sans resize-none text-xs"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSavingLedger}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all border border-transparent cursor-pointer text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-2 disabled:bg-slate-350 disabled:text-slate-500"
                >
                  {isSavingLedger ? '...' : (lang === 'bn' ? 'লগ এন্ট্রি রেজিস্টার করুন' : 'Confirm Ledger Log Entry')}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADD PRODUCT ================= */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 p-2 rounded-xl text-indigo-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-vincendo font-black text-slate-900">Register Catalog Product</h3>
                    <p className="text-[11px] text-slate-400 font-vincendo">Define store offering parameters below</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-755 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-semibold">
                
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Product Offering Title *</label>
                  <input
                    type="text"
                    required
                    value={productNameInput}
                    onChange={(e) => setProductNameInput(e.target.value)}
                    placeholder="e.g., Premium Vintage Denim Jacket"
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Catalog SKU ID (Optional)</label>
                    <input
                      type="text"
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      placeholder="e.g., JKT-DENIM"
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Unit Selling Price (৳) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={productPrice}
                      onChange={(e) => setProductPrice(Number(e.target.value))}
                      className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Available Sizes (Separated by comma)</label>
                  <input
                    type="text"
                    value={productSizes}
                    onChange={(e) => setProductSizes(e.target.value)}
                    placeholder="e.g., S, M, L, XL, XXL"
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none font-medium"
                  />
                  {/* Quick-toggle size pills */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((sz) => {
                      const activeSizes = productSizes.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
                      const isChosen = activeSizes.includes(sz);
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => {
                            if (isChosen) {
                              const filtered = activeSizes.filter((s) => s !== sz);
                              setProductSizes(filtered.join(', '));
                            } else {
                              const appended = [...activeSizes, sz];
                              setProductSizes(appended.join(', '));
                            }
                          }}
                          className={`text-[10px] h-6 px-2 rounded-lg font-bold transition-all border cursor-pointer select-none ${
                            isChosen
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-black'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isChosen ? `✓ ${sz}` : `+ ${sz}`}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-slate-400 font-normal leading-relaxed mt-1 block">These variants will auto-populate as drops in order registration.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500">Available Theme Colors (Separated by comma)</label>
                  <input
                    type="text"
                    value={productColors}
                    onChange={(e) => setProductColors(e.target.value)}
                    placeholder="e.g., Cobalt Blue, Olive Green, Classic Noir"
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl focus:outline-none font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-widest"
                >
                  Save Product to Catalog
                </button>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ORDER DETAIL & STATUS UPDATE ================= */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col my-8"
            >
              {/* Injecting direct print CSS override stylesheet to guarantee only the label prints */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  #root, header, footer, main, .fixed, .modal-backdrop, .no-print {
                    display: none !important;
                    visibility: hidden !important;
                  }
                  #parcel-print-sticker {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 4in !important;
                    height: 6in !important;
                    border: 2px dashed #000 !important;
                    padding: 15px !important;
                    font-family: monospace !important;
                    font-size: 11px !important;
                    color: black !important;
                    visibility: visible !important;
                    z-index: 9999999 !important;
                    box-sizing: border-box !important;
                    background: white !important;
                  }
                }
              `}} />

              {/* Dynamic Header with premium dark gradient design */}
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-indigo-700/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-indigo-700/20 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase py-1 px-2.5 rounded-md bg-indigo-800/80 border border-indigo-700/60 text-indigo-200 tracking-wider">
                        {lang === 'bn' ? 'অর্ডার কর্মক্ষেত্র' : 'ORDER WORKSPACE'}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        • {new Date(selectedOrderDetail.createdAt).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl tracking-widest font-black uppercase text-indigo-50 mt-1.5">
                      #{selectedOrderDetail.id.toUpperCase()}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 block font-bold mb-1 uppercase tracking-wider text-right">
                        {lang === 'bn' ? 'ডেলিভারি স্ট্যাটাস' : 'Fulfillment Status'}
                      </span>
                      <span className={`text-[10px] px-3.5 py-1.5 font-black rounded-full border uppercase tracking-wider ${
                        selectedOrderDetail.status === 'pending' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        selectedOrderDetail.status === 'processing' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                        selectedOrderDetail.status === 'shipped' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                        selectedOrderDetail.status === 'delivered' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {selectedOrderDetail.status === 'pending' ? `🕒 ${t('statusPending')}` :
                         selectedOrderDetail.status === 'processing' ? `⚙️ ${t('statusProcessing')}` :
                         selectedOrderDetail.status === 'shipped' ? `📦 ${t('statusShipped')}` :
                         selectedOrderDetail.status === 'delivered' ? `✅ ${t('statusDelivered')}` :
                         `❌ ${t('statusCancelled')}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetail(null)}
                      className="p-2 hover:bg-white/10 rounded-xl text-indigo-100 hover:text-white transition-all cursor-pointer bg-white/5 border border-white/15 mt-3.5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Tracking Progress Ribbon */}
                <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-5 gap-1 text-[10px] text-center font-bold tracking-wider text-slate-400">
                  {[
                    { key: 'pending', label: lang === 'bn' ? 'পেন্ডিং' : 'PENDING', icon: Clock, bg: 'from-amber-500 to-amber-600', color: 'text-amber-400' },
                    { key: 'processing', label: lang === 'bn' ? 'প্রসেসিং' : 'PROCESSING', icon: SlidersHorizontal, bg: 'from-indigo-500 to-indigo-600', color: 'text-indigo-400' },
                    { key: 'shipped', label: lang === 'bn' ? 'শিপড' : 'SHIPPED', icon: Package, bg: 'from-blue-500 to-blue-600', color: 'text-blue-400' },
                    { key: 'delivered', label: lang === 'bn' ? 'ডেলিভার্ড' : 'DELIVERED', icon: CheckCircle, bg: 'from-emerald-500 to-emerald-600', color: 'text-emerald-400' },
                    { key: 'cancelled', label: lang === 'bn' ? 'বাতিল' : 'CANCELLED', icon: X, bg: 'from-rose-500 to-rose-600', color: 'text-rose-400' }
                  ].map((step, idx) => {
                    const isSelected = selectedOrderDetail.status === step.key;
                    const isPassed = (() => {
                      const orderStatuses = ['pending', 'processing', 'shipped', 'delivered'];
                      const currentIdx = orderStatuses.indexOf(selectedOrderDetail.status);
                      const stepIdx = orderStatuses.indexOf(step.key);
                      return currentIdx >= stepIdx && stepIdx !== -1 && selectedOrderDetail.status !== 'cancelled';
                    })();
                    
                    return (
                      <div key={step.key} className="relative flex flex-col items-center">
                        <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all ${
                          isSelected ? `bg-gradient-to-r ${step.bg} text-white shadow-xl ring-4 ring-indigo-500/30 scale-110` :
                          isPassed ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          <step.icon className="w-4 h-4" />
                        </div>
                        <span className={`mt-2 font-mono text-[9px] block ${
                          isSelected ? `${step.color} font-black` :
                          isPassed ? 'text-indigo-300' : 'text-slate-500'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Scroll Area */}
              <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50/50 space-y-6">
                
                {/* Visual grid splits */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left Column (Main Info) */}
                  <div className="md:col-span-7 space-y-6">
                    
                    {/* Recipient card details */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                          {lang === 'bn' ? 'গ্রাহকের ঠিকানা ও বিবরণ' : 'Customer Shipping Destination'}
                        </h3>
                      </div>

                      <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-700 text-base uppercase shrink-0">
                            {selectedOrderDetail.customerName[0]}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 tracking-normal">{selectedOrderDetail.customerName}</h4>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-mono font-bold rounded-lg transition-colors">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              {selectedOrderDetail.customerPhone}
                            </span>
                          </div>
                        </div>

                        <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 flex gap-3">
                          <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-indigo-700/80 uppercase tracking-widest block font-mono">
                              {lang === 'bn' ? 'কুরিয়ার ডেলিভারি গন্তব্য ঠিকানা' : 'Courier address'}
                            </span>
                            {selectedOrderDetail.district && (
                              <div className="flex flex-wrap gap-1 mb-1 mt-0.5">
                                <span className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                                  {lang === 'bn' ? 'জেলা: ' : 'DISTRICT: '}{selectedOrderDetail.district}
                                </span>
                                {selectedOrderDetail.thana && (
                                  <span className="text-[9px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded">
                                    {lang === 'bn' ? 'থানা: ' : 'THANA: '}{selectedOrderDetail.thana}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="text-slate-700 text-xs font-mono font-semibold leading-relaxed block">
                              {selectedOrderDetail.deliveryAddress}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Subtotal Details Card */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                      
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                          {lang === 'bn' ? 'ক্রয়কৃত আইটেমের তথ্য' : 'Purchased Itemization'}
                        </h3>
                      </div>

                      <div className="space-y-3 font-medium">
                        
                        {/* Selected Product Line */}
                        <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-150/40 text-xs">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-900 block text-sm">{selectedOrderDetail.productName}</span>
                            <div className="flex gap-1.5 mt-1.5">
                              <span className="text-[9px] font-bold bg-white text-slate-755 px-2.5 py-0.5 border border-slate-200 rounded-md font-mono">
                                {lang === 'bn' ? 'সাইজ:' : 'Size:'} {selectedOrderDetail.size}
                              </span>
                              <span className="text-[9px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-755 px-2.5 py-0.5 rounded-md font-mono">
                                {lang === 'bn' ? 'কালার:' : 'Color:'} {selectedOrderDetail.color}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono bg-white border border-slate-200 text-slate-800 font-black text-xs px-3 py-1.5 rounded-xl">
                            x{selectedOrderDetail.quantity}
                          </span>
                        </div>

                        {/* Charges lists */}
                        <div className="space-y-2 text-xs pt-2 text-slate-600 px-1">
                          
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">
                              {lang === 'bn' ? 'প্রোডাক্ট মোট মূল্য:' : 'Items Subtotal Price:'}
                            </span>
                            <span className="font-mono text-slate-800 font-bold">৳ {selectedOrderDetail.price.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">
                              {lang === 'bn' ? 'ডেলিভারি চার্জ:' : 'Standard Delivery Charge:'}
                            </span>
                            <span className="font-mono text-slate-800 font-bold">৳ {(selectedOrderDetail.deliveryCharge || 0).toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between items-center pt-3.5 border-t border-slate-100 text-slate-900 font-black text-xs uppercase tracking-wide">
                            <span className="text-indigo-950 font-extrabold">
                              {lang === 'bn' ? 'ক্যাশ অন ডেলিভারি (COD) মোট প্রদেয়:' : 'Collectable COD Surcharge:'}
                            </span>
                            <span className="font-mono text-indigo-700 text-base">৳ {(selectedOrderDetail.price + (selectedOrderDetail.deliveryCharge || 0)).toLocaleString()}</span>
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Uploaded Photos Section in Details Panel */}
                    {selectedOrderDetail.images && selectedOrderDetail.images.length > 0 && (
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                          <Image className="w-4 h-4 text-indigo-650" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                            {lang === 'bn' ? 'প্রোডাক্ট ছবিসমূহ' : 'Product Attachment Photos'}
                          </h3>
                          <span className="bg-indigo-100 text-indigo-850 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ml-auto">
                            {selectedOrderDetail.images.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {selectedOrderDetail.images.map((imgBase64, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setPreviewImage(imgBase64)}
                              className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-indigo-500 transition-all cursor-zoom-in shadow-sm block w-full text-left"
                              title={lang === 'bn' ? 'ছবি বড় করে দেখতে ক্লিক করুন' : 'Click to view full image'}
                            >
                              <img
                                src={imgBase64}
                                alt={`Product attachment ${index + 1}`}
                                className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-slate-800 text-[10.5px] font-bold px-2 py-1 rounded-lg transition-opacity flex items-center gap-1 shadow">
                                  {lang === 'bn' ? 'বড় করে দেখুন' : 'Zoom In'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOrderDetail.notes && (
                      <div className="bg-amber-50/55 rounded-2xl p-4.5 border border-amber-200/50 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider font-mono">
                          <Info className="w-4 h-4 text-amber-600" />
                          {lang === 'bn' ? 'ডেলিভারি ইনস্ট্রাকশন / বিশেষ নোট' : 'Fulfillment Guidelines / Customer Notes'}
                        </div>
                        <p className="text-slate-700 text-xs italic font-medium leading-relaxed bg-white/70 p-3 rounded-lg border border-amber-100/60">
                          "{selectedOrderDetail.notes}"
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Right Column (Sticker Preview) */}
                  <div className="md:col-span-5 space-y-6">
                    
                    {/* PHYSICAL PREVIEW OF GLUED SHIFT LABELS */}
                    <div className="bg-indigo-950 text-indigo-300 rounded-2xl p-5 shadow-lg space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-450 tracking-wider flex items-center gap-1 uppercase">
                          <Printer className="w-3.5 h-3.5" /> Physical Courier Label
                        </span>
                        <span className="bg-indigo-900 text-[8px] font-semibold text-indigo-200 px-1.5 py-0.5 rounded tracking-widest uppercase font-mono">
                          Live Sticker Setup
                        </span>
                      </div>

                      {/* Mock Sticky Label */}
                      <div className="border border-indigo-805 border-dashed rounded-xl p-3.5 bg-white text-indigo-950 font-mono text-[9px] space-y-2 relative overflow-hidden select-none shadow-inner">
                        
                        <div className="text-center font-bold border-b border-slate-300 pb-1.5 text-[10px] tracking-tight uppercase font-mono block text-slate-800">
                          📦 NEXTORDER COURIER sticker
                        </div>

                        {/* Barcode representation */}
                        <div className="flex justify-center items-center gap-[1.2px] py-1">
                          {[2, 1, 3, 1, 2, 3, 1, 2, 3, 1, 4, 1.5, 1, 2, 1.5, 3, 1, 2, 1].map((width, i) => (
                            <div key={i} className="bg-slate-900" style={{ width: `${width}px`, height: '18px' }} />
                          ))}
                        </div>
                        <div className="text-center text-[7px] tracking-wider text-slate-500 font-bold -mt-0.5 tracking-widest uppercase">
                          #{selectedOrderDetail.id.toUpperCase()}
                        </div>

                        <div className="pt-2 border-t border-slate-200 text-[8px] leading-tight space-y-1">
                          <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[7px] font-mono">Recipient Information:</p>
                          {selectedOrderDetail.district && (
                            <p className="font-bold text-indigo-750 uppercase tracking-wider text-[8px] font-mono bg-indigo-50 px-1 py-0.5 rounded inline-block">
                              ROUTE: {selectedOrderDetail.thana ? `${selectedOrderDetail.thana.toUpperCase()}, ` : ''}{selectedOrderDetail.district.toUpperCase()}
                            </p>
                          )}
                          <p className="font-bold text-slate-900 text-[10px]">{selectedOrderDetail.customerName}</p>
                          <p className="font-bold text-slate-900 bg-slate-100 inline-block px-1 rounded text-[9.5px] font-mono">{selectedOrderDetail.customerPhone}</p>
                          <p className="text-slate-500 italic leading-snug">{selectedOrderDetail.deliveryAddress}</p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-200 text-[8px] flex justify-between font-mono">
                          <span className="text-slate-900 truncate font-semibold">{selectedOrderDetail.productName} (x{selectedOrderDetail.quantity})</span>
                          <span className="font-extrabold text-indigo-805">৳ {(selectedOrderDetail.price + (selectedOrderDetail.deliveryCharge || 0)).toLocaleString()}</span>
                        </div>

                      </div>

                      {/* Actions */}
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
                      >
                        <Printer className="w-4 h-4" /> Print Sticker Label (4"x6")
                      </button>

                    </div>

                  </div>

                </div>

              </div>

              {/* Modal footer toolbar */}
              <div className="bg-slate-50 px-6 py-4.5 border-t border-slate-100 flex items-center justify-between no-print gap-3">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selectedOrderDetail.id)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> {t('detailDestroyOrder')}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetail(null)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-xs uppercase active:scale-95 shadow-xs"
                >
                  {t('detailCloseWorkspace')}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDERED ABSOLUTE ELEMENT SOLELY TARGETED BY PRINT MEDIA QUERY */}
      {selectedOrderDetail && (
        <div id="parcel-print-sticker" className="hidden" style={{ display: 'none' }}>
          <div style={{ border: '2px dashed #000', padding: '15px', fontFamily: 'monospace', fontSize: '11px', color: '#000', lineHeight: '1.4' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
              📦 NEXTORDER DELIVERY COURIER SLIP
            </div>

            {/* Custom Barcode simulator for printing in pure black/white */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', padding: '10px 0' }}>
              {[3, 1, 4, 2, 2, 4, 1, 3, 4, 1, 5, 2, 1, 3, 2, 4, 2, 3, 1].map((width, i) => (
                <div key={i} style={{ backgroundColor: '#000', width: `${width}px`, height: '35px' }} />
              ))}
            </div>
            
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginBottom: '12px' }}>
              ORDER ID: #{selectedOrderDetail.id.toUpperCase()}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '10px', borderRight: '1px solid #ccc' }}>
                    <div style={{ fontWeight: 'bold', borderBottom: '1px solid #000', marginBottom: '4px', paddingBottom: '2px' }}>Receiver Address details:</div>
                    {selectedOrderDetail.district && (
                      <div style={{ fontWeight: 'bold', fontSize: '11px', margin: '2px 0 4px 0', border: '1px solid #000', padding: '2px 4px', backgroundColor: '#333', color: '#fff', width: 'fit-content' }}>
                        ROUTE: {selectedOrderDetail.thana ? `${selectedOrderDetail.thana.toUpperCase()}, ` : ''}{selectedOrderDetail.district.toUpperCase()}
                      </div>
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '3px 0' }}>{selectedOrderDetail.customerName}</div>
                    <div style={{ fontWeight: 'black', fontSize: '14px', margin: '4px 0', border: '1px solid #000', padding: '2px 4px', width: 'fit-content', backgroundColor: '#eee' }}>
                      {selectedOrderDetail.customerPhone}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {selectedOrderDetail.deliveryAddress}
                    </div>
                  </td>
                  <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '10px' }}>
                    <div style={{ fontWeight: 'bold', borderBottom: '1px solid #000', marginBottom: '4px', paddingBottom: '2px' }}>Sender Merchant Info:</div>
                    <div style={{ fontWeight: 'bold', margin: '3px 0' }}>{activeShop ? activeShop.name : userSession.displayName}</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>NextOrder Business User</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>{userSession.email}</div>
                    <div style={{ fontSize: '9px', color: '#888', marginTop: '12px' }}>NextOrder Live Tracking Platform</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '8px 0', margin: '8px 0' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Items Details:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <div>
                  <strong>{selectedOrderDetail.productName}</strong>
                  <span style={{ marginLeft: '10px', fontSize: '10px', color: '#000' }}>
                    (Size: {selectedOrderDetail.size}, Color: {selectedOrderDetail.color})
                  </span>
                </div>
                <div style={{ fontWeight: 'bold' }}>Qty: {selectedOrderDetail.quantity}</div>
              </div>
              <div style={{ borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span>Net Product Subtotal:</span>
                <span>৳ {selectedOrderDetail.price.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
                <span>Standard Delivery Charge:</span>
                <span>৳ {(selectedOrderDetail.deliveryCharge || 0).toLocaleString()}</span>
              </div>
            </div>

            {selectedOrderDetail.notes && (
              <div style={{ border: '1px solid #000', padding: '6px', fontSize: '9.5px', marginBottom: '8px', fontStyle: 'italic' }}>
                <strong>Fulfillment Instructions:</strong> {selectedOrderDetail.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>TOTAL CASH TO COLLECT (COD):</div>
              <div style={{ fontSize: '16px', fontWeight: '950', border: '2px solid #000', padding: '4px 8px' }}>
                ৳ {(selectedOrderDetail.price + (selectedOrderDetail.deliveryCharge || 0)).toLocaleString()}
              </div>
            </div>

            <div style={{ fontSize: '8px', color: '#777', textAlign: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '5px' }}>
              Thank you for ordering with NextOrder! Automated shipping label generated successfully.
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: IMAGE LIGHTBOX PREVIEW ================= */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl flex flex-col items-center justify-center overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all cursor-pointer z-35 shadow-md flex items-center justify-center"
                title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full max-h-[80vh] flex items-center justify-center bg-slate-950 rounded-2xl overflow-hidden p-1.5 border border-slate-800">
                <img
                  src={previewImage}
                  alt="Full-size order product attachment"
                  className="max-w-full max-h-[75vh] object-contain rounded-xl select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full py-2.5 px-3 flex items-center justify-between text-slate-400 text-xs">
                <span className="font-mono font-bold tracking-wide">
                  {lang === 'bn' ? 'প্রোডাক্ট ছবি ভিউয়ার' : 'IMAGE VIEWER'}
                </span>
                <span className="text-[10px] bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded font-black uppercase text-indigo-300">
                  {lang === 'bn' ? 'ইন-অ্যাপ লাইটবক্স' : 'In-App Lightbox'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
