import { Events, Invite } from "discord.js";
import Bot from "../client.mjs";
import { invite as inv } from "../utils/index.mjs";


export default {
  name: Events.InviteCreate,
  /**
   * @param {Bot} client
   * @param {Invite} invite
   */
  run: (client, invite) => {
    inv.invite.updateInvites(invite.guild)
  },
};
