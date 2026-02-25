const logText = document.getElementById('log-text');
const trainBtn = document.getElementById('trainBtn');
const autoScanBtn = document.getElementById('autoScanBtn');
const aiPrediction = document.getElementById('ai-prediction');
const riskAlert = document.getElementById('risk-alert');
const summaryList = document.getElementById('summary-list');
const singleDisplay = document.getElementById('single-display');
const autoSummary = document.getElementById('auto-summary');
const sentimentFill = document.getElementById('sentiment-fill');

let hits = parseInt(localStorage.getItem('ai_hits')) || 0;
let total = parseInt(localStorage.getItem('ai_total')) || 0;

const logger = (msg) => { logText.innerText = msg.toUpperCase(); };

async function getSentiment() {
    try {
        const res = await fetch('https://api.alternative.me/fng/');
        const data = await res.json();
        return parseInt(data.data[0].value);
    } catch (e) { return 50; }
}

async function processCrypto(id, sentiment) {
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`);
        const pData = await res.json();
        const prices = pData.prices.map(p => p[1]);
        
        const min = Math.min(...prices), max = Math.max(...prices);
        const norm = prices.map(p => (p - min) / (max - min));

        const net = new brain.NeuralNetwork();
        net.train([{ input: [norm[norm.length-2], sentiment/100], output: [norm[norm.length-1] > norm[norm.length-2] ? 1 : 0] }]);
        const result = net.run([norm[norm.length-1], sentiment/100]);
        
        return { pred: result > 0.5 ? "SUBIRÁ" : "BAJARÁ", current: prices[prices.length-1] };
    } catch (e) { return null; }
}

async function runSingle() {
    autoSummary.classList.add('hidden');
    singleDisplay.classList.remove('hidden');
    const id = document.getElementById('cryptoTarget').value;
    
    // Alerta de PEPE
    riskAlert.classList.toggle('hidden', id !== 'pepe');

    logger(`Iniciando secuencia: ${id}`);
    const sentiment = await getSentiment();
    updateSentimentUI(sentiment);

    const data = await processCrypto(id, sentiment);
    if (data) {
        // Validar anterior
        const lastP = localStorage.getItem('last_p');
        const lastT = localStorage.getItem('last_t');
        if(lastP && lastT) {
            total++;
            if((data.current > lastP) === (lastT === "SUBIRÁ")) hits++;
        }

        aiPrediction.innerText = data.pred;
        aiPrediction.style.color = data.pred === "SUBIRÁ" ? "#39ff14" : "#ff003c";
        
        localStorage.setItem('last_p', data.current);
        localStorage.setItem('last_t', data.pred);
        localStorage.setItem('ai_hits', hits);
        localStorage.setItem('ai_total', total);
        updateStats();
        logger("Análisis completado.");
    }
}

async function runAutoScan() {
    const list = ['bitcoin', 'ethereum', 'ripple', 'dogecoin', 'litecoin', 'cardano', 'chainlink', 'pepe', 'pax-gold'];
    singleDisplay.classList.add('hidden');
    autoSummary.classList.remove('hidden');
    summaryList.innerHTML = "<p>CARGANDO...</p>";
    
    const sentiment = await getSentiment();
    updateSentimentUI(sentiment);
    let html = "";

    for (let id of list) {
        logger(`Escaneando: ${id}`);
        const d = await processCrypto(id, sentiment);
        if(d) {
            const color = d.pred === "SUBIRÁ" ? "#39ff14" : "#ff003c";
            html += `<div class="summary-row"><span>${id.toUpperCase()}</span><span style="color:${color}">${d.pred}</span></div>`;
        }
    }
    summaryList.innerHTML = html;
    logger("Escaneo global listo.");
}

function updateSentimentUI(v) {
    document.getElementById('sentiment-value').innerText = v;
    sentimentFill.style.width = v + "%";
    const l = document.getElementById('sentiment-label');
    if(v < 30) { l.innerText = "MIEDO EXTREMO"; l.style.color = "#ff003c"; }
    else if(v > 70) { l.innerText = "CODICIA EXTREMA"; l.style.color = "#39ff14"; }
    else { l.innerText = "NEUTRAL"; l.style.color = "#ffcc00"; }
}

function updateStats() {
    document.getElementById('total-hits').innerText = hits;
    document.getElementById('accuracy-pct').innerText = total === 0 ? "0%" : Math.round((hits/total)*100) + "%";
}

trainBtn.addEventListener('click', runSingle);
autoScanBtn.addEventListener('click', runAutoScan);
document.getElementById('resetStats').onclick = () => { localStorage.clear(); location.reload(); };
updateStats();

