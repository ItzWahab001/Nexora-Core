import { Events, NewsChannel } from "discord.js";
import { auditlog, cache, number } from "../utils/index.mjs";
import Bot from "../client.mjs";
import { HandleJTC } from "../utils/handlers/JoinToCreate.mjs";
export default {
  name: "voiceStateUpdate",
  /**
   * @param {Bot} client - The Discord client.
   * @param {import('discord.js').VoiceState} newState
   * @param {import('discord.js').VoiceState} oldState
   */
  run: async (client, oldState, newState) => {
    const data = await oldState.guild.fetchData();

    await HandleJTC(data, oldState, newState)
    await auditlog("Voice", oldState.guild, { oldState, newState });

    if (data.Levels !== true) return;
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const guild = newState.guild;

    if (!oldChannel && !newChannel) return;

    if (!newState.member) return;

    const member = await newState.member.fetch().catch(() => null);

    if (!member || member.user.bot) return;

    // Member joined a voice channel
    if (!oldChannel && newChannel) {
      let statsDb = await client.db.FindOne("Level", {
        Guild: member.guild.id,
        User: member.id,
      });

      if (!statsDb) {
        await client.db.Create("Level", {
          Guild: member.guild.id,
          User: member.id,
        });
        statsDb = await client.db.FindOne("Level", {
          Guild: member.guild.id,
          User: member.id,
        });
      }

      const isCache = cache.get(
        `VCStats:Connections:${member.guild.id}:${newState.member.id}`
      );

      if (isCache) return;

      cache.set(`VCStats:${member.guild.id}:${newState.member.id}`, Date.now());
      cache.set(
        `VCStats:Connections:${member.guild.id}:${newState.member.id}`,
        true,
        5
      );
    }

    // Member left a voice channel
    if (oldChannel && !newChannel) {
      const Cache = cache.get(
        `VCStats:${member.guild.id}:${newState.member.id}`
      );
      if (Cache) {
        const time = Date.now() - Cache;

        const hasLeveledUp = await client.lvl.addVoiceXP({
          user: member.user,
          guild: member.guild,
          xp: number.clamp(parseInt(time / 60 / 1000), 1, 100),
          time: parseInt(time / 60 / 1000),
        });

        cache.delete(`VCStats:${member.guild.id}:${newState.member.id}`);

        if (hasLeveledUp) {
          const user = await client.lvl.fetchVoiceLevels(
            {
              user: member.user,
              guild: member.guild,
            },
            false
          );

          const attachments = [];

          if (data?.VoiceLevelupMessage) {
            var levelMessage = data.VoiceLevelupMessage;

            levelMessage = levelMessage
              .replace(`{user:username}`, member.user.username)
              .replace(`{user:mention}`, member.user)
              .replace(`{user:level}`, user.Voice.level)
              .replace(`{user:xp}`, user.Voice.xp);

            const CardData = data.LevelupCard;

            if (data?.Cards?.RankUp) {
              const card = await new LevelUp()
                .setAvatar(
                  member.avatarURL({
                    forceStatic: true,
                    extension: "png",
                  }) ||
                    member.displayAvatarURL({
                      forceStatic: true,
                      extension: "png",
                    })
                )
                .setBackground(
                  "image",
                  CardData?.Background &&
                    (await isImageURLValid(CardData.Background))
                    ? CardData.Background
                    : Theme.LevelupCard.Background
                )
                .setUsername(member.user.username)
                .setBorder(
                  `#${
                    CardData
                      ? CardData.BoderColor
                      : Theme.LevelupCard.BoderColor
                  }`
                )
                .setAvatarBorder(
                  `#${
                    CardData
                      ? CardData.AvatarBoderColor
                      : Theme.LevelupCard.AvatarBoderColor
                  }`
                )
                .setOverlayOpacity(0.8)
                .setLevels(user.Voice.level - 1, user.Voice.level)
                .build();

              const attachment = new AttachmentBuilder(card, {
                name: `rankup-${member.id}.png`,
              });
              attachments.push(attachment);
            }

            try {
              if (data.VoiceLevelupChannel) {
                await guild.channels
                  .fetch(data.VoiceLevelupChannel)
                  ?.safeSend({
                    files: attachments,
                    content: levelMessage,
                  })
                  .catch(() => {});
              }
            } catch {}
          }

          const dataRew = await client.db.FindOne("VoiceLevelRoles", {
            Guild: guild.id,
            Level: user.level,
          });

          if (dataRew !== null) member.roles.add(dataRew.Role).catch((e) => {});
        }
      }
    }
  },
};
