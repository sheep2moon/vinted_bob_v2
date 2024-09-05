import { RawItem, VintedItem } from "../types/vinted_types";

export const parseItem = (item: RawItem) => {
    if (item.id) {
        const parsedItem: VintedItem = {
            id: parseInt(item.id),
            title: item.title,
            price: item.total_item_price,
            brand_title: item.brand_dto.title,
            username: item.user.login,
            description: item.description,
            photo_urls: item.photos.map((photo: any) => photo.url),
            size: item.size_title || "brak",
            status: item.status,
            post_url: item.url
        };
        return parsedItem;
    }
};
