import { createTranscript } from "discord-html-transcripts/dist/index.js";
import { EmbedBuilder } from "../index.mjs";
import logger from "../logger.mjs"
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder as DiscordEmbedBuilder } from "discord.js";

/**@type {import("./index.mjs").BasicParamHandler}*/
const OpenHandler = async (i, data) => {
    try {
        const { guild, client } = i;

        const userDate = await i.client.db.FindOne("GuildMember", {
            User: i.member.id
        });

        if (userDate && userDate.Ticket?.Channel) return await i.safeReply({
            content: `^{handler.ticket.already} <#${userDate.Ticket.Channel}> - <t:${Math.floor(userDate.Ticket.Date / 1000)}:R>`,
            ephemeral: true
        });

        await i.deferReply({
            ephemeral: true
        });

        const channel = await guild.channels.create({
            name: `ticket-${i.member.user.username}`,
            type: 0,
            parent: data.Ticket?.Category || i.channel.parentId,
            topic: `Ticket for ${i.member.user.username} - <@${i.member.id}> - <t:${Math.floor(Date.now() / 1000)}:R>`,
            reason: `Ticket for ${i.member.user.username}`,
            permissionOverwrites: [
                {
                    id: i.member.id,
                    allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
                },
                {
                    id: guild.id,
                    deny: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
                }
            ]
        }).catch(() => "");

        if (!channel) return await i.safeEdit({
            content: "^{handler.ticket.error}",
            ephemeral: true
        }).catch(d => { });

        const buttons = [
            new ButtonBuilder()
                .setLabel("^{handler.ticket.buttons.delete}")
                .setStyle(4)
                .setCustomId("feat:ticket:delete"),
            new ButtonBuilder()
                .setLabel("^{handler.ticket.buttons.close}")
                .setStyle(2)
                .setCustomId("feat:ticket:close"),
            new ButtonBuilder()
                .setLabel("^{handler.ticket.buttons.claim}")
                .setStyle(1)
                .setCustomId("feat:ticket:claim"),
        ];

        const row = new ActionRowBuilder().setComponents(buttons).toJSON();

        await channel.safeSend({
            content: `<@${i.member.id}> - <@&${data.Ticket.Role}>`,
            embeds: [new EmbedBuilder()
                .setTheme(data.Theme)
                .setTitle("^{handler.ticket.title}")
                .setDescription(`<@${i.member.id}>, ^{handler.ticket.open_msg}`)
                .setDefaultFooter()
                .setTimestamp()],
            components: [row]
        });

        await i.client.db.UpdateOne("GuildMember", {
            User: i.member.id
        }, {
            $set: {
                Ticket: {
                    Channel: channel.id,
                    Date: Date.now()
                }
            }
        }, { upsert: true, new: true });

        await i.safeEdit({
            content: `^{handler.ticket.created} <#${channel.id}>`,
            ephemeral: true
        }).catch(d => { });




    } catch (d) {
        logger(d, "error")
    }
}

/**@type {import("./index.mjs").BasicParamHandler}*/
const CloseHandler = async (i, data) => {
    try {

        await i.deferReply({
            ephemeral: true
        });

        const ticketData = await isTicket(i.client, i.channel);

        if (!ticketData) return await i.safeEdit({
            content: "^{handler.ticket.not_ticket}",
            ephemeral: true
        }).catch(d => "");

        await i.channel.edit({
            permissionOverwrites: [
                {
                    id: ticketData.User,
                    deny: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
                },
            ]
        });


        const component = i.message.components.find(d => d.components.find(d => d.customId === "feat:ticket:close"));
        const button = component.components.find(d => d.customId === "feat:ticket:close");

        const btn = new ButtonBuilder()
            .setLabel("^{handler.ticket.buttons.reopen}")
            .setStyle(2)
            .setCustomId("feat:ticket:reopen")

        component.components.splice(component.components.indexOf(button), 1, btn);

        await i.message.safeEdit({
            components: [component]
        }).catch(d => "");

        await i.safeEdit({
            content: "^{handler.ticket.closed}",
            ephemeral: true
        }).catch(d => "");


    } catch (E) { logger(E, "error") }
}

