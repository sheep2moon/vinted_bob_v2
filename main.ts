import { delay } from "./src/helpers/helpers";
import { ItemManager } from "./src/services/item_manager";
import { Logger } from "./src/services/logger";
import { Proxy } from "./src/services/proxy";
import { Vinted } from "./src/services/vinted";
import express, { Request, Response } from "express";
import cors from "cors";
import { db } from "./src/db";
import { customSearch, searchWithBrands } from "./src/db/schema";
import { AddSearchFormData } from "./src/types/frontend";
import { createChannelIfNotExists, deleteDiscordChannel, discordInit } from "./src/services/discord";
import { createChannel } from "discord.js";
import { eq } from "drizzle-orm";

const app = express();
app.use(cors());
app.use(express.json());
app.listen(3001, () => {
    console.log("Server started on port 3001");
});

app.get("/brands", async (req, res) => {
    const searchText = typeof req.query.search_text === "string" ? req.query.search_text : "";
    if (searchText.length < 3) {
        res.status(400).send("Search text must be at least 3 characters long");
        return;
    }
    const brands = await vinted.searchForBrands(searchText);
    if (brands && brands.length > 0) {
        res.send(brands);
    } else {
        res.status(404).send("Not found brands for search text: " + searchText);
    }
    return;
});

app.post("/add-search", async (req: Request, res: Response) => {
    const data: AddSearchFormData = req.body;
    if (!data) return res.status(400).send("No data");
    try {
        const channelId = await createChannelIfNotExists(data.name);
        const search = await db
            .insert(customSearch)
            .values({
                channelId,
                title: data.name,
                phrases: data.phrases.join(","),
                priceFrom: data.priceFrom,
                priceTo: data.priceTo,
                sizeIds: data.sizeIds.map(sizeId => parseInt(sizeId))
            })
            .returning({ id: customSearch.id });
        console.log(data);

        const searchId = search[0].id;
        Promise.all(
            data.brandIds.map(brandId => {
                return db.insert(searchWithBrands).values({
                    searchId,
                    brandId
                });
            })
        );
        await item_manager.refreshSearches();
    } catch (error) {
        Logger.log("ERROR", error);
        res.status(500).send(error);
    }

    console.log("Added to DB");
    return res.status(200).send("OK");
});

app.post("/delete-search", async (req: Request, res: Response) => {
    const deleteId = req.body.searchId ?? null;
    console.log(req.body);

    if (!deleteId) return res.status(400).send("No searchId");
    try {
        await db.delete(searchWithBrands).where(eq(searchWithBrands.searchId, deleteId));
        const deletedSearch = await db.delete(customSearch).where(eq(customSearch.id, deleteId)).returning({ channelId: customSearch.channelId });
        const channelId = deletedSearch[0].channelId;
        if (channelId) {
            await deleteDiscordChannel(channelId);
        }
        await item_manager.refreshSearches();

        res.status(200).send("OK");
    } catch (error) {
        Logger.log("ERROR", error);
        res.status(500).send(error);
    }
    return;
});

const vinted = new Vinted();
const item_manager = new ItemManager();

const startBot = async () => {
    await item_manager.init();
    await Proxy.init();
    await vinted.init();
    await discordInit();
    while (true) {
        try {
            await vinted.searchForItems(item_manager.processItem);
        } catch (error) {
            Logger.log("ERROR", error);
        }
    }
};

startBot();
