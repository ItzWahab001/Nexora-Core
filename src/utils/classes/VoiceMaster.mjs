import {
  ChannelType,
  PermissionsBitField,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import Bot from "../../client.mjs";
import { cache, logger } from "../index.mjs";

class VoiceMaster {
  /** @param {import("discord.js").GuildMember} member*/
  static Key = (member, channel) =>
    `VoiceMaster:${member.guild.id}:${member.id}:${channel.id}`;

  /** @param {Bot} client  */
  constructor(client) {
    this.client = client;
  }

  /**
   * Hendler join to create
   * @param {Object} data
   * @param {VoiceState} OldVoice
   * @param {VoiceState} NewVoice
   */
  async HandleEvent(data, OldVoice, NewVoice) {
    try {
      if (!data.JoinToCreate) return;

      const JTC = data.JoinToCreate.find(
        (x) => x.Channel === NewVoice.channelId
      );

      if (JTC?.Enable && NewVoice.channelId === JTC.Channel) {
        const parentId = JTC?.Parent || NewVoice.member.voice.channel.parentId;
        const userLimit = NewVoice.member.voice.channel.userLimit || 0;

        const newChannel = await NewVoice.guild.channels.create({
          name: `${NewVoice.member.user.username}'s Channel`,
          type: ChannelType.GuildVoice,
          parent: parentId,
          userLimit: userLimit,
        });

        cache.set(
          VoiceMaster.Key(NewVoice.member, newChannel),
          `${newChannel.id}:${JTC.PanelNum}`
        );

        await NewVoice.member.voice.setChannel(newChannel);
      }

      if (OldVoice.channel) {
        const _JTC = data.JoinToCreate.find(
          (x) => x.Channel === OldVoice.channelId
        );
        
        if (_JTC?.Enable) return;

        const cacheEntry = cache.get(
          VoiceMaster.Key(OldVoice.member, OldVoice.channel)
        );

        if (OldVoice.channelId === cacheEntry?.split(":")[0]) {
          const nonBotMembers = OldVoice.channel.members.filter(
            (x) => !x.user.bot
          ).size;
          if (nonBotMembers === 0) {
            cache.delete(VoiceMaster.Key(OldVoice.member, OldVoice.channel));
            if (OldVoice.channel.deletable) {
              await OldVoice.channel.delete().catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      e.message += ` - ${NewVoice.client.user.username}`;
      logger(e, "error");
    }
  }

  /** @param {VoiceChannel} channel  */
  async Hide(channel, member) {
    return await channel.permissionOverwrites
      .set([
        {
          id: member.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: member.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ])
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  /** @param {VoiceChannel} channel  */
  async UnHide(channel, member) {
    return await channel.permissionOverwrites
      .set([
        {
          id: member.guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ])
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async Lock(channel, member) {
    return await channel.permissionOverwrites
      .set([
        {
          id: member.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.Connect],
        },
        {
          id: member.user.id,
          allow: [PermissionsBitField.Flags.Connect],
        },
      ])
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async UnLock(channel, member) {
    return await channel.permissionOverwrites
      .set([
        {
          id: member.guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.Connect],
        },
      ])
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async Mute(channel, member) {
    await channel.members.forEach((m) => {
      if (m.id !== member.id) m.voice.setMute(true);
    });
    return "Ok";
  }

  async UnMute(channel, member) {
    await channel.members.forEach((m) => {
      if (m.id !== member.id) m.voice.setMute(false);
    });
    return "Ok";
  }

  async Disconnect(channel, member) {
    await channel.members.forEach((m) => {
      if (m.id !== member.id) m.voice.disconnect();
    });
    return "Ok";
  }
  async Rename(channel, member, { text }) {
    return await channel
      .setName(text)
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async Delete(channel, member) {
    return await channel
      .delete()
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async Ban(channel, member, { target }) {
    return await channel.permissionOverwrites
      .set([
        {
          id: target,
          deny: [PermissionsBitField.Flags.Connect],
        },
      ])
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async UnBan(channel, member, { target }) {
    return await channel.permissionOverwrites
      .set([
        {
          id: target,
          allow: [PermissionsBitField.Flags.Connect],
        },
      ])
      .then(() => `Ok`)
      .catch(() => "Error");
  }

  async Permit(channel, member, { number }) {
    return await channel
      .setUserLimit(number)
      .then(() => `Ok`)
      .catch(() => "Error");
  }
}

export default VoiceMaster;
export { VoiceMaster };
