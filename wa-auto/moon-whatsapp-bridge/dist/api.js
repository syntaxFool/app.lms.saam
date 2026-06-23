"use strict";
/**
 * LMS API client — authenticated with X-API-Key header.
 * Moon uses this to check duplicates, create leads, log activities,
 * and post notifications.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lmsApi = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const api = axios_1.default.create({
    baseURL: config_1.config.lmsApiUrl,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config_1.config.moonApiKey,
        'X-Service-Name': config_1.config.serviceName,
    },
});
// Unwrap axios response to get response.data directly
api.interceptors.response.use((res) => res.data, (err) => {
    console.error(`[${config_1.config.serviceName} API] Error:`, err.response?.status, err.response?.data || err.message);
    return Promise.reject(err);
});
exports.lmsApi = {
    /** Check if a phone number already exists as a lead */
    checkDuplicate: async (phone) => {
        const encoded = encodeURIComponent(phone);
        const response = await api.get(`/leads/check-duplicate/${encoded}`);
        return response.data;
    },
    /** Create a new lead */
    createLead: async (data) => {
        const response = await api.post('/leads', data);
        return response.data;
    },
    /** Add an activity to an existing lead */
    addActivity: async (leadId, data) => {
        const response = await api.post(`/leads/${leadId}/activities`, data);
        return response.data;
    },
    /** Create a persistent notification (shows in LMS notification bell) */
    createNotification: async (payload) => {
        const response = await api.post('/notifications', payload);
        return response.data;
    },
};
