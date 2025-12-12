// EcoGuard - script.js (Live CO2 + Temp + Tree Counter + Cart + Donations)

/* =========================
   CONFIG (change these)
   ========================= */
const ANNUAL_LOSS_HA = 10_000_000;      // hectares lost per year (global baseline)
const TREES_PER_HECTARE = 1000;        // model: average trees per hectare (adjustable)
const COUNTER_UPDATE_INTERVAL_MS = 1000; // how often to update trees counter (ms)

/* =========================
   UTILITY / SAFETY
   ========================= */
function $(id) { return document.getElementById(id); }
function safeTextSet(el, txt) { if (!el) return; el.textContent = txt; }

/* =========================
   1) LIVE CLIMATE STATS - Smooth Counters
   ========================= */
const co2Element = $('co2');
const tempElement = $('temp');

let co2Current = 421.38;     // fallback / initial value
let tempCurrent = 1.24;      // fallback / initial value
let co2Target = co2Current;
let tempTarget = tempCurrent;

// Fetch real data from API
async function fetchClimateData() {
  try {
    // CO2 in ppm
    const co2Res = await fetch('https://global-warming.org/api/co2-api');
    const co2Data = await co2Res.json();
    const co2 = parseFloat(co2Data.co2);
    if (!isNaN(co2)) co2Target = co2;

    // Temperature anomaly in °C
    const tempRes = await fetch('https://global-warming.org/api/temperature-api');
    const tempData = await tempRes.json();
    const latestTemp = tempData.result?.[0]?.median;
    if (!isNaN(latestTemp)) tempTarget = latestTemp;

  } catch(e) {
    console.error("Climate fetch failed, using previous values", e);
  }
}

// Smoothly update the displayed values every second
function updateClimateCounter() {
  const co2Step = (co2Target - co2Current) * 0.05; // smooth step
  co2Current += co2Step;
  safeTextSet(co2Element, co2Current.toFixed(2) + " ppm");

  const tempStep = (tempTarget - tempCurrent) * 0.05; // smooth step
  tempCurrent += tempStep;
  safeTextSet(tempElement, tempCurrent.toFixed(2) + "°C");
}

// Initial paint
updateClimateCounter();
setInterval(updateClimateCounter, 1000);
fetchClimateData();
setInterval(fetchClimateData, 3*60*1000);

/* =========================
   2) REALISTIC TREE-LOSS COUNTER (Option A)
   ========================= */
const now = new Date();
const startOfYear = new Date(now.getFullYear(), 0, 1);
const secondsSinceYearStart = Math.floor((now - startOfYear) / 1000);

const treesPerYear = ANNUAL_LOSS_HA * TREES_PER_HECTARE;
const treesPerSecond = treesPerYear / (365 * 24 * 60 * 60);

let treesLost = Math.floor(treesPerSecond * secondsSinceYearStart);

function updateTreesCounter() {
  treesLost += treesPerSecond * (COUNTER_UPDATE_INTERVAL_MS / 1000);
  safeTextSet($('trees'), Math.floor(treesLost).toLocaleString());
}
updateTreesCounter();
setInterval(updateTreesCounter, COUNTER_UPDATE_INTERVAL_MS);

/* =========================
   3) SHOPPING CART SYSTEM
   ========================= */
let cart = JSON.parse(localStorage.getItem('ecoguardCart')) || [];
const cartIcon = $('cartIcon');
const cartCount = $('cartCount');

