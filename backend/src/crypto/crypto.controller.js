const cryptoService = require("./crypto.service");

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
