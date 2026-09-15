import { Collection, GuildMember, Role, Webhook } from "discord.js";
import { containsLink, cache, string, EmbedBuilder } from "../index.mjs";
import { manageable as memberInteract } from "../member.mjs";
import log from "../logger.mjs";

const DEFAULT_TIMEOUT_HOURS = 24; //hours

const Colors = {
    TIMEOUT: "#102027",
    UNTIMEOUT: "#4B636E",
    KICK: "#FF7961",
    SOFTBAN: "#AF4448",
    BAN: "#D32F2F",
    UNBAN: "#00C853",
    VMUTE: "#102027",
    VUNMUTE: "#4B636E",
    DEAFEN: "#102027",
    UNDEAFEN: "#4B636E",
    DISCONNECT: "#4B636E",
    MOVE: "#4B636E",
    ROLE: "#FF7961",
    NICK: "#4B636E"
}
/**
* 
* @param {Guild} guild 
* @returns {Webhook}
*/
export const logModWebhook = async (guild) => {
    const settings = await guild.fetchData();
    if (!settings?.Modlog?.WebHook?.id || !settings?.Modlog?.WebHook?.token) return false;

    /** @type {Webhook} */
    let Webhook;
    const key = `Webhook:${guild.id}:${settings.Modlog.WebHook.id}`
    const WebCache = cache.get(key);

    if (WebCache) Webhook = WebCache;
    else {
        Webhook = await guild.client.fetchWebhook(settings.Modlog.WebHook.id, settings.Modlog.WebHook.token)
        cache.set(key, WebCache, 120)
    }

    if (!Webhook) {
        await message.client.db.UpdateOne('GuildConfig', {
            Guild: guild.id
        }, {
            $set: {
                "Modlog.WebHook": {
                    id: null,
                    token: null
                }
            }
        });
        return false;
    }

    return Webhook;
}
/**
 * Send logs to the configured channel and stores in the database
 * @param {import('discord.js').GuildMember} issuer
 * @param {import('discord.js').GuildMember|import('discord.js').User} target
 * @param {String} reason
 * @param {String} type
 * @param {Object} data
 */
export const logModeration = async (issuer, target, reason, type, data = {}) => {

    if (!type) return;
    const { guild } = issuer;
    const settings = await guild.fetchData();

    if (!settings?.Modlog?.WebHook?.id || !settings?.Modlog?.WebHook?.token) return;

    const Webhook = await logModWebhook(guild);

    if (!Webhook) return;

    const forUserFiled = {
        name: "Target",
        value: `\`\`\`yml\n${target?.user?.username} • ${target?.user?.id}\`\`\``,
        inline: true
    }


    const embed = new EmbedBuilder()
        .setTheme(settings.Theme)
        .setAuthor({ name: `Moderation Logs`, iconURL: guild.iconURL({ dynamic: true }) })
        .setFooter({
            text: `By ${issuer.displayName} • ${issuer.id}`,
            iconURL: issuer.displayAvatarURL(),
        });

    type = type.toLowerCase().trim();

    const fields = [{
        name: "Issuer (Moderator)",
        value: `\`\`\`yml\n${issuer.displayName} • ${issuer.id}\`\`\``
    }, {
        name: "Action",
        value: `\`\`\`yml\n!${string.capFirstLetter(type)}\`\`\``,
        inline: true
    }];

    if (typeof reason == "string") fields.push({
        name: "Reason",
        value: `\`\`\`yml\n${reason}\`\`\``,
        inline: true
    })

    const forRoleField = {
        name: 'Role',
        value: `\`\`\`yml\n${data?.role?.name} - [${data?.role?.id}]\`\`\``,
        inline: false
    }

    switch (type) {
        case "purge":
            fields.push(
                { name: "Purge Type", value: `\`\`\`yml\n${data.purgeType}\`\`\``, inline: true },
                { name: "Messages", value: `\`\`\`yml\n${data.deletedCount.toString()}\`\`\``, inline: true },
                { name: "Channel", value: `\`\`\`yml\n#${data.channel.name} [${data.channel.id}]\`\`\``, inline: false }
            );
            break;

        case "timeout":
            embed.setColor(Colors.TIMEOUT);
            fields.push(forUserFiled)
            break;

        case "untimeout":
            embed.setColor(Colors.UNTIMEOUT);
            fields.push(forUserFiled)
            break;

        case "kick":
            embed.setColor(Colors.KICK);
            fields.push(forUserFiled)
            break;

        case "softban":
            embed.setColor(Colors.SOFTBAN);
            fields.push(forUserFiled)
            break;

        case "ban":
            embed.setColor(Colors.BAN);
            fields.push(forUserFiled)
            break;

        case "unban":
            embed.setColor(Colors.UNBAN);
            fields.push(forUserFiled)
            break;

        case "vmute":
            embed.setColor(Colors.VMUTE);
            fields.push(forUserFiled)
            break;

        case "vunmute":
            embed.setColor(Colors.VUNMUTE);
            fields.push(forUserFiled)
            break;

        case "deafen":
            embed.setColor(Colors.DEAFEN);
            fields.push(forUserFiled)
            break;

        case "undeafen":
            embed.setColor(Colors.UNDEAFEN);
            fields.push(forUserFiled)
            break;

        case "disconnect":
            embed.setColor(Colors.DISCONNECT);
            fields.push(forUserFiled)
            break;

        case "move":
            embed.setColor(Colors.MOVE);
            fields.push(forUserFiled)
            break;
        case "roleadd":
            embed.setColor(Colors.ROLE);
            fields.push(forUserFiled)
            fields.push(forRoleField)
            break;
        case "roleremove":
            embed.setColor(Colors.ROLE);
            fields.push(forUserFiled)
            fields.push(forRoleField)
            break;
        case "roledelete":
            embed.setColor(Colors.ROLE);
            fields.push(forRoleField)
            break;
        case "roleupdate":
            embed.setColor(Colors.ROLE);
            fields.push(forRoleField);
            fields.push({
                name: 'Updated',
                value: `\`\`\`yml\n${string.capFirstLetter(data.type)}: ${data.editOptions}\`\`\``,
            })
            break;
        case "nickname":
            embed.setColor(Colors.NICK);
            fields.push(forUserFiled);
            fields.push({
                name: 'Updated to',
                value: `\`\`\`yml\n${string.capFirstLetter(data?.name)}\`\`\``,
            })
            break;
    }

    embed.addFields(...fields);

    await Webhook.send({
        embeds: [embed]
    })
}
export default class ModUtils {
    /**
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     */
    static canModerate(issuer, target) {
        return memberInteract(issuer, target);
    }

