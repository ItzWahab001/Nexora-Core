import { cache } from "./index.mjs";
import { Client, Collection, Guild, Invite } from "discord.js";

/**
 * @type {Map<string, Map<string, number | undefined>>}
 */
const guildInvites = new Map();

/**
 * @param {Guild} guild
 */
const updateInvites = async (guild) => {
  if (!guild.members?.me?.permissions?.has("ManageGuild")) return null;

  const invites = await guild?.invites?.fetch();

  const condUses = new Map();

  for (const [, inv] of invites) condUses.set(inv.code, inv.uses);
  guildInvites.set(guild.id, condUses);

  return invites;
};

export const invite = {
  guildInvites: (id) => guildInvites.get(id),
  /**
   * @param {Invite[]} newInvites
   */
  usedInvite: (newInvites) => {
    return newInvites.find(
      (inv) => guildInvites.get(inv.guild.id)?.get(inv.code) < inv.uses
    );
  },

  updateInvites: updateInvites,
};
