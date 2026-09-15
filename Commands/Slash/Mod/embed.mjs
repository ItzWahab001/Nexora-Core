import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import { isHex } from '../../../src/utils/index.mjs';

/**@type {import('../../../src/utils/Command.mjs').interaction} */
export default {
    category: "Moderation",
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Creates a custom embed and send in channel!')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option => option.setName('channel')
            .setDescription('Channel where you want to send embed')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
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
            await interaction.deferReply({
                ephemeral: true
            })
            const channel = interaction.options.getChannel("channel");
            if (!channel.canSendEmbeds()) {
                return interaction.followUp("I don't have permission to send embeds in that channel");
            }
            interaction.followUp(`Embed setup started in ${channel}`);
            await embedSetup(channel, interaction.member);
        } catch (e) { err(e) }
    },
};



/**
 * @param {import('discord.js').GuildTextBasedChannel} channel
 * @param {import('discord.js').GuildMember} member
 */
async function embedSetup(channel, member) {
    const sentMsg = await channel.send({
        content: "Click the button below to get started",
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("EMBED_ADD").setLabel("Create Embed").setStyle(1)
            ),
        ],
    });

    const btnInteraction = await channel
        .awaitMessageComponent({
            componentType: 0,
            filter: (i) => i.customId === "EMBED_ADD" && i.member.id === member.id && i.message.id === sentMsg.id,
            time: 20000,
        })
        .catch((ex) => { });

    if (!btnInteraction) return sentMsg.edit({ content: "No response received", components: [] });

    await btnInteraction.showModal(
        new ModalBuilder({
            customId: "EMBED_MODAL",
            title: "Embed Generator",
            components: [
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("title")
                        .setLabel("Embed Title")
                        .setStyle(1)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("author") //image  
                        .setLabel("Image")
                        .setStyle(1)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("description")
                        .setLabel("Embed Description")
                        .setStyle(2)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("color")
                        .setLabel("Embed hex code")
                        .setValue("ffffff")
                        .setStyle(1)
                        .setMinLength(6)
                        .setMaxLength(6)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("footer")
                        .setLabel("Embed Footer")
                        .setStyle(1)
                        .setRequired(false)
                ),
            ],
        })
    );

    // receive modal input
    const modal = await btnInteraction
        .awaitModalSubmit({
            time: 1 * 60 * 1000,
            filter: (m) => m.customId === "EMBED_MODAL" && m.member.id === member.id && m.message.id === sentMsg.id,
        })
        .catch((ex) => { });

    if (!modal) return sentMsg.edit({ content: "No response received, cancelling setup", components: [] });

    await modal.deferUpdate();

    const title = modal.fields.getTextInputValue("title");
    const author = modal.fields.getTextInputValue("author");
    const description = modal.fields.getTextInputValue("description");
    const footer = modal.fields.getTextInputValue("footer");
    const color = modal.fields.getTextInputValue("color");

    if (!title && !author && !description && !footer)
        return sentMsg.edit({ content: "You can't send an empty embed!", components: [] });

    const embed = new EmbedBuilder();
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (author) embed.setImage(author)
    if (footer) embed.setFooter({ text: footer });
    if ((color && isHex(color))) embed.setColor(`#${color}`);

    // add/remove field button
    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("EMBED_FIELD_ADD").setLabel("Add Field").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("EMBED_FIELD_REM").setLabel("Remove Field").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("EMBED_FIELD_DONE").setLabel("Done").setStyle(ButtonStyle.Primary)
    );

    await sentMsg.edit({
        content: "Please add fields using the buttons below. Click done when you are done.",
        embeds: [embed],
        components: [buttonRow],
    });

    const collector = channel.createMessageComponentCollector({
        componentType: 0,
        filter: (i) => i.member.id === member.id,
        message: sentMsg,
        idle: 5 * 60 * 1000,
    });

    collector.on("collect", async (interaction) => {
        if (interaction.customId === "EMBED_FIELD_ADD") {
            await interaction.showModal(
                new ModalBuilder({
                    customId: "EMBED_ADD_FIELD_MODAL",
                    title: "Add Field",
                    components: [
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("name")
                                .setLabel("Field Name")
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("value")
                                .setLabel("Field Value")
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("inline")
                                .setLabel("Inline? (true/false)")
                                .setStyle(TextInputStyle.Short)
                                .setValue("true")
                                .setRequired(true)
                        ),
                    ],
                })
            );

            // receive modal input
            const modal = await interaction
                .awaitModalSubmit({
                    time: 5 * 60 * 1000,
                    filter: (m) => m.customId === "EMBED_ADD_FIELD_MODAL" && m.member.id === member.id,
                })
                .catch((ex) => { });

            if (!modal) return sentMsg.edit({ components: [] });

            modal.reply({ content: "Field added", ephemeral: true }).catch((ex) => { });

            const name = modal.fields.getTextInputValue("name");
            const value = modal.fields.getTextInputValue("value");
            let inline = modal.fields.getTextInputValue("inline").toLowerCase();

            if (inline === "true") inline = true;
            else if (inline === "false") inline = false;
            else inline = true; // default to true

            const fields = embed.embed.data.fields || [];
            fields.push({ name, value, inline });
            embed.setFields(fields);
        }

        // remove field
        else if (interaction.customId === "EMBED_FIELD_REM") {
            const fields = embed.embed.data.fields;
            if (fields) {
                fields.pop();
                embed.setFields(fields);
                interaction.reply({ content: "Field removed", ephemeral: true });
            } else {
                interaction.reply({ content: "There are no fields to remove", ephemeral: true });
            }
        }

        // done
        else if (interaction.customId === "EMBED_FIELD_DONE") {
            return collector.stop();
        }

        await sentMsg.edit({ embeds: [embed] });
    });

    collector.on("end", async (_collected, _reason) => {
        await sentMsg.edit({ content: "", components: [] });
    });
}
