import { Events, GuildMember } from "discord.js";
import { welcome, invite, cache } from "../utils/index.mjs";
import Bot from "../client.mjs";
export default {
  name: Events.GuildMemberRemove,
  /**
   * @param {Bot} client - The Discord client.
   * @param {GuildMember} member - The message object.
   */
  run: async (client, member) => {
    try {
      const data = await member.guild.fetchData();

      if (data?.Farewell?.Channel && data?.Farewell?.Enable) {
        const newInvtes = await member.guild.invites.fetch();
        const usedInvte = invite.invite.usedInvite(newInvtes);
        await welcome.sendFarewell(member, usedInvte, data);
      }

      // sticky roles
      if (data?.StickyRoles.Enable) {
        const userData = await client.db.FindOne("StickyRoles", {
          Guild: member.guild.id,
          User: member.user.id,
        });

        const Roles = [...member._roles, ...data.StickyRoles.Roles];
        if (userData) {
          await client.db.UpdateOne(
            "StickyRoles",
            {
              Guild: member.guild.id,
              User: member.user.id,
            },
            { $set: { Roles } },
            { upsert: true }
          );
        } else {
          await client.db.Create(
            "StickyRoles",
            {
              Guild: member.guild.id,
              User: member.user.id,
              Roles,
            },
            {
              upsert: true,
            }
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
  },
};
