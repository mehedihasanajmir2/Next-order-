export type LanguageCode = 'en' | 'bn';

export interface LanguageDef {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageDef[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Top Bar
    title: "NextOrder Workspace",
    orders: "Orders Management",
    products: "Products Catalog",
    logOut: "Log Out",
    exitDemo: "Exit Demo Sandbox",
    demoBadge: "DEMO SANDBOX",
    liveBadge: "LIVE SYSTEM",
    searchPlaceholder: "Search orders by customer, phone or product...",
    searchProductsPlaceholder: "Search products by name or SKU...",
    statusAll: "All Statuses",
    statusPending: "Pending",
    statusProcessing: "Processing",
    statusShipped: "Shipped",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",
    filterTitle: "Filter by Status",

    // Stats
    statsTotalOrders: "Total Orders",
    statsPendingOrders: "Pending Orders",
    statsProcessingOrders: "Processing Orders",
    statsCompletedSales: "Completed Sales Value",
    statsActiveProducts: "Active Products",
    statsValueSuffix: "৳",

    // Orders Grid Headers
    colOrderRef: "ORDER REF",
    colCustomer: "CUSTOMER",
    colProduct: "PRODUCT",
    colPaidAmt: "COLLECTABLE VALUE",
    colStatus: "STATUS",
    colAction: "ACTION",

    // Order Card Labels
    phoneLabel: "Phone",
    addressLabel: "Address",
    sizeLabel: "Size",
    colorLabel: "Color",
    qtyLabel: "Quantity",
    chargeLabel: "Delivery Charge",
    notesLabel: "Notes",
    viewWorkspace: "View Workspace",
    quickSticker: "Quick Sticker",

    // Action Buttons
    btnNewOrder: "Record New Order",
    btnNewProduct: "Create New Product",
    btnClose: "Close",
    btnSaveOrder: "Register Order Record",
    btnSaveProduct: "Register Product",

    // Form Fields - Order
    formHeaderNewOrder: "Record New Order Logistics",
    formRecipientName: "Recipient Full Name",
    formRecipientPhone: "Recipient Contact Phone",
    formCourierAddress: "Full Destination Address",
    formSelectProduct: "Select Catalog Product",
    formCustomProductPlaceholder: "Or enter custom product name",
    formSelectProductValue: "Selected Product Name",
    formSpecifySize: "Specify Product Size",
    formSpecifyColor: "Specify Product Color Variant",
    formNetPrice: "Net Product Price (৳)",
    formDeliveryCharge: "Delivery Shipping Charge (৳)",
    formFulfillmentNotes: "Fulfillment Guidelines / Specific Notes",
    formNotesPlaceholder: "E.g. Call before delivery, handle with care...",
    formInitialStatus: "Initial Order Status",

    // Form Fields - Product
    formHeaderNewProduct: "Create New Catalog Product",
    formProductName: "Product Internal Name",
    formProductSku: "Unique Product SKU Number",
    formBasePrice: "Base Sells Price (৳)",
    formSizesHint: "Sizes (comma separated, e.g. M, L, XL, XXL)",
    formColorsHint: "Colors (comma separated, e.g. Red, Blue, Black)",

    // Detail Modal Workspace
    detailHeader: "Order Workspace",
    detailStatusRibbon: "Fulfillment Status",
    detailCourierTitle: "Customer Shipping Destination",
    detailCourierAddressLabel: "Courier Address",
    detailItemizationTitle: "Purchased Itemization",
    detailItemsSubtotal: "Items Subtotal Price",
    detailColCOD: "Collectable COD Surcharge",
    detailFulfillmentNotes: "Fulfillment Guidelines / Customer Notes",
    detailTransitionHub: "Transition Hub",
    detailOpenPending: "Open Pending",
    detailProcessing: "Processing",
    detailShipped: "Shipped",
    detailDelivered: "Delivered",
    detailCancelOrder: "Cancel Order Flow",
    detailPhysicalLabel: "Physical Courier Label",
    detailLiveStickerSetup: "Live Sticker Setup",
    detailStickerTitle: "NEXTORDER COURIER STICKER",
    detailRecipientInfo: "Recipient Information",
    detailTotalCollectable: "Total Collectable Cash-On-Delivery:",
    detailPrintSticker: "Print Sticker Label (4\"x6\")",
    detailDestroyOrder: "Destroy Order Record",
    detailCloseWorkspace: "Close Workspace",

    // Empty States / Toast / Alerts
    noOrdersFound: "No order records found in current timeline.",
    noProductsFound: "No catalog products registered yet.",
    loadingData: "Synchronizing business workspace metrics...",
    createFirstOrder: "Please register your first product under products tab, then capture customer logs.",
    savingState: "Saving changes to database...",
    deleteConfirm: "Are you sure you want to delete this?",
    successText: "Operation executed successfully"
  },
  bn: {
    // Top Bar
    title: "নেক্সটঅর্ডার ওয়ার্কস্পেস",
    orders: "অর্ডার ম্যানেজমেন্ট",
    products: "প্রোডাক্ট ক্যাটালগ",
    logOut: "লগ আউট করুন",
    exitDemo: "ডেমো স্যান্ডবক্স বন্ধ করুন",
    demoBadge: "ডেমো স্যান্ডবক্স",
    liveBadge: "লাইভ সিস্টেম",
    searchPlaceholder: "গ্রাহক, ফোন বা প্রোডাক্ট দিয়ে অর্ডার খুঁজুন...",
    searchProductsPlaceholder: "নাম বা SKU দিয়ে প্রোডাক্ট খুঁজুন...",
    statusAll: "সব অর্ডার",
    statusPending: "পেন্ডিং",
    statusProcessing: "প্রসেসিং",
    statusShipped: "শিপড",
    statusDelivered: "ডেলিভার্ড",
    statusCancelled: "বাতিল",
    filterTitle: "স্ট্যাটাস ফিল্টার করুন",

    // Stats
    statsTotalOrders: "মোট অর্ডার",
    statsPendingOrders: "পেন্ডিং অর্ডার",
    statsProcessingOrders: "প্রসেসিং অর্ডার",
    statsCompletedSales: "সফল বিক্রয় মূল্য",
    statsActiveProducts: "সক্রিয় প্রোডাক্ট",
    statsValueSuffix: "৳",

    // Orders Grid Headers
    colOrderRef: "অর্ডার আইডি",
    colCustomer: "গ্রাহক",
    colProduct: "প্রোডাক্ট",
    colPaidAmt: "সংগ্রহযোগ্য মূল্য",
    colStatus: "স্ট্যাটাস",
    colAction: "অ্যাকশন",

    // Order Card Labels
    phoneLabel: "ফোন",
    addressLabel: "ঠিকানা",
    sizeLabel: "সাইজ",
    colorLabel: "কালার",
    qtyLabel: "পরিমাণ",
    chargeLabel: "ডেলিভারি চার্জ",
    notesLabel: "নোটস",
    viewWorkspace: "ওয়ার্কস্পেস দেখুন",
    quickSticker: "কুইক স্টিকার",

    // Action Buttons
    btnNewOrder: "নতুন অর্ডার লিখুন",
    btnNewProduct: "নতুন প্রোডাক্ট তৈরি করুন",
    btnClose: "বন্ধ করুন",
    btnSaveOrder: "অর্ডার রেজিস্টার করুন",
    btnSaveProduct: "প্রোডাক্ট রেজিস্টার করুন",

    // Form Fields - Order
    formHeaderNewOrder: "নতুন অর্ডারের তথ্য সংরক্ষণ",
    formRecipientName: "গ্রাহকের পুরো নাম",
    formRecipientPhone: "গ্রাহকের মোবাইল নম্বর",
    formCourierAddress: "ডেলিভারির সম্পূর্ণ ঠিকানা",
    formSelectProduct: "ক্যাটালগ প্রোডাক্ট নির্বাচন করুন",
    formCustomProductPlaceholder: "অথবা কাস্টম প্রোডাক্ট নাম লিখুন",
    formSelectProductValue: "নির্বাচিত প্রোডাক্টের নাম",
    formSpecifySize: "প্রোডাক্টের সাইজ উল্লেখ করুন",
    formSpecifyColor: "প্রোডাক্টের কালার উল্লেখ করুন",
    formNetPrice: "প্রোডাক্টের নেট মূল্য (৳)",
    formDeliveryCharge: "ডেলিভারি শিপিং চার্জ (৳)",
    formFulfillmentNotes: "ডেলিভারি নির্দেশিকা / বিশেষ নোট",
    formNotesPlaceholder: "যেমন: ডেলিভারির আগে কল করুন, সাবধানে হ্যান্ডেল করুন...",
    formInitialStatus: "প্রারম্ভিক অর্ডার স্ট্যাটাস",

    // Form Fields - Product
    formHeaderNewProduct: "ক্যাটালের জন্য নতুন প্রোডাক্ট",
    formProductName: "প্রোডাক্টের নাম",
    formProductSku: "ইউনিক প্রোডাক্ট SKU নম্বর",
    formBasePrice: "বিক্রয় মূল্য (৳)",
    formSizesHint: "সাইজসমূহ (কমা দিয়ে লিখুন, যেমন: M, L, XL, XXL)",
    formColorsHint: "কালারসমূহ (কমা দিয়ে লিখুন, যেমন: Red, Blue, Black)",

    // Detail Modal Workspace
    detailHeader: "অর্ডার ওয়ার্কস্পেস",
    detailStatusRibbon: "ডেলিভারি স্ট্যাটাস",
    detailCourierTitle: "গ্রাহকের ডেলিভারি ঠিকানা",
    detailCourierAddressLabel: "কুরিয়ার ঠিকানা",
    detailItemizationTitle: "অর্ডারের বিবরণ",
    detailItemsSubtotal: "প্রোডাক্ট সাবটোটাল মূল্য",
    detailColCOD: "মোট সংগ্রহযোগ্য টাকা (ডেলিভারি চার্জসহ)",
    detailFulfillmentNotes: "ডেলিভারি নির্দেশিকা / কাস্টমার নোট",
    detailTransitionHub: "স্ট্যাটাস পরিবর্তন হাব",
    detailOpenPending: "পেন্ডিং করুন",
    detailProcessing: "প্রসেসিং করুন",
    detailShipped: "শিপড করুন",
    detailDelivered: "ডেলিভার্ড করুন",
    detailCancelOrder: "অর্ডার বাতিল করুন",
    detailPhysicalLabel: "ফিজিক্যাল কুরিয়ার লেবেল",
    detailLiveStickerSetup: "লাইভ স্টিকার সেটআপ",
    detailStickerTitle: "নেক্সটঅর্ডার কুরিয়ার স্টিকার",
    detailRecipientInfo: "গ্রাহকের তথ্য",
    detailTotalCollectable: "মোট সংগ্রহযোগ্য ক্যাশ-অন-ডেলিভারি:",
    detailPrintSticker: "স্টিকার প্রিন্ট করুন (৪\"x৬\")",
    detailDestroyOrder: "অর্ডার রেকর্ড ডিলিট করুন",
    detailCloseWorkspace: "ওয়ার্কস্পেস বন্ধ করুন",

    // Empty States / Toast / Alerts
    noOrdersFound: "বর্তমান তালিকায় কোনো মেলা অর্ডার রেকর্ড পাওয়া যায়নি।",
    noProductsFound: "এখনও কোনো প্রোডাক্ট ক্যাটালগে যুক্ত করা হয়নি।",
    loadingData: "ব্যবসায়িক ওয়ার্কস্পেস লোড হচ্ছে...",
    createFirstOrder: "অনুগ্রহ করে প্রথমে প্রোডাক্ট ট্যাব থেকে একটি প্রোডাক্ট যোগ করুন, এরপর কাস্টমারের অর্ডার যুক্ত করুন।",
    savingState: "ডাটাবেজে তথ্য সংরক্ষণ করা হচ্ছে...",
    deleteConfirm: "আপনি কি নিশ্চিত যে এটি ডিলিট করতে চান?",
    successText: "কাজটি সফলভাবে সম্পন্ন হয়েছে"
  }
};
