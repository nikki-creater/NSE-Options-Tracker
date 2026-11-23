/* =====================================================
   OPTIONS TRACKER - FRONTEND
   HTML + CSS + JavaScript
===================================================== */

const API_URL = "/api";

const $ = (id) => document.getElementById(id);

const expiryDropdown = $("expiryDropdown");
const settingsExpiry = $("settingsExpiry");
const symbolDropdown = $("symbolDropdown");
const settingsModal = $("settingsModal");
const optionTables = $("optionTables");
const loadingOverlay = $("loadingOverlay");
const editButton = $("editButton");
const refreshButton = $("refreshButton");
const saveSettings = $("saveSettings");
const connectionStatus = $("connectionStatus");
const tableStatus = $("tableStatus");
const lastUpdated = $("lastUpdated");

let symbols = [];
let selectedSymbols = [];
let selectedExpiry = "";
let expiryDates = [];
let loading = false;

function getSavedSettings() {
  try {
    return JSON.parse(localStorage.getItem("optionsTrackerSettings")) || {};
  } catch {
    return {};
  }
}

function saveLocalSettings() {
  localStorage.setItem(
    "optionsTrackerSettings",
    JSON.stringify({
      expiry: selectedExpiry,
      symbols: selectedSymbols,
    }),
  );
}

async function apiRequest(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.error || result.message || `HTTP Error ${response.status}`,
    );
  }

  return result;
}

function showLoading(show) {
  loadingOverlay?.classList.toggle("show", show);
}

function showError(message) {
  optionTables.innerHTML = `
    <div class="error-message">
      <strong>Unable to load data</strong>
      <p>${escapeHTML(message)}</p>
    </div>
  `;

  tableStatus.textContent = "Data loading failed";
}

function showEmptyState(message) {
  optionTables.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>Options Tracker</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(2) : "--";
}

/* Convert dates into comparable values */

function normalizeDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  const match = String(value).match(
    /^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})$/,
  );

  if (!match) return String(value).trim().toLowerCase();

  const months = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  return `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, "0")}`;
}

/* Initialize */

document.addEventListener("DOMContentLoaded", initializeApplication);

async function initializeApplication() {
  try {
    showLoading(true);

    await checkBackend();
    await loadSymbols();

    const saved = getSavedSettings();

    selectedSymbols = Array.isArray(saved.symbols)
      ? saved.symbols.filter((symbol) => symbols.includes(symbol))
      : [];

    if (!selectedSymbols.length) {
      selectedSymbols = [
        symbols.includes("RELIANCE") ? "RELIANCE" : symbols[0],
      ];
    }

    updateSymbolDropdown();

    await loadExpiryDates();

    if (expiryDates.length) {
      const savedExpiry = expiryDates.find(
        (date) => normalizeDate(date) === normalizeDate(saved.expiry),
      );

      selectedExpiry = savedExpiry || expiryDates[0];
    }

    updateExpiryDropdowns();

    saveLocalSettings();

    if (selectedExpiry) {
      await loadOptionTables();
    } else {
      showEmptyState("No expiry dates are available.");
    }
  } catch (error) {
    console.error("Initialization error:", error);
    showError(error.message);
    connectionStatus.textContent = "Connection Failed";
  } finally {
    showLoading(false);
  }
}

/* Backend health */

async function checkBackend() {
  const result = await apiRequest(`${API_URL}/health`);

  connectionStatus.textContent = result.message
    ? "Backend Connected"
    : "Backend Connected";
}

/* Load symbols */

async function loadSymbols() {
  const result = await apiRequest(`${API_URL}/symbols`);

  symbols = Array.isArray(result.symbols) ? result.symbols : [];

  if (!symbols.length) {
    throw new Error("No symbols returned by backend.");
  }
}

/* Symbol dropdown */

function updateSymbolDropdown() {
  symbolDropdown.innerHTML = "";

  const allOption = new Option("ALL SYMBOLS", "ALL");

  allOption.selected = selectedSymbols.length === symbols.length;

  symbolDropdown.add(allOption);

  symbols.forEach((symbol) => {
    const option = new Option(symbol, symbol);
    option.selected = selectedSymbols.includes(symbol);
    symbolDropdown.add(option);
  });
}

/* Expiry dates */

async function loadExpiryDates() {
  const referenceSymbol = selectedSymbols[0];

  const params = new URLSearchParams({
    symbol: referenceSymbol,
  });

  const result = await apiRequest(`${API_URL}/expiries?${params.toString()}`);

  expiryDates = Array.isArray(result.expiryDates) ? result.expiryDates : [];

  updateExpiryDropdowns();
}

