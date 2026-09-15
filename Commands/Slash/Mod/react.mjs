import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { parseEmoji } from '../../../src/utils/emoji.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    data: new SlashCommandBuilder()
        .setName('react')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('React to a message with an emoji (Staff only)')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('The ID of the message to react to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji to react with (can be an emoji name or custom emoji ID)')
                .setRequired(true)),
    category: 'Moderation',
    cooldown: 5,
    run: async ({ interaction, client, err, guildData }) => {
        try {

            const messageId = interaction.options.getString('message_id');
            const emoji = interaction.options.getString('emoji');

            
            // Fetch the message
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId);

            if (!message) {
                return interaction.reply({content: 'Message not found. Message should be in the same channel as the command'});
            }

            const parsedEmoji = parseEmoji(emoji);

            if(!parsedEmoji) return interaction.reply({
                content: "Invaild emotes"
            })

            // React to the message
            await message.react(parsedEmoji);

            await interaction.reply('Reaction added successfully.');
        } catch (error) {
            err(error);
        }
    }
};
