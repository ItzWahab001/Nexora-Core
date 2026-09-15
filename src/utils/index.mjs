import { Application, Guild, Webhook } from "discord.js";
import * as number from "./number.mjs";
import axios from "axios";
import url from "url";
import Level from "./classes/Level.mjs";
import EmbedBuilder from "./classes/EmbedBuilder.mjs";
import ModUtils, { logModeration, logModWebhook } from "./classes/ModUtils.mjs";
import Economy from "./classes/Economy.mjs";
import Database from "./classes/Database.mjs";
import GiveawaysManager from "./classes/Giveaways.mjs";
import VoiceMaster from "./classes/VoiceMaster.mjs";
import cache from "./cache.mjs";
import nsfwWords from "./stuff/nsfwWords.mjs";
import * as todClassic from "./stuff/tod/classic.mjs";
import * as todNsfw from "./stuff/tod/nsfw.mjs";
import * as todFunny from "./stuff/tod/funny.mjs";
import * as invite from "./invite.mjs";
import * as welcome from "./welcome.mjs";
import * as string from "./string.mjs";
import * as variables from "./variables.mjs";
import * as automod from "./automod.mjs";
import * as justreddit from "justreddit";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { auditlog } from "./auditlog.mjs";
import { Eiyuu } from "eiyuu";
import { NSFW } from "nsfwhub";
import logger, { webhookLog } from "./logger.mjs";

const eiyuu = new Eiyuu();
const getURLParts = url.parse;
const hub = new NSFW();

const parser = new Parser({
  timeout: 1_0000,
});
export {
  cache,
  Level,
  string,
  welcome,
  invite,
  automod,
  Economy,
  ModUtils,
  Database,
  variables,
  EmbedBuilder,
  GiveawaysManager,
  VoiceMaster,
  logModeration,
  logModWebhook,
  number,
  auditlog,
  nsfwWords,
  logger,
  webhookLog,
  justreddit,
};

/**
 *
 * @param {import("discord.js").MessageReplyOptions} content
 * @param {import("../Models/GuildConfig.mjs")} guildData
 * @returns
 */
export const ParseContent = (content, guildData) => {
  if (!content?.files || !Array.isArray(content.files))
    return JSON.parse(
      JSON.stringify(content)
        .translate(guildData.Language || "en") // "./index.mjs"
        .replaceEmojis(guildData.Theme || "Yellow") // "./replaceEmoji.mjs"
    );
  else {
    const { files, ...otherOptions } = content;
    const Parsed = JSON.parse(
      JSON.stringify(otherOptions)
        .translate(guildData.Language || "en")
        .replaceEmojis(guildData.Theme || "Yellow")
    );
    return {
      files,
      ...Parsed,
    };
  }
};

/**
 * Sanitizes a message by truncating it if it exceeds the specified character limit.
 * @param {string} message The message to sanitize.
 * @param {number} [limit=2000] The character limit. Default is 2000.
 * @returns {string} The sanitized message.
 */
export const sanitizeMessage = (message, limit = 2000) => {
  return message.length > limit ? message.slice(0, limit - 3) + "..." : message;
};

/**
 * convert object values into keys and keys into values
 * @param {Object} obj
 * @returns {Object}
 */
export const convertObject = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

export const progressBar = (percentage = 0, progressBarLength = 14) => {
  // TODO
  const pb = {
    le: "<:lefte:1162595345532985404>",
    me: "<:middlee:1162595342466953256>",
    re: "<:righte:1162595340675985438>",
    lf: "<:leftf:1162595336636862554>",
    mf: "<:middlef:1162595334552301681>",
    rf: "<:rightf:1162595330823565412>",
  };

  percentage = number.clamp(percentage, 0, 100);

  const filledSquares = Math.round((percentage / 100) * progressBarLength) || 0;
  const emptySquares = progressBarLength - filledSquares || progressBarLength;

  const ProgressBar =
    (filledSquares ? pb.lf : pb.le) +
    (pb.mf.repeat(filledSquares) + pb.me.repeat(emptySquares)) +
    (filledSquares === progressBarLength ? pb.rf : pb.re);

  return ProgressBar;
};

export const progressBar2 = (percentage = 0, steps = 10) => {
  percentage = number.clamp(percentage, 0, 100);

  const markers = {
    filled: "#",
    unfilled: "-",
  };

  const progress = Math.round((percentage / 100) * steps);

  return (
    "[" +
    markers.filled.repeat(progress) +
    markers.unfilled.repeat(steps - progress) +
    "]"
  );
};

/**
 * Checks if the given image URL is valid by sending a HEAD request to the URL and
 * checking the response status and content type.
 * @param {string} imageURL - The URL of the image to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the image URL is valid,
 *   and false otherwise.
 */
