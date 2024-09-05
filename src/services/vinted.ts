import { Logger } from "./logger";
import { fetchItem } from "../api/fetch_item_by_id";
import { Proxy } from "./proxy";
import { delay } from "../helpers/helpers";
import dotenv from "dotenv";
import { RawItem, VintedItem } from "../types/vinted_types";
dotenv.config();

export class Vinted {
    idStep: number = 1;
    consecutiveErrorCount: number = 0;
    currentId: number = 0;
    lastPublishedTime: Date = new Date();
    maxConcurrentRequests: number;
    adjustedMaxConcurrentRequests: number;
    activePromises = new Set<Promise<any>>();
    cookie: string = "";

    constructor() {
        this.maxConcurrentRequests = Math.max(1, Math.floor(parseInt(process.env.MAX_CONCURRENT_REQUESTS || "5")));
        this.adjustedMaxConcurrentRequests = this.maxConcurrentRequests;
    }

    async init() {
        await this.refreshCookie();
        setInterval(() => {
            this.refreshCookie();
        }, 1000 * 60 * 5);
        const highestCatalogId = await this.findHighestId();
        if (highestCatalogId) {
            this.currentId = highestCatalogId;
        } else {
            throw new Error("Failed to find highest catalog ID");
        }
        // setInterval(() => {
        //     Logger.log("INFO", `Concurrent requests: ${this.activePromises.size} Current ID: ${this.currentId}  lastPublishedTime: ${this.lastPublishedTime.getTime()} ConsecutiveErrors: ${this.consecutiveErrorCount} IdStep ${this.idStep}`);
        // }, 1000);
    }

    updateCurrentId() {
        const timeSinceLastPublish = Date.now() - this.lastPublishedTime.getTime();
        if (timeSinceLastPublish > 20000) {
            this.idStep = Math.min(this.idStep * 2 + 10, 20);
        } else if (timeSinceLastPublish > 10000) {
            this.idStep = Math.min(this.idStep * 2 + 1, 5);
        } else if (timeSinceLastPublish > 5000) {
            this.idStep = Math.min(this.idStep + 1, 3);
        } else {
            this.idStep = 1;
        }
        this.currentId += this.idStep;
    }

    public async searchForItems(cb: (item: RawItem) => void) {
        if (!this.cookie) {
            await this.refreshCookie();
        }

        if (this.activePromises.size < this.adjustedMaxConcurrentRequests) {
            this.updateCurrentId();
            const newItemPromise = this.fetchAndPublishItem(cb).finally(() => {
                this.activePromises.delete(newItemPromise);
            });
            this.activePromises.add(newItemPromise);
        }

        await Promise.race([...this.activePromises]);
    }

    adjustConcurrency() {
        // If there have been more than 5 consecutive errors, reduce concurrency
        if (this.consecutiveErrorCount > 5) {
            this.adjustedMaxConcurrentRequests = Math.max(this.adjustedMaxConcurrentRequests - 1, 2);
        } else {
            const timeSinceLastPublication = Date.now() - this.lastPublishedTime.getTime();

            // Adjust concurrency based on the time since the last publication
            if (timeSinceLastPublication > 6000) {
                // Increase concurrency if more than 6 seconds have passed since last publication
                this.adjustedMaxConcurrentRequests = Math.min(this.adjustedMaxConcurrentRequests + 1, this.maxConcurrentRequests);
            } else if (timeSinceLastPublication < 1500) {
                // Decrease concurrency if less than 1.5 seconds have passed since last publication
                this.adjustedMaxConcurrentRequests = Math.max(this.adjustedMaxConcurrentRequests - 1, 2);
            }
        }

        // Ensure computedConcurrency remains within bounds
        this.adjustedMaxConcurrentRequests = Math.max(2, Math.min(this.adjustedMaxConcurrentRequests, this.maxConcurrentRequests));
    }

    public async fetchAndPublishItem(processItem: (item: RawItem) => void) {
        try {
            const response = await fetchItem(this.cookie, this.currentId);
            const item = response?.data.item;
            if (item) {
                processItem(item);
            }
            if (response?.status === 404) {
                this.consecutiveErrorCount++;
            }
        } catch (error) {
            Logger.log("ERROR", error);
        }
        // IF ITEM -> lastPublishedTime = new Date(item.updated_at_ts).getTime();
        // PUBLISH TO DISCORD LOGIC
        return;
    }

    async findHighestId() {
        const url = `https://www.vinted.pl/api/v2/catalog/items?per_page=30&order=newest_first`;
        const headers = { Cookie: this.cookie };
        const maxTries = 3;
        let tries = 0;
        while (tries < maxTries) {
            try {
                let response = await Proxy.getRequest(url, headers);
                const items: RawItem[] = response?.data.items;
                if (items && items.length > 0) {
                    const highestId = Math.max(...items.map(item => parseInt(item.id)));
                    Logger.log("INFO", `HighestId found: ${highestId}`);
                    return highestId;
                }
            } catch (error) {
                Logger.log("ERROR", error);
                tries++;
            }
        }
    }

    async searchForBrands(searchQuery: string) {
        const url = `https://www.vinted.pl/api/v2/catalog/filters/search?filter_search_code=brand&filter_search_text=${searchQuery}`;
        const headers = { Cookie: this.cookie };
        const maxTries = 3;
        let tries = 0;
        while (tries < maxTries) {
            try {
                const response = await Proxy.getRequest(url, headers);
                const brands = response?.data.options;
                console.log(brands);
                if (brands && brands.length > 0) {
                    return brands;
                }
            } catch (error) {
                Logger.log("ERROR", error);
                tries++;
            }
        }
    }

    async refreshCookie() {
        let isNewCookie = false;
        while (!isNewCookie) {
            try {
                const url = "https://www.vinted.pl/catalog?";
                const response = await Proxy.getRequest(url);
                if (response && response.headers["set-cookie"]) {
                    const cookies = response.headers["set-cookie"];
                    const vintedCookie = cookies.find(cookie => cookie.startsWith("_vinted_fr_session"));
                    if (vintedCookie) {
                        const cookie = vintedCookie.split(";")[0];
                        Logger.log("INFO", `Fetched cookie: ${cookie.length}`);
                        this.cookie = cookie;
                        isNewCookie = true;
                    } else {
                        throw new Error("Session cookie not found in the headers.");
                    }
                }
            } catch (error) {
                Logger.log("ERROR", error);
            }
        }
    }
}
