// Thin Vercel entry (api/*.js). Heavy handler lives in lib/ so the function is registered.
export { default } from '../lib/handlers/movix-proxy.js';
