const express = require("express");
const router = express.Router();
const controller = require("./crypto.controller");

router.get("/", controller.listCryptos); // GET /api/crypto
router.post("/", controller.createCrypto); // POST /api/crypto
router.get("/search", controller.search); // GET /api/crypto/search
router.get("/:symbol", controller.getCrypto); // GET /api/crypto/BTC
router.get("/:symbol/semantic", controller.getSemanticDetails); // GET /api/crypto/BTC/semantic
router.get("/:symbol/live", controller.getLivePrice);

module.exports = router;