    /**
    * @param {import('discord.js').GuildMember} issuer
    * @param {import('discord.js').GuildMember} target
    * @param {string} reason
    * @param {"Timeout"|"Kick"|"SoftBan"|"Ban"} action
    */

    static async addModAction(issuer, target, reason, action) {
        switch (action) {
            case "Timeout":
                return ModUtils.timeoutTarget(issuer, target, DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000, reason);

            case "Kick":
                return ModUtils.kickTarget(issuer, target, reason);

            case "SoftBan":
                return ModUtils.softbanTarget(issuer, target, reason);

            case "Ban":
                return ModUtils.banTarget(issuer, target, reason);
        }
    }


    /**
     * Delete the specified number of messages matching the type
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').BaseGuildTextChannel} channel
     * @param {"Attachment"|"Bot"|"Link"|"Token"|"User"|"All"} type
     * @param {number} amount
     * @param {any} argument
     */
    static async purgeMessages(issuer, channel, type, amount = 75, argument) {

        if (!channel.permissionsFor(issuer).has(["ManageMessages", "ReadMessageHistory"])) {
            return "MemberPerm";
        }

        if (!channel.permissionsFor(issuer.guild.members.me).has(["ManageMessages", "ReadMessageHistory"])) {
            return "BotPerm";
        }

        const toDelete = new Collection();

        try {

            const messages = await channel.messages.fetch({
                limit: amount,
                cache: false,
                force: true
            });

            for (const message of messages.values()) {
                if (toDelete.size >= amount) break;
                if (!message.deletable) continue;
                if (message.createdTimestamp < Date.now() - 1209600000) continue; // skip messages older than 14 days

                if (type === "All") {
                    toDelete.set(message.id, message);
                } else if (type === "Attachment") {
                    if (message.attachments.size > 0) {
                        toDelete.set(message.id, message);
                    }
                } else if (type === "Bot") {
                    if (message.author.bot) {
                        toDelete.set(message.id, message);
                    }
                } else if (type === "Link") {
                    if (containsLink(message.content)) {
                        toDelete.set(message.id, message);
                    }
                } else if (type === "Token") {
                    if (message.content.includes(argument)) {
                        toDelete.set(message.id, message);
                    }
                } else if (type === "User") {
                    if (message.author.id === argument) {
                        toDelete.set(message.id, message);
                    }
                }
            }

            if (toDelete.size === 0) return "NoMessages";

            if (toDelete.size === 1 && toDelete.first().author.id === issuer.id) {
                await toDelete.first().delete();
                return "NoMessages";
            }

            await channel.bulkDelete(toDelete, true);

            await logModeration(issuer, {}, null, "Purge", { channel, purgeType: type, deletedCount: toDelete.size })

            return toDelete.size


        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * warns the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async warnTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        try {
            await logModeration(issuer, target, reason, "Warn");

            let memberDb = await issuer.client.db.FindOne('Warnings', {
                Guild: issuer.guild.id,
                User: target.id
            });

            if (!memberDb) {
                await issuer.client.db.Create('Warnings', {
                    Guild: issuer.guild.id,
                    User: target.id
                }, { upsert: true, new: true });

                memberDb = {
                    Warnings: 0
                }
            }

            memberDb.Warnings += 1;

            const settings = await issuer.guild.fetchData();

            // check if max warnings are reached
            if (memberDb.Warnings >= settings?.MaxWarn?.Limit) {
                await ModUtils.addModAction(issuer.guild.members.me, target, "Max warnings reached", settings.MaxWarn.Action); // moderate
                memberDb.Warnings = 0; // reset warnings
            }

            await issuer.client.db.UpdateOne('Warnings', {
                Guild: issuer.guild.id,
                User: target.id
            }, {
                $set: {
                    Warnings: memberDb.Warnings
                }
            })

            await issuer.client.db.Create('Modlog', {
                Guild: issuer.guild.id,
                User: target.id,
                Reason: reason,
                Type: "Warn",
                Admin: {
                    id: issuer.id,
                    username: issuer.user.username
                }
            }, { upsert: true })

            return true;
        } catch (ex) {
            console.log(ex)
            return "Error";
        }
    }

    /**
     * Timeouts(aka mutes) the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {number} ms
     * @param {string} reason
     */
    static async timeoutTarget(issuer, target, ms, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (target.communicationDisabledUntilTimestamp - Date.now() > 0) return "Already";
        try {
            await target.timeout(ms, reason);
            await logModeration(issuer, target, reason, "Timeout");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
    * change user nickname
    * @param {import('discord.js').GuildMember} issuer
    * @param {import('discord.js').GuildMember} target
    * @param {string} name
     */
    static async setNick(issuer, target, name) {
        if (target.id === issuer.client.user.id && !issuer.guild.members.me.permissions.has("ChangeNickname")) return "BotPerm"
        else if (target.id !== issuer.client.user.id && !memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!memberInteract(issuer, target)) return "MemberPerm";

        try {
            await target.setNickname(name);
            await logModeration(issuer, target, null, "NickName", { name });
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * UnTimeouts(aka mutes) the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async unTimeoutTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (target.communicationDisabledUntilTimestamp - Date.now() < 0) return "NoTimeout";
        try {
            await target.timeout(null, reason);
            await logModeration(issuer, target, reason, "UnTimeout");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * kicks the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async kickTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        try {
            await target.kick(reason);
            logModeration(issuer, target, reason, "Kick");
            return true;
        } catch (ex) {
            log("kickTarget", ex);
            return "Error";
        }
    }

    /**
     * Softbans the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async softbanTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        try {
            await target.ban({
                deleteMessageDays: 7,
                reason
            });
            await issuer.guild.members.unban(target.user);
            await logModeration(issuer, target, reason, "Softban");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Bans the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async banTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        try {
            await issuer.guild.bans.create(target.id, {
                days: 0,
                reason: `${reason} - Banned By ${issuer.displayName}`
            });
            await logModeration(issuer, target, reason, "Ban");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
    * Add role to someone and logs to the database, channel
    * @param {import('discord.js').GuildMember} issuer
    * @param {import('discord.js').GuildMember} target
    * @param {Role} role
    */
    static async addRole(issuer, target, role) {
        const myPositon = issuer.guild.members.me.roles.highest.position;
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (role?.position >= myPositon) return "BotPositon";
        if (role.tags && role.tags.botId) return "BotRole";
        if (!target.roles.cache.get(role)) return "Already";
        try {
            await target.roles.add(role)
            await logModeration(issuer, target, null, "RoleAdd", { role });
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }


    /**
    * @param {Role} role
    */
    static async RolesIn(role) {
        try {
            const key = `RolesIn:${role.id}`

            const cacheData = cache.get(key);
            if (cacheData) return cacheData;
            else {
                const { members } = role

                if (members.size === 0) return false;

                const maped = members.map((i, index) => `${i.user.displayName} - ${i.user.id}`);

                cache.set(key, `Total: ${members.size}\n\n${maped}`, 30);

                return cache.get(key);
            }

        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
    * @param {import('discord.js').GuildMember} issuer
    * @param {Role} role
    * @param {String} editOptions
    */
    static async roleUpdate(issuer, role, type, value = "") {
        try {
            const myPositon = issuer.guild.members.me.roles.highest.position;
            const issuerPositon = issuer.roles.highest.position;

            if (role?.position >= myPositon) return "BotPositon"
            if (role?.position > issuerPositon && issuer.guild.ownerId !== issuer.id) return "MemberPerm"
            if ((role.tags && role.tags.botId) || !role.editable) return "BotRole"

            switch (type) {
                case "color":
                    await role.setColor(value)
                    break;
                case "icon":
                    await role.setIcon(value)
                    break;
                case "name":
                    await role.setName(value)
                    break;
                case "mentionable":
                    await role.setMentionable(value)
                    break
            }

            await logModeration(issuer, null, null, "RoleUpdate", { editOptions: value, role, type })

            return true

        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
    * Remove role to someone and logs to the database, channel
    * @param {import('discord.js').GuildMember} issuer
    * @param {import('discord.js').GuildMember} target
    * @param {Role} role
    */
    static async removeRole(issuer, target, role) {
        const myPositon = issuer.guild.members.me.roles.highest.position;
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (role?.position >= myPositon) return "BotPositon"
        if (role.tags && role.tags.botId) return "BotRole"
        if (target.roles.cache.get(role)) return "Already";
        try {
            await target.roles.remove(role)
            await logModeration(issuer, target, null, "RoleRemove", { role });
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
    * Remove role to someone and logs to the database, channel
    * @param {import('discord.js').GuildMember} issuer
    * @param {Role} role
    * @param {string} reason
    */
    static async delRole(issuer, role, reason) {
        const myPositon = issuer.guild.members.me.roles.highest.position;
        const issuerPositon = issuer.roles.highest.position;

        if (role?.position >= myPositon) return "BotPositon"
        if (role?.position > issuerPositon) return "MemberPerm"
        if (role.tags && role.tags.botId) return "BotRole"

        try {
            await issuer.guild.roles.delete(role, { reason: `Deleted by ${issuer.user.displayName}: ${reason}` })
            await logModeration(issuer, null, null, "RoleDelete", { role });
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Bans the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').User} target
     * @param {string} reason
     */
    static async unBanTarget(issuer, target, reason) {
        try {
            await issuer.guild.bans.remove(target, reason);
            await logModeration(issuer, target, reason, "UnBan");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Voice mutes the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async vMuteTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!target.voice.channel) return "NoVoice";
        if (target.voice.mute) return "Already";
        try {
            await target.voice.setMute(true, reason);
            await logModeration(issuer, target, reason, "Vmute");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Voice unmutes the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async vUnmuteTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!target.voice.channel) return "NoVoice";
        if (!target.voice.mute) return "NotMuted";
        try {
            await target.voice.setMute(false, reason);
            logModeration(issuer, target, reason, "Vmute");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Deafens the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async deafenTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!target.voice.channel) return "NoVoice";
        if (target.voice.deaf) return "Already";
        try {
            await target.voice.setDeaf(true, reason);
            await logModeration(issuer, target, reason, "Deafen");
            return true;
        } catch (ex) {
            log(ex, "error");
            return `Failed to deafen ${target.user.tag}`;
        }
    }

    /**
     * UnDeafens the target and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async unDeafenTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!target.voice.channel) return "NoVoice";
        if (!target.voice.deaf) return "NotDeafned";
        try {
            await target.voice.setDeaf(false, reason);
            await logModeration(issuer, target, reason, "unDeafen");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Disconnects the target from voice channel and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     */
    static async disconnectTarget(issuer, target, reason) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!target.voice.channel) return "NoVoice";
        try {
            await target.voice.disconnect(reason);
            await logModeration(issuer, target, reason, "Disconnect");
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }

    /**
     * Moves the target to another voice channel and logs to the database, channel
     * @param {import('discord.js').GuildMember} issuer
     * @param {import('discord.js').GuildMember} target
     * @param {string} reason
     * @param {import('discord.js').VoiceChannel|import('discord.js').StageChannel} channel
     */
    static async moveTarget(issuer, target, reason, channel) {
        if (!memberInteract(issuer, target)) return "MemberPerm";
        if (!memberInteract(issuer.guild.members.me, target)) return "BotPerm";
        if (!target.voice?.channel) return "NoVoice";
        if (target.voice.channelId === channel.id) return "Already";
        if (!channel.permissionsFor(target).has(["ViewChannel", "Connect"])) return "TargetPerm";
        try {
            await target.voice.setChannel(channel, reason);
            await logModeration(issuer, target, reason, "Move", { channel });
            return true;
        } catch (ex) {
            log(ex, "error");
            return "Error";
        }
    }
}
;