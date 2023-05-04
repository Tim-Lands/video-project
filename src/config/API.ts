const axios = require("axios");
export default axios.create({
  baseURL: "https://api.timwoork.com/", //api.timwoork.com
  withCredentials: true,
});
