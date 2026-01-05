const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.API_BASE_URL;

class CmcClient {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        "X-CMC_PRO_API_KEY": API_KEY,
        Accept: "application/json",
      },
    });
  }

  // Get latest listings IDs
  async getLatestListings(limit = 20) {
    try {
      const response = await this.client.get(
        "/v1/cryptocurrency/listings/latest",
        {
          params: { limit: limit },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error(
        "CMC Listings Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // Get rich metadata (Logo, URLs, Description) for specific IDs
  async getMetadata(ids) {
    try {
      const response = await this.client.get("/v2/cryptocurrency/info", {
        params: { id: ids },
      });
      return response.data.data;
    } catch (error) {
      console.error(
        "CMC Metadata Error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

module.exports = new CmcClient();
