import { v4 as uuidv4 } from "uuid";

import { integer, pgTableCreator, primaryKey, varchar, timestamp } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator(name => `vinted-bot-front_${name}`);

export const brands = createTable("brands", {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull()
});

export const customSearch = createTable("customSearch", {
    id: varchar("id", { length: 255 })
        .notNull()
        .primaryKey()
        .$defaultFn(() => uuidv4()),
    channelId: varchar("channelId", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    phrases: varchar("phrases", { length: 255 }).notNull(),
    priceFrom: integer("priceFrom"),
    priceTo: integer("priceTo"),
    sizeIds: integer("sizeIds").array(),
    addedAt: timestamp("addedAt").notNull().defaultNow(),
    createdById: varchar("createdById", { length: 255 }).notNull()
});

export const searchWithBrands = createTable(
    "searchWithBrands",
    {
        searchId: varchar("search_id", { length: 255 })
            .notNull()
            .references(() => customSearch.id),
        brandId: varchar("brand_id", { length: 255 })
            .notNull()
            .references(() => brands.id)
    },
    table => {
        return { pk: primaryKey({ columns: [table.brandId, table.searchId] }) };
    }
);

export type Brand = typeof brands.$inferSelect;
export type CustomSearch = typeof customSearch.$inferSelect;
export type CustomSearchWithBrands = typeof customSearch.$inferSelect & {
    brands: (typeof brands.$inferSelect)[];
};
