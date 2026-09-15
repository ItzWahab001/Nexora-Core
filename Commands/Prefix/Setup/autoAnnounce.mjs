import EmbedBuilder from '../../../src/utils/classes/EmbedBuilder.mjs';
import moment from 'moment-timezone';
import {
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    StringSelectMenuOptionBuilder,
    ChannelType
} from 'discord.js';
import { sanitizeMessage, cache } from '../../../src/utils/index.mjs';


/**@type {import('../../../src/utils/Command.mjs').prefix} */
export default {
    ignore: true,
    name: "setup-auto-announce",
    category: "Setup",
    cooldown: 5,
    maintenance: true,
    description: "Setup announcements for your server",
    aliases: ["setup-auto-announce", "setup-auto-announce", "set-auto-announce", "set-auto-announce", "auto-announce", "auto-announce"],
    permissions: {
        user: ["Administrator", "SendMessages"],
        bot: ["ManageRoles", "ManageWebhooks", "ManageMessages", "ReadMessageHistory", "EmbedLinks", "AttachFiles"]
    },
    run: async ({ message, client, err, Slash, options, guildData }) => {
        try {
            const KEY = `AutoAnnounce:${message.guild.id}`;
            if (Slash && Slash.is) await message.deferReply({ fetchReply: true });
            const user = message.author || message.user
            const data = guildData


            let homeBtn = new ButtonBuilder().setCustomId("AutoAnnounce:home-btn").setStyle(2).setLabel("^{common.home_page}")


            const rows = d => {
                let resetBtn = new ButtonBuilder()
                    .setCustomId("setup:AutoAnnounce:reset")
                    .setStyle(2).setLabel("^{common.reset}")
                    .setEmoji("979818265582899240")
                    .setDisabled(d.AutoAnnounce?.List?.length > 0 ? false : true)

                let timezoneBtn = new ButtonBuilder()
                    .setCustomId("setup:AutoAnnounce:timeZone")
                    .setStyle(2)
                    .setLabel("^{command.auto_announce.buttons.timezone}")

                let addBtn = new ButtonBuilder()
                    .setCustomId("setup:AutoAnnounce:add")
                    .setStyle(3).setLabel("^{command.auto_announce.buttons.add}")
                    .setDisabled(d.AutoAnnounce?.List?.length < 25 ? false : true)

                let removeBtn = new ButtonBuilder()
                    .setCustomId("setup:AutoAnnounce:remove:btn")
                    .setStyle(4).setLabel("^{command.auto_announce.buttons.remove}")
                    .setDisabled(d?.AutoAnnounce?.List?.length > 0 ? false : true)

                const row = new ActionRowBuilder()
                    .addComponents(addBtn, removeBtn);

                const row2 = new ActionRowBuilder()
                    .addComponents(timezoneBtn, resetBtn)

                return [
                    row,
                    row2
                ].map(x => x.toJSON())
            }

            let emebd = (d = data) => {
                let des = "^{command.auto_announce.description}\n"

                if (d.AutoAnnounce?.List?.length) {
                    des += "\n^{command.auto_announce.list}\n"
                    d.AutoAnnounce.List.forEach(y => {

                        des += `- ${y.Type} ${y.Time <= 12 ? `${y.Time}:00 AM` : `${y.Time - 12}:00 PM`} - <#${y.Channel}>\n - \`${sanitizeMessage(y.Message, 25)}\`\n`;
                    })
                }

                des += `\n**!{dot} Timezone**: \`${d.AutoAnnounce?.Timezone ? `${moment().tz(d.AutoAnnounce.Timezone).format("lll")} (${d.AutoAnnounce.Timezone})` : "None"}\``
                des += `\n\n> ${(client.getPromotion())?.Message}`

                return new EmbedBuilder(client)
                    .setTheme(data.Theme)
                    .setAuthor({
                        name: "^{command.auto_announce.title}",
                    })
                    .setDescription(des)
                    .setThumbnail("https://cdn.discordapp.com/emojis/1068024801186295808.gif")
                    .setFooter({
                        text: `${d.AutoAnnounce?.List?.length || 0}/24`
                    })
                    .setTimestamp()
            }

            const home = d => {
                return {
                    embeds: [emebd(d)],
                    components: rows(d)
                }
            }

            let msg = await message[Slash?.is ? "safeEdit" : "safeReply"](home(data));

            // if (Slash?.is) msg = await msg.fetch();

            const collector = msg.createMessageComponentCollector({
                componentType: 0,
                time: 240 * 1000
            })

            collector.on("collect",
                /**
                 * @param {import('discord.js').Interaction} i 
                 */
                async (i) => {
                    if (i.user.id !== user.id) return await i.safeReply({
                        content: "^{common.no_auth_components}",
                        ephemeral: true
                    });

                    const data2 = await i.guild.fetchData();

                    const wait = {
                        embeds: [new EmbedBuilder().setTheme(data.Theme).setDescription("^{common.loading}")],
                        components: []
                    }

                    if (i.customId === "setup:AutoAnnounce:reset") {

                        await i.safeUpdate(wait);

                        const data4 = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id,
                        }, {
                            $unset: {
                                ["AutoAnnounce"]: {}
                            }
                        }, { upsert: true, new: true })

                        await msg.safeEdit(home(data4))

                        await i.guild.updateData()

                    }

                    else if (i.customId === "setup:AutoAnnounce:add") {
                        await i.safeUpdate(await addPanel())
                    }

                    else if (i.customId.startsWith("new:AutoAnnounce:")) {
                        const [, , , action] = i.customId.split(":");

                        if (i.customId.startsWith("new:AutoAnnounce:btn")) {

                            // * set announement Channel  
                            if (action === "Channel") {
                                const row = new ActionRowBuilder()
                                    .setComponents([
                                        new ChannelSelectMenuBuilder()
                                            .setCustomId(`new:AutoAnnounce:menu:Channel`)
                                            .setPlaceholder("^{common.click_here}")
                                            .setMaxValues(1)
                                            .setMinValues(1)
                                            .setChannelTypes([0])
                                    ]);
                                const embed = new EmbedBuilder()
                                    .setTheme(guildData.Theme)
                                    .setDescription("^{command.auto_announce.select_channel}")

                                await i.safeUpdate({
                                    embeds: [embed],
                                    components: [row.toJSON()]
                                });
                            }

                            //* Set announment message (on button click)
                            else if (action === "Message") {
                                const input_1 = new TextInputBuilder()
                                    .setCustomId("message")
                                    .setLabel("^{command.auto_announce.modal.message}")
                                    .setPlaceholder("^{command.auto_announce.modal.message_ph}")
                                    .setStyle(2)
                                    .setMaxLength(1000)
                                    .setRequired(true)
                                    .setMinLength(20)

                                const modal = new ModalBuilder()
                                    .setTitle("^{command.auto_announce.title}")
                                    .setCustomId("new:AutoAnnounce:modal:Message")
                                    .addComponents(new ActionRowBuilder().addComponents(input_1))

                                await i.safeShowModal(modal.toJSON());

                                const response = await i.awaitModalSubmit({
                                    time: 240 * 1000,
                                    filter: (i) => i.user.id === user.id && i.customId === "new:AutoAnnounce:modal:Message"
                                });

                                if (!response || !response.isModalSubmit()) return;

                                const message = response.fields.fields.get("message").value;

                                cache.set(KEY, {
                                    ...cache.get(KEY),
                                    Message: message,
                                });

                                await response.safeUpdate(await addPanel())
                            }

                            //* set hour (on button click)
                            else if (action === "Time") {
                                const row = new ActionRowBuilder()
                                const menu = new StringSelectMenuBuilder()
                                    .setCustomId("new:AutoAnnounce:menu:Time")
                                    .setPlaceholder("^{common.click_here}")
                                    .setMaxValues(1)
                                    .setMinValues(1)

                                for (let i = 1; i <= 24; i++) {
                                    menu.addOptions([
                                        {
                                            label: `${i <= 12 ? i : i - 12} ${i <= 12 ? "AM" : "PM"}`,
                                            value: `${i}`
                                        }
                                    ])
                                }
                                row.addComponents(menu)
                                const embed = new EmbedBuilder()
                                    .setTheme(guildData.Theme)
                                    .setDescription("^{command.auto_announce.select_time}")

                                await i.safeUpdate({
                                    components: [row.toJSON()],
                                    embeds: [embed]
                                });
                            }
                            else if (action === "Save") {
                                await i.safeUpdate(wait);

                                const newData = await client.db.UpdateOne('GuildConfig', {
                                    Guild: i.guild.id
                                }, {
                                    $push: {
                                        ["AutoAnnounce.List"]: cache.get(KEY)
                                    }
                                }, {
                                    upsert: true,
                                    new: true
                                });

                                cache.delete(KEY);
                                await msg.safeEdit(home(newData))
                                await i.guild.updateData()

                            }
                        }
                        else if (i.customId.startsWith("new:AutoAnnounce:")) {

                            //* Channel selected from menu
                            if (action === "Channel") {
                                await i.safeUpdate(wait)

                                cache.set(KEY, {
                                    ...cache.get(KEY),
                                    Channel: i.values[0],
                                });

                                await msg.safeEdit(await addPanel())
                            }

                            //* Time selected
                            else if (action === "Time") {
                                await i.safeUpdate(wait)

                                cache.set(KEY, {
                                    ...cache.get(KEY),
                                    Time: i.values[0],
                                });

                                await msg.safeEdit(await addPanel())
                            }

                        }

                    }

                    else if (i.customId === "setup:AutoAnnounce:timeZone") {
                        const input_1 = new TextInputBuilder()
                            .setCustomId("tz")
                            .setLabel("^{command.auto_announce.modal.timezone}")
                            .setPlaceholder("^{command.auto_announce.modal.timezone_ph}")
                            .setStyle(1)
                            .setMaxLength(100)
                            .setRequired(true)

                        const modal = new ModalBuilder()
                            .setTitle("^{command.auto_announce.title}")
                            .setCustomId("new:AutoAnnounce:modal:tz")
                            .addComponents(new ActionRowBuilder().addComponents(input_1))

                        await i.safeShowModal(modal);

                        const response = await i.awaitModalSubmit({
                            time: 240 * 1000,
                            filter: (i) => i.user.id === user.id && i.customId === "new:AutoAnnounce:modal:tz"
                        });

                        if (!response || !response.isModalSubmit()) return;

                        const tz = response.fields.fields.get("tz").value;

                        // timexone validation with momtem
                        const timeValidation = moment.tz.zone(tz) ? true : false
                        if (!timeValidation) return response.safeReply({
                            embeds: [new EmbedBuilder().setTheme(guildData.Theme).setColor("Red").setDescription("^{command.auto_announce.invalid_timezone}")],
                            ephemeral: true
                        })

                        await response.safeUpdate(wait)

                        const newData = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id
                        }, {
                            $set: {
                                "AutoAnnounce.Timezone": tz
                            }
                        }, {
                            upsert: true,
                            new: true
                        });

                        await msg.safeEdit(home(newData));
                        await i.guild.updateData()

                    }

                    else if (i.customId === "setup:AutoAnnounce:remove:btn") {

                        await i.safeUpdate(wait)
                        const Select = new StringSelectMenuBuilder()
                            .setCustomId(`setup:AutoAnnounce:remove:menu`)
                            .setPlaceholder('^{common.click_here}')

                        let dis = ``

                        // iterate on AutoAnnounce list and make a menu
                        data2.AutoAnnounce.List.forEach((y, index) => {
                            dis += `${index + 1}. ** ${y.Type}** - <#${y.Channel}>\n - \`${sanitizeMessage(y.Message, 10)}\`\n`
                            Select.addOptions(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${index + 1}`)
                                    .setValue(`${index}`)
                            )
                        })

                        Select.setMinValues(1)
                        Select.setMaxValues(data2.AutoAnnounce.List.length)

                        await msg.safeEdit({
                            embeds: [
                                new EmbedBuilder().setTheme(data2.Theme)
                                    .setDescription("^{command.auto_announce.select_to_remove}" + dis)
                            ],
                            components: [
                                new ActionRowBuilder().addComponents(Select),
                                new ActionRowBuilder().addComponents(homeBtn)
                            ].map(x => x.toJSON())
                        })

                    }

                    else if (i.customId === "setup:AutoAnnounce:remove:menu") {
                        await i.safeUpdate(wait);

                        data2.AutoAnnounce.List = data2.AutoAnnounce.List.filter((y, index) => !i.values.map(Number).includes(index))

                        const updated = await client.db.UpdateOne('GuildConfig', {
                            Guild: i.guild.id
                        }, {
                            $set: {
                                ['AutoAnnounce.List']: data2.AutoAnnounce.List
                            }
                        }, { upsert: true, new: true });

                        await msg.safeEdit(home(updated));

                        await i.guild.updateData()
                    }

                    else if (i.customId === "AutoAnnounce:home-btn") await i.safeUpdate(home(data2))

                    async function addPanel() {
                        const CacheData = cache.get(KEY) || {};
                        const config = {
                            Channel: i.channelId,
                            Type: "Daily",
                            Message: "",
                            Time: "",
                            ...CacheData,
                        }

                        const btns = [
                            new ButtonBuilder()
                                .setCustomId("new:AutoAnnounce:btn:Channel")
                                .setLabel("^{command.auto_announce.buttons.set_channel}")
                                .setStyle(2),
                            new ButtonBuilder()
                                .setCustomId("new:AutoAnnounce:btn:Message")
                                .setLabel("^{command.auto_announce.buttons.set_message}")
                                .setStyle(2),
                            new ButtonBuilder()
                                .setCustomId("new:AutoAnnounce:btn:Time")
                                .setLabel("^{command.auto_announce.buttons.set_time}")
                                .setStyle(2),
                            // new ButtonBuilder()
                            //     .setCustomId("new:AutoAnnounce:btn:Type")
                            //     .setLabel("^{command.auto_announce.buttons.set_type}")
                            //     .setDisabled(true)
                            //     .setStyle(3),
                        ]


                        const row = new ActionRowBuilder().setComponents(btns);
                        const row2 = new ActionRowBuilder()
                            .setComponents(homeBtn, new ButtonBuilder()
                                .setCustomId("new:AutoAnnounce:btn:Save").setLabel("^{command.auto_announce.buttons.save}").setStyle(3).setDisabled(!(config.Channel && config.Message && config.Time)));

                        const embed = new EmbedBuilder().setTheme(guildData.Theme)
                            .setDefaultFooter().setDescription('!{dot} **^{common.current_config}**\n- \`Type\` : ' + config.Type + '\n- \`Channel\` : <#' + config.Channel + '>\n- \`Message\` : ' + (config.Message ? sanitizeMessage(config.Message, 12) : "^{common.not_set}") + '\n- \`Time\` : ' + (config.Time ? `${Number(config.Time) <= 12 ? Number(config.Time) : Number(config.Time) - 12} ${Number(config.Time) <= 12 ? "AM" : "PM"}` : "Not Set"))
                            .setTitle("^{command.auto_announce.title}");

                        cache.set(KEY, config);
                        return {
                            embeds: [embed],
                            components: [row, row2].map(x=>x.toJSON())
                        }

                    }

                })


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

