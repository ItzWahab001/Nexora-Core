import { Guild, GuildMember, Webhook } from "discord.js";
import {
  EmbedBuilder,
  ModUtils,
  containsLink,
  containsDiscordInvite,
  cache,
  logger,
} from "./index.mjs";
import { get } from "http";

const antispamCache = new Map();
const MESSAGE_SPAM_THRESHOLD = 5000;
const MAX_MESSAGES = 5; // Adjust this based on your needs

// Cleanup the cache
setInterval(() => {
  antispamCache.forEach((value, key) => {
    if (Date.now() - value.timestamp > MESSAGE_SPAM_THRESHOLD) {
      antispamCache.delete(key);
    }
  });
}, 10 * 60 * 1000);

/**
 * Check if the message needs to be moderated and has required permissions
 * @param {import('discord.js').Message} message
 */
const shouldModerate = (message) => {
  try {
    const { member, guild, channel } = message;

    // Ignore if bot cannot delete channel messages
    if (!channel.permissionsFor(guild.members.me)?.has("ManageMessages"))
      return false;

    // Ignore Possible Guild Moderators
    if (member.permissions.has(["KickMembers", "BanMembers", "ManageGuild"]))
      return false;

    // Ignore Possible Channel Moderators
    if (channel.permissionsFor(message.member).has("ManageMessages"))
      return false;
    return true;
  } catch (e) {
    logger(e, "error");
  }
};

/**
 * Perform moderation on the message
 * @param {import('discord.js').Message} message
 * @param {object} settings
 */
