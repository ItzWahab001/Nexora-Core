import { Collection, PermissionsBitField, Message } from "discord.js";
import Bot from "../../client.mjs";
import {
    AutoDelete,
    Counting,
    CustomCommandHandler,
    LevelHandler,
    MessageModeHandler,
    RoleCommandHandler,
    StickyMessagesHandler,
    WordReactHandler,
    prefixHandler,
} from "../../utils/handlers/index.mjs";

import { logger, escapeRegex, automod } from "../../utils/index.mjs";

export default {
    name: "messageCreate",
    /**
     * @param {Bot} client - The Discord client.
     * @param {Message} message - The message object.
     */
    run: async (client, message) => {
        try {
            if (message.system || !message.guild) return;
            const guildData = await message.guild.fetchData();

            if (guildData?.AutoDelete?.Enable) AutoDelete(message, guildData);

            if (message.author.bot) return;

            //* Custom Commands
            if (guildData?.CustomCommands?.Enable) await CustomCommandHandler(message, guildData);
            if (guildData?.RolesCommands?.List.length) await RoleCommandHandler(message, guildData);

            if (guildData.Levels == true) await LevelHandler(message, guildData)
            if(guildData.StickyMessages?.Enable) await StickyMessagesHandler(message, guildData)
            if(guildData.WordReact?.List?.length) await WordReactHandler(message, guildData)
            // if (guildData?.Count?.Enable) await Counting(message, guildData)

            if (guildData?.AutoMod?.Enable && message?.id) await automod.performAutomod(message, guildData);
            // if (guildData?.AI.Enable && guildData?.AI?.Channel === message.channelId) await ChatBot(message, guildData);
            MessageModeHandler(message, guildData)
        } catch (error) {
            logger(error, "error");
        }
    },
};
