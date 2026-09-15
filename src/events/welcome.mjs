import { Events, GuildMember } from "discord.js";
import { welcome, invite, cache } from "../utils/index.mjs";
import Bot from "../client.mjs";
export default {
  name: "guildMemberAdd",
  /**
   * @param {Bot} client - The Discord client.
   * @param {GuildMember} member - The message object.
   */
  run: async (client, member) => {
    try {
      const data = await member.guild.fetchData();

      if (data?.Welcome?.Channel && data?.Welcome?.Enable) {
        const newInvtes = await member.guild.invites.fetch();
        const usedInvte = invite.invite.usedInvite(newInvtes);
        await welcome.sendWelcome(member, usedInvte, data);
      }

      // sticky roles
      if (data?.StickyRoles.Enable) {
        const userData = await client.db.FindOne("StickyRoles", {
          Guild: member.guild.id,
          User: member.user.id,
        });
        if (userData) {
          userData?.Roles?.forEach((ro) => {
            const RoleKey = `Wel:Roles:${ro}`;
            let roleCache = cache.get(RoleKey);
            let role;
            if (roleCache) role = roleCache;
            else {
              role = member.guild.roles.cache.get(ro);
              cache.set(RoleKey, role, 40);
            }
            if (!role || !role?.editable) return;
            member.roles.add(role).catch(() => {});
          });
        }
      }

      // * AutoRoles

      if (data?.AutoRoles.Enable) {
        data?.AutoRoles?.Roles?.forEach((ro) => {
          const RoleKey = `Wel:Roles:${ro}`;
          let roleCache = cache.get(RoleKey);
          let role;
          if (roleCache) role = roleCache;
          else {
            role = member.guild.roles.cache.get(ro);
            cache.set(RoleKey, role, 40);
          }
          if (!role || !role?.editable) return;
          member.roles.add(role).catch(() => {});
        });
      }
    } catch (e) {
      console.log(e);
    }
  },
};
