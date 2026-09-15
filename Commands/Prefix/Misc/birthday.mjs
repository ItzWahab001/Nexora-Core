import { EmbedBuilder, cache } from '../../../src/utils/index.mjs';
import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, Message, ModalBuilder, TextInputBuilder, Webhook, parseWebhookURL } from 'discord.js';


/**@type {import('../../../src/utils/Command.mjs').prefix} */

export default {
    name: "birthday",
    description: "birthday system for this guild",
    cooldown: 5,
    category: "Misc",
    aliases: ['birth', 'bday', 'birthday-list', 'bday-list'],
    permissions: {
        user: ["SendMessages", 'ViewChannel', "ReadMessageHistory"],
        bot: ["EmbedLinks", "SendMessages", "ViewChannel", "ReadMessageHistory"]
    },
    run: async ({ message, client, err, guildData }) => {
        try {

            const user = message.author || message.user;

            const Embed = new EmbedBuilder().setTheme(guildData?.Theme);

            if (!guildData?.Birthday?.Enable) return await message.safeReply({
                embeds: [Embed.setDescription("^{command.birthday.disabled}")]
            })

            if (!guildData.Birthday.Channel) return await message.safeReply({
                embeds: [Embed.setDescription("^{command.birthday.no_channel}")]
            });


            const row = d => {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId("birthday:menu")
                    .setPlaceholder("^{command.birthday.menu.ph}")
                    .setMaxValues(1)
                    .setOptions([
                        {
                            label: "^{command.birthday.menu.list.label}",
                            value: "birthday:list",
                            emoji: "811260045307543553",
                            description: "^{command.birthday.menu.list.description}"
                        },
                        {
                            label: "^{command.birthday.menu.set.label}",
                            value: "birthday:set",
                            description: "^{command.birthday.menu.set.description}",
                            emoji: "1012018621272297632"
                        },

                    ])

                if (d?.Birthday) menu.addOptions(
                    {
                        label: "^{command.birthday.menu.remove.label}",
                        value: "birthday:remove",
                        description: "^{command.birthday.menu.remove.description}",
                        emoji: "979818265582899240"
                    })

                return new ActionRowBuilder().setComponents([menu])
            }

            const data = await client.db.FindOne('GuildMember', {
                Guild: message.guild.id,
                User: user.id
            })

            const home = (d = data) => {
                const [year, month, day] = d?.Birthday?.split('-') || [0, 0, 0];
                return {
                    embeds: [
                        Embed.setAuthor({
                            name: `^{command.birthday.title}`,
                            iconURL: client.user.displayAvatarURL(),
                        })
                            .setDescription(`*^{command.birthday.guide_message}*\n\n${d?.Birthday ? `Your: ${month}-${day}\n` : ""}`)
                            .setDefaultFooter()
                            .toJSON()
                    ],
                    components: [row(d)]
                }
            }

            const msg = await message.safeReply(home())

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000,
            })

            collector.on("collect",
                /** * @param {import('discord.js').Interaction} i */
                async i => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });


                    const load = {
                        embeds: [new EmbedBuilder().setTheme(guildData.Theme).setDescription("^{common.loading}")],
                        components: []
                    }



                    if (i.isAnySelectMenu()) {
                        const value = i.values.shift();
                        if (value === "birthday:list") {
                            await i.safeReply({ ...load, ephemeral: true })
                            // upcoming birthdays in next 10 days
                            const birthdays = await client.db.Find('GuildMember', {
                                Guild: message.guild.id
                            })

                            const upcoming = birthdays.filter(b => b.Birthday)

                                .filter(b => {
                                    const [year, month, day] = b.Birthday.split('-')
                                    const date = new Date(new Date().getFullYear(), month - 1, day)
                                    return date.getTime() >= new Date().getTime() && date.getTime() <= new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000).getTime()
                                });

                            if (upcoming.length === 0) return await i.safeEdit({
                                embeds: [Embed.setDescription("^{command.birthday.no_upcoming}")]
                            });

                            const list = upcoming.map(b => {
                                const [year, month, day] = b.Birthday.split('-')
                                return `<@${b.User}> - ${month}-${day}`
                            }).join('\n')

                            await i.safeEdit({
                                embeds: [],
                                components: [],
                                content: list
                            })

                        }
                        else if (value === "birthday:set") {
                            const input_1 = new TextInputBuilder()
                                .setCustomId("birthday:date")
                                .setLabel("^{command.birthday.modal.set.label}")
                                .setStyle(1)
                                .setPlaceholder("^{command.birthday.modal.set.ph}")
                                .setMaxLength(10)
                                .setRequired(true)

                            const modal = new ModalBuilder()
                                .setCustomId("setup:birthday:date:modal")
                                .setTitle("^{command.birthday.modal.title}")
                                .addComponents(new ActionRowBuilder().addComponents(input_1))
                                .toJSON()

                            await i.safeShowModal(modal)

                            const response = await i.awaitModalSubmit({
                                filter: i => i.customId === "setup:birthday:date:modal" && i.user.id === user.id,
                                time: 240 * 1000,
                            });


                            if (!response || !response.isModalSubmit()) return;


                            const date = response.fields.fields.get("birthday:date").value;

                            if (date.match(/^\d{4}-\d{2}-\d{2}$/) === null) return await response.safeReply({
                                embeds: [Embed.setDescription("^{command.birthday.invalid_date}")],
                                ephemeral: true
                            });

                            await response.safeUpdate(load);

                            const newData = await client.db.UpdateOne('GuildMember',
                                { Guild: i.guild.id, User: i.user.id }, {
                                $set: {
                                    Birthday: date
                                }
                            }, { upsert: true, new: true });

                            await msg.safeEdit(home(newData));

                        }
                        else if (value === "birthday:remove") {
                            await i.safeUpdate(load);
                            const newData = await client.db.UpdateOne('GuildMember',
                                { Guild: i.guild.id, User: i.user.id },
                                { Birthday: null }, { upsert: true, new: true });
                            await msg.safeEdit(home(newData));
                        }
                    }

                });

            collector.on('end', async i => {
                await msg.safeEdit({
                    embeds: [new EmbedBuilder().setTheme(guildData?.Theme).setDescription("^{common.timeout}")],
                    files: [],
                    content: "",
                    components: []
                }).catch(() => { });
            });

        } catch (error) {
            err(error)
        }
    }
};