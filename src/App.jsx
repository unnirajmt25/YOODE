import React, { useState, useMemo } from 'react';
import { Settings, Download, Search, Layers, Scissors, Check, X, Shield, Users, Building, Zap, ShoppingCart } from 'lucide-react';
import './index.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PLACEMENTS = [
    { id: 'front', label: 'Front' },
    { id: 'back', label: 'Back' },
    { id: 'left_sleeve', label: 'Left Sleeve' },
    { id: 'right_sleeve', label: 'Right Sleeve' }
];

const ADD_ONS = ['DTG', 'DTF', 'Screen Print', 'Embroidery (Standard)', 'Embroidery (Coloreel)'];

const SIZES = [
    { id: '36', label: '36 - XS' },
    { id: '38', label: '38 - S' },
    { id: '40', label: '40 - M' },
    { id: '42', label: '42 - L' },
    { id: '44', label: '44 - XL' },
    { id: '46', label: '46 - 2XL' },
    { id: '48', label: '48 - 3XL' },
    { id: '50', label: '50 - 4XL' },
    { id: '52', label: '52 - 5XL' },
    { id: '54', label: '54 - 6XL' },
];

const CONFIG = {
    'Retail': { base: 699, rates: { 'DTG': 1.2, 'DTF': 0.8, 'Screen Print': 5, 'Embroidery (Standard)': 0.05, 'Embroidery (Coloreel)': 0.07 }, minCharge: { 'DTG': 120, 'DTF': 60 } },
    'Corporate': { base: 560, rates: { 'DTG': 1.1, 'DTF': 0.5, 'Screen Print': 4.5, 'Embroidery (Standard)': 0.04, 'Embroidery (Coloreel)': 0.06 }, minCharge: { 'DTG': 80, 'DTF': 40 } },
    'Reseller': { base: 532, rates: { 'DTG': 1.0, 'DTF': 0.4, 'Screen Print': 4, 'Embroidery (Standard)': 0.03, 'Embroidery (Coloreel)': 0.05 }, minCharge: { 'DTG': 50, 'DTF': 30 } }
};

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginError, setLoginError] = useState('');

    const [customerType, setCustomerType] = useState('Retail');
    const [product, setProduct] = useState('Women Amid Crew Neck');
    const [style, setStyle] = useState('Basic T-Shirt');
    const [quantity, setQuantity] = useState(10);
    const [selectedSize, setSelectedSize] = useState('40');

    const [placements, setPlacements] = useState(
        PLACEMENTS.reduce((acc, p) => ({ ...acc, [p.id]: { active: false, type: 'DTG', width: 4, height: 4, colours: 1, stitches: 16000 } }), {})
    );
    const [cart, setCart] = useState([]);

    const handlePlacementChange = (id, field, value) => {
        setPlacements(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const currentConfig = CONFIG[customerType];
    const basePrice = currentConfig.base;

    // Helper to calculate raw cost of an addon type without state dependencies loops
    const calculateCostForType = (type, width, height, colours, stitches) => {
        const area = width * height;
        const rate = currentConfig.rates[type] || 0;
        let cost = 0;

        if (type.includes('Embroidery')) {
            cost = stitches * rate;
        } else if (type === 'Screen Print') {
            cost = area * rate * colours;
        } else {
            cost = area * rate;
            const min = currentConfig.minCharge?.[type] || 0;
            if (cost < min) cost = min;
        }
        return cost;
    };

    const calculatedPlacements = useMemo(() => {
        return Object.entries(placements).map(([id, data]) => {
            if (!data.active) return { id, ...data, area: 0, setup: 0, cost: 0 };

            const area = data.width * data.height;
            const cost = calculateCostForType(data.type, data.width, data.height, data.colours, data.stitches);
            let setup = (data.type === 'Screen Print' && quantity < 100) ? 500 : 0;

            return { id, ...data, area, setup, cost };
        });
    }, [placements, customerType, quantity]);
    //test
    const addOnTotals = calculatedPlacements.reduce((sum, p) => sum + p.cost, 0);
    const totalSetup = calculatedPlacements.reduce((sum, p) => sum + p.setup, 0);
    const pricePerItem = basePrice + addOnTotals;
    const grandTotal = (pricePerItem * quantity) + totalSetup;

    const handleAddToCart = () => {
        const newItem = {
            id: Date.now(),
            customerType,
            product,
            style,
            quantity,
            size: SIZES.find(s => s.id === selectedSize)?.label,
            placements: calculatedPlacements.filter(p => p.active),
            basePrice,
            pricePerItem,
            totalSetup,
            grandTotal
        };
        setCart([...cart, newItem]);
        // Optional: Reset placements to default after adding to cart
        setPlacements(PLACEMENTS.reduce((acc, p) => ({ ...acc, [p.id]: { active: false, type: 'DTG', width: 4, height: 4, colours: 1, stitches: 16000 } }), {}));
    };

    const handleDownloadQuote = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("YOODE - Order Quote", 14, 22);

        doc.setFontSize(11);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
        doc.text(`Customer Tier: ${customerType}`, 14, 38);

        let finalOrderTotal = 0;

        const tableData = cart.map((item, index) => {
            finalOrderTotal += item.grandTotal;
            let customPrints = item.placements.map(p => `${p.label} (${p.type})`).join(", ") || "None";

            return [
                index + 1,
                `${item.product}\n${item.style}`,
                item.size,
                item.quantity,
                customPrints,
                `INR ${item.grandTotal.toFixed(2)}`
            ];
        });

        doc.autoTable({
            startY: 45,
            head: [['#', 'Product', 'Size', 'Qty', 'Decorations', 'Total']],
            body: tableData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [0, 0, 0] }
        });

        const finalY = doc.lastAutoTable.finalY || 45;
        doc.setFontSize(14);
        doc.text(`Grand Total: INR ${finalOrderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 15);

        doc.save("YOODE_Quote.pdf");
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError('');

        if (loginUser === 'unnirajmt@gmail.com' && loginPass === '123') {
            setIsLoggedIn(true);
        } else {
            setLoginError('Invalid username or password');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div className="logo" style={{ justifyContent: 'center', marginBottom: '1rem', fontSize: '1.75rem' }}>
                            <Layers className="text-accent" />
                            <span>YOODE</span>
                        </div>
                        <h2 className="panel-title" style={{ marginBottom: '0.5rem' }}>Partner Portal</h2>
                        <p className="panel-subtitle">Sign in to access the pricing calculator.</p>
                    </div>

                    {loginError && (
                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                            {loginError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>Username</label>
                            <input
                                type="text"
                                value={loginUser}
                                onChange={(e) => setLoginUser(e.target.value)}
                                className="glass-input"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>Password</label>
                            <input
                                type="password"
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                className="glass-input"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                        <button type="submit" className="action-btn w-full" style={{ marginTop: '0.5rem' }}>
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="logo">
                    <Layers className="text-accent" />
                    <span>YOODE</span>
                </div>
                <nav>
                    <button className="nav-btn active">Calculator</button>
                    <button className="nav-btn">Catalog</button>
                    <button className="nav-btn" onClick={() => { setIsLoggedIn(false); setLoginPass(''); setLoginUser(''); }}>Logout</button>
                </nav>
            </header>

            <main className="main-content">
                <div className="dashboard-grid">
                    {/* LEFT: Config Panel */}
                    <div className="panel config-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">Apparel Price Calculator</h2>
                            <p className="panel-subtitle">Simple quote builder for product, quantity and print setup.</p>
                        </div>

                        <div className="input-group">
                            <label>Customer Type</label>
                            <div className="customer-type-selector">
                                {['Retail', 'Corporate', 'Reseller'].map(type => (
                                    <button
                                        key={type}
                                        className={`type-btn ${customerType === type ? 'active' : ''}`}
                                        onClick={() => setCustomerType(type)}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="input-group">
                                <label>Product</label>
                                <input
                                    type="text"
                                    value={product}
                                    onChange={(e) => setProduct(e.target.value)}
                                    className="glass-input"
                                />
                            </div>
                            <div className="input-group">
                                <label>Style</label>
                                <input
                                    type="text"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    className="glass-input"
                                />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="input-group">
                                <label>Size</label>
                                <select
                                    value={selectedSize}
                                    onChange={(e) => setSelectedSize(e.target.value)}
                                    className="glass-select"
                                >
                                    {SIZES.map(size => (
                                        <option key={size.id} value={size.id}>
                                            {size.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Quantity</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    min="1"
                                    className="glass-input"
                                />
                            </div>
                        </div>

                        <div className="divider" />

                        <div className="panel-header">
                            <h3 className="section-title">Print Placements</h3>
                            <p className="panel-subtitle">Select any placement and choose one decoration method for each.</p>
                        </div>

                        <div className="placements-grid">
                            {PLACEMENTS.map(plc => {
                                const data = placements[plc.id];
                                const activeCost = calculatedPlacements.find(p => p.id === plc.id)?.cost || 0;

                                return (
                                    <div key={plc.id} className={`placement-card ${data.active ? 'active' : ''}`}>
                                        <div className="placement-header" onClick={() => handlePlacementChange(plc.id, 'active', !data.active)}>
                                            <div className="custom-checkbox">
                                                {data.active && <Check size={14} />}
                                            </div>
                                            <span className="placement-label">{plc.label}</span>
                                            {data.active && <span className="placement-cost">+₹{activeCost.toFixed(0)}/pc</span>}
                                        </div>

                                        {data.active && (
                                            <div className="placement-body">
                                                {!data.type.includes('Embroidery') ? (
                                                    <div>
                                                        <div className="dims-grid">
                                                            <div>
                                                                <label>Width (in)</label>
                                                                <input type="number" min="0.1" step="0.1" value={data.width} onChange={(e) => handlePlacementChange(plc.id, 'width', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div>
                                                                <label>Height (in)</label>
                                                                <input type="number" min="0.1" step="0.1" value={data.height} onChange={(e) => handlePlacementChange(plc.id, 'height', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                        </div>
                                                        <div className="area-calc">Area: {(data.width * data.height).toFixed(2)} sq.in</div>
                                                    </div>
                                                ) : (
                                                    <div className="dims-grid">
                                                        <div>
                                                            <label>Stitch Count</label>
                                                            <input type="number" step="1000" value={data.stitches} onChange={(e) => handlePlacementChange(plc.id, 'stitches', parseInt(e.target.value) || 0)} />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="radio-list">
                                                    {ADD_ONS.map(addon => {
                                                        const isSelected = data.type === addon;
                                                        const isEmbroidery = addon.includes('Embroidery');

                                                        // Fallback dimensions for previewing cost of other options
                                                        const dynamicCost = calculateCostForType(
                                                            addon,
                                                            isEmbroidery ? 4 : data.width,
                                                            isEmbroidery ? 4 : data.height,
                                                            data.colours,
                                                            isEmbroidery ? data.stitches : 16000
                                                        );

                                                        return (
                                                            <div
                                                                key={addon}
                                                                className={`radio-item ${isSelected ? 'active' : ''}`}
                                                                onClick={() => handlePlacementChange(plc.id, 'type', addon)}
                                                            >
                                                                <div className="radio-label">
                                                                    <div className="radio-circle"></div>
                                                                    <span>{addon}</span>
                                                                </div>
                                                                <span className="radio-price">₹{dynamicCost.toFixed(0)}/pc</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {data.type === 'Screen Print' && (
                                                    <div className="dims-grid mt-4" style={{ marginTop: '1rem' }}>
                                                        <div>
                                                            <label>Number of Colours</label>
                                                            <input type="number" min="1" value={data.colours} onChange={(e) => handlePlacementChange(plc.id, 'colours', parseInt(e.target.value) || 1)} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid-2 mt-6">
                            <button className="action-btn btn-secondary w-full" onClick={() => setPlacements(PLACEMENTS.reduce((acc, p) => ({ ...acc, [p.id]: { active: false, type: 'DTG', width: 4, height: 4, colours: 1, stitches: 16000 } }), {}))}>
                                Reset Form
                            </button>
                            <button className="action-btn btn-primary w-full" onClick={handleAddToCart}>
                                <ShoppingCart className="inline-icon" />
                                Save to Cart
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: Summary Panel */}
                    <div className="summary-card">
                        <div className="panel config-panel">
                            <div className="panel-header">
                                <h2 className="summary-title">Price Summary</h2>
                                <p className="summary-subtitle">Invoice-style breakdown in INR.</p>
                            </div>

                            <div className="summary-row space-between">
                                <span>Base unit price</span>
                                <span>₹{basePrice.toFixed(2)}</span>
                            </div>
                            <div className="summary-row space-between mt-2">
                                <span>Quantity matched</span>
                                <span>{quantity}x ({SIZES.find(s => s.id === selectedSize)?.label})</span>
                            </div>
                            <div className="summary-row space-between mt-2">
                                <span>Customer tier used</span>
                                <span className="text-highlight">{customerType}</span>
                            </div>

                            {calculatedPlacements.filter(p => p.active).length > 0 && (
                                <div className="add-on-list">
                                    <div className="text-lg font-600 mb-2">Decoration charges</div>
                                    <br />
                                    {calculatedPlacements.filter(p => p.active).map(p => (
                                        <div key={p.id} className="add-on-row">
                                            <div className="add-on-details">
                                                <span className="add-on-label">{p.label} - {p.type}</span>
                                                {p.type.includes('Embroidery') ? (
                                                    <span className="add-on-meta">{p.stitches} stitches</span>
                                                ) : (
                                                    <span className="add-on-meta">W {p.width} x H {p.height} ({p.area.toFixed(2)} sq in)</span>
                                                )}
                                                {p.setup > 0 && <span className="add-on-meta text-warning">Setup Fee Applied: ₹{p.setup}</span>}
                                            </div>
                                            <span className="add-on-cost">₹{p.cost.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="divider"></div>

                            <div className="summary-row space-between">
                                <span>Decoration per piece</span>
                                <span>₹{addOnTotals.toFixed(2)}</span>
                            </div>

                            {totalSetup > 0 && (
                                <div className="summary-row space-between mt-2 text-warning">
                                    <span>Total setup cost</span>
                                    <span>₹{totalSetup.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="summary-row space-between text-lg mt-4">
                                <span>Total unit price</span>
                                <span className="text-highlight">₹{pricePerItem.toFixed(2)}</span>
                            </div>

                            <div className="total-block mt-6">
                                <div className="total-block-row">
                                    <span>Grand total ({quantity} pcs)</span>
                                </div>
                                <div className="total-block-row">
                                    <span className="total-amount">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {cart.length > 0 && (
                            <div className="panel config-panel mt-6" style={{ marginTop: '2rem' }}>
                                <div className="panel-header">
                                    <h2 className="summary-title" style={{ fontSize: '1.25rem' }}>Order Cart ({cart.length})</h2>
                                </div>
                                {cart.map((item, i) => (
                                    <div key={item.id} className="summary-row space-between mt-2" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700' }}>{item.quantity}x {item.product}</span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.size} • {item.placements.length} Prints</span>
                                        </div>
                                        <span className="text-highlight">₹{item.grandTotal.toFixed(2)}</span>
                                    </div>
                                ))}

                                <div className="total-block mt-4">
                                    <div className="total-block-row">
                                        <span style={{ color: '#a1a1aa' }}>Total Cart Value</span>
                                    </div>
                                    <div className="total-block-row">
                                        <span className="total-amount" style={{ fontSize: '1.8rem' }}>₹{cart.reduce((s, i) => s + i.grandTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                <button className="action-btn btn-primary w-full" style={{ marginTop: '1.5rem' }} onClick={handleDownloadQuote}>
                                    <Download className="inline-icon" />
                                    Download Final PDF Quote
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
