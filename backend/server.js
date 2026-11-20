/* =====================================================
   OPTIONS TRACKER
   LOCAL BACKEND
   NODE.JS + EXPRESS + AXIOS
===================================================== */

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

const app = express();
const PORT = process.env.PORT || 3000;

const NSE_BASE = "https://www.nseindia.com";

const EXPIRY_API = `${NSE_BASE}/api/option-chain-contract-info`;

const OPTION_API = `${NSE_BASE}/api/option-chain-v3`;

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

/* =====================================================
   NSE SYMBOLS
===================================================== */

const SYMBOLS = [
  "ABCAPITAL",
  "RELIANCE",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "INFY",
  "TCS",
  "ITC",
  "AXISBANK",
  "KOTAKBANK",
  "LT",
  "BAJFINANCE",
  "BHARTIARTL",
  "MARUTI",
  "HINDUNILVR",
];

/* =====================================================
   NSE SESSION
===================================================== */

const cookieJar = new CookieJar();

const nseClient = wrapper(
  axios.create({
    jar: cookieJar,
    timeout: 30000,
    maxRedirects: 5,

    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",

      Accept: "application/json, text/plain, */*",

      "Accept-Language": "en-US,en;q=0.9",

      "Accept-Encoding": "gzip, deflate, br",

      "X-Requested-With": "XMLHttpRequest",

      Referer: `${NSE_BASE}/option-chain`,

      Origin: NSE_BASE,

      Connection: "keep-alive",
    },
  }),
);

let sessionReady = false;
let sessionPromise = null;

/* =====================================================
   INITIALIZE NSE SESSION
===================================================== */

async function initializeNSE() {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      console.log("Initializing NSE session...");

      sessionReady = false;

      await nseClient.get(`${NSE_BASE}/option-chain`);

      sessionReady = true;

      console.log("NSE session initialized.");
      return true;
    } catch (error) {
      sessionReady = false;

      console.error(
        "NSE SESSION ERROR:",
        error.response?.status,
        error.message,
      );

      throw new Error(
        `NSE session initialization failed: ${
          error.response?.status || error.message
        }`,
      );
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

/* =====================================================
   NSE REQUEST
===================================================== */

async function nseGet(url, params = {}) {
  if (!sessionReady) {
    await initializeNSE();
  }

  try {
    const response = await nseClient.get(url, {
      params,
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      console.log("NSE session expired. Retrying...");

      sessionReady = false;

      await initializeNSE();

      const retry = await nseClient.get(url, {
        params,
        timeout: 30000,
      });

      return retry.data;
    }

    throw error;
  }
}

/* =====================================================
   HELPERS
===================================================== */

function validateSymbol(symbol) {
  return SYMBOLS.includes(
    String(symbol || "")
      .trim()
      .toUpperCase(),
  );
}

function normalizeExpiry(value) {
  if (!value) return "";

  const months = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  const match = String(value)
    .trim()
    .match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})$/);

  if (match) {
    const month = months[match[2].toUpperCase()];

    if (!month) return "";

    return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getExpiryDates(response) {
  const possibleLists = [
    response?.expiryDates,
    response?.records?.expiryDates,
    response?.filtered?.expiryDates,
  ];

  return possibleLists.find(Array.isArray) || [];
}

function getOptionRows(response) {
  const possibleRows = [
    response?.records?.data,
    response?.filtered?.data,
    response?.data,
  ];

  return possibleRows.find(Array.isArray) || [];
}

function getUnderlyingValue(response) {
  return (
    response?.records?.underlyingValue ??
    response?.filtered?.underlyingValue ??
    response?.underlyingValue ??
    null
  );
}

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend Connected",
    nseSessionReady: sessionReady,
    dataSource: "NSE India",
    localServer: true,
  });
});

/* =====================================================
   SYMBOL LIST
===================================================== */

app.get("/api/symbols", (req, res) => {
  res.json({
    success: true,
    totalSymbols: SYMBOLS.length,
    symbols: SYMBOLS,
  });
});

/* =====================================================
   EXPIRY DATES
===================================================== */

app.get("/api/expiries", async (req, res) => {
  const symbol = String(req.query.symbol || "RELIANCE")
    .trim()
    .toUpperCase();

  if (!validateSymbol(symbol)) {
    return res.status(400).json({
      success: false,
      message: "Invalid NSE symbol",
      symbol,
    });
  }

  try {
    console.log("Loading expiry:", symbol);

    const response = await nseGet(EXPIRY_API, {
      symbol,
    });

    const expiryDates = getExpiryDates(response);

    if (!expiryDates.length) {
      return res.status(502).json({
        success: false,
        message: "NSE returned no expiry dates",
        symbol,
        nseResponse: response,
      });
    }

    res.json({
      success: true,
      symbol,
      totalExpiries: expiryDates.length,
      expiryDates,
    });
  } catch (error) {
    console.error("EXPIRY ERROR:", error.message);

    res.status(502).json({
      success: false,
      message: "Unable to fetch expiry dates",
      error: error.message,
      status: error.response?.status || null,
      details: error.response?.data || null,
    });
  }
});

