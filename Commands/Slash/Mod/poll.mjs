import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    category: "Moderation",
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Creates a poll with up to ten options')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => option.setName('title')
            .setDescription('The title of the poll')
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(200)
        )
        .addStringOption(option => option.setName('option1')
            .setDescription('First option (required)')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option => option.setName('option2')
            .setDescription('Second option (required)')
            .setRequired(true)
            .setMaxLength(100)

        )
        .addStringOption(option => option.setName('option3')
            .setDescription('Third option')
            .setMaxLength(100)
        )
        .addStringOption(option => option.setName('option4')
            .setDescription('Fourth option')
            .setMaxLength(20)

        )
        .addStringOption(option => option.setName('option5')
            .setDescription('Fifth option')
            .setMaxLength(100)
        )
        .addStringOption(option => option.setName('option6')
            .setDescription('Sixth option')
            .setMaxLength(100))
        .addStringOption(option => option.setName('option7')
            .setDescription('Seventh option')
            .setMaxLength(100)
        )
        .addStringOption(option => option.setName('option8')
            .setDescription('Eighth option')
            .setMaxLength(100))
        .addStringOption(option => option.setName('option9')
            .setDescription('Ninth option')
            .setMaxLength(100))
        .addStringOption(option => option.setName('option10')
            .setDescription('Tenth option')
            .setMaxLength(100)
        )
        .addStringOption(option => option.setName('mode')
            .setDescription('The mode to show options in')
            .addChoices(
                {
                    name: "Numbers",
                    value: "num"
                },
                {
                    name: "Letters",
                    value: "li"
                },
                {
                    name: "Circles",
                    value: "cir"
                },
                {
                    name: "Squares",
                    value: "sq"
                },
                {
                    name: "Hearts",
                    value: "hea"
                },
                {
                    name: "Books",
                    value: "book"
                }
            )
        )
        .addRoleOption(option => option.setName('role')
            .setDescription('Role to mention when the poll is sent')
            .setRequired(false)
        ),
    cooldown: 10,
    /**
     * 
     * @param {Object} object 
     * @param {import('discord.js').Interaction} object.interaction 
     * @param {Bot} object.client
     * @param {Function} object.err 
     */
    run: async ({ interaction, client, err, guildData }) => {
        try {
            await interaction.reply({ content: 'Creating poll, please wait', ephemeral: true })
            //reactions
            const num = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
            const li = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯']
            const cir = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟤', '🟠', '⚪', '⚫', '🔘']
            const sq = ['🟥', '🟩', '🟦', '🟨', '🟪', '🟫', '🟧', '⬜', '⬛', '⏹️']
            const hea = ['❤️', '💚', '💙', '💛', '💜', '🤎', '🧡', '🤍', '🖤', '💟']
            const book = ['📕', '📗', '📘', '📒', '📔', '📙', '📓', '🔖', '🗒️', '📚']
            const title = interaction.options.getString('title', true)
            //command options
            const role = interaction.options.getRole('role', false)
            var mention = ""
            if (role) mention = `<@&${role.id}>`
            var params = [interaction.options.getString('option1', true), interaction.options.getString('option2', true)]
            var el = ""
            var mode = interaction.options.getString(`mode`, false) || 'num'
            var desc = ""
            var options = new Map()
            var i;
            for (i = 3; i < 11; i++) {
                el = interaction.options.getString(`option${i}`, false)
                if (el) params.push(el)
            }
            switch (mode) {
                case 'num':
                    params.forEach((p, i) => {
                        options.set(p, num[i])
                    })
                    break;
                case 'li':
                    params.forEach((p, i) => {
                        options.set(p, li[i])
                    })
                    break;
                case 'cir':
                    params.forEach((p, i) => {
                        options.set(p, cir[i])
                    })
                    break;
                case 'sq':
                    params.forEach((p, i) => {
                        options.set(p, sq[i])
                    })
                    break;
                case 'hea':
                    params.forEach((p, i) => {
                        options.set(p, hea[i])
                    })
                    break;
                case 'book':
                    params.forEach((p, i) => {
                        options.set(p, book[i])
                    })
                    break;
                default:
                    break;
            }
            options.forEach((v, k) => {
                desc += `${v} : ${k}\n`
            })
            const embed = new EmbedBuilder()
                .setTheme(guildData.Theme)
                .setTitle(title)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setDescription(desc)
                .setTimestamp()
            const msg = await interaction.channel.send({ content: mention, embeds: [embed] })
            options.forEach(async (v, k) => {
                await msg.react(v)
            })
        } catch (e) { err(e) }
    },
};