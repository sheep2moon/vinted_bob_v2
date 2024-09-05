import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder } from "discord.js";
import { VintedItem } from "../types/vinted_types";

async function createBaseEmbed(title: string, description: string, color: ColorResolvable) {
    const embed = new EmbedBuilder().setTitle(`${title}`).setDescription(`📄 ${description}`).setColor(color).setTimestamp();

    return embed;
}

async function createBaseUrlButton(label: string, url: string) {
    return new ButtonBuilder().setLabel(`${label}`).setStyle(ButtonStyle.Link).setURL(`${url}`);
}

export async function createItemEmbed(item: VintedItem) {
    console.log("Create embed with - ", JSON.stringify(item));

    const embed = await createBaseEmbed(item.title, item.description, "Grey");
    embed.setURL(item.post_url);

    const photosEmbeds = [];
    const maxPhotos = 3;

    const first_photo_url = item.photo_urls[0];
    embed.addFields(
        { name: "Cena", value: `${item.price}zł`, inline: true },
        { name: "Rozmiar", value: `${item.size || "Brak"}`, inline: true },
        { name: "Stan", value: `${item.status || "Brak"}`, inline: true },
        { name: "Marka", value: `${item.brand_title || "Brak"}`, inline: true }
    );

    for (let i = 1; i < item.photo_urls.length && i < maxPhotos; i++) {
        const photo_url = item.photo_urls[i];

        const photoEmbed = new EmbedBuilder().setImage(`${photo_url}`).setURL(`${item.post_url}`);

        photosEmbeds.push(photoEmbed);
    }

    embed.setImage(first_photo_url);
    return { embed, photosEmbeds };
}

export async function createVintedItemActionRow(item: VintedItem) {
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    actionRow.addComponents(await createBaseUrlButton("🔗 Zobacz na Vinted", item.post_url));

    return actionRow;
}
