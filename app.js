const logText = document.getElementById('log-text');
const trainBtn = document.getElementById('trainBtn');
const autoScanBtn = document.getElementById('autoScanBtn');
const aiPrediction = document.getElementById('ai-prediction');
const summaryList = document.getElementById('summary-list');
const singleDisplay = document.getElementById('single-display');
const autoSummary = document.getElementById('auto-summary');

let hits = parseInt(localStorage.getItem('ai_hits')) || 0;
let total = parseInt(localStorage.getItem('ai_total')) || 0;

function logger(msg) { logText.innerText = `> ${msg.toUpperCase()}`; }

async function getSentiment() {
    try {
        const res = await fetch('https://api.alternative.me/fng/');
        const data = await res.json();
        return parseInt(data.data[0].value);
    } catch (e) { return 50; }
}

// Función Corazón: Entrenar una sola moneda
async function processCrypto(id, sentiment) {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`);
    const data = await res.json();
    const prices = data.prices.map(p => p[1]);
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const norm = prices.map(p => (p - min) / (max - min));

    const net = new brain.NeuralNetwork();
    net.train([
        { input: [norm[norm.length - 2], sentiment / 100], output: [norm[norm.length - 1] > norm[norm.length - 2] ? 1 : 0] }
    ]);

    const result = net.run([norm[norm.length - 1], sentiment / 100]);
    return { 
        pred: result > 0.5 ? "SUBIRÁ" : "BAJARÁ", 
        val: result,
        current: prices[prices.length - 1] 
    };
}

// Modo Escaneo Automático
async function runAutoScan() {
    const cryptos = ['bitcoin', 'ethereum', 'ripple', 'solana', 'binancecoin'];
    singleDisplay.classList.add('hidden');
    autoSummary.classList.remove('hidden');
    summaryList.innerHTML = "CARGANDO DATOS...";
    
    logger("Iniciando escaneo de mercado masivo...");
    const sentiment = await getSentiment();
    let resultsHTML = "";

    for (let id of cryptos) {
        logger(`Analizando ${id}...`);
        const data = await processCrypto(id, sentiment);
        const color = data.pred === "SUBIRÁ" ? "#00ff41" : "#ff3131";
        resultsHTML += `
            <div class="summary-row">
                <span>${id.toUpperCase()}</span>
                <span style="color: ${color}">${data.pred}</span>
            </div>`;
    }
    
    summaryList.innerHTML = resultsHTML;
    logger("Escaneo completo. Recomendaciones listas.");
}

// Modo Individual
async function runSingle() {
    autoSummary.classList.add('hidden');
    singleDisplay.classList.remove('hidden');
    const id = document.getElementById('cryptoTarget').value;
    const sentiment = await getSentiment();
    
    logger(`Sincronizando ${id}...`);
    const data = await processCrypto(id, sentiment);
    
    aiPrediction.innerText = data.pred;
    aiPrediction.style.color = data.pred === "SUBIRÁ" ? "#00ff41" : "#ff3131";
    
    // Guardar para récord de precisión
    localStorage.setItem('last_pred_type', data.pred);
    localStorage.setItem('last_pred_price', data.current);
    logger("IA Entrenada. Predicción individual lista.");
}

autoScanBtn.addEventListener('click', runAutoScan);
trainBtn.addEventListener('click', runSingle);
document.getElementById('resetStats').onclick = () => { localStorage.clear(); location.reload(); };
