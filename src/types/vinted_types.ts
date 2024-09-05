export type VintedItem = {
    id: number;
    title: string;
    price: number;
    brand_title: string;
    username: string;
    photo_urls: string[];
    size: string;
    status: string;
    post_url: string;
    description: string;
};

export type RawItem = {
    id: string;
    title: string;
    brand_id: number;
    total_item_price: number;
    size_id: number | null;
    brand_dto: {
        title: string;
    };
    user: {
        login: string;
    };
    description: string;
    photos: {
        url: string;
    }[];
    size_title: string;
    status: string;
    url: string;
};
