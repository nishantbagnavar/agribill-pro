import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, Package, FileText, MessageCircle, BarChart2,
  Bell, Users, ArrowRight, CheckCircle, ChevronDown,
  Zap, Shield, Wifi
} from 'lucide-react';

/* ─── Floating hero preview card ─── */
function HeroCard() {
  return (
    <div
      className="relative rounded-2xl p-5 w-80 animate-float"
      style={{
        background: 'white',
        boxShadow: '0 24px 64px rgba(31,111,95,0.18)',
        border: '1px solid var(--green-100)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-100)' }}>
            <Leaf size={14} style={{ color: 'var(--primary-dark)' }} />
          </div>
          <span className="font-display font-600 text-sm" style={{ color: 'var(--primary-dark)' }}>AgriBill Pro</span>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          Live
        </span>
      </div>

      {/* KPI */}
      <div className="mb-4">
        <p className="text-xs font-body mb-0.5" style={{ color: 'var(--gray-500)' }}>Today's Sales</p>
        <p className="font-mono font-700 text-2xl" style={{ color: 'var(--gray-900)' }}>₹24,850</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>↑ 12% vs yesterday</p>
      </div>

      {/* Mini chart bars */}
      <div className="flex items-end gap-1 h-12 mb-4">
        {[35, 55, 40, 70, 50, 80, 65, 90, 72, 95, 60, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}%`,
              background: i === 11 ? 'var(--primary)' : 'var(--green-100)',
            }}
          />
        ))}
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--color-danger-bg)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} />
          <span className="text-xs font-body" style={{ color: 'var(--color-danger)' }}>3 Low Stock Alerts</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--color-warning-bg)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-warning)' }} />
          <span className="text-xs font-body" style={{ color: 'var(--color-warning)' }}>DAP Fertilizer: 2 bags left</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Features ─── */
const FEATURES = [
  {
    icon: Package,
    emoji: '📦',
    title: 'Smart Inventory',
    desc: 'Track every bag of fertilizer, seed, and pesticide by batch number and expiry date.',
    delay: 0,
  },
  {
    icon: FileText,
    emoji: '🧾',
    title: 'GST Billing',
    desc: 'Generate professional GST-compliant invoices with UPI QR code in seconds.',
    delay: 80,
  },
  {
    icon: MessageCircle,
    emoji: '📱',
    title: 'WhatsApp Integration',
    desc: 'Send bills and due reminders directly to customers via WhatsApp — no app needed.',
    delay: 160,
  },
  {
    icon: BarChart2,
    emoji: '📊',
    title: 'Sales Dashboard',
    desc: 'Visual analytics showing daily sales, top products, and category-wise revenue.',
    delay: 240,
  },
  {
    icon: Bell,
    emoji: '⏰',
    title: 'Smart Reminders',
    desc: 'Auto-alerts for low stock and expiry so you never lose a sale or waste stock.',
    delay: 320,
  },
  {
    icon: Users,
    emoji: '👥',
    title: 'Customer Profiles',
    desc: 'Manage dues, purchase history, and send payment reminders to each customer.',
    delay: 400,
  },
];

function FeatureCard({ icon: Icon, emoji, title, desc, delay }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl p-6 transition-all duration-300 group cursor-default"
      style={{
        background: 'white',
        border: '1px solid var(--gray-200)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--green-300)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = visible ? 'translateY(0)' : 'translateY(20px)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--gray-200)';
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl"
        style={{ background: 'var(--green-100)' }}
      >
        {emoji}
      </div>
      <h3 className="font-display font-600 text-base mb-2" style={{ color: 'var(--gray-900)' }}>{title}</h3>
      <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--gray-500)' }}>{desc}</p>
    </div>
  );
}

/* ─── How It Works ─── */
const STEPS = [
  { n: '01', title: 'Add Your Products', desc: 'Enter your inventory — fertilizers, seeds, pesticides. Set prices, GST rates, and stock alerts.', icon: Package },
  { n: '02', title: 'Create Bills Instantly', desc: 'Search products, add to cart, select customer. GST calculated automatically. Print or share PDF.', icon: FileText },
  { n: '03', title: 'Track Everything', desc: 'Dashboard shows daily sales, low stock alerts, and expiry warnings at a glance.', icon: BarChart2 },
  { n: '04', title: 'Send via WhatsApp', desc: 'Scan QR once. Then send bills and due reminders to any customer in one click.', icon: MessageCircle },
];

/* ─── Categories ─── */
const CATEGORIES = [
  { emoji: '🌿', name: 'Fertilizers', hindi: 'Khaad' },
  { emoji: '🌱', name: 'Seeds', hindi: 'Beej' },
  { emoji: '🐛', name: 'Pesticides', hindi: 'Keetnaashak' },
  { emoji: '🍄', name: 'Fungicides', hindi: 'Fungisaid' },
  { emoji: '🌾', name: 'Herbicides', hindi: 'Kharpatwar' },
  { emoji: '⚗️', name: 'Micronutrients', hindi: 'Sukhshma Poshan' },
  { emoji: '🔧', name: 'Farm Tools', hindi: 'Krishi Upkaran' },
  { emoji: '📦', name: 'Others', hindi: 'Anya' },
];

/* ─── Navbar ─── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.90)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--gray-200)' : 'none',
        boxShadow: scrolled ? 'var(--shadow-xs)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-100)' }}>
            <Leaf size={16} style={{ color: 'var(--primary-dark)' }} />
          </div>
          <span className="font-display font-700 text-base" style={{ color: 'var(--primary-dark)' }}>AgriBill Pro</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Categories'].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/ /g, '-')}`}
              className="font-body text-sm transition-colors hover:text-green-700"
              style={{ color: 'var(--gray-600)' }}
            >
              {link}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:block font-display font-500 text-sm px-4 py-2 rounded-lg transition-all hover:bg-gray-100"
            style={{ color: 'var(--gray-700)' }}
          >
            Login
          </Link>
          <Link
            to="/register"
            className="font-display font-600 text-sm px-4 py-2 rounded-lg text-white flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--primary-dark)' }}
          >
            Start Free
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Main Export ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen font-body" style={{ background: 'white' }}>
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="pt-32 pb-24 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #EDF8F2 0%, #FFFBEB 100%)' }}
      >
        {/* Grain texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="max-w-6xl mx-auto relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display font-500 mb-6"
                style={{ background: 'var(--green-100)', color: 'var(--primary-dark)', border: '1px solid var(--green-200)' }}
              >
                <Zap size={12} />
                Made for Indian Agriculture Shops
              </div>

              <h1
                className="font-display font-800 leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--gray-900)' }}
              >
                Apni Dukan Ka{' '}
                <span style={{ color: 'var(--primary-dark)' }}>Poora Hisaab</span>
                {' '}— Ek Jagah
              </h1>

              <p className="font-body text-lg mb-3 max-w-xl mx-auto lg:mx-0" style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>
                Complete inventory, billing &amp; WhatsApp automation for your agri-shop.
              </p>
              <p className="font-body text-sm mb-10 max-w-xl mx-auto lg:mx-0" style={{ color: 'var(--gray-400)' }}>
                Works <strong>offline</strong> · Zero monthly cost · Your data stays with you
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="h-12 px-8 rounded-xl font-display font-600 text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'var(--primary-dark)', boxShadow: '0 4px 14px rgba(31,111,95,0.35)' }}
                >
                  Start Free
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#how-it-works"
                  className="h-12 px-8 rounded-xl font-display font-500 flex items-center justify-center gap-2 transition-all hover:bg-white"
                  style={{ color: 'var(--gray-700)', border: '1px solid var(--gray-300)' }}
                >
                  ▶ How It Works
                </a>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-5 mt-10 justify-center lg:justify-start">
                {[
                  { icon: Shield, label: 'Data stays on your PC' },
                  { icon: Wifi, label: 'Works offline' },
                  { icon: Zap, label: 'No monthly fees' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon size={13} style={{ color: 'var(--primary)' }} />
                    <span className="text-xs font-body" style={{ color: 'var(--gray-500)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — floating card */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <HeroCard />
            </div>
          </div>
        </div>

        {/* Crop silhouette divider */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <path
              d="M0 60 L0 30 Q40 10 80 30 Q120 50 160 25 Q200 0 240 20 Q280 40 320 15 Q360 -5 400 18 Q440 40 480 22 Q520 5 560 25 Q600 45 640 20 Q680 -2 720 18 Q760 38 800 15 Q840 -8 880 20 Q920 45 960 22 Q1000 0 1040 25 Q1080 48 1120 20 Q1160 -5 1200 22 Q1240 45 1280 18 Q1320 -8 1360 25 Q1400 50 1440 30 L1440 60 Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-display font-600 uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              Features
            </p>
            <h2 className="font-display font-700 text-3xl" style={{ color: 'var(--gray-900)' }}>
              Everything your agri shop needs
            </h2>
            <p className="font-body mt-3 max-w-lg mx-auto" style={{ color: 'var(--gray-500)' }}>
              Built specifically for fertilizer and seed shop owners across rural India.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id="how-it-works"
        className="py-20 px-6"
        style={{ background: 'var(--green-50)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-display font-600 uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              How It Works
            </p>
            <h2 className="font-display font-700 text-3xl" style={{ color: 'var(--gray-900)' }}>
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STEPS.map(({ n, title, desc, icon: Icon }, i) => (
              <div key={n} className="flex gap-5 items-start">
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-display font-800 text-xl"
                  style={{ background: 'var(--green-100)', color: 'var(--primary-dark)' }}
                >
                  {n}
                </div>
                <div className="pt-1">
                  <h3 className="font-display font-600 text-base mb-1.5" style={{ color: 'var(--gray-900)' }}>{title}</h3>
                  <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--gray-500)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl font-display font-600 text-white transition-all hover:opacity-90"
              style={{ background: 'var(--primary-dark)' }}
            >
              Get Started Free
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section id="categories" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-display font-600 uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              Categories
            </p>
            <h2 className="font-display font-700 text-3xl" style={{ color: 'var(--gray-900)' }}>
              Covers your entire product range
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map(({ emoji, name, hindi }) => (
              <div
                key={name}
                className="rounded-xl p-5 text-center transition-all duration-200 hover:-translate-y-1 cursor-default"
                style={{
                  background: 'white',
                  border: '1px solid var(--gray-200)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div className="text-3xl mb-2">{emoji}</div>
                <p className="font-display font-600 text-sm" style={{ color: 'var(--gray-900)' }}>{name}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: 'var(--gray-400)' }}>{hindi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        className="py-16 px-6"
        style={{ background: 'linear-gradient(135deg, var(--primary-dark) 0%, #133D35 100%)' }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display font-700 text-2xl text-white mb-3">
            Ready to manage your shop smarter?
          </h2>
          <p className="font-body mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Free to use. No internet needed. 100% your data.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="h-12 px-8 rounded-xl font-display font-600 flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'var(--gold-500)', color: 'var(--gray-900)' }}
            >
              Start Free Setup
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="h-12 px-8 rounded-xl font-display font-500 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t" style={{ borderColor: 'var(--gray-200)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf size={16} style={{ color: 'var(--primary-dark)' }} />
            <span className="font-display font-600 text-sm" style={{ color: 'var(--primary-dark)' }}>AgriBill Pro</span>
            <span className="text-xs font-body" style={{ color: 'var(--gray-400)' }}>
              — For Bharat's Rural Entrepreneurs 🌾
            </span>
          </div>
          <p className="text-xs font-body" style={{ color: 'var(--gray-400)' }}>
            © {new Date().getFullYear()} AgriBill Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
