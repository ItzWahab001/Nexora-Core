import Bot from '../../../src/client.mjs';
import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import {

    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { sanitizeMessage, cache, variables, isImageURLValid } from '../../../src/utils/index.mjs';

/** @type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    name: "notes",
    category: "Misc",
    cooldown: 5,
    description: "Make your notes",
    aliases: ["list", "note"],
    permissions: {
        user: ["SendMessages"],
        bot: ["AttachFiles"]
    },

    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
            const cacheKey = `setup:notes`
            const user = message.author || message.user

            let data = await client.db.FindOne('Notes', {
                User: user.id
            })

            if (!data) {
                data = await client.db.UpdateOne('Notes', {
                    User: user.id
                }, {
                    Notes: []
                }, { upsert: true, new: true })
            }

            let homeBtn = new ButtonBuilder().setCustomId("notes:home-btn").setStyle(2).setLabel("Back");
            let resetBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:notes:reset")
                .setStyle(2).setLabel("Reset All")
                .setEmoji("979818265582899240")
                .setDisabled(isdata?.Notes?.length > 0 ? false : true)

            let addBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:notes:add")
                .setStyle(3).setLabel("Add Note")
                .setDisabled(isdata?.Notes?.length < 25 ? false : true)

            let removeBtn = (isdata = data) => new ButtonBuilder()
                .setCustomId("setup:notes:remove:btn")
                .setStyle(4).setLabel("Remove Remove")
                .setDisabled(isdata?.Notes?.length > 0 ? false : true)

            const menu = (Data = data) => {
                const Select = new StringSelectMenuBuilder()
                    .setCustomId(`setup:notes:list:menu`)
                    .setPlaceholder('Clieck to select a note')
                    .setDisabled(Data?.Notes?.length > 0 ? false : true)
                    .setMaxValues(1)
                    .setMinValues(1)
                    Data.Notes.forEach(y => {
                        Select.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${y.Title}`)
                                .setValue(`${y.ID}`)
                                .setDescription(sanitizeMessage(y.Description, 30))
                        )
                    })
                return Select;
            }

            const row = (d = data) => new ActionRowBuilder()
                .addComponents(addBtn(d), removeBtn(d));

            const row2 = (isdata = data) => new ActionRowBuilder()
                .addComponents(resetBtn(isdata))

            const row3 = (isdata = data) => new ActionRowBuilder()
                .addComponents(menu(isdata))

            let emebd = (d = data) => {
                let des = "**!{dot} Notes**\n"

                if (d?.Notes?.length) {
                    d.Notes.forEach(y => {
                        des += `- **${y.Title}**\n - ID: ${y.ID}\n`;
                    })
                }

                des += `\n\n> *${(client.getPromotion())?.Message}*`

                return new EmbedBuilder(client)
                    .setTheme(guildData.Theme)
                    .setAuthor({
                        name: "Notes",
                        url: `${client.config.Links.Discord}`
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setFooter({
                        text: `Total Notes: ${d.Notes?.length || 0}/24`
                    })
                    .setTimestamp()
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"]({
                components: data.Notes.length > 0 ? [row3(data), row(data), row2(data)] : [row(data), row2(data)],
                embeds: [emebd()]
            });

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000
            })

            collector.on("collect",
                /**
                 * 
                 * @param {import('discord.js').Interaction} i 
                 */
                async (i) => {

                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    const wait = {
                        embeds: [new EmbedBuilder(client).setTheme(guildData.Theme).setDescription("^{common.loading}")],
                        components: [],
                        ephemeral: true
                    }


                    if (i.customId === "setup:notes:reset") {

                        await i.safeUpdate(wait);

                        const data4 = await client.db.UpdateOne('Notes', {
                            User: i.member.id
                        }, {
                            $set: {
                                ["Notes"]: []
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit(home(data4))


                    } else if (i.customId === "setup:notes:add") {
                        const input_1 = new TextInputBuilder()
                            .setStyle(1)
                            .setRequired(true)
                            .setCustomId(':Title')
                            .setLabel("Title")
                            .setPlaceholder('Cute and small title')
                            .setMaxLength(25);

                        const input_2 = new TextInputBuilder()
                            .setStyle(1)
                            .setRequired(true)
                            .setCustomId(':ID')
                            .setLabel("Enter ID")
                            .setPlaceholder('ID contains only numbers and letter')
                            .setMaxLength(15);

                        const input_3 = new TextInputBuilder()
                            .setStyle(2)
                            .setRequired(true)
                            .setCustomId(':Description')
                            .setLabel("Description")
                            .setMaxLength(2000)
                            .setPlaceholder('Description of the note')


                        const modal = new ModalBuilder()
                            .setCustomId('setup:notes:modal')
                            .setTitle('Notes')
                            .addComponents(new ActionRowBuilder().addComponents(input_1))
                            .addComponents(new ActionRowBuilder().addComponents(input_2))
                            .addComponents(new ActionRowBuilder().addComponents(input_3))

                        await i.safeShowModal(modal);

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "setup:notes:modal" && i.user.id === message.member.id,
                            time: 240 * 1000
                        }).catch(() => "")

                        if (!response) return;

                        /// on modal submit
                        if (response?.isModalSubmit()) {
                            const Title = response.fields.fields.get(":Title").value;
                            const ID = response.fields.fields.get(":ID").value;
                            const Description = response.fields.fields.get(":Description").value;


                            if (!ID.match(/^[a-zA-Z0-9]+$/)) return await response.safeReply({
                                content: "!{skull} ID must be only letters and numbers".replaceEmojis(guildData.Theme),
                                ephemeral: true
                            })

                            if (data.Notes.find(x => x.ID === ID)) return await response.safeReply({
                                content: "!{skull} ID already exists".replaceEmojis(guildData.Theme),
                                ephemeral: true
                            })

                            if (data.Notes.length >= 24) return await response.safeReply({
                                content: "!{skull} You can't add more than 24 notes".replaceEmojis(guildData.Theme),
                                ephemeral: true
                            })

                            const newData = await client.db.UpdateOne('Notes', {
                                User: i.user.id
                            }, {
                                $set: {
                                    ["Notes"]: data.Notes.concat({
                                        Title,
                                        ID,
                                        Description,
                                        Time: Date.now(),
                                    })
                                }
                            }, { upsert: true, new: true })

                            await response.safeUpdate(home(newData))
                        }


                    } else if (i.customId === "setup:notes:remove:btn") {

                        const Select = new StringSelectMenuBuilder()
                            .setCustomId(`setup:notes:remove:menu`)
                            .setPlaceholder('Dont Make Selection!')
                        const data2 = await client.db.FindOne('Notes', {
                            User: i.member.id
                        })

                        data2.Notes.forEach(y => {
                            Select.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${y.Title}`)
                                    .setValue(`${y.ID}`)
                                    .setDescription(sanitizeMessage(y.Description, 30))
                            )
                        })

                        Select.setMinValues(1)
                        Select.setMaxValues(data2.Notes.length)

                        await i.safeUpdate({
                            embeds: [
                                new EmbedBuilder().setTheme(guildData.Theme)
                                    .setDescription("!{star} Select Notes from following menu to remove*")
                            ],
                            components: [
                                new ActionRowBuilder().addComponents(Select),
                                new ActionRowBuilder().addComponents(homeBtn)
                            ]
                        })

                    } else if (i.customId === "setup:notes:remove:menu") {
                        await i.safeUpdate(wait);

                        const data2 = await client.db.FindOne('Notes', {
                            User: i.member.id
                        })

                        data2.Notes = data2.Notes.filter(y => !i.values.includes(y.ID))

                        const updated = await client.db.UpdateOne('Notes', {
                            User: i.member.id
                        }, {
                            $set: {
                                ['Notes']: data2.Notes
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(updated))

                    }
                    else if (i.customId === "setup:notes:list:menu") {
                        await i.safeReply(wait);
                        const data2 = await client.db.FindOne('Notes', {
                            User: i.member.id
                        })
                        const note = data2.Notes.find(x => x.ID === i.values[0])
                        if (!note) return await i.safeUpdate({
                            content: "!{skull} Note not found".replaceEmojis(guildData.Theme),
                        })

                        const embed = new EmbedBuilder()
                            .setTheme(guildData.Theme)
                            .setTitle(note.Title)
                            .setDescription(note.Description)
                            .setFooter({
                                text: `ID: ${note.ID}`
                            })
                            .setTimestamp(note.Time)

                        await i.safeEdit({
                            embeds: [embed],
                            content : ""
                        })
                    }
                    else if (i.customId === "notes:home-btn") await i.safeUpdate(home())


                    //* Go to main page
                    function home(data) {
                        return {
                            files: [],
                            embeds: [emebd(data)],
                            content: "",
                            components: data.Notes.length > 0 ? [row3(data), row(data), row2(data)] : [row(data), row2(data)],
                        };
                    }

                });


            collector.on('end', async i => {
                await msg.safeEdit({
                    embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                }).catch(() => { })
            })


        } catch (error) {
            err(error)
        }
    }
};