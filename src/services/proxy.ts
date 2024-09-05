import { SocksProxyAgent } from "socks-proxy-agent";
import { Logger } from "./logger";
import { makeGetRequest } from "../utils/http-request";
import { delay } from "../helpers/helpers";
import dotenv from "dotenv";
dotenv.config();
// const proxyConfig = {
//     host: process.env.PROXY_HOST || "127.0.0.1",
//     port: parseInt(process.env.PROXY_PORT || "80"),
//     username: process.env.PROXY_USERNAME || "",
//     password: process.env.PROXY_PASSWORD || ""
// };

export class Proxy {
    static proxies = [];
    static currentProxyIndex = 0;

    static async init() {
        this.proxies = await getProxies();
    }

    static getProxyAgent() {
        if (this.proxies.length > 0) {
            const proxy = this.proxies[this.currentProxyIndex];
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
            return new SocksProxyAgent(proxy);
        }
    }

    static async getRequest(url: string, headers: { [key: string]: string } = {}) {
        const agent = this.getProxyAgent();
        if (!agent) {
            Logger.log("ERROR", "Invalid proxy agent");
            return null;
        }
        const response = await makeGetRequest(url, headers, agent);
        return response;
    }
}

export async function getProxies() {
    const url = new URL("https://proxy.webshare.io/api/v2/proxy/list/");
    url.searchParams.append("mode", "direct");
    url.searchParams.append("page_size", "9999");

    const options = {
        method: "GET",
        headers: {
            Authorization: "Token " + process.env.PROXY_API_KEY
        }
    };
    while (true) {
        const req = await fetch(url.href, options);
        const res = await req.json();
        if (res.results.length > 0) {
            console.log(res.results.length);

            const proxyUrls = res.results.map((proxy: any) => `socks://${proxy.username}:${proxy.password}@${proxy.proxy_address}:${proxy.port}`);
            return proxyUrls;
        }
        await delay(1000);
        Logger.log("INFO", "No proxies found, retrying in 1 second");
    }
}

// function getProxyAgent() {
//     const proxyURI = `socks://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
//     return new SocksProxyAgent(proxyURI);
// }

// export async function proxyGetRequest(url: string, headers: { [key: string]: string } = {}) {
//     const agent = getProxyAgent();
//     const response = await makeGetRequest(url, headers, agent);
//     return response;
// }
