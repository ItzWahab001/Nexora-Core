import { Events, NewsChannel } from "discord.js";
import { auditlog, cache } from "../../utils/index.mjs"
import Bot from "../../client.mjs";
export default {
    name: Events.GuildAuditLogEntryCreate,
    /**
    * @param {Bot} client - The Discord client.
    * @param {import('discord.js').GuildAuditLogsEntry} audit
    * @param {import('discord.js').Guild} guild
    */
    run: async (client, audit, guild) => {
        const { targetType, actionType } = audit;

        if (audit.targetType === "Guild" && audit.actionType === "Update") await auditlog("GuildUpdate", guild, { audit })
        else if (targetType == "Sticker" && actionType === "Create") await auditlog("StickerCreate", guild, { audit })
        else if (targetType == "Sticker" && actionType === "Delete") await auditlog("StickerDelete", guild, { audit })
        else if (targetType == "Sticker" && actionType === "Update") await auditlog("StickerUpdate", guild, { audit })

        else if (targetType == "Emoji" && actionType === "Create") await auditlog("EmojiCreate", guild, { audit })
        else if (targetType == "Emoji" && actionType === "Delete") await auditlog("EmojiDelete", guild, { audit })
        else if (targetType == "Emoji" && actionType === "Update") await auditlog("EmojiUpdate", guild, { audit })

        else if (targetType == "Role" && actionType === "Create") await auditlog("RoleCreate", guild, { audit })
        else if (targetType == "Role" && actionType === "Delete") await auditlog("RoleDelete", guild, { audit })
        else if (targetType == "Role" && actionType === "Update") await auditlog("RoleUpdate", guild, { audit })

        else if (targetType === "User" && actionType === "Update") await auditlog("UserUpdate", guild, { audit })
        else if (targetType === "User" && actionType === "Delete") await auditlog("UserDelete", guild, { audit })
        else if (targetType === "User" && actionType === "Create") await auditlog("UserCreate", guild, { audit })

        else if (targetType == "Channel" && actionType === "Create") await auditlog("ChannelCreate", guild, { audit })
        else if (targetType == "Channel" && actionType === "Delete") await auditlog("ChannelDelete", guild, { audit })
        else if (targetType == "Channel" && actionType === "Update") await auditlog("ChannelUpdate", guild, { audit })

        else if (targetType == "AutoModerationRule" && actionType === "Create") await auditlog("AutoModerationRuleCreate", guild, { audit })
        else if (targetType == "AutoModerationRule" && actionType === "Delete") await auditlog("AutoModerationRuleDelete", guild, { audit })
        else if (targetType == "AutoModerationRule" && actionType === "Update") await auditlog("AutoModerationRuleUpdate", guild, { audit })

        
    }
}