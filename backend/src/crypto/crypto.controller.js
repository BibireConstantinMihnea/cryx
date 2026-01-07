const cryptoService = require("./crypto.service");
const axios = require("axios");

exports.listCryptos = async (req, res) => {
  try {
    const data = await cryptoService.getAllCryptos();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCrypto = async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await cryptoService.getCryptoBySymbol(symbol);

    if (!data) return res.status(404).json({ message: "Crypto not found" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCrypto = async (req, res) => {
  try {
    const { symbol, name, type } = req.body;
    if (!symbol || !name || !type) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const result = await cryptoService.createCrypto({ symbol, name, type });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSemanticDetails = async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await cryptoService.getSemanticDetails(symbol);

    if (Object.keys(data).length === 0) {
      return res.status(404).json({ message: "Crypto not found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLivePrice = async (req, res) => {
  try {
    const { symbol } = req.params;

    const apiKey = process.env.API_KEY;
    const baseUrl = process.env.API_BASE_URL;

    if (!apiKey || !baseUrl) {
      console.error("MISSING .ENV CONFIG: Check API_KEY and API_BASE_URL");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const apiUrl = `${baseUrl}v1/cryptocurrency/quotes/latest`;

    const response = await axios.get(apiUrl, {
      headers: { "X-CMC_PRO_API_KEY": apiKey },
      params: { symbol: symbol, convert: "USD" },
    });

    const data = response.data.data[symbol];

    if (!data) return res.status(404).json({ message: "Symbol not found on CMC" });

    res.json({
      price_usd: data.quote.USD.price,
      change_24h: data.quote.USD.percent_change_24h,
      market_cap: data.quote.USD.market_cap,
      last_updated: data.quote.USD.last_updated,
    });
  } catch (err) {
    console.error("CMC Error:", err.response?.data || err.message);
    
    res.json({ price_usd: null, error: "External API Error" });
  }
};