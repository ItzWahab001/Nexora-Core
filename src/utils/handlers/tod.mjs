import { getTod, EmbedBuilder, logger } from '../index.mjs';

/**@type {import('./index.mjs').BasicParamHandler} */
export const TruthOrDareHandler = async (interaction, data) => {
    try {
        const { client } = interaction
        if (interaction.isButton() && interaction?.customId.includes("tod:")) {
            let type = interaction.customId.split(":")[1]
            const subType = interaction.customId.split(":")[2]
            const user = interaction.customId.split(":")[3]
            if (user !== interaction.user.id) return await interaction.safeReply({
                content: "You Cant use these buttons",
                ephemeral: true
            })

            const row = interaction.message.components[0];

            if (type === "Random") type = Math.random() < 0.5 ? "Truth" : "Dare"
            const guildData = data

            const embed = new EmbedBuilder().setTheme(guildData.Theme)
                .setTitle(getTod(type, subType))
                .setAuthor({
                    name: interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({
                        forceStatic: false
                    })
                })
                .setFooter({ text: type + ": " + subType });

            await interaction.msg.safeEdit({ components: [] });

            await interaction.safeReply({
                embeds: [embed],
                components: [row]
            });

        }
    } catch (e) { logger(e, "error") }
}
