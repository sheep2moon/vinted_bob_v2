import { Proxy } from "../services/proxy";

/**
 * Fetch a specific item by ID from Vinted.
 * @param {Object} params - Parameters for fetching an item.
 * @param {string} params.cookie - Cookie for authentication.
 * @param {number} params.item_id - ID of the item to fetch.
 * @returns {Promise<Object>} - Promise resolving to the fetched item.
 */
export async function fetchItem(cookie: string, item_id: number) {
    const url = `https://www.vinted.pl/api/v2/items/${item_id}`;
    const headers = { Cookie: cookie };
    const response = await Proxy.getRequest(url, headers);

    if (!response) {
        return null;
    }

    return response;
}
