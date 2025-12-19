const express = require("express");
const router = express.Router();
const controller = require("./crypto.controller");

router.get("/", controller.listCryptos); // GET /api/crypto
router.post("/", controller.createCrypto); // POST /api/crypto
router.get("/:symbol", controller.getCrypto); // GET /api/crypto/BTC

module.exports = router;
