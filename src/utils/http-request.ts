import axios from "axios";
import randomUserAgent from "random-useragent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { Logger } from "../services/logger";
import { delay } from "../helpers/helpers";
const PLATFORMS: { [key: string]: string } = {
    Windows: "Windows",
    macOS: "Mac",
    Linux: "Linux",
    Android: "Android",
    iOS: "iPhone",
    "Windows Phone": "Windows Phone"
};
export const makeGetRequest = async (url: string, headers = {}, agent: SocksProxyAgent) => {
    const userAgent = randomUserAgent.getRandom();
    const platform = Object.keys(PLATFORMS).find(key => userAgent.includes(PLATFORMS[key])) || "Windows";

    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const timeoutId = setTimeout(() => {
        source.cancel("Request timed out after 3000ms");
    }, 3000);

    const options = {
        url,
        method: "GET",
        headers: {
            "User-Agent": userAgent,
            "Accept-Encoding": "gzip, deflate, br",
            Platform: platform,
            "Accept-Language": "pl-PL,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            Referer: "https://vinted.pl/",
            Origin: "https://www.vinted.pl/catalog",
            DNT: "1",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document",
            TE: "Trailers",
            Pragma: "no-cache",
            Priority: "u=0, i",
            ...headers
        },
        httpsAgent: agent,
        httpAgent: agent,
        responseType: "json" as "json",
        timeout: 3000,
        cancelToken: source.token
    };

    try {
        const response = await axios(options);
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        const code = error.response ? error.response.status : null;
        if (code === 404) {
            throw Error("Resource not found.");
        } else if (code === 403) {
            throw Error("Access forbidden.");
        } else if (code === 429) {
            throw Error("Rate limit exceeded.");
        } else {
            throw Error(`Error making GET request: ${error.message}`);
        }
    }
};

export function isValidHttpUrl(str: string) {
    let url;

    try {
        url = new URL(str);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}
