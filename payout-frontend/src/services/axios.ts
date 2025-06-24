import axios from "axios";

export const axiosService = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_API_URL,
  // timeout: 6000,
});
