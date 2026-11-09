import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clock3, Crown, Instagram, Menu, Scissors, ShieldCheck,
  Sparkles, Star, UserRound, UsersRound, Wallet, MessageCircle, X, Youtube,
} from 'lucide-react';
import { fallbackServices, hasBackend, money, Service, supabase } from './lib/api';

type Screen = 'home' | 'booking' | 'owner';
type Hours = Record<string, { open: string | null; close: string | null }>;
type Booking = {
  id: string; customer_name: string; phone: string; appointment_date: string;
  start_time: string; end_time: string; amount: number; status: string;
  source: string; is_paid: boolean; notes: string; service_id: string; whatsapp_opt_in: boolean;
  services?: { name: string };
};
type Review = { id: string; customer_name: string; rating: number; body: string; is_published: boolean; created_at: string };
type Slot = { start: string; end: string; label: string };

const initialHours: Hours = {
  '0': { open: null, close: null }, '1': { open: '09:00', close: '17:00' },
  '2': { open: '09:00', close: '17:00' }, '3': { open: '09:00', close: '17:00' },
  '4': { open: '09:00', close: '17:00' }, '5': { open: '09:00', close: '17:00' },
  '6': { open: '09:00', close: '15:00' },
};
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const photos = [
  ['Soft taper finish', '/images/portfolio/tyler-cut-01.webp'],
  ['Detail line fade', '/images/portfolio/tyler-cut-02.webp'],
  ['Clean silver taper', '/images/portfolio/tyler-cut-03.webp'],
  ['Curved line design', '/images/portfolio/tyler-cut-04.webp'],
  ['Skin fade and beard', '/images/portfolio/tyler-cut-05.webp'],
];

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function timeLabel(time: string) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
}
function whatsappNumber(value: string) {
  const compact = value.replace(/[\s().-]/g, '');
  if (/^07\d{9}$/.test(compact)) return '44' + compact.slice(1);
  if (/^\+447\d{9}$/.test(compact)) return compact.slice(1);
  if (/^00447\d{9}$/.test(compact)) return compact.slice(2);
  if (/^447\d{9}$/.test(compact)) return compact;
  return null;
}
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(location.hash.replace('#', '') === 'owner' ? 'owner' : location.hash.replace('#', '') === 'booking' ? 'booking' : 'home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const onHash = () => {
      const next = location.hash.replace('#', '');
      setScreen(next === 'owner' || next === 'booking' ? next : 'home');
      setMenuOpen(false);
      if (!next || next === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHash);
    if (supabase) {
      supabase.from('services').select('id,name,price,duration_minutes,description,is_active').eq('is_active', true).order('sort_order').then(({ data }) => { if (data?.length) setServices(data as Service[]); });
      supabase.from('reviews').select('id,customer_name,rating,body,created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(3).then(({ data }) => { if (data) setReviews(data); });
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (where: Screen) => { location.hash = where === 'home' ? '' : where; setScreen(where); setMenuOpen(false); };
  return <>
    <header className="topbar">
      <a className="brand" href="#home" onClick={() => go('home')} aria-label="Tyler the Barber home">
        <span className="brand-crown"><Crown size={28} strokeWidth={1.3} /></span>
        <span className="brand-script">Tyler the Barber</span>
        <span className="brand-sub">BARBERING</span>
      </a>
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
        <a href="#home" onClick={() => go('home')}>Home</a>
        <a href="#services" onClick={() => { go('home'); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); }}>Services</a>
        <a href="#gallery" onClick={() => { go('home'); document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }}>Gallery</a>
        <a href="#reviews" onClick={() => { go('home'); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }}>Reviews</a>
        <a href="#about" onClick={() => { go('home'); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }}>About</a>
        <a href="#contact" onClick={() => { go('home'); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>Contact</a>
      </nav>
      <button className="button button-gold header-book" onClick={() => go('booking')}><CalendarDays size={17} /> Book appointment</button>
    </header>

    {screen === 'home' && <Home services={services} reviews={reviews} onBook={() => go('booking')} />}
    {screen === 'booking' && <BookingPage services={services} onBack={() => go('home')} />}
    {screen === 'owner' && <OwnerPage services={services} />}
  </>;
}

function Home({ services, reviews, onBook }: { services: Service[]; reviews: any[]; onBook: () => void }) {
  return <main>
    <section className="hero">
      <div className="hero-photo" />
      <div className="hero-content">
        <p className="eyebrow">Precision cuts · Personal service</p>
        <h1>LOOK SHARP.<br /><em>FEEL GREAT.</em></h1>
        <p className="hero-copy">Fresh cuts. Clean fades. A proper barber experience.</p>
        <button className="button button-gold hero-button" onClick={onBook}>Book your appointment <ChevronRight size={21} /></button>
        <div className="hero-tags"><span>Haircuts</span><b>·</b><span>Fades</span><b>·</b><span>Beard trims</span><b>·</b><span>Kids cuts</span></div>
      </div>
      <div className="hero-emblem"><Crown size={68} strokeWidth={1.2} /></div>
      <a className="scroll-hint" href="#services" aria-label="Scroll to services"><ArrowDown size={18} /></a>
    </section>

    <section className="services-strip section-dark" id="services">
      <SectionTitle>Our services</SectionTitle>
      <div className="service-grid">
        {services.map((s, i) => {
          const Icon = [Scissors, Sparkles, UserRound, UsersRound][i % 4];
          return <article className="service-item" key={s.id}><Icon size={37} strokeWidth={1.45} /><h3>{s.name}</h3><p>{money(s.price)}</p></article>;
        })}
      </div>
    </section>

    <section className="gallery-section" id="gallery">
      <SectionTitle>Fresh work</SectionTitle>
      <p className="section-intro">A few looks, finished with care.</p>
      <div className="gallery-grid">{photos.map(([name, src], i) => <figure className={`gallery-card gallery-${i + 1}`} key={name}><img src={src} alt={`${name} barber haircut`} loading="lazy" /><figcaption>{name}</figcaption></figure>)}</div>
    </section>

    <section className="price-section section-dark" id="price-list">
      <SectionTitle>Price list</SectionTitle>
      <p className="section-intro">Straightforward prices. No surprises.</p>
      <div className="price-list">{services.map(s => <div className="price-row" key={s.id}><span>{s.name}</span><i /><strong>{money(s.price)}</strong></div>)}</div>
      <button className="button button-outline" onClick={onBook}>Choose a service <ArrowRight size={17} /></button>
    </section>

    <section className="about-section" id="about">
      <div className="about-image" role="img" aria-label="Barber chair in a modern barbershop" />
      <div className="about-copy"><p className="eyebrow">The barber behind the chair</p><h2>Good cuts.<br /><em>Good energy.</em></h2><p>Every appointment is about more than a quick trim. Take a seat, tell me what you're after, and leave feeling like yourself at your best.</p><p>From kids' first cuts to a fresh fade and beard tidy, you’re always welcome.</p><button className="text-button" onClick={onBook}>Come in for a cut <ArrowRight size={18} /></button></div>
    </section>

    <section className="reviews-section section-dark" id="reviews">
      <SectionTitle>What clients say</SectionTitle>
    {reviews.length ? <div className="review-grid">{reviews.map(r => <article className="review-card" key={r.id}><div className="stars">{'★'.repeat(r.rating || 5)}</div><p>“{r.body}”</p><span>— {r.customer_name}</span></article>)}</div> : <div className="review-empty"><div className="stars">★★★★★</div><h3>Your next great cut starts here.</h3><p>Book in, enjoy the chair, and share your review after your visit.</p><button className="text-button" onClick={onBook}>Book your first visit <ArrowRight size={17} /></button></div>}
    <ReviewForm />
    </section>

    <section className="appointment-banner">
      <div className="banner-crown"><Crown size={62} strokeWidth={1.25} /></div>
      <div className="banner-copy"><h2>BOOK YOUR APPOINTMENT <em>TODAY</em></h2><p>Step up your style.</p></div>
      <button className="button button-gold" onClick={onBook}><CalendarDays size={17} /> Book now</button>
    </section>

    <footer id="contact" className="footer">
      <div className="footer-social"><a href="https://facebook.com/Tylerthebabrer" target="_blank" rel="noreferrer" aria-label="Facebook">f</a><a href="https://instagram.com/Tylerthebarber" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={21} /></a><a href="https://tiktok.com/@Tylerthebarber" target="_blank" rel="noreferrer" aria-label="TikTok">♪</a></div>
      <p>Tyler the Barber · Fresh cuts. Sharp style.</p>
      <div className="footer-links"><a href="https://facebook.com/Tylerthebabrer" target="_blank" rel="noreferrer">Facebook</a><a href="https://instagram.com/Tylerthebarber" target="_blank" rel="noreferrer">Instagram</a><a href="https://tiktok.com/@Tylerthebarber" target="_blank" rel="noreferrer">TikTok</a><a href="#owner">Owner login</a></div>
      <span className="copyright">© {new Date().getFullYear()} Tyler the Barber</span>
    </footer>
  </main>;
}

function ReviewForm() {
  const [name, setName] = useState(''); const [body, setBody] = useState(''); const [rating, setRating] = useState(5); const [message, setMessage] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage('');
    if (!supabase) { setMessage('Reviews will be available once the site is connected.'); return; }
    const { error } = await supabase.from('reviews').insert({ customer_name: name.trim(), rating, body: body.trim(), is_published: false });
    setMessage(error ? 'Could not send that review just now.' : 'Thanks — your review has been sent to Tyler for approval.');
    if (!error) { setName(''); setBody(''); setRating(5); }
  }
  return <details className="leave-review"><summary>Leave a review</summary><form onSubmit={submit} className="review-form"><label className="field-label">Your name<input required value={name} onChange={e => setName(e.target.value)} placeholder="First name" /></label><label className="field-label">Your rating<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}</select></label><label className="field-label">Your review<textarea required minLength={8} maxLength={800} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="How was your visit?" /></label><button className="button button-outline">Send review <ArrowRight size={15} /></button>{message && <p className="review-message">{message}</p>}</form></details>;
}

function SectionTitle({ children }: { children: string }) { return <div className="section-title"><span /><h2>{children}</h2><span /></div>; }

function BookingPage({ services, onBack }: { services: Service[]; onBack: () => void }) {
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState(localToday());
  const [busy, setBusy] = useState<{ start_time: string; end_time: string }[]>([]);
  const [hours, setHours] = useState<Hours>(initialHours);
  const [reviewRows, setReviewRows] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const service = services.find(s => s.id === serviceId) || services[0];

  useEffect(() => {
    setSelected(''); setMessage('');
    if (!supabase) return;
    Promise.all([
      supabase.from('barber_settings').select('opening_hours').eq('id', true).single(),
      supabase.rpc('get_busy_slots', { p_day: date }),
    ]).then(([settings, slots]) => {
      if (settings.data?.opening_hours) setHours(settings.data.opening_hours as Hours);
      setBusy(slots.data || []);
    });
  }, [date]);

  const available = useMemo(() => {
    if (!service) return [];
    const day = new Date(`${date}T12:00:00`).getDay();
    const hoursToday = hours[String(day)];
    if (!hoursToday?.open || !hoursToday.close) return [];
    const startLimit = Number(hoursToday.open.slice(0, 2)) * 60 + Number(hoursToday.open.slice(3));
    const closeLimit = Number(hoursToday.close.slice(0, 2)) * 60 + Number(hoursToday.close.slice(3));
    const out: Slot[] = [];
    for (let m = startLimit; m + service.duration_minutes <= closeLimit; m += service.duration_minutes) {
      const start = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const end = addMinutes(start, service.duration_minutes);
      if (busy.some(slot => start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5))) continue;
      if (date === localToday() && start <= new Date().toTimeString().slice(0, 5)) continue;
      out.push({ start, end, label: timeLabel(start) });
    }
    return out;
  }, [date, hours, busy, service]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setMessage('');
    if (!supabase || !service || !selected) { setMessage('Choose a time to continue.'); return; }
    setLoading(true);
    const slot = available.find(s => s.start === selected);
    if (!slot) { setLoading(false); setMessage('That time has just been taken. Please choose another.'); return; }
    const { error } = await supabase.from('appointments').insert({
      customer_name: form.name.trim(), phone: form.phone.trim(), service_id: service.id,
      appointment_date: date, start_time: slot.start, end_time: slot.end,
      amount: service.price, status: 'confirmed', source: 'online', whatsapp_opt_in: whatsappConsent,
    });
    setLoading(false);
    if (error) { setMessage(error.message.includes('duplicate') ? 'That time has just been booked. Pick another.' : 'Could not place the booking. Please try another time or contact Tyler.'); return; }
    setSuccess(true);
  }

  return <main className="subpage booking-page"><div className="subpage-head"><button className="back-link" onClick={onBack}><ChevronLeft size={18} /> Back to home</button><p className="eyebrow">Your next fresh cut</p><h1>Book an <em>appointment.</em></h1><p>Pick a service, choose a free time, and you’re all set.</p></div>
    {!hasBackend ? <div className="setup-notice"><ShieldCheck size={20} /><div><strong>Online booking is being set up.</strong><p>The VPS booking API needs to be connected before appointments can be saved. Contact Tyler to book for now.</p></div></div> : success ? <div className="booking-success"><div className="success-icon"><Check size={30} /></div><p className="eyebrow">You're booked in</p><h2>See you soon, {form.name.split(' ')[0]}.</h2><p>{service?.name} · {formatDate(date)} at {timeLabel(selected)}</p><p>{whatsappConsent ? 'Tyler will send your WhatsApp reminder manually.' : 'Your booking is confirmed.'}</p><button className="button button-gold" onClick={onBack}>Back to home</button></div> : <div className="booking-layout"><form className="booking-form" onSubmit={submit}>
      <label className="field-label">Choose your service<select value={serviceId} onChange={e => setServiceId(e.target.value)}>{services.map(s => <option value={s.id} key={s.id}>{s.name} — {money(s.price)} · {s.duration_minutes} min</option>)}</select></label>
      <label className="field-label">Choose a day<input type="date" min={localToday()} value={date} onChange={e => setDate(e.target.value)} required /></label>
      <div className="field-label">Available times <div className="slot-grid">{available.length ? available.map(s => <button type="button" className={selected === s.start ? 'slot selected' : 'slot'} onClick={() => setSelected(s.start)} key={s.start}>{s.label}</button>) : <p className="muted">No free times on this day. Try another date.</p>}</div></div>
      <div className="form-divider" />
      <label className="field-label">Your name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" autoComplete="name" /></label>
      <label className="field-label">Mobile number<input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07..." autoComplete="tel" /></label>
      <label className="consent"><input type="checkbox" checked={whatsappConsent} onChange={e => setWhatsappConsent(e.target.checked)} /><span>I'd like Tyler to send my appointment reminder on WhatsApp. This is optional and sent manually.</span></label>
      {message && <p className="form-message" role="alert">{message}</p>}
      <button className="button button-gold submit-book" disabled={loading || !selected}>{loading ? 'Booking…' : <>Confirm booking <ArrowRight size={18} /></>}</button>
    </form><aside className="booking-summary"><CalendarDays size={28} /><h2>Your appointment</h2><p>{service?.name || 'Choose a service'}</p><div className="summary-line"><span>Price</span><strong>{money(service?.price || 0)}</strong></div><div className="summary-line"><span>Duration</span><strong>{service?.duration_minutes || 0} mins</strong></div><div className="summary-line"><span>Date</span><strong>{formatDate(date)}</strong></div><div className="summary-line"><span>Time</span><strong>{selected ? timeLabel(selected) : 'Choose a time'}</strong></div></aside></div>}
  </main>;
}