function updateExpiryDropdowns() {
  expiryDropdown.innerHTML = "";
  settingsExpiry.innerHTML = "";

  expiryDropdown.add(new Option("Select Expiry Date", ""));

  settingsExpiry.add(new Option("Select Expiry Date", ""));

  expiryDates.forEach((date) => {
    expiryDropdown.add(new Option(date, date));
    settingsExpiry.add(new Option(date, date));
  });

  expiryDropdown.value = selectedExpiry;
  settingsExpiry.value = selectedExpiry;
}

/* Main expiry change */

expiryDropdown.addEventListener("change", async () => {
  selectedExpiry = expiryDropdown.value;

  saveLocalSettings();

  await loadOptionTables();
});

/* Option chain */

async function loadOptionTables(silent = false) {
  if (loading) return;

  if (!selectedExpiry) {
    showEmptyState("Please select an expiry date.");
    return;
  }

  if (!selectedSymbols.length) {
    showEmptyState("Please select at least one symbol.");
    return;
  }

  loading = true;
  if (!silent) {
    showLoading(true);
  }
  tableStatus.textContent = "Loading NSE data...";

  try {
    const params = new URLSearchParams({
      expiry: selectedExpiry,
      symbols: selectedSymbols.join(","),
    });

    const result = await apiRequest(
      `${API_URL}/option-chain?${params.toString()}`,
    );

    const tables = Array.isArray(result.tables) ? result.tables : [];

    renderOptionTables(tables);

    const loadedCount = tables.filter(
      (item) =>
        item.success && Array.isArray(item.data) && item.data.length > 0,
    ).length;

    tableStatus.textContent = `${loadedCount} / ${selectedSymbols.length} symbols loaded`;

    lastUpdated.textContent = "Last Updated: " + new Date().toLocaleString();

    connectionStatus.textContent =
      loadedCount > 0 ? "NSE Data Received" : "NSE Data Unavailable";

    if (loadedCount === 0) {
      tableStatus.textContent = `0 / ${selectedSymbols.length} symbols loaded`;
    }
  } catch (error) {
    console.error("Option chain error:", error);
    showError(error.message);
    connectionStatus.textContent = "NSE Data Error";
  } finally {
    loading = false;

    if (!silent) {
      showLoading(false);
    }
  }
}

/* ITM / OTM / ATM */

function getMoneyness(type, strike, spot) {
  const s = Number(strike);
  const p = Number(spot);

  if (!Number.isFinite(s) || !Number.isFinite(p)) {
    return "N/A";
  }

  const tolerance = Math.max(0.01, Math.abs(p) * 0.0001);

  if (Math.abs(s - p) <= tolerance) {
    return "ATM";
  }

  if (type === "CE") {
    return s < p ? "ITM" : "OTM";
  }

  return s > p ? "ITM" : "OTM";
}

function getMoneynessClass(value) {
  return value.toLowerCase().replace("/", "-");
}

// =========================================
// RENDER ONLY ITM / OTM BOUNDARY ROWS
// =========================================

