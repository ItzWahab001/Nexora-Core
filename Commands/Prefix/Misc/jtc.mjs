import { Message } from 'discord.js';
import GlobalConfig from '../../../Assets/Global/config.mjs';
import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';
import { JTC_CoreHandler, tasksWithRes } from '../../../src/utils/handlers/JoinToCreate.mjs';

/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    // ignore: true,
    name: "voice",
    description: "Voice Master aka Join To Create",
    cooldown: 5,
    aliases: ["v", "jtc"],
    category: "Misc",
    options: [
        {
            name: GlobalConfig.JoinToCreate.Actions.filter(x => !tasksWithRes.includes(x)).join("/"),
            type: "string",
            id: "action",
            required: true,
            choices: GlobalConfig.JoinToCreate.Actions.filter(x => !tasksWithRes.includes(x))
        }
    ],
    permissions: {
        user: ["ManageMessages", "SendMessages"],
        bot: ["ManageMessages"]
    },
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const action = GlobalConfig.JoinToCreate.Actions.find(x => x.toLowerCase() === options.get("action")?.toLowerCase())
            await JTC_CoreHandler(message, guildData, action)
        } catch (error) {
            err(error)
        }
    }
};