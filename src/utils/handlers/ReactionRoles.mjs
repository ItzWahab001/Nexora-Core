import { slash as ErrorHandler } from '../errorHandler.mjs';
import {cache }from '../index.mjs';
import Bot from '../../client.mjs';

/** @type {import('./index.mjs').BasicParamHandler} */
export const ReactionRoleHandler = async (i, data) => {
    const err = (err) => ErrorHandler(i, err);
    try {
        if (i.isStringSelectMenu() && i.customId.includes("reaction-roles-panel")) {
            const { guildId, client } = i

            let data;
            let Panel = i.customId.replace("reaction-roles-panel-", "")
            let cacheData = cache.get("ReactionRolesData-" + guildId);

            if (cacheData) data = cacheData;

            else {
                data = await client.db.FindOne('ReactionRoles', {
                    Guild: guildId,
                    Panel
                });
                if (data) cache.set("ReactionRolesData-" + guildId, data, 10);
            }

            if (!data?.Roles?.length) return await i.deferUpdate();

            let role;
            let roleId = i.values[0];
            let Cache = cache.get("role-" + roleId);


            if (!Cache) {
                role = await i.guild.roles.fetch(roleId).catch(() => null);
                cache.set("role-" + roleId, role, 60);
            } else role = Cache;

            if (!role || role === null) return await i.safeReply({
                content: `Role not found`,
                ephemeral: true
            })

            const { member } = i;

            await i.deferReply({
                ephemeral: true,
                fetchReply: true
            })

            let type = member.roles.cache.has(i.values[0]) ? "remove" : "add";

            await member.roles[type](role).catch(err => {
                return i.safeEdit({
                    content: `!{i} Got an error while ${type == "add" ? "adding" : "Remving"} role.`.replaceEmojis(data.Theme),
                });
            });

            await i.safeEdit({
                content: `!{y} ${type == "add" ? "Added" : "Removed"} Role: **${role.name}**`.replaceEmojis(data.Theme),
            })


            if (type == "add" && !data.MultiSelect) {
                let roles = data.Roles.filter(r => r.RoleID !== role.id);
                roles.forEach(async r => {
                    if (member.roles.cache.has(r.RoleID)) {
                        await member.roles.remove(r.RoleID).catch({})
                    }
                })
            }

        }
    } catch (e) {
        err(e)
    }

}