import { EmbedBuilder } from '../../../src/utils/index.mjs';
import { ActionRowBuilder, ButtonBuilder, ChannelSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, Webhook, parseWebhookURL } from 'discord.js';

/**@type {import('../../../src/utils/Command.mjs').prefix} */

export default {
    name: "set-birthday",
    description: "Setup birthday system for this guild",
    cooldown: 5,
    category: "Setup",
    aliases: ['birthday-set', 'birthday-setup', 'set-birthday', 'setup-birthday', 'birthday-setup',],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["AttachFiles", "EmbedLinks", "SendMessages", "ViewChannel", "ReadMessageHistory", "ManageWebhooks"]
    },
    run: async ({ message, client, err, options, guildData }) => {
        try {
            const user = message.author || message.user;

            const Embed = new EmbedBuilder(client).setTheme(guildData?.Theme)

            const select = (data) => new ChannelSelectMenuBuilder()
                .setCustomId("setup:birthday:select")
                .setChannelTypes([ChannelType.GuildText])
                .setDisabled(!data?.Birthday?.Enable)
                .setMaxValues(1)
                .setPlaceholder("^{common.click_here}")

            const btn = (data) => new ButtonBuilder()
                .setCustomId("setup:birthday:enable")
                .setStyle(data?.Birthday?.Enable ? 2 : 3)
                .setLabel(data?.Birthday?.Enable ? "Disable" : "Enable")

            const btn2 = (data) => new ButtonBuilder()
                .setCustomId("setup:birthday:reset")
                .setEmoji("979818265582899240")
                .setDisabled(!(data.Birthday.Enable && data.Birthday.Channel))
                .setStyle(4)
                .setLabel("^{common.reset}")

            const btn3 = (data) => new ButtonBuilder()
                .setCustomId("setup:birthday:message")
                .setDisabled(!(data.Birthday.Enable && data.Birthday.Channel))
                .setStyle(data.Birthday.Enable && data.Birthday.Channel ? 2 : 3)
                .setLabel("^{command.setup_birthday.buttons.message}")

            const row = (data = guildData) => new ActionRowBuilder().addComponents(select(data))
            const row2 = (data = guildData) => new ActionRowBuilder().addComponents(btn(data), btn3(data), btn2(data))

            const home = (data) => ({
                embeds: [
                    Embed.setAuthor({
                        name: `^{command.setup_birthday.title}`,
                        iconURL: client.user.displayAvatarURL(),
                    })
                        .setDescription(`*^{command.setup_birthday.description}*\n\n${data?.Birthday?.Enable ? `!{star} ^{command.setup_birthday.title} ^{common.enable}` : `!{dot} ^{command.setup_birthday.title} ^{common.disable}`}\n${data?.Birthday?.Channel ? `!{star} Channel: <#${data.Birthday.Channel}>` : ""}`)
                        .setDefaultFooter()
                ],
                components: [row(data), row2(data)].map(row => row.toJSON())
            })
            const msg = await message.safeReply(home(guildData))

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

                    if (i.customId === "setup:birthday:select") {
                        await i.safeUpdate(load);

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Birthday.Channel"]: i.values[0]
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));

                        await i.guild.updateData();
                    } else if (i.customId === "setup:birthday:enable") {
                        await i.safeUpdate(load);
                        const data2 = await i.guild.fetchData()

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Birthday.Enable"]: !data2.Birthday.Enable
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();
                    } 
                    
                    else if (i.customId === "setup:birthday:reset") {
                        await i.safeUpdate(load);

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $unset: {
                                ["Birthday"]: 0
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();
                    }
                    

                    else if (i.customId === "setup:birthday:message") {
                        const input_1 = new TextInputBuilder()
                            .setCustomId("message")
                            .setLabel("^{command.setup_birthday.modal.message}")
                            .setStyle(2)
                            .setPlaceholder("^{command.setup_birthday.modal.message_ph}")
                            .setMaxLength(100)
                            .setRequired(true)
                            .setValue("^{command.setup_birthday.modal.message_value}")

                        const modal = new ModalBuilder()
                            .setCustomId("setup:birthday:message:modal")
                            .setTitle("^{command.setup_birthday.title}")
                            .addComponents(new ActionRowBuilder().addComponents(input_1))

                        await i.safeShowModal(modal.toJSON())

                        const response = await i.awaitModalSubmit({
                            filter: i => i.customId === "setup:birthday:message:modal" && i.user.id === user.id,
                            time: 240 * 1000,
                        })

                        if (!response || !response.isModalSubmit()) return;
                        await response.safeUpdate(load);

                        const value = response.fields.fields.get("message").value

                        const data = await client.db.UpdateOne('GuildConfig', {
                            Guild: message.guildId
                        }, {
                            $set: {
                                ["Birthday.Message"]: value
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(data));
                        await i.guild.updateData();

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