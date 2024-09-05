import { ChannelType, Client, GatewayIntentBits, Guild } from "discord.js";
import { ActionRowBuilder, AnyComponentBuilder, EmbedBuilder } from "discord.js";
import axios from "axios";
import dotenv from "dotenv";
import { Logger } from "./logger";
import { RawItem } from "../types/vinted_types";
import { parseItem } from "../utils/parse_item";
import { createItemEmbed, createVintedItemActionRow } from "../utils/embed_builders";
dotenv.config();

type DiscordPostMessage = {
    content: string;
    embeds: EmbedBuilder[] | undefined;
    components: ActionRowBuilder<AnyComponentBuilder>[] | undefined;
};
type DiscordPost = {
    message: DiscordPostMessage;
    channelId?: string;
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

export const discordInit = async () => {
    try {
        await client.login(process.env.token);
    } catch (error) {
        Logger.log("ERROR", error);
    }
    client.on("ready", () => {
        Logger.log("INFO", "Discord bot is ready");
        const guildId = process.env.DISCORD_GUILD_ID;
        if (guildId) {
            client.guilds.fetch(guildId);
        }
    });
};

export const getDiscordGuild = async () => {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
        throw new Error("No guild ID found");
    }
    let guild: Guild | undefined;
    guild = client.guilds.cache.get(guildId);
    if (guild) return guild;
    guild = await client.guilds.fetch(guildId);
    if (guild) return guild;

    throw new Error("Guild not found");
};

export async function createChannelIfNotExists(channelName: string) {
    const guild = await getDiscordGuild();
    const exists = guild.channels.cache.find(c => c.name === channelName);
    if (exists) {
        throw new Error("Channel with this name already exists");
    }
    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText
    });
    return channel.id;
}

export async function createDiscordPost(rawItem: RawItem) {
    const parsedItem = parseItem(rawItem);
    if (!parsedItem) {
        throw new Error("Failed to parse raw item");
    }
    const { embed, photosEmbeds } = await createItemEmbed(parsedItem);
    const actionButtons = await createVintedItemActionRow(parsedItem);
    const post: DiscordPostMessage = {
        content: `<@everyone> ${parsedItem.title}`,
        embeds: [embed, ...photosEmbeds],
        components: [actionButtons]
    };
    return post;
}

export async function deleteDiscordChannel(channelId: string) {
    console.log("Deleting channel", channelId);
    const guild = await getDiscordGuild();
    await guild.channels.delete(channelId);
}

export async function postMessageToChannel(message: DiscordPostMessage, channelId: string) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

    const headers = {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "DiscordBot (https://vinted-bob.com, 0.2.1)"
    };
    const data = {
        content: message.content,
        embeds: message.embeds || [],
        components: message.components || []
    };
    const options = {
        url,
        method: "POST",
        headers,
        data,
        responseType: "json" as "json",
        decompress: true,
        maxContentLength: 10 * 1024 * 1024,
        maxRedirects: 5
    };
    try {
        const response = await axios(options);
        return { response, body: response.data };
    } catch (error: any) {
        const code = error.response ? error.response.status : null;
        if (code === 404) {
            throw new Error("Discord post - Channel not found.");
        } else if (code === 403) {
            throw new Error("Discord post - Access forbidden.");
        } else if (code === 429) {
            throw new Error("Discord post - 429 too many requests");
        } else {
            throw new Error(`Discord post error -: ${error.message}`);
        }
    }
}

// export const postMessageToChannel = async ({ message, channelId = "1252290704017719479" }: DiscordPost) => {
//     const url = `https://discord.com/api/v10/channels/${channelId}/messages`;

//     const headers = {
//         Authorization: `Bot ${Configuration.discordConfig.token}`,
//         "Content-Type": "application/json",
//         "User-Agent": "DiscordBot (https://your-url.com, 1.0.0)"
//     };

//     const data = {
//         content: message.content,
//         embeds: message.embeds || [],
//         components: message.components || []
//     };

//     const options = {
//         url,
//         method: "POST",
//         headers,
//         data,
//         responseType: "json" as "json",
//         decompress: true,
//         maxContentLength: 10 * 1024 * 1024,
//         maxRedirects: 5
//     };
//     try {
//         const response = await axios(options);
//         return { response, body: response.data };
//     } catch (error: any) {
//         const code = error.response ? error.response.status : null;
//         if (code === 404) {
//             throw new Error("Channel not found.");
//         } else if (code === 403) {
//             throw new Error("Access forbidden.");
//         } else if (code === 429) {
//             Logger.error("Discord 429 too many requests");
//         } else {
//             throw new Error(`Error posting message: ${error.message}`);
//         }
//     }
// };