function OwnerPage({ services }: { services: Service[] }) {
  const [session, setSession] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState('week');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [week, setWeek] = useState(localToday());
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [reminderRows, setReminderRows] = useState<Booking[]>([]);
  const [reviewRows, setReviewRows] = useState<Review[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]); const [notes, setNotes] = useState<any[]>([]);
  const [hours, setHours] = useState<Hours>(initialHours);
  const [walkIn, setWalkIn] = useState({ name: '', phone: '', serviceId: services[0]?.id || '' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', date: localToday() });
  const [noteForm, setNoteForm] = useState({ title: '', body: '' });
  const [blockForm, setBlockForm] = useState({ date: localToday(), start: '12:00', end: '13:00', reason: 'Walk-in / unavailable' });
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: auth } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { auth.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!supabase || !session?.user?.id) { setAuthorized(false); return; }
    supabase.from('profiles').select('role').eq('user_id', session.user.id).single().then(({ data }) => {
      if (data?.role === 'owner') { setAuthorized(true); setError(''); }
      else { setAuthorized(false); setError('This login is not marked as the owner. Sign in with an owner account in Vanta Core.'); }
    });
  }, [session]);

  async function refresh() {
    if (!supabase || !authorized) return;
    const start = new Date(`${week}T12:00:00`); const day = start.getDay(); start.setDate(start.getDate() - ((day + 6) % 7));
    const end = new Date(start); end.setDate(start.getDate() + 7);
    const isoStart = start.toISOString().slice(0, 10); const isoEnd = end.toISOString().slice(0, 10);
    const [book, exp, note, setting, block, reviewData, reminderData] = await Promise.all([
      supabase.from('appointments').select('*, services(name)').gte('appointment_date', isoStart).lt('appointment_date', isoEnd).order('appointment_date').order('start_time'),
      supabase.from('expenses').select('*').gte('expense_date', isoStart).lt('expense_date', isoEnd).order('expense_date', { ascending: false }),
      supabase.from('business_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('barber_settings').select('opening_hours').eq('id', true).single(),
      supabase.from('calendar_blocks').select('*').gte('block_date', isoStart).lt('block_date', isoEnd).order('block_date'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*, services(name)').eq('status', 'confirmed').eq('whatsapp_opt_in', true).gte('appointment_date', localToday()).order('appointment_date').order('start_time').limit(300),
    ]);
    setAppointments(book.data || []); const reminderNow = new Date(); const today = localToday(); const nowTime = `${String(reminderNow.getHours()).padStart(2, '0')}:${String(reminderNow.getMinutes()).padStart(2, '0')}`; setReminderRows((reminderData.data || []).filter((a: Booking) => a.appointment_date > today || (a.appointment_date === today && a.start_time.slice(0, 5) >= nowTime))); setExpenses(exp.data || []); setNotes(note.data || []);
    if (setting.data?.opening_hours) setHours(setting.data.opening_hours as Hours);
    setBlocks(block.data || []);
    setReviewRows(reviewData.data || []);
    if (book.error || exp.error) setError(book.error?.message || exp.error?.message || 'Could not load dashboard data.');
  }
  useEffect(() => { refresh(); }, [authorized, week]);
  useEffect(() => { if (tab === 'reminders') refresh(); }, [tab, authorized]);

  async function signIn(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!supabase) { setError('The VPS API is not configured. Set VITE_API_BASE_URL in the site environment.'); return; }
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) setError(signError.message);
  }
  async function signOut() { await supabase?.auth.signOut(); setAuthorized(false); setSession(null); }
  const totals = useMemo(() => {
    const complete = appointments.filter(a => a.status === 'completed');
    const income = complete.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const outgoing = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { clients: complete.length, income, outgoing, net: income - outgoing };
  }, [appointments, expenses]);

  async function updateBooking(id: string, patch: Partial<Booking>) {
    if (!supabase) return;
    const { error: e } = await supabase.from('appointments').update(patch).eq('id', id);
    if (e) setError(e.message); else { setNotice('Appointment updated.'); refresh(); }
  }
  async function addWalkIn(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    const service = services.find(s => s.id === walkIn.serviceId);
    if (!service) return;
    const start = new Date(); const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    const { error: e2 } = await supabase.from('appointments').insert({ customer_name: walkIn.name.trim(), phone: walkIn.phone || 'Walk-in', service_id: service.id, appointment_date: localToday(), start_time: startTime, end_time: addMinutes(startTime, service.duration_minutes), amount: service.price, status: 'completed', source: 'walk_in', is_paid: true, sms_opt_in: false });
    if (e2) setError(e2.message); else { setWalkIn({ ...walkIn, name: '', phone: '' }); setNotice('Walk-in added to today’s takings.'); refresh(); }
  }
  async function addExpense(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    const { error: e2 } = await supabase.from('expenses').insert({ description: expenseForm.description.trim(), amount: Number(expenseForm.amount), expense_date: expenseForm.date });
    if (e2) setError(e2.message); else { setExpenseForm({ ...expenseForm, description: '', amount: '' }); setNotice('Outgoing saved.'); refresh(); }
  }
  async function addNote(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    const { error: e2 } = await supabase.from('business_notes').insert({ title: noteForm.title.trim() || 'Note', body: noteForm.body.trim() });
    if (e2) setError(e2.message); else { setNoteForm({ title: '', body: '' }); setNotice('Note saved.'); refresh(); }
  }
  async function deleteRow(table: string, id: string) {
    if (!supabase) return;
    const { error: e } = await supabase.from(table).delete().eq('id', id);
    if (e) setError(e.message); else refresh();
  }
  async function saveHours(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    const { error: e2 } = await supabase.from('barber_settings').update({ opening_hours: hours, updated_at: new Date().toISOString() }).eq('id', true);
    if (e2) setError(e2.message); else setNotice('Opening hours saved.');
  }
  async function moderateReview(id: string, publish: boolean) {
    if (!supabase) return;
    const { error: e } = await supabase.from('reviews').update({ is_published: publish }).eq('id', id);
    if (e) setError(e.message); else { setNotice(publish ? 'Review published.' : 'Review hidden.'); refresh(); }
  }
  async function blockTime(e: FormEvent) {
    e.preventDefault(); if (!supabase) return;
    const { error: e2 } = await supabase.from('calendar_blocks').insert({ block_date: blockForm.date, start_time: blockForm.start, end_time: blockForm.end, reason: blockForm.reason });
    if (e2) setError(e2.message); else { setNotice('Time blocked from online bookings.'); refresh(); }
  }

  if (!hasBackend) return <main className="subpage owner-page"><div className="owner-gate"><div className="owner-lock"><ShieldCheck size={28} /></div><p className="eyebrow">Owner area</p><h1>Dashboard setup</h1><p>Connect the VPS API to turn on secure bookings, the calendar and your weekly business figures.</p><a className="button button-gold" href="#home">Back to website</a></div></main>;
  if (!session || !authorized) return <main className="subpage owner-page"><div className="owner-gate"><a className="back-link" href="#home"><ChevronLeft size={18} /> Back to website</a><div className="owner-lock"><ShieldCheck size={28} /></div><p className="eyebrow">Tyler’s private area</p><h1>Owner <em>login.</em></h1><p>Sign in to manage your appointments, calendar and weekly takings.</p><form className="owner-login" onSubmit={signIn}><label className="field-label">Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label><label className="field-label">Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <p className="form-message">{error}</p>}<button className="button button-gold" type="submit">Sign in <ArrowRight size={17} /></button></form></div></main>;

  const weekStart = new Date(`${week}T12:00:00`); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const shiftWeek = (amount: number) => { const d = new Date(`${week}T12:00:00`); d.setDate(d.getDate() + amount * 7); setWeek(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); };
  return <main className="owner-shell">
    <aside className="owner-sidebar"><a className="brand owner-brand" href="#home"><span className="brand-crown"><Crown size={24} /></span><span className="brand-script">Tyler</span><span className="brand-sub">OWNER STUDIO</span></a><div className="owner-nav">{[['week', Wallet, 'This week'], ['calendar', CalendarDays, 'Calendar'], ['reminders', MessageCircle, 'Reminders'], ['settings', Clock3, 'Opening hours'], ['notes', Scissors, 'Notes'], ['reviews', Star, 'Reviews']].map(([id, Icon, label]: any) => <button className={tab === id ? 'owner-nav-item active' : 'owner-nav-item'} onClick={() => setTab(id)} key={id}><Icon size={18} />{label}</button>)}</div><button className="owner-nav-item signout" onClick={signOut}><ShieldCheck size={18} />Sign out</button></aside>
    <section className="owner-main"><div className="owner-topline"><div><p className="eyebrow">Tyler the Barber · Owner studio</p><h1>{tab === 'week' ? 'Your week.' : tab === 'calendar' ? 'Your calendar.' : tab === 'settings' ? 'Your hours.' : tab === 'reviews' ? 'Client reviews.' : tab === 'reminders' ? 'Client reminders.' : 'Your notes.'}</h1></div><button className="button button-outline" onClick={() => { location.hash = ''; }}><ArrowRight size={16} /> View website</button></div>
      {error && <div className="owner-alert error-alert">{error}<button onClick={() => setError('')}><X size={16} /></button></div>}{notice && <div className="owner-alert success-alert">{notice}<button onClick={() => setNotice('')}><X size={16} /></button></div>}
      {tab !== 'reminders' && <div className="week-picker"><button onClick={() => shiftWeek(-1)} aria-label="Previous week"><ChevronLeft /></button><strong>{weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong><button onClick={() => shiftWeek(1)} aria-label="Next week"><ChevronRight /></button><input aria-label="Pick a week" type="date" value={week} onChange={e => setWeek(e.target.value)} /></div>}
      {tab === 'week' && <>
        <div className="metric-grid"><Metric icon={<Wallet />} title="Made this week" value={money(totals.income)} note="Completed appointments" /><Metric icon={<UsersRound />} title="Clients this week" value={String(totals.clients)} note="Completed cuts & walk-ins" /><Metric icon={<Scissors />} title="Outgoings" value={money(totals.outgoing)} note="Logged this week" /><Metric icon={<Sparkles />} title="After outgoings" value={money(totals.net)} note="Income minus expenses" /></div>
        <div className="owner-columns"><div className="panel"><div className="panel-head"><div><h2>Appointments</h2><p>{appointments.length} bookings this week</p></div></div>{appointments.length ? <div className="table-scroll"><table><thead><tr><th>When</th><th>Client</th><th>Service</th><th>Value</th><th>Status</th><th></th></tr></thead><tbody>{appointments.map(a => <tr key={a.id}><td>{formatDate(a.appointment_date)}<small>{timeLabel(a.start_time)}</small></td><td>{a.customer_name}<small>{a.source === 'walk_in' ? 'Walk-in' : a.phone}</small></td><td>{a.services?.name || 'Service'}</td><td>{money(Number(a.amount))}</td><td><select value={a.status} onChange={e => updateBooking(a.id, { status: e.target.value })}><option value="confirmed">Booked</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option></select></td><td><button className="mini-action" onClick={() => { const nextDate = prompt('New date (YYYY-MM-DD)', a.appointment_date); if (!nextDate) return; const nextTime = prompt('New start time (HH:MM)', a.start_time.slice(0, 5)); if (!nextTime) return; const service = services.find(s => s.id === a.service_id); updateBooking(a.id, { appointment_date: nextDate, start_time: nextTime, end_time: addMinutes(nextTime, service?.duration_minutes || 30) }); }}>Edit time</button></td></tr>)}</tbody></table></div> : <div className="empty-state">Nothing booked this week yet. Walk-ins you add will appear here too.</div>}</div>
          <div className="panel walkin-panel"><div className="panel-head"><div><h2>Add a walk-in</h2><p>Count them towards today’s income.</p></div><UserRound /></div><form onSubmit={addWalkIn} className="stack-form"><label className="field-label">Client name<input required value={walkIn.name} onChange={e => setWalkIn({ ...walkIn, name: e.target.value })} placeholder="Name" /></label><label className="field-label">Phone (optional)<input value={walkIn.phone} onChange={e => setWalkIn({ ...walkIn, phone: e.target.value })} placeholder="Mobile number" /></label><label className="field-label">Service<select value={walkIn.serviceId} onChange={e => setWalkIn({ ...walkIn, serviceId: e.target.value })}>{services.map(s => <option key={s.id} value={s.id}>{s.name} · {money(s.price)}</option>)}</select></label><button className="button button-gold">Add walk-in <ArrowRight size={16} /></button></form></div></div>
        <div className="owner-columns lower-columns"><div className="panel"><div className="panel-head"><div><h2>Outgoings</h2><p>Expenses you logged this week.</p></div></div>{expenses.length ? expenses.map(e => <div className="list-row" key={e.id}><div><strong>{e.description}</strong><small>{formatDate(e.expense_date)}</small></div><b>{money(Number(e.amount))}</b><button onClick={() => deleteRow('expenses', e.id)} aria-label="Delete outgoing"><X size={15} /></button></div>) : <div className="empty-state">No outgoings recorded this week.</div>}<form onSubmit={addExpense} className="inline-form"><input required placeholder="What did you pay for?" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} /><input required type="number" min="0.01" step="0.01" placeholder="£ amount" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /><button className="button button-outline">Add</button></form></div>
        <div className="panel"><div className="panel-head"><div><h2>Business notes</h2><p>Quick reminders for later.</p></div></div>{notes.slice(0, 3).map(n => <div className="note-row" key={n.id}><div><strong>{n.title}</strong><p>{n.body}</p></div><button onClick={() => deleteRow('business_notes', n.id)} aria-label="Delete note"><X size={15} /></button></div>)}<form onSubmit={addNote} className="stack-form note-form"><input placeholder="Note title" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} /><textarea required placeholder="Write a note…" value={noteForm.body} onChange={e => setNoteForm({ ...noteForm, body: e.target.value })} rows={3} /><button className="button button-outline">Save note</button></form></div></div>
      </>}
      {tab === 'reminders' && <div className="panel reminders-panel"><div className="panel-head"><div><h2>WhatsApp reminders</h2><p>Upcoming confirmed bookings where the client opted in.</p></div><MessageCircle /></div><p className="reminder-explainer">Choose a reminder to open WhatsApp with the message ready. Check the details, then press Send in WhatsApp. Nothing is sent automatically.</p>{reminderRows.length ? <div className="reminder-list">{reminderRows.map(a => { const number = whatsappNumber(a.phone); const message = `Hi ${a.customer_name.split(' ')[0]}, just a reminder of your appointment with Tyler for ${a.services?.name || 'your service'} on ${formatDate(a.appointment_date)} at ${timeLabel(a.start_time)}. Message me if you need to rearrange.`; const href = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : undefined; return <article className="reminder-card" key={a.id}><div className="reminder-details"><strong>{a.customer_name}</strong><span>{a.services?.name || 'Service'} · {formatDate(a.appointment_date)} at {timeLabel(a.start_time)}</span><small>{a.phone} · WhatsApp opted in</small></div>{href ? <a className="button reminder-send" href={href} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Open WhatsApp</a> : <span className="reminder-invalid">Enter a valid UK mobile to use WhatsApp</span>}</article>; })}</div> : <div className="empty-state">No upcoming confirmed bookings have opted in to WhatsApp reminders.</div>}</div>}
      {tab === 'calendar' && <div className="owner-columns"><div className="panel"><div className="panel-head"><div><h2>Booked this week</h2><p>Manage bookings, cancellations and times.</p></div></div>{appointments.length ? appointments.map(a => <div className="list-row" key={a.id}><div><strong>{formatDate(a.appointment_date)} · {timeLabel(a.start_time)}</strong><small>{a.customer_name} · {a.services?.name || 'Service'}</small></div><button className="mini-action" onClick={() => { const d = prompt('New date (YYYY-MM-DD)', a.appointment_date); const t = d && prompt('New start time (HH:MM)', a.start_time.slice(0, 5)); if (!d || !t) return; const svc = services.find(s => s.id === a.service_id); updateBooking(a.id, { appointment_date: d, start_time: t, end_time: addMinutes(t, svc?.duration_minutes || 30) }); }}>Change</button><button onClick={() => updateBooking(a.id, { status: 'cancelled' })}>Cancel</button></div>) : <div className="empty-state">No appointments to show.</div>}</div><div className="panel"><div className="panel-head"><div><h2>Block a time</h2><p>Remove a slot for a walk-in or time off.</p></div></div><form onSubmit={blockTime} className="stack-form"><label className="field-label">Date<input type="date" min={localToday()} required value={blockForm.date} onChange={e => setBlockForm({ ...blockForm, date: e.target.value })} /></label><div className="two-fields"><label className="field-label">From<input type="time" required value={blockForm.start} onChange={e => setBlockForm({ ...blockForm, start: e.target.value })} /></label><label className="field-label">Until<input type="time" required value={blockForm.end} onChange={e => setBlockForm({ ...blockForm, end: e.target.value })} /></label></div><label className="field-label">Reason<input value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })} /></label><button className="button button-gold">Block time <CalendarDays size={16} /></button></form>{blocks.map(b => <div className="list-row" key={b.id}><div><strong>{formatDate(b.block_date)} · {timeLabel(b.start_time)}</strong><small>{b.reason} · until {timeLabel(b.end_time)}</small></div><button onClick={() => deleteRow('calendar_blocks', b.id)} aria-label="Remove block"><X size={15} /></button></div>)}</div></div>}
      {tab === 'settings' && <div className="panel hours-panel"><div className="panel-head"><div><h2>Weekly opening hours</h2><p>Change the days and times customers can book.</p></div></div><form onSubmit={saveHours}>{dayNames.map((d, i) => <div className="hours-row" key={d}><strong>{d}</strong><label className="closed-toggle"><input type="checkbox" checked={Boolean(hours[String(i)]?.open)} onChange={e => setHours({ ...hours, [String(i)]: e.target.checked ? { open: '09:00', close: '17:00' } : { open: null, close: null } })} /> Open</label>{hours[String(i)]?.open ? <><input type="time" value={hours[String(i)].open || '09:00'} onChange={e => setHours({ ...hours, [String(i)]: { ...hours[String(i)], open: e.target.value } })} /><span>to</span><input type="time" value={hours[String(i)].close || '17:00'} onChange={e => setHours({ ...hours, [String(i)]: { ...hours[String(i)], close: e.target.value } })} /></> : <span className="muted closed-text">Closed</span>}</div>)}<button className="button button-gold">Save opening hours <Check size={17} /></button></form></div>}
      {tab === 'notes' && <div className="panel notes-panel"><div className="panel-head"><div><h2>All your notes</h2><p>Ideas, reminders and business admin in one place.</p></div></div><form onSubmit={addNote} className="stack-form note-form"><input placeholder="Note title" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} /><textarea required placeholder="Write a note…" value={noteForm.body} onChange={e => setNoteForm({ ...noteForm, body: e.target.value })} rows={4} /><button className="button button-gold">Save note</button></form>{notes.map(n => <div className="note-row" key={n.id}><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString('en-GB')}</small></div><button onClick={() => deleteRow('business_notes', n.id)}><X size={15} /></button></div>)}</div>}
      {tab === 'reviews' && <div className="panel notes-panel"><div className="panel-head"><div><h2>Reviews for approval</h2><p>New reviews stay private until you approve them.</p></div></div>{reviewRows.length ? reviewRows.map(r => <div className="note-row" key={r.id}><div><strong>{r.customer_name} · <span className="stars">{'★'.repeat(r.rating)}</span></strong><p>{r.body}</p><small>{r.is_published ? 'Published' : 'Waiting for approval'} · {new Date(r.created_at).toLocaleDateString('en-GB')}</small></div>{r.is_published ? <button className="mini-action" onClick={() => moderateReview(r.id, false)}>Hide</button> : <button className="mini-action" onClick={() => moderateReview(r.id, true)}>Approve</button>}<button onClick={() => deleteRow('reviews', r.id)} aria-label="Delete review"><X size={15} /></button></div>) : <div className="empty-state">No reviews yet. Customer submissions will appear here.</div>}</div>}
    </section>
  </main>;
}

function Metric({ icon, title, value, note }: { icon: ReactNode; title: string; value: string; note: string }) { return <article className="metric-card"><div className="metric-icon">{icon}</div><span>{title}</span><strong>{value}</strong><small>{note}</small></article>; }