/* =====================================================
   FETCH OPTION CHAIN FOR ONE SYMBOL
===================================================== */

async function getOptionChain(symbol, expiry) {
  const response = await nseGet(OPTION_API, {
    type: "Equity",
    symbol,
    expiry,
  });

  const rows = getOptionRows(response);

  const underlyingValue = getUnderlyingValue(response);

  if (!rows.length) {
    return {
      symbol,
      success: true,
      expiryDate: expiry,
      underlyingValue,
      totalContracts: 0,
      data: [],
      message: "NSE returned no contracts",
    };
  }

  const requestedExpiry = normalizeExpiry(expiry);

  const matchingRows = rows.filter((row) => {
    if (!row.expiryDate) {
      return true;
    }

    return normalizeExpiry(row.expiryDate) === requestedExpiry;
  });

  const sortedRows = matchingRows.sort(
    (a, b) => Number(a.strikePrice) - Number(b.strikePrice),
  );

  console.log(
    `${symbol}: NSE rows=${rows.length}, matched=${sortedRows.length}`,
  );

  return {
    symbol,
    success: true,
    expiryDate: expiry,
    underlyingValue,
    totalContracts: sortedRows.length,
    timestamp:
      response?.records?.timestamp || response?.filtered?.timestamp || null,
    data: sortedRows,
    message: sortedRows.length
      ? "Option chain loaded"
      : "No contracts for selected expiry",
  };
}

/* =====================================================
   OPTION CHAIN FOR MULTIPLE SYMBOLS
===================================================== */

app.get("/api/option-chain", async (req, res) => {
  const expiry = String(req.query.expiry || "").trim();

  if (!expiry) {
    return res.status(400).json({
      success: false,
      message: "Expiry date is required",
    });
  }

  let requestedSymbols = req.query.symbols
    ? req.query.symbols.split(",")
    : ["RELIANCE"];

  requestedSymbols = [
    ...new Set(requestedSymbols.map((symbol) => symbol.trim().toUpperCase())),
  ];

  if (!requestedSymbols.length) {
    return res.status(400).json({
      success: false,
      message: "Select at least one symbol",
    });
  }

  const invalidSymbols = requestedSymbols.filter(
    (symbol) => !validateSymbol(symbol),
  );

  if (invalidSymbols.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid symbols",
      invalidSymbols,
    });
  }

  try {
    console.log("\n========== OPTION CHAIN ==========");
    console.log("Expiry:", expiry);
    console.log("Symbols:", requestedSymbols);

    const results = [];

    // Keep requests sequential to reduce NSE request load.
    for (const symbol of requestedSymbols) {
      try {
        const result = await getOptionChain(symbol, expiry);

        results.push(result);
      } catch (error) {
        console.error(
          `${symbol} ERROR:`,
          error.response?.status,
          error.message,
        );

        results.push({
          symbol,
          success: false,
          expiryDate: expiry,
          underlyingValue: null,
          totalContracts: 0,
          data: [],
          error: error.response?.status
            ? `NSE HTTP ${error.response.status}: ${error.message}`
            : error.message,
        });
      }
    }

    const loadedCount = results.filter(
      (item) => item.success && item.data.length > 0,
    ).length;

    console.log("Loaded symbols:", loadedCount);
    console.log("==================================\n");

    res.json({
      success: true,
      expiry,
      totalSymbols: results.length,
      loadedCount,
      tables: results,
    });
  } catch (error) {
    console.error("OPTION CHAIN FATAL ERROR:", error);

    res.status(502).json({
      success: false,
      message: "Unable to fetch option-chain data",
      error: error.message,
      status: error.response?.status || null,
      details: error.response?.data || null,
    });
  }
});

/* =====================================================
   ROOT PAGE
===================================================== */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* =====================================================
   API NOT FOUND
===================================================== */

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, () => {
  console.log("");
  console.log("==================================");
  console.log("       OPTIONS TRACKER");
  console.log("==================================");
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Symbols: http://localhost:${PORT}/api/symbols`);
  console.log("NSE Source: NSE India");
  console.log("==================================");
});
