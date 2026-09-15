import { AttachmentBuilder, Invite } from "discord.js";
import { EmbedBuilder, cache } from "./index.mjs";
import { welcomeCard } from "greetify";
import Bot from "../client.mjs";

const getSettings = async (guild) => await guild.fetchData();

/**
 * @param {string} content
 * @param {import('discord.js').GuildMember} member
 * @param {Invite | undefined} inviteData
 */
const parse = async (content, member, inviteData, invitecount = 0) => {
  return content
    .replace(/\\n/g, "\n")
    .replace(/{guild:name}/g, member.guild.name)
    .replace(/{guild:membercount}/g, member.guild.memberCount)
    .replace(
      /{user:accountcreated}/g,
      parseInt(member.user.createdTimestamp / 1000)
    )
    .replace(/{user:nick}/g, member.displayName)
    .replace(/{user:name}/g, member.user.username)
    .replace(/{user:dis}/g, member.user.discriminator)
    .replace(/{user:tag}/g, member.user.tag)
    .replace(/{user:mention}/g, member.toString())
    .replace(/{user:avatar}/g, member.displayAvatarURL())
    .replace(/{inviter:username}/g, inviteData?.inviter?.username || "unknown")
    .replace(
      /{inviter:mention}/g,
      inviteData?.inviter?.toString() || "@unknown"
    );
};

const buildCard = async (member, data, type) => {
  let cardata = data.WelcomeCard;
  if (type === "FAREWELL") cardata = data?.FarewellCard;

  const welcard = await new welcomeCard()
    .setName(member.user.username)
    .setAvatar(member.user.displayAvatarURL({ format: "png" }))
    .setMessage(
      await parse(cardata.Message || "Members {guild:membercount}", member)
    )
    .setBackground(cardata.Background)
    .setColor(cardata.Color) // without #

    .setTitle(type === "FAREWELL" ? "GoodBye" : "Welcome")
    .build();

  const attachment = new AttachmentBuilder(welcard, {
    name: `card-${member.user.id}.png`,
  });

  return attachment;
};

/**
 * @param {import('discord.js').GuildMember} member
 * @param {"WELCOME"|"FAREWELL"} type
 * @param {Object} data
 * @param {Invite | undefined} inviterData
 */
const buildGreeting = async (member, type, data, inviterData) => {
  if (!data) return;
  let config = type === "FAREWELL" ? data.Farewell : data.Welcome;

  /**
   * @type {Bot}
   */
  const client = member.client;

  if (inviterData.inviter) {
    client.db.UpdateOne(
      "GuildMember",
      {
        Guild: member.guild.id,
        User: member.id,
      },
      {
        $set: {
          InvitedBy: inviterData?.inviter?.id || null,
        },
      },
      {
        upsert: true,
      }
    );

  await  client.db.UpdateOne(
      "GuildMember",
      {
        Guild: member.guild.id,
        User: inviterData.inviterId,
      },
      {
        $inc: {
          ["Invites.Count"]: type == "WELCOME" ? 1 : -1,
        },
      }
    );
  }

  return {
    content: await parse(config.Message, member, inviterData),
    files: config?.Card ? [await buildCard(member, data, type)] : [],
  };
};

/**
 * Send welcome message
 * @param {import('discord.js').GuildMember} member
 * @param {Object} inviterData
 */
async function sendWelcome(member, inviterData = {}, data = {}) {
  const { guild } = member;

  if (!guild || !member) return;
  if (!data || !data?.Welcome?.Enable) return;

  let channel = guild.channels.cache.get(data?.Welcome?.Channel);

  if (!channel) {
    return;
  }

  // build welcome message
  const response = await buildGreeting(member, "WELCOME", data, inviterData);

  await channel.send(response).catch(() => {});
}

/**
 * Send welcome message
 * @param {import('discord.js').GuildMember} member
 * @param {Object} inviterData
 */
async function sendFarewell(member, inviterData = {}, data) {
  const { guild } = member;

  if (!guild || !member) return;

  if (!data || !data?.Farewell?.Enable) return;

  let channel = guild.channels.cache.get(data?.Farewell?.Channel);

  if (!channel) return;

  // build welcome message
  const response = await buildGreeting(member, "FAREWELL", data, inviterData);

  await channel.send(response).catch(() => {});
}

export { buildCard, buildGreeting, sendWelcome, sendFarewell };