async function performAutomod(message, settings) {
  try {
    const { AutoMod } = settings;

    if (!AutoMod.Enable) return;
    if (AutoMod.Whitelist.Channels.includes(message.channelId)) return;
    if (AutoMod.Whitelist.Users.includes(message.author.id)) return;
    if (message.member._roles.includes(AutoMod.Whitelist.Roles)) return;
    if (!AutoMod.Debug && !shouldModerate(message)) return;

    const { channel, member, guild, content, author } = message;
    if (!settings.Modlog?.WebHook?.id || !settings.Modlog?.WebHook?.token)
      return;

    /** @type {Webhook} */
    let Webhook;
    const key = `Webhook:${guild.id}:${settings.Modlog.WebHook.id}`;
    const WebCache = cache.get(key);

    if (WebCache) Webhook = WebCache;
    else {
      Webhook = await message.client.fetchWebhook(
        settings.Modlog.WebHook.id,
        settings.Modlog.WebHook.token
      );
      cache.set(key, WebCache, 120);
    }

    if (!Webhook) {
      await message.client.db.UpdateOne(
        "GuildConfig",
        {
          Guild: guild.id,
        },
        {
          $set: {
            "Modlog.WebHook": {
              id: null,
              token: null,
            },
          },
        }
      );
      return;
    }

    let shouldDelete = false;
    let strikesTotal = 0;

    const fields = [];
    // Define a regular expression to match mentions
    const mentionRegex = /<@!?\d+>|<@&\d+>/g;

    // Use the match method to find all mentions in the message content
    const mentions = message.content.match(mentionRegex);

    // Max mentions
    if (
      AutoMod.Anti.MassMention &&
      mentions?.length >= AutoMod.Anti.MassMention
    ) {
      fields.push({
        name: "Mentions",
        value: `${mentions.length}/${AutoMod.Anti.MassMention}`,
        inline: true,
      });
      // shouldDelete = true;
      strikesTotal += 1;
    } else if (message.mentions.everyone) {
      fields.push({ name: "Everyone Mention", value: "✓", inline: true });
      strikesTotal += 1;
    }

    // Max Lines
    // if (AutoMod.max_lines > 0) {
    //     const count = content.split("\n").length;
    //     if (count > AutoMod.max_lines) {
    //         fields.push({ name: "New Lines", value: `${count}/${AutoMod.max_lines}`, inline: true });
    //         shouldDelete = true;
    //         // strikesTotal += Math.ceil((count - AutoMod.max_lines) / AutoMod.max_lines);
    //         strikesTotal += 1;
    //     }
    // }

    // Anti Attachments
    // if (AutoMod.anti_attachments) {
    //     if (message.attachments.size > 0) {
    //         fields.push({ name: "Attachments Found", value: "✓", inline: true });
    //         shouldDelete = true;
    //         strikesTotal += 1;
    //     }
    // }

    // Anti links
    if (AutoMod.Anti.Links) {
      if (containsLink(content)) {
        fields.push({ name: "Links Found", value: "✓", inline: true });
        shouldDelete = true;
        strikesTotal += 1;
      }
    }

    // Anti Spam

    if (AutoMod.Anti.Spam) {
      const key = `${author.id}:${message.guildId}:${message.channelId}`;

      // Check if the user has recent messages in the cache
      if (antispamCache.has(key)) {
        const userMessages = antispamCache.get(key);

        // Check if the user has sent too many messages
        if (userMessages.length >= MAX_MESSAGES) {
          const lastMessage = userMessages[MAX_MESSAGES - 1];

          // Check if the time difference between the last two messages is within the threshold
          const timeDifference = Date.now() - lastMessage.timestamp;

          if (timeDifference < MESSAGE_SPAM_THRESHOLD) {
            // Spam detected
            fields.push({
              name: "AntiSpam Detection",
              value: "✓",
              inline: true,
            });
            shouldDelete = true;
            strikesTotal += 1;
          }
        }

        // Add the current message to the user's message history
        userMessages.push({ content, timestamp: Date.now() });

        // Keep only the last MAX_MESSAGES messages to prevent the cache from growing indefinitely
        antispamCache.set(key, userMessages.slice(-MAX_MESSAGES));
      } else {
        // Initialize the user's message history in the cache
        antispamCache.set(key, [{ content, timestamp: Date.now() }]);
      }
    }

    // Anti Invites
    if (!AutoMod.Anti.Links && AutoMod.Anti.Invites) {
      if (containsDiscordInvite(content)) {
        fields.push({ name: "Discord Invites", value: "✓", inline: true });
        shouldDelete = true;
        strikesTotal += 1;
      }
    }

    // delete message if deletable
    if (shouldDelete && message.deletable) {
      message
        .delete()
        .then(() => channel.safeSend("> Auto-Moderation! Message deleted", 5))
        .catch(() => {});
    }

    if (strikesTotal > 0) {
      // add strikes to member
      const memberDb = await getMember(guild, author);
      memberDb.Strikes += strikesTotal;

      // log to db
      const reason = fields
        .map((field) => field.name + ": " + field.value)
        .join("\n");

      await guild.client.db.Create(
        "Modlog",
        {
          Guild: guild.id,
          User: author.id,
          Reason: reason,
          Admin: {
            id: guild.members.me.id,
            username: guild.members.me.user.username,
          },
          Strikes: strikesTotal,
          Type: "AutoMod",
        },
        { upsert: true, new: true }
      );

      // send AutoMod log
      if (Webhook) {
        const logEmbed = new EmbedBuilder()
          .setAuthor({ name: "Auto Moderation" })
          .setThumbnail(author.displayAvatarURL())
          .setColor("#36393F")
          .addFields(fields)
          .setDescription(
            `**Channel:** ${channel.toString()}\n**Content:**\n${content}`
          )
          .setFooter({
            text: `By ${author.username} | ${author.id}`,
            iconURL: author.avatarURL(),
          });

        await Webhook.send({ embeds: [logEmbed] });
      }

      // DM strike details
      const strikeEmbed = new EmbedBuilder()
        .setColor("#36393F")
        .setThumbnail(guild.iconURL())
        .setAuthor({ name: "Auto Moderation" })
        .addFields(fields)
        .setDescription(
          `You have received ${strikesTotal} strikes!\n\n` +
            `**Guild:** ${guild.name}\n` +
            `**Total Strikes:** ${memberDb.Strikes} out of ${AutoMod.Strikes}`
        );

      await author.send({ embeds: [strikeEmbed] }).catch((ex) => {});

      // check if max strikes are received
      if (memberDb.Strikes >= AutoMod.Strikes) {
        // Reset Strikes
        memberDb.Strikes = 0;

        // Add Moderation Action
        await ModUtils.addModAction(
          guild.members.me,
          member,
          `AutoMod By ${guild.client.user.displayName}: Max strikes received`,
          AutoMod.Action
        ).catch(() => {});
      }

      await guild.client.db.UpdateOne(
        "Warnings",
        {
          Guild: guild.id,
          User: author.id,
        },
        {
          $set: {
            ["Strikes"]: memberDb.Strikes,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (e) {
    logger(e, "error");
  }
}

/**
 *
 * @param {Guild} guild
 * @param {GuildMember} author
 */
async function getMember(guild, author) {
  const data = await guild.client.db.FindOne("Warnings", {
    Guild: guild.id,
    User: author.id,
  });
  if (data) return data;

  await guild.client.db.Create(
    "Warnings",
    {
      Guild: guild.id,
      User: author.id,
    },
    { upsert: true, new: true }
  );

  return await guild.client.db.FindOne("Warnings", {
    Guild: guild.id,
    User: author.id,
  });
}

export { performAutomod, getMember as getWarnData };