/**@type {import("./index.mjs").BasicParamHandler}*/
const ReopenHandler = async (i, data) => {
    try {

        await i.deferReply({
            ephemeral: true
        });

        const ticketData = await isTicket(i.client, i.channel);

        if (!ticketData) return await i.safeEdit({
            content: "^{handler.ticket.not_ticket}",
            ephemeral: true
        }).catch(d => "");

        await i.channel.edit({
            permissionOverwrites: [
                {
                    id: ticketData.User,
                    allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
                },
            ]
        });


        const component = i.message.components.find(d => d.components.find(d => d.customId === "feat:ticket:reopen"));
        const button = component.components.find(d => d.customId === "feat:ticket:reopen");

        const btn = new ButtonBuilder()
            .setLabel("^{handler.ticket.buttons.close}")
            .setStyle(2)
            .setCustomId("feat:ticket:close")

        component.components.splice(component.components.indexOf(button), 1, btn);

        await i.message.safeEdit({
            components: [component]
        }).catch(d => "");

        await i.safeEdit({
            content: "^{handler.ticket.reopened}",
            ephemeral: true
        }).catch(d => "");


    } catch (E) { logger(E, "error") }
}

/**@type {import("./index.mjs").BasicParamHandler}*/
const DeleteHandler = async (i, data) => {
    try {

        await i.deferReply({
            ephemeral: true
        });

        const ticketData = await isTicket(i.client, i.channel);
        if (!ticketData) return await i.safeEdit({
            content: "^{handler.ticket.not_ticket}",
            ephemeral: true
        }).catch(d => "");


        await i.safeEdit({
            content: "^{handler.ticket.will_be_deleted}",
            ephemeral: true
        }).catch(d => "");

        await new Promise(r => setTimeout(r, 5000));

        // loggin ticket 
        const logChannel = i.client.channels.cache.get(data.Ticket.LogChannel);

        if (logChannel) {
            const transcript = await createTranscript(i.channel, {
                poweredBy: false
            })
            const embed = new EmbedBuilder()
                .setTheme(data.Theme)
                .setTitle("^{handler.ticket.deleted}")
                .setDescription(`^{handler.ticket.deleted_msg}`)
                .setFields([
                    {
                        name: "^{handler.ticket.opened_by}",
                        value: `<@${ticketData.User}>`,
                        inline: true
                    },
                    {
                        name: "^{handler.ticket.channel}",
                        value: `${i.channel.name} (${i.channel.id})`,
                        inline: true
                    },
                    {
                        name: "^{handler.ticket.closed_by}",
                        value: `<@${i.member.id}>`,
                    }
                ]).setTimestamp().setDefaultFooter();

            await logChannel.safeSend({
                embeds: [embed],
                files: [transcript]
            }).catch(d => "");

        }

        await i.channel.delete().catch(d => "");


        await i.client.db.UpdateOne("GuildMember", {
            User: i.member.id
        }, {
            $unset: {
                Ticket: ""
            }
        });

    } catch (E) { logger(E, "error") }
}

/**@type {import("./index.mjs").BasicParamHandler}*/
const ClaimHandler = async (i, data) => {
    try {
        await i.deferReply({
            ephemeral: true
        });

        const message = i.message
        const embed = new DiscordEmbedBuilder(message.embeds[0])
            .setFields([
                {
                    name: "^{handler.ticket.claimed_by}",
                    value: `<@${i.member.id}>`,
                    inline: true
                }
            ]).toJSON();

        await message.safeEdit({
            embeds: [{ ...message.embeds[0], ...embed }]
        });

        await i.safeEdit({
            content: "^{handler.ticket.claimed}",
            ephemeral: true
        }).catch(d => "");
    } catch (E) { logger(E, "error") }

}

const isTicket = async (client, channel) => {
    const data = await client.db.FindOne("GuildMember", {
        ["Ticket.Channel"]: channel?.id || channel
    });
    return data || false;
}

/**@type {import("./index.mjs").BasicParamHandler}*/
export const TicketCoreHandler = async (i, data) => {
    try {
        if (!i.isButton() || !i.customId.startsWith("feat:ticket:")) return;

        if (!data.Ticket.Enable) return await i.safeReply({
            ephemeral: true,
            content: "Tickets are disabled!"
        });

        const [, , type] = i.customId.split(":");

        if (type === "open") return await OpenHandler(i, data);

        if (!i.member.roles.cache.has(data.Ticket.Role) && type !== "open") return await i.safeReply({
            ephemeral: true,
            content: `^{handler.ticket.missing_role}\n> <@&${data.Ticket.Role}>`
        });

        if (type === "close") return await CloseHandler(i, data);
        else if (type === "delete") return await DeleteHandler(i, data);
        else if (type === "claim") return await ClaimHandler(i, data);
        else if (type === "reopen") return await ReopenHandler(i, data);

    } catch (E) {
        logger(E, "error")
    }
}