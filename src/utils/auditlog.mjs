import { AuditLogEvent, AuditLogOptionsType, Guild, Webhook } from "discord.js";
import cache from "./cache.mjs";
import { EmbedBuilder, string } from "./index.mjs";


/**
* 
* @param {"UserCreate" | "UserDelete"| "UserUpdate"| "AutoModerationRuleDelete" | "AutoModerationRuleCreate" |"AutoModerationRuleUpdate"| "MessageDelete" | "MessageUpdate" | "MessageDeleteBulk" | "Voice" | "RoleCreate" | "RoleDelete" | "RoleUpdate" | "ChannelCreate" | "ChannelDelete" | "ChannelUpdate" | "ThreadCreate" | "ThreadDelete" | "ThreadSync" | "ThreadUpdate" | "ThreadMemberUpdate" | "ThreadMembersUpdate" | "GuildScheduledEventCreate" | "GuildScheduledEventDelete" | "GuildScheduledEventUpdate" | "GuildUpdate" | "StickerCreate" | "StickerDelete" | "StickerUpdate" | "EmojiCreate" | "EmojiDelete" | "EmojiUpdate"} type 
* @param {Guild} guild 
* @param {Object} data 
* @param {import("discord.js").Channel} data.channel 
* @param {import("discord.js").Message } data.message
* @param {import("discord.js").Message } data.newMessage
* @param {import("discord.js").Role } data.role
* @param {import("discord.js").Role } data.newRole
* @param {import('discord.js').VoiceState} data.newState
* @param {import('discord.js').VoiceState} data.oldState
* @param {import('discord.js').ThreadChannel} data.thread
* @param {import('discord.js').GuildScheduledEvent} data.event
* @param {import('discord.js').GuildScheduledEvent} data.newEvent
* @param {import('discord.js').GuildAuditLogsEntry} data.audit
*/
export const auditlog = async (type, guild, data = { audit }) => {
    if (!type) return;

    const settings = await guild.fetchData();
    if (!settings || typeof settings.AuditLog.Channel !== "object" || !settings.AuditLog?.Channel?.id) return;

    /** 
    * @type {Webhook}
    */
    let Webhook;
    const key = `Webhook:${guild.id}:${settings.AuditLog.Channel.id}`
    const WebCache = cache.get(key);

    if (WebCache) Webhook = WebCache;
    else {
        Webhook = await guild.client.fetchWebhook(settings.AuditLog.Channel.id, settings.AuditLog.Channel.token).catch(() => "")
        if (Webhook) cache.set(key, WebCache, 120)
    }

    if (!Webhook) {
        await guild.client.db.UpdateOne('GuildConfig', {
            Guild: guild.id
        }, {
            $set: {
                ["AuditLog.Channel"]: {}
            }
        });
        await guild.updateData()
        return;
    }

    const fields = [{
        name: ""
    }]

    let tite = ""
    let des = ""

    const userDes = `- User: ${data?.message?.author?.displayName} - ${data?.message?.author?.id}\n`
    const channelDes = `- Channel: ${data?.message?.channel?.name} - ${data?.message?.channel?.id}\n`
    const user = data?.message?.author || data?.audit?.executor

    const embed = new EmbedBuilder()
        .setTheme(settings.Theme)
        .setFooter({
            text: `${type}`,
            iconURL: guild.client.user.displayAvatarURL({
                forceStatic: true
            })
        })
        .setTimestamp()

    if (user) embed.setAuthor({ name: `${user.displayName} - ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    else embed.setAuthor({ name: "Audit Log", iconURL: guild.iconURL({ forceStatic: false }) })

    const files = []


    switch (type) {
        case "MessageDelete":
            if (!settings.AuditLog?.Message) return;
            des += `A Message sent by ${user} deleted in ${data.message.channel}\n**__Content__**:\n${data?.message?.content || "*Content Not Avaliable*"}\n`;
            if (data.message.attachments.size > 0) {
                data.message.attachments.forEach(attachment => {
                    files.push({
                        attachment: attachment.url
                    })
                })
            }
            break;
        case "MessageUpdate":
            if (!settings.AuditLog.Message) return;
            Webhook.send({
                embeds: [embed.setDescription(`A Message updated by ${user} in ${data.message.channel}\n**__Content__**:\n${data?.message?.content || "*Content Not Avaliable*"}`)
                    .setFooter({ text: "Before" })]
            })
            des += `A Message updated by ${user} in ${data.newMessage.channel}\n**__Content__**:\n${data?.newMessage?.content || "*Content Not Avaliable*"}\n`;
            embed.setFooter({
                text: "After"
            })
            break;

        case "MessageDeleteBulk":
            if (!settings.AuditLog?.Message) return;
            des += `**${data.message.size}** Messages deleted in ${data.channel}`;
            break;

        case "Voice":
            if (!settings.AuditLog?.Voice) return;
            if (data.newState?.channel && !data?.oldState?.channel) des += `${data.newState.member} Changed Voice Channel ${data.oldState.channel} to ${data.newState.channel}`;
            if (data.newState?.channel && data.oldState?.channel) des += `${data.newState.member} Joined ${data.newState.channel}`;
            if (!data?.newState?.channel && data?.oldState?.channel) des += `${data.oldState.member} Left ${data.oldState.channel}`;
            break;


        case "RoleCreate":
            if (!settings.AuditLog.Roles) return;
            embed.setColor(data.audit.target.color)
            des += `A New Role ${data.audit.target} just Created by <@&${data.audit.executor}>`
            break;
        case "RoleDelete":
            if (!settings.AuditLog.Roles) return;
            embed.setColor(data.audit.target.color)
            des += `A Role (${data.audit.target.name} - ${data.audit.targetId}) just Deleted by <@&${data.audit.executor}>`
            break;
        case "RoleUpdate":
            if (!settings.AuditLog.Roles) return;
            embed.setColor(data.audit.target.color)
            tite = "Role Updated";
            des += `- **Changed**: ${data.audit?.changes.map(y => string.capFirstLetter(y.key)).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).join(", ")}`
            break;

        case "ChannelCreate":
            if (!settings.AuditLog.Channels) return;
            des += `A New Channel Created <#${data.audit.targetId}> by ${data.audit.executor}`
            break;
        case "ChannelDelete":
            if (!settings.AuditLog.Channels) return;
            des += `A Channel just deleted (${data.audit.target.name}) by ${data.audit.executor}`
            break;
        case "ChannelUpdate":
            if (!settings.AuditLog.Channels) return;
            tite = "Channel Update";
            des += `- **Changed**: ${data.audit?.changes.map(y => string.capFirstLetter(y.key)).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).join(", ")}`
            break;


        case "ThreadCreate":
            if (!settings.AuditLog.Threads) return;
            des += `A New Thread <#${data.thread.id}> Created in <#${data.thread.parent.id}> by <@${data.thread.ownerId}>`
            break;
        case "ThreadDelete":
            if (!settings.AuditLog.Threads) return;
            des += `A Thread (name: ${data.thread.name}) deleted in <#${data.thread.parent.id}>`
            break;
        case "ThreadUpdate":
            if (!settings.AuditLog.Threads) return;
            des += `A Thread Channel just updated <#${data.thread.id}>`
            break;


        case "GuildScheduledEventCreate":
            if (!settings.AuditLog.ServerEvents) return;
            des += `A New Server event created **${data.event.name}** by ${data.event.creator}`
            break;
        case "GuildScheduledEventDelete":
            if (!settings.AuditLog.ServerEvents) return;
            des += `A Server event just deleted **${data.event.name}**`
            break;
        case "GuildScheduledEventUpdate":
            if (!settings.AuditLog.ServerEvents) return;
            des += `A server event just updated **${data.event.name}**`
            break;

        case "GuildUpdate":
            if (!settings.AuditLog.Guild) return;
            des += `### Server Just Updated\n- Changed: ${data.audit?.changes.map(y => y.key).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).join(", ")}`
            break;

        case "EmojiCreate":
            if (!settings.AuditLog.StickerAndEmotes) return;

            des += `A Emoji Upload ${data.audit.changes.map(y => y.new)[0]} by ${data.audit.executor}`
            break;
        case "EmojiDelete":
            if (!settings.AuditLog.StickerAndEmotes) return;
            des += `A Emoji just deleted \`${data.audit.changes.map(y => y.old)[0]}\` by ${data.audit.executor}`
            break;
        case "EmojiUpdate":
            if (!settings.AuditLog.StickerAndEmotes) return;
            des += `**Emoji Updated**\n- Changed: ${data.audit?.changes.map(y => y.key).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).join(", ")}`
            break;

        case "StickerCreate":
            if (!settings.AuditLog.StickerAndEmotes) return;
            des += `A Sticker Upload ${data.audit.target} by ${data.audit.executor}`
            break;
        case "StickerDelete":
            if (!settings.AuditLog.StickerAndEmotes) return;
            des += `A Emoji just deleted \`:${data.audit.changes.map(y => y.old)[0]}:\` by ${data.audit.executor}`
            break;
        case "StickerUpdate":
            if (!settings.AuditLog.StickerAndEmotes) return;
            des += `**Sticker Updated**\n- Changed: ${data.audit?.changes.map(y => y.key).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).join(", ")}`
            break;

        case "UserUpdate":
            if (!settings.AuditLog.Member) return;
            tite = "Member Profile Updated"

            if (data.audit.changes[0].key === "$add") des += `${data.audit.executor} added following roles to ${data.audit.target}\n\n !{star}**_Roles_**:\n ${data.audit.changes[0].new.slice(0, 30).map(y => `<@&${y.id}>`).join(", ")}`
            else if (data.audit.changes[0].key === "$remove") des += `${data.audit.executor} removed following roles to ${data.audit.target}\n\n !{star}**_Roles_**:\n ${data.audit.changes[0].new.slice(0, 30).map(y => `<@&${y.id}>`).join(", ")}`

            else des += `- **Changed**: ${data.audit?.changes.map(y => string.capFirstLetter(y.key)).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).slice(0, 10).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).slice(0, 10).join(", ")}`
            break;

        case "UserCreate":
            if (!settings.AuditLog.Member && !settings.AuditLog.Guild) return;
            tite = "Member Logs"
            const { action } = data.audit
            if (data.audit.action === AuditLogEvent.BotAdd)
                des += `!{star} ${data.audit.executor} added a bot ${data.audit.target} (${data.audit.executorId})`
            else if (action === AuditLogEvent.MemberBanRemove)
                des += `!{star} ${data.audit.executor} unbaned ${data.audit.target} (${data.audit.targetId})`
            else return;
            break;

        case "UserDelete":
            if (!settings.AuditLog.Member && !settings.AuditLog.Guild) return;
            tite = "Member Logs"
            const Action = data.audit.action
            if (Action === AuditLogEvent.MemberKick) des += `!{star} ${data.audit.executor} kicked ${data.audit.target} (${data.audit.targetId})`
            else if (Action === AuditLogEvent.MemberPrune) des += `!{star} ${data.audit.executor} Purned ${data.audit.target} (${data.audit.targetId})`
            else if (Action === AuditLogEvent.MemberBanAdd) des += `!{star} ${data.audit.executor} Banned ${data.audit.target} (${data.audit.targetId})`
            else return;
            break;

        case "AutoModerationRuleCreate":
            if (!settings.AuditLog.AutoMod) return;
            des += `Auto Moderation Rule Created with type of ${data.audit.target.eventType} by ${data.audit.executor}`
            break;
        case "AutoModerationRuleDelete":
            if (!settings.AuditLog.AutoMod) return;
            des += `Auto Moderation Rule just deleted \`${data.audit.target.name}\` by ${data.audit.executor}`
            break;
        case "AutoModerationRuleUpdate":
            if (!settings.AuditLog.AutoMod) return;
            tite = "Auto Moderation Rule Update";
            des += `- **Changed**: ${data.audit?.changes.map(y => string.capFirstLetter(y.key)).join(", ")}\n- Changes By: ${data.audit.executor} - ${data.audit.executorId}\n- Old: ${data.audit.changes.map(y => y.old).join(", ")}\n- New: ${data.audit.changes.map(y => y.new).join(", ")}`
            break;
    }

    embed.setDescription(des);

    if (tite) embed.setTitle(tite)



    Webhook.send({
        embeds: [embed],
        files
    });

    // if (files.length) Webhook.send({
    //     files
    // })


}