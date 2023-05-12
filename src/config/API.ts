const axios = require("axios");
export default axios.create({
  baseURL: "http://host.docker.internal:8000", //api.timwoork.com
});
