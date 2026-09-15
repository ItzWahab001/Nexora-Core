import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { EmbedBuilder } from '../../../src/utils/index.mjs';

/**@type {import("../../../src/utils/Command.mjs").interaction} */
export default {
    category: "Misc",
    data: new SlashCommandBuilder()
        .setName("notes")
        .setDescription("Manage your notes")
        .addSubcommand((subcommand) => subcommand
            .setName("add")
            .setDescription("Add a note")
            .addStringOption(option => option
                .setName("title")
                .setMaxLength(50)
                .setDescription("The title of the note")
                .setRequired(true))
            .addStringOption(option => option
                .setName("content")
                .setMaxLength(1000)
                .setDescription("The content of the note")
                .setRequired(true)))

        .addSubcommand((subcommand) => subcommand
            .setName("list")
            .setDescription("List all your notes"))

        .addSubcommand((subcommand) => subcommand
            .setName("delete")
            .setDescription("Delete a note")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The id of the note")
                .setRequired(true)))

        .addSubcommand((subcommand) => subcommand
            .setName("find")
            .setDescription("find a not")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The id of the note")
                .setRequired(true)))

        .setDMPermission(true),
    cooldown: 5,
    run: async ({ interaction, client, err, guildData }) => {
        try {
            const sub = interaction.options.getSubcommand();

            if (sub === "add") {
                await interaction.deferReply({ ephemeral: true });
                const title = interaction.options.getString("title");
                const content = interaction.options.getString("content");
                const id = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);


                const note = await client.db.UpdateOne('Notes', {
                    User: interaction.user.id
                }, {
                    $push: {
                        Notes: {
                            Title: title,
                            Content: content,
                            ID: id
                        }
                    }
                }, { upsert: true, new: true });

                await interaction.safeEdit({ content: `^{command.notes.added}\n\n> Note ID: \`${id}\``, ephemeral: true })
            }

            else if (sub === "list") {
                await interaction.deferReply({ ephemeral: true });
                const notes = await client.db.FindOne('Notes', {
                    User: interaction.user.id
                });

                if (!notes || !notes.Notes?.length) return await interaction.safeEdit({ content: "^{command.notes.not_found}", ephemeral: true });
                const buffer = Buffer.from(JSON.stringify(notes.Notes, null, 2));
                const attachment = new AttachmentBuilder(buffer, { name: "notes.json" });
                await interaction.safeEdit({ files: [attachment], ephemeral: true });
            }
            else if (sub === "delete") {
                const id = interaction.options.getString("id");
                await interaction.deferReply({ ephemeral: true });

                const data = await client.db.FindOne('Notes', {
                    User: interaction.user.id,
                });

                const note = data.Notes?.find(note => note.ID == id);

                if (!note) return await interaction.safeEdit({
                    content: "^{command.notes.not_found}", ephemeral: true
                });

                await client.db.UpdateOne('Notes', {
                    User: interaction.user.id
                }, {
                    $set: {
                        Notes: data.Notes.filter(note => note.ID !== id)
                    }
                });

                await interaction.safeEdit({ content: `^{command.notes.deleted}.\n> Note ID: \`${id}\``, ephemeral: true })
            }

            else if (sub === "find") {
                const id = interaction.options.getString("id");
                await interaction.deferReply({ ephemeral: true });

                let isNote = await client.db.FindOne('Notes', {
                    User: interaction.user.id,
                });

                const note = isNote.Notes.find(note => note.ID === id);

                if (!note || !isNote.Notes?.length) return await interaction.safeEdit({
                    content: "^{command.notes.not_found}", ephemeral: true
                });

                const embed = new EmbedBuilder(client)
                    .setTitle(note.Title)
                    .setDescription(note.Content)
                    .setFooter({ text: `Note ID: ${id}` })

                await interaction.safeEdit({ embeds: [embed], ephemeral: true });
            }
            else {
                await interaction.safeReply({ content: "Invalid subcommand", ephemeral: true });
            }
        } catch (error) {
            err(error)
        }
    }
};