import { EmbedBuilder, Role } from "discord.js";
import axios from "axios";

export default {
  name: [
    "highfive",
    "happy",
    "sleep",
    "handhold",
    "laugh",
    "bite",
    "poke",
    "tickle",
    "kiss",
    "wave",
    "thumbsup",
    "stare",
    "cuddle",
    "smile",
    "lurk",
    "baka",
    "blush",
    "nom",
    "peck",
    "handshake",
    "think",
    "pout",
    "facepalm",
    "yawn",
    "wink",
    "shoot",
    "smug",
    "nope",
    "cry",
    "pat",
    "nod",
    "punch",
    "dance",
    "feed",
    "shrug",
    "bored",
    "kick",
    "hug",
    "yeet",
    "slap",
    "neko",
    "husbando",
    "kitsune",
    "waifu",
  ],
  cooldown: 10,
  description: "React on somesone as {commandName}",
  category: "Fun",
  options: [
    {
      id: "user",
      type: "user",
      name: "@User / Mention Someone",
      required: false,
    },
  ],
  run: async ({ message, client, err, args, command, options }) => {
    try {
      let user = options.get("user");

      const errMsg = async () =>
        await message.reply({
          embeds: [
            new EmbedBuilder().setDescription(
              client.emotes.x + " Got an error! try again later"
            ),
          ],
        });

      const response = await axios.get(
        `https://nekos.best/api/v2/${command.name}`
      );

      if (
        !response.data ||
        !response.data.results ||
        !response.data.results[0].url
      )
        return errMsg();

      await message
        .reply({
          embeds: [
            new EmbedBuilder()
              .setImage(response.data.results[0].url)
              .setTitle("Anime Reaction")
              .setDescription(
                `${message.author} Reacted ${
                  user ? `On <@${user.id}>` : `: ${command.name}`
                }`
              ),
          ],
        })
        .catch((e) => err(e));
    } catch (error) {
      err(error);
    }
  },
};
