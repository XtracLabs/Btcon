const addressInput = document.getElementById("addressInput");
const searchBtn = document.getElementById("searchBtn");
const statusText = document.getElementById("statusText");
const balanceBtcon = document.getElementById("balanceBtcon");
const qrcode = document.getElementById("qrcode");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");

const btconPriceEl = document.getElementById("btconPrice");
const eurInput = document.getElementById("eurInput");
const convertBtn = document.getElementById("convertBtn");
const convertResult = document.getElementById("convertResult");
const tokenTotalEl = document.getElementById("tokenTotal");
const tokenEuroEl = document.getElementById("tokenEuro");
const resetTokens = document.getElementById("resetTokens");
const tokenButtons = document.querySelectorAll(".token-btn");

let btconPriceEuro = 0;
let selectedTokens = 0;

function formatNumber(value) {
  return Number(value).toLocaleString("fr-FR");
}

function shortTxid(txid) {
  return txid.slice(0, 12) + "..." + txid.slice(-10);
}

async function updateBtconPrice() {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur");
    const data = await response.json();

    const btcPriceEuro = data.bitcoin.eur;
    btconPriceEuro = btcPriceEuro / 100000000;

    btconPriceEl.textContent = btconPriceEuro.toFixed(8) + " €";
    updateSelectedTokenDisplay();
  } catch (error) {
    btconPriceEl.textContent = "Erreur prix";
  }
}

function convertEuroToBtcon() {
  const euros = parseFloat(eurInput.value);

  if (!btconPriceEuro || !euros || euros <= 0) {
    convertResult.textContent = "0 BTCON";
    return;
  }

  const btcon = Math.floor(euros / btconPriceEuro);
  convertResult.textContent = formatNumber(btcon) + " BTCON";
}

function updateSelectedTokenDisplay() {
  tokenTotalEl.textContent = formatNumber(selectedTokens) + " BTCON";

  if (!btconPriceEuro) {
    tokenEuroEl.textContent = "≈ 0 €";
    return;
  }

  const euros = selectedTokens * btconPriceEuro;
  tokenEuroEl.textContent = "≈ " + euros.toFixed(4) + " €";
}

function addTokens(amount) {
  selectedTokens += amount;
  updateSelectedTokenDisplay();
}

function resetCalculatorTokens() {
  selectedTokens = 0;
  updateSelectedTokenDisplay();
}

function renderQRCode(address) {
  qrcode.innerHTML = "";

  new QRCode(qrcode, {
    text: address,
    width: 160,
    height: 160,
    correctLevel: QRCode.CorrectLevel.H
  });
}

function getTransactionValueForAddress(tx, address) {
  let received = 0;
  let sent = 0;

  tx.vout.forEach(output => {
    if (output.scriptpubkey_address === address) {
      received += output.value;
    }
  });

  tx.vin.forEach(input => {
    const previousOutput = input.prevout;
    if (previousOutput && previousOutput.scriptpubkey_address === address) {
      sent += previousOutput.value;
    }
  });

  return received - sent;
}

function renderHistory(transactions, address) {
  historyList.innerHTML = "";

  if (!transactions.length) {
    historyList.innerHTML = '<div class="empty">Aucune transaction trouvée.</div>';
    historyCount.textContent = "0 transaction";
    return;
  }

  historyCount.textContent = transactions.length + " transaction" + (transactions.length > 1 ? "s" : "");

  transactions.forEach(tx => {
    const value = getTransactionValueForAddress(tx, address);
    const isPlus = value >= 0;
    const amount = Math.abs(value);

    const row = document.createElement("div");
    row.className = "tx " + (isPlus ? "plus" : "minus");

    row.innerHTML = `
      <div class="tx-sign">${isPlus ? "+" : "-"}</div>
      <div>
        <div class="tx-id">${shortTxid(tx.txid)}</div>
        <small>${tx.status.confirmed ? "Confirmée" : "En attente"}</small>
      </div>
      <div class="tx-amount">${formatNumber(amount)} BTCON</div>
    `;

    historyList.appendChild(row);
  });
}

async function loadAddress() {
  const address = addressInput.value.trim();

  if (!address) {
    statusText.textContent = "Entre une adresse BTC.";
    return;
  }

  try {
    statusText.textContent = "Chargement des données...";
    renderQRCode(address);

const address = addressInput.value.trim().replace(/\s/g,"");
const addressResponse = await fetch(`https://blockstream.info/api/address/${encodeURIComponent(address)}`);

    if (!addressResponse.ok) {
      throw new Error("Adresse introuvable");
    }

    const addressData = await addressResponse.json();
    const balance =
      addressData.chain_stats.funded_txo_sum -
      addressData.chain_stats.spent_txo_sum;

    balanceBtcon.textContent = formatNumber(balance) + " BTCON";

  const txResponse = await fetch(`https://blockstream.info/api/address/${encodeURIComponent(address)}/txs`);
    const transactions = await txResponse.json();

    renderHistory(transactions, address);
    statusText.textContent = "Adresse chargée avec succès.";
  } catch (error) {
    statusText.textContent = "Erreur : impossible de charger cette adresse.";
    balanceBtcon.textContent = "0 BTCON";
    historyList.innerHTML = '<div class="empty">Erreur de chargement.</div>';
  }
}

searchBtn.addEventListener("click", loadAddress);
addressInput.addEventListener("keydown", event => {
  if (event.key === "Enter") loadAddress();
});

convertBtn.addEventListener("click", convertEuroToBtcon);
eurInput.addEventListener("keydown", event => {
  if (event.key === "Enter") convertEuroToBtcon();
});

tokenButtons.forEach(button => {
  button.addEventListener("click", () => {
    addTokens(Number(button.dataset.value));
  });
});

resetTokens.addEventListener("click", resetCalculatorTokens);

updateBtconPrice();
setInterval(updateBtconPrice, 10000);