export const isImageURLValid = async (imageURL) => {
  try {
    const response = await axios.head(imageURL);
    if (response.status !== 200) {
      return false;
    }
    const contentType = response.headers["content-type"];
    if (!contentType.startsWith("image/")) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * validate straming url
 * @param {String} url
 * @returns {Boolean}
 */
export const validateStreamingURL = (url) => {
  if (!url || !getURLParts(url)) return false;
  const { hostname } = getURLParts(url);
  hostname = hostname.replace("www.", "");
  if (!["twitch.tv", "youtube.com", "facebook.com"].includes(hostname))
    return false;
  const streamKey = url.split("/").pop();
  if (!streamKey) return false;
  return true;
};

/**
 * Checks if a string is a valid discord invite
 * @param {String} text
 */
export const containsDiscordInvite = (text) => {
  return /(https?:\/\/)?(www.)?(discord.(gg|io|me|li|link|plus)|discorda?p?p?.com\/invite|invite.gg|dsc.gg|urlcord.cf)\/[^\s/]+?(?=\b)/.test(
    text
  );
};

/**
 * Checks if a string include link
 * @param {String} text
 */
export const containsLink = (text) => {
  return /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/.test(
    text
  );
};

export const escapeRegex = (str) => {
  try {
    return str.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`);
  } catch (e) {
    console.log(String(e.stack));
  }
};

/**
 *
 * @param {URL | String} input url or username of insat user
 * @returns {Boolean | String}
 */
export const validateInstagramId = (input) => {
  input = input.toLowerCase().trim().replace(" ", "");
  // Regular expression to match Instagram URL or ID
  const instagramIdRegex =
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_]+)\/?$/i;

  const match = input.match(instagramIdRegex);

  if (match) return match[1];
  else return false;
};

/**
 * @param {URL | String} input url or username of insat user
 * @returns {Boolean | String}
 */
export const validateXId = (input) => {
  input = input.toLowerCase().trim().replace(" ", "");
  // Regular expression to match Instagram URL or ID
  const X = /^(?:https?:\/\/)?(?:www\.)?x\.com\/([a-zA-Z0-9_]+)\/?$/i;
  const twitter =
    /^(?:https?:\/\/)?(?:www\.)?twitter\.com\/([a-zA-Z0-9_]+)\/?$/i;

  const match = input.match(X) || input.match(twitter);

  if (match) return match[1];
  else return false;
};

/**
 *
 * @param {String} input
 * @param {String} type
 * @returns
 */

export const validateSocialMedia = (input, type) => {
  const regex = {
    youtube:
      /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c)\/([a-zA-Z0-9_]+)\/?$/i,
    twitch: /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)\/?$/i,
  };

  const match = input.match(regex[type.toLowerCase()]);

  if (match) {
    return match[1];
  } else {
    return null;
  }
};

/**
 *
 * @param {Object} data
 * @param {Guild} guild
 */
export const onlineCounter = async (data, guild) => {
  await guild.fetch();
  const channel = guild.channels.cache.get(data.Counter.Online.Channel);
  if (!channel) return;
  const Onlinemembers = guild.approximatePresenceCount;

  await channel.setName(
    `${data.Counter.Online.ChannelName || "Online"} ${number.abbreviate(
      Onlinemembers
    )}`
  );
};

/**
 *
 * @param {Object} data
 * @param {Guild} guild
 */
export const totalCounter = async (data, guild) => {
  await guild.fetch();
  const channel = guild.channels.cache.get(data.Counter?.Total?.Channel);
  if (!channel) return;
  const Onlinemembers = guild.approximateMemberCount;

  await channel.setName(
    `${data.Counter.Total.ChannelName || "All"} ${number.abbreviate(
      Onlinemembers
    )}`
  );
};

/**
 * @param {Object} data
 * @param {Guild} guild
 */
export const XCounter = async (data, guild) => {
  if (!data.Counter?.X?.ID) return;
  const channel = guild.channels.cache.get(data.Counter?.X?.Channel);
  if (!channel) return;
  // TODO
  const sb = 0; // await socialblade("twitter", data.Counter.X.ID).catch(() => { return; })
  if (!sb) return;
  const value =
    sb.table[sb.table.length > 2 ? sb.table.length - 2 : sb.table.length];

  await channel.setName(
    `${data.Counter.X.ChannelName || "X"} ${number.abbreviate(value.followers)}`
  );
};

/**
 * @param {Object} data
 * @param {Guild} guild
 */
export const instaCounter = (data, guild) => {
  if (!data.Counter?.Insta?.ID) return;

  const channel = guild.channels.cache.get(data.Counter?.Insta?.Channel);
  if (!channel) return;

  axios
    .get(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${data.Counter.Insta.ID}`,
      {
        headers: {
          "User-Agent":
            "Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)",
        },
      }
    )
    .then((res) => {
      if (res?.data?.status !== "ok") return;
      const count = res?.data?.data?.user?.edge_followed_by?.count || 0;
      channel.setName(
        `${data.Counter.Insta.ChannelName || "Insta"} ${number.abbreviate(
          count
        )}`
      );
    });
};

/**
 * @param {String} query
 * @param {"Random"| "Hot" | "Top" | "Best" | "New"} type
 * @param {"real" | "r34" } site
 */
export const redditFeed = async (query, type, nsfw = false, site = "real") => {
  const parseType = {
    Random: "random",
    Hot: "hot",
    Top: "top",
    Best: "rising",
    New: "new",
  };
  try {
    if (nsfw) {
      const page = Math.floor(Math.random() * 2);
      const url = `https://app.rule34.dev/${site}/${page}/score:>0+${query}`;
      const res = await axios.get(url);
      if (res.status !== 200) return false;
      let $ = cheerio.load(res.data);

      const images = $("[class=chato]").filter("[id]");
      const random = Math.floor(Math.random() * images.length);
      const id = images[random].attribs.id;
      if (!id) return false;

      const res2 = await axios.get(url + `?id=${id}`);

      if (res.status !== 200) return false;

      $ = cheerio.load(res2.data);

      const image = $(".porra").last().prop("src");

      return image;
    } else {
      const c = await justreddit.randomPostFromSub({
        subReddit: query,
        sortType: parseType[type],
      });
      if (c.error) return false;
      return c;
    }
  } catch (e) {
    return false;
  }
};

/**
 * Post Reddit Feed
 * @param {Guild} guild
 */
export const postReddit = async (guild) => {
  const data = await guild.fetchData();

  if (!data?.Reddit?.Enable || !data?.Reddit?.List?.length) return;

  data.Reddit.List.forEach(async (feed) => {
    /** @type {Webhook} */
    let Webhook;
    const key = `Webhook:${guild.id}:${feed.Webhook.id}`;
    const WebCache = cache.get(key);
    if (WebCache) Webhook = WebCache;
    else {
      Webhook = await guild.client.fetchWebhook(
        feed.Webhook.id,
        feed.Webhook.token
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
          $pull: {
            "Modlog.List": {
              Webhook: {
                id: null,
                token: null,
              },
            },
          },
        }
      );
      return;
    }

    const embed = new EmbedBuilder().setColor("DarkButNotBlack");
    let reddit;
    if (feed.Filter || nsfwWords.includes(feed.Triger)) {
      reddit = await redditFeed(feed.Triger, feed.Type, true);
      if (!reddit) return;
      embed.setImage(reddit);
      embed.setFooter({ text: `NSFW Auto-feed for ${feed.Triger}` });
    } else {
      reddit = await redditFeed(feed.Triger, feed.Type, false);
      if (!reddit) return;
      embed
        .setAuthor({ name: reddit.author })
        .setURL(reddit.url)
        .setTitle("New Crosspost")
        .setImage(reddit.image)
        .setDescription(reddit.title)
        .setFooter({
          text: `Fast Feed from /r/${feed.Triger}`,
        });
    }

    await Webhook.send({
      embeds: [embed],
    }).catch(() => {});
  });
};

export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNumber;
};

