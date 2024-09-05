import { eq } from "drizzle-orm";
import { db } from "../db";
import { Brand, brands, customSearch, CustomSearch, CustomSearchWithBrands, searchWithBrands } from "../db/schema";
import { RawItem } from "../types/vinted_types";
import { createDiscordPost, postMessageToChannel } from "./discord";

export class ItemManager {
    searches: CustomSearchWithBrands[] = [];

    async init() {
        await this.refreshSearches();
    }

    public processItem = async (item: RawItem) => {
        console.log("PROCESSING ITEM", `${item.title}, ${item.brand_dto.title}`);
        console.log(this.searches);

        if (!this.searches || this.searches.length === 0) throw new Error("No searches found");
        for (const search of this.searches) {
            console.log("SEARCH", search.title);

            let phraseMatch = true;
            if (search.phrases) {
                phraseMatch = matchSearchPhrases(search.phrases.split(","), item.title, item.description);
            }

            let brandMatch = true;
            if (search.brands.length > 0) {
                brandMatch = matchBrands(
                    search.brands.map(brand => parseInt(brand.id)),
                    item.brand_id
                );
            }

            let priceMatch = true;
            if (search.priceFrom && search.priceTo) {
                priceMatch = matchPrice(search.priceFrom, search.priceTo, item.total_item_price);
            }

            let sizeMatch = true;
            if (search.sizeIds && search.sizeIds.length > 0 && item.size_id) {
                sizeMatch = matchSize(search.sizeIds, item.size_id);
            }

            if (phraseMatch && brandMatch && priceMatch) {
                console.log("MATCHED SEARCH", search.title);
                const discordPost = await createDiscordPost(item);
                await postMessageToChannel(discordPost, search.channelId);
            }
        }
    };

    public async refreshSearches() {
        const result = await db
            .select({
                search: customSearch,
                brands: brands
            })
            .from(customSearch)
            .leftJoin(searchWithBrands, eq(customSearch.id, searchWithBrands.searchId))
            .leftJoin(brands, eq(searchWithBrands.brandId, brands.id));
        const searches = new Map<string, CustomSearch & { brands: Brand[] }>();
        for (const search of result) {
            const searchId = search.search.id;
            if (!searches.has(searchId)) {
                searches.set(searchId, {
                    ...search.search,
                    brands: []
                });
            }
            if (search.brands) {
                searches.get(searchId)?.brands.push(search.brands);
            }
        }
        const searchesArray: CustomSearchWithBrands[] = Array.from(searches.values());
        this.searches = searchesArray;
    }
}

function matchSearchPhrases(searchWords: string[], itemTitle: string, itemDescription: string) {
    if (searchWords.length === 0) {
        return true;
    }
    return searchWords.some(searchWord => {
        const searchWordLower = searchWord.toLowerCase();
        return itemTitle.toLowerCase().includes(searchWordLower) || itemDescription.toLowerCase().includes(searchWordLower);
    });
}

function matchBrands(brandIds: number[], itemBrandId: number) {
    return brandIds.includes(itemBrandId);
}

function matchPrice(min: number, max: number, itemPrice: number) {
    if (itemPrice > min && itemPrice < max) {
        return true;
    }
    return false;
}

function matchSize(sizeIds: number[], itemSizeId: number) {
    return sizeIds.includes(itemSizeId);
}
