"use strict";
const axios = require('axios');
module.exports = axios.create({
    baseURL: "https://api.timwoork.com/",
    withCredentials: true,
});