export const isEntryInDuration = (
  entry,
  duration,
  currentDate,
  type = "text"
) => {
  switch (duration) {
    case "day":
      return type === "text"
        ? entry.Timestamp.some(
            (timestamp) =>
              timestamp.Day === currentDate.toISOString().slice(0, 10)
          )
        : entry.Voice.Timestamp.some(
            (timestamp) =>
              timestamp.Day === currentDate.toISOString().slice(0, 10)
          );
    case "week":
      return type === "text"
        ? entry.Timestamp.some(
            (timestamp) => timestamp.Week === getWeekNumber(currentDate)
          )
        : entry.Voice.Timestamp.some(
            (timestamp) => timestamp.Week === getWeekNumber(currentDate)
          );
    case "month":
      return type === "text"
        ? entry.Timestamp.some(
            (timestamp) =>
              timestamp.Month === currentDate.toISOString().slice(0, 7)
          )
        : entry.Voice.Timestamp.some(
            (timestamp) =>
              timestamp.Month === currentDate.toISOString().slice(0, 7)
          );
    default:
      return false;
  }
};

/**
 * get truth or dare question
 * @param {"Truth" | "Dare" | "Random"} type
 * @param {"Classic" | "Nsfw" | "Funny"} subType
 * @returns {String}
 */
export const getTod = (type, subType) => {
  type = type === "Random" ? (Math.random() < 0.5 ? "Truth" : "Dare") : type;
  let tod =
    subType === "Funny"
      ? todFunny[type]
      : subType === "Nsfw"
      ? todNsfw[type]
      : todClassic[type];
  return tod[Math.floor(Math.random() * tod.length)];
};

/**
 * add suffix on number
 * @param {Number | String} number
 * @returns
 */
export const addSuffix = (number) => {
  if (typeof number === "string") number = parseInt(number);
  if (!number) return;
  if (number % 100 >= 11 && number % 100 <= 13) return number + "th";
  switch (number % 10) {
    case 1:
      return number + "st";
    case 2:
      return number + "nd";
    case 3:
      return number + "rd";
  }
  return number + "th";
};

/**
 * Checks if a string is a valid Hex color
 * @param {string} text
 */
export const isHex = (text) => /^#?[0-9A-F]{6}$/i.test(text);