if (!$('cartSidebar')) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cart-overlay" id="cartOverlay"></div>
    <div class="cart-sidebar" id="cartSidebar">
      <div class="cart-header">
        <h2>Your Cart (<span id="sidebarCount">0</span>)</h2>
        <button class="close-cart" id="closeCart">×</button>
      </div>
      <div id="cartItems"></div>
      <div class="cart-total">Total: $<span id="cartTotal">0.00</span></div>
      <button class="checkout-btn" id="checkoutBtn">Proceed to Checkout</button>
    </div>
  `);
}

const cartSidebar = $('cartSidebar');
const cartOverlay = $('cartOverlay');
const cartItemsContainer = $('cartItems');
const cartTotalElement = $('cartTotal');
const sidebarCount = $('sidebarCount');

function updateCartUI() {
  if (!cartCount) {
    const ic = document.createElement('div');
    ic.id = 'cartCount';
    ic.style.position = 'fixed';
    ic.style.right = '18px';
    ic.style.top = '18px';
    ic.style.background = '#0a4d3c';
    ic.style.color = '#fff';
    ic.style.padding = '6px 8px';
    ic.style.borderRadius = '20px';
    ic.style.zIndex = '9999';
    document.body.appendChild(ic);
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const counterEl = $('cartCount');
  if (counterEl) counterEl.textContent = totalItems;
  if (sidebarCount) sidebarCount.textContent = totalItems;

  if (!cartItemsContainer) return;
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty. Start saving the planet!</p>';
    if (cartTotalElement) cartTotalElement.textContent = '0.00';
    return;
  }

  cartItemsContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" style="width:64px;height:64px;object-fit:cover;">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>$${item.price} × ${item.quantity}</p>
      </div>
      <button class="remove-item" data-index="${index}">×</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (cartTotalElement) cartTotalElement.textContent = total.toFixed(2);
}

function addToCart(name, price, image) {
  const existing = cart.find(item => item.name === name);
  if (existing) existing.quantity += 1;
  else cart.push({ name, price, image, quantity: 1 });
  localStorage.setItem('ecoguardCart', JSON.stringify(cart));
  updateCartUI();
  try { alert(`${name} added to cart!`); } catch(e) {}
}

document.querySelectorAll('.btn-buy').forEach(button => {
  button.addEventListener('click', () => {
    const product = button.closest('.product') || button.closest('.kit') || button.parentElement;
    const nameEl = product ? product.querySelector('h3') : null;
    const priceEl = product ? product.querySelector('.price') : null;
    const imageEl = product ? product.querySelector('img') : null;

    const name = nameEl ? nameEl.textContent : 'Eco product';
    const priceText = priceEl ? priceEl.textContent : button.textContent;
    const price = parseFloat((priceText || '').replace('$','')) || 50;
    const image = (imageEl && imageEl.src) ? imageEl.src : 'https://images.unsplash.com/photo-1613665798979-93d4318a0888?w=400';

    addToCart(name, price, image);
  });
});

if (cartIcon) {
  cartIcon.addEventListener('click', () => {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
    updateCartUI();
  });
}
const closeCartBtn = $('closeCart');
if (closeCartBtn) closeCartBtn.addEventListener('click', () => {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('active');
});
if (cartOverlay) cartOverlay.addEventListener('click', () => {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('active');
});

if (cartItemsContainer) {
  cartItemsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item')) {
      const index = parseInt(e.target.dataset.index, 10);
      if (!isNaN(index)) {
        cart.splice(index, 1);
        localStorage.setItem('ecoguardCart', JSON.stringify(cart));
        updateCartUI();
      }
    }
  });
}

/* =========================
   4) FAKE DONATION SYSTEM + LIVE PIE CHART
   ========================= */
let donationData = JSON.parse(localStorage.getItem('ecoguardDonations')) || {
  reforestation: 0, methane: 0, renewables: 0, education: 0, operations: 0, totalDonated: 0
};

const donateButtons = document.querySelectorAll('.donate-btn');
const customAmountInput = $('customAmount');
const payNowBtn = $('payNow');
let myChart;

function updateDonationChart() {
  const canvas = $('donationChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const totalRaised = donationData.totalDonated || 0;
  if (myChart) myChart.destroy();
  myChart = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: [
        `Reforestation (35%) – $${Math.round(donationData.reforestation / 1000)}k`,
        `Methane Reduction (25%) – $${Math.round(donationData.methane / 1000)}k`,
        `Renewable Energy (20%) – $${Math.round(donationData.renewables / 1000)}k`,
        `Climate Education (10%) – $${Math.round(donationData.education / 1000)}k`,
        `Operations (10%) – $${Math.round(donationData.operations / 1000)}k`
      ],
      datasets: [{ data: [35,25,20,10,10], backgroundColor: ['#1b5e20','#2e7d32','#66bb6a','#a5d6a7','#c8e6c9'], borderColor:'#fff', borderWidth:3, hoverOffset:20 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 20, font: { size: 13 } } },
        title: { display:true, text:`Total Raised So Far: $${(totalRaised/1000).toFixed(1)}k — Thank You!`, font:{ size:20, weight:'bold' }, color:'#0a4d3c', padding:20 },
        tooltip: { callbacks:{ label:function(context){ const value=context.parsed; const actual=(value/100)*totalRaised; return `$${actual.toLocaleString(undefined,{maximumFractionDigits:0})} donated`; } } }
      }
    }
  });
}

function processDonation(amount) {
  if (!amount || amount <=0) { try { alert("Please select or enter a valid amount!"); } catch(e) {} return; }
  donationData.reforestation += amount*0.35;
  donationData.methane += amount*0.25;
  donationData.renewables += amount*0.20;
  donationData.education += amount*0.10;
  donationData.operations += amount*0.10;
  donationData.totalDonated += amount;
  localStorage.setItem('ecoguardDonations', JSON.stringify(donationData));
  updateDonationChart();
  if (payNowBtn) { payNowBtn.textContent="Thank You!"; payNowBtn.style.background="#1b5e20"; setTimeout(()=>{ payNowBtn.textContent="Donate Securely (Fake)"; payNowBtn.style.background="#0a4d3c"; },3000); }
  try { alert(`You just donated $${amount}! The planet thanks you`); } catch(e) {}
}

donateButtons.forEach(btn=>{
  btn.addEventListener('click',()=>{
    donateButtons.forEach(b=>{ b.style.background='#e0f2e9'; b.style.color='#0a4d3c'; });
    btn.style.background='#0a4d3c'; btn.style.color='white';
    if (customAmountInput) customAmountInput.value='';
  });
});

if (payNowBtn) {
  payNowBtn.addEventListener('click',()=>{
    let amount=customAmountInput?parseFloat(customAmountInput.value):NaN;
    if (!amount || amount<=0){
      const selected=Array.from(document.querySelectorAll('.donate-btn')).find(b=>{ return b.style.background && (b.style.background.includes('rgb') || b.style.background.includes('#0a4d3c')); });
      if(selected) amount=parseFloat(selected.dataset.amount)||NaN;
    }
    processDonation(amount);
    if(customAmountInput) customAmountInput.value='';
  });
}

/* =========================
   INITIALIZE ON LOAD
   ========================= */
document.addEventListener('DOMContentLoaded', ()=>{
  updateCartUI();
  updateDonationChart();
  safeTextSet($('trees'), Math.floor(treesLost).toLocaleString());
});

// ---------------------------
// LOGIN BUTTON
// ---------------------------
document.addEventListener("click", function (e) {
    if (e.target.id === "login-btn") {
        window.location.href = "login.html"; 
    }
});