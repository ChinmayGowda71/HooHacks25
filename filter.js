const axios = require("axios");
const { parse } = require("node-html-parser");
const fs = require('fs'); // for testing onlly

// insert openai key into a file named openai-key.txt
const OPENAI_API_KEY = "";