function renderOptionTables(tables) {
  optionTables.innerHTML = "";

  if (!tables || !tables.length) {
    showEmptyState("No option chain data available.");
    return;
  }

  tables.forEach((item) => {
    const card = document.createElement("div");
    card.className = "symbol-card";

    if (!item.success) {
      card.innerHTML = `
                <div class="symbol-header">
                    <h3>${escapeHTML(item.symbol)}</h3>
                    <span>Data unavailable</span>
                </div>
                <div class="error-message">
                    ${escapeHTML(item.error || "Unable to load data")}
                </div>
            `;

      optionTables.appendChild(card);
      return;
    }

    const spot = Number(item.underlyingValue);

    const rows = (item.data || [])
      .filter((row) => Number.isFinite(Number(row.strikePrice)))
      .sort((a, b) => Number(a.strikePrice) - Number(b.strikePrice));

    // Find nearest ITM and OTM strikes
    const itmRows = rows.filter((row) => Number(row.strikePrice) < spot);

    const otmRows = rows.filter((row) => Number(row.strikePrice) > spot);

    // CE: Last ITM and First OTM
    // PE: First OTM and Last ITM
    const lastITM = itmRows.length ? itmRows[itmRows.length - 1] : null;

    const firstOTM = otmRows.length ? otmRows[0] : null;

    const boundaryRows = [lastITM, firstOTM].filter(Boolean);

    let html = `
            <div class="symbol-header">
                <h3>${escapeHTML(item.symbol)}</h3>

                <span>
                    Spot: ${formatPrice(spot)}
                    | Expiry: ${escapeHTML(item.expiryDate)}
                </span>
            </div>

            <div class="table-wrapper">
                <table class="option-table">

                    <thead>
                        <tr>
                            <th>CE LTP</th>
                            <th>CE ITM / OTM</th>
                            <th>STRIKE PRICE</th>
                            <th>PE ITM / OTM</th>
                            <th>PE LTP</th>
                        </tr>
                    </thead>

                    <tbody>
        `;

    if (!boundaryRows.length) {
      html += `
                <tr>
                    <td colspan="5">
                        No ITM / OTM boundary contracts available.
                    </td>
                </tr>
            `;
    }

    boundaryRows.forEach((row) => {
      const strike = Number(row.strikePrice);

      const ce = row.CE || null;
      const pe = row.PE || null;

      const ceType = getMoneyness("CE", strike, spot);

      const peType = getMoneyness("PE", strike, spot);

      html += `
                <tr>

                    <td class="ltp-value">
                        ${formatPrice(ce?.lastPrice)}
                    </td>

                    <td class="${getMoneynessClass(ceType)}">
                        ${ce ? ceType : "--"}
                    </td>

                    <td class="strike-value">
                        ${formatPrice(strike)}
                    </td>

                    <td class="${getMoneynessClass(peType)}">
                        ${pe ? peType : "--"}
                    </td>

                    <td class="ltp-value">
                        ${formatPrice(pe?.lastPrice)}
                    </td>

                </tr>
            `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        `;

    card.innerHTML = html;

    optionTables.appendChild(card);
  });
}

/* Settings modal */

editButton.addEventListener("click", () => {
  settingsExpiry.value = selectedExpiry;
  updateSymbolDropdown();
  settingsModal.classList.add("show");
});

function closeSettings() {
  settingsModal.classList.remove("show");
}

$("closeModal").addEventListener("click", closeSettings);
$("cancelSettings").addEventListener("click", closeSettings);

settingsModal.addEventListener("click", (event) => {
  if (event.target === settingsModal) {
    closeSettings();
  }
});

/* Select all symbols */

symbolDropdown.addEventListener("change", () => {
  const values = Array.from(symbolDropdown.selectedOptions).map(
    (option) => option.value,
  );

  selectedSymbols = values.includes("ALL")
    ? [...symbols]
    : values.filter((value) => value !== "ALL");

  updateSymbolDropdown();
});

/* Apply settings */

saveSettings.addEventListener("click", async () => {
  const expiry = settingsExpiry.value;

  const values = Array.from(symbolDropdown.selectedOptions).map(
    (option) => option.value,
  );

  const newSymbols = values.includes("ALL")
    ? [...symbols]
    : values.filter((value) => value !== "ALL");

  if (!expiry) {
    alert("Please select an expiry date.");
    return;
  }

  if (!newSymbols.length) {
    alert("Please select at least one symbol.");
    return;
  }

  const oldExpiry = selectedExpiry;
  const oldSymbols = [...selectedSymbols];

  saveSettings.disabled = true;

  try {
    selectedSymbols = newSymbols;

    const params = new URLSearchParams({
      symbol: selectedSymbols[0],
    });

    const result = await apiRequest(`${API_URL}/expiries?${params.toString()}`);

    const newExpiryDates = result.expiryDates || [];

    const matchingExpiry = newExpiryDates.find(
      (date) => normalizeDate(date) === normalizeDate(expiry),
    );

    if (!matchingExpiry) {
      throw new Error(
        `Expiry ${expiry} is unavailable for ${selectedSymbols[0]}.`,
      );
    }

    expiryDates = newExpiryDates;
    selectedExpiry = matchingExpiry;

    updateExpiryDropdowns();
    saveLocalSettings();
    closeSettings();

    await loadOptionTables();
  } catch (error) {
    selectedExpiry = oldExpiry;
    selectedSymbols = oldSymbols;

    updateSymbolDropdown();
    updateExpiryDropdowns();

    alert(error.message);
  } finally {
    saveSettings.disabled = false;
  }
});

/* Refresh */

refreshButton.addEventListener("click", async () => {
  if (loading) return;

  refreshButton.disabled = true;
  refreshButton.textContent = "Loading...";

  try {
    await loadOptionTables();
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Refresh";
  }
});

/* =========================================
   LIVE DATA REFRESH - WITHOUT PAGE RELOAD
========================================= */

const AUTO_REFRESH_INTERVAL = 10000;

setInterval(async () => {
  if (document.hidden) return;

  if (loading) return;

  if (!selectedExpiry || !selectedSymbols.length) return;

  // Fetch data silently without loading overlay
  await loadOptionTables(true);
}, AUTO_REFRESH_INTERVAL);
/* =====================================
   AUTO REFRESH WITH 10 SECOND COUNTDOWN
===================================== */

let countdownValue = 10;

const countdownElement = document.getElementById("countdown");

setInterval(async () => {
  countdownValue--;

  countdownElement.textContent = countdownValue;

  if (countdownValue <= 0) {
    countdownValue = 10;

    // Refresh NSE data only
    await loadOptionChain();
  }
}, 1000);
