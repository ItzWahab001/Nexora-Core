import {
  ActionRowBuilder,
  Message,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  UserSelectMenuBuilder,
  VoiceChannel,
} from "discord.js";
import logger from "../logger.mjs";
import GlobalConfig from "../../../Assets/Global/config.mjs";
import { EmbedBuilder, VoiceMaster, cache } from "../index.mjs";

export const tasksWithRes = ["Users", "Ban", "Rename", "Permit"];

/**
 *
 * @param {Object} data
 * @param {VoiceChannel} OldVoice
 * @param {VoiceChannel} NewVoice
 */
export const HandleJTC = async (data, OldVoice, NewVoice) => {
  await NewVoice.client.voiceMaster.HandleEvent(data, OldVoice, NewVoice);
};

/**
 * @param {Message | import("discord.js").Interaction} i
 * @param {import("../../../Assets/Global/config.mjs").JoinToCreateActions} task
 */
export const JTC_Validate = (i, task) => {
  try {
    const { member } = i;
    const userChannel = member.voice.channel;

    if (![...GlobalConfig.JoinToCreate.Actions].includes(task))
      return "InvalidTask";
    if (!userChannel) return "NoVoiceChannel";
    const Cache = cache.get(VoiceMaster.Key(member, userChannel));
    if (!Cache) return "NoTempChannel";

    return "Ok";
  } catch (e) {
    logger(e, "error");
    return "Error";
  }
};

/**
 *
 * @param {import("discord.js").Interaction} i
 * @param {*} task
 */
const JTC_ActionsWithRes = async (i, data, responses) => {
  let res = "InvalidTask";
  if (i.isStringSelectMenu())
    if (i.customId === "jtc:Permit:Menu")
      res = await i.client.voiceMaster.Permit(
        i.member.voice.channel,
        i.member,
        { number: i.values.shift() }
      );
    else if (i.customId === "jtc:Users:Menu") {
      const action = i.values.shift(); //* Mute, Unmute, Deafen and undeafen
      const Row = new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setPlaceholder(`Select a User from the Menu to ${action}`)
          .setCustomId(`jtc:Users:UserMenu:${action}`)
          .setMaxValues(1)
      );
      return await i.safeUpdate({
        components: [Row],
      });
    }

  if (i.isUserSelectMenu())
    if (i.customId === "btn:Ban:Menu")
      res = await i.client.voiceMaster.Ban(i.member.voice.channel, i.member, {
        target: i.values.shift(),
      });
    else if (i.customId.startsWith("jtc:Users:UserMenu:")) {
      const Member = i.member.voice.channel.members.find(
        (Member) => Member.id == i.values[0]
      );

      if (!Member)
        return await i.safeReply({
          ephemeral: true,
          content: `<@${i.values[0]}> is not connected with your channel.`,
        });

      try {
        if (i.customId.includes("Mute")) Member.voice.setMute(true);
        else if (i.customId.includes("UnMute")) Member.voice.setMute(false);
        else if (i.customId.includes("Deafen")) Member.voice.setDeaf(true);
        else i.voice.setDeaf(false);
        res = "Ok";
      } catch (E) {
        res = "Error";
      }

      return await i.safeUpdate({
        embeds: [
          new EmbedBuilder()
            .setTheme(data.Theme)
            .setDescription(responses[res]),
        ],
        ephemeral: true,
      });
    }

  if (i.isModalSubmit())
    if (i.customId === "jtc:Rename:Modal")
      res = await i.client.voiceMaster.Rename(
        i.member.voice.channel,
        i.member,
        { text: i.fields.getTextInputValue("name") }
      );
    else if (i.customId === "jtc:Permit:Modal")
      res = await i.client.voiceMaster.Permit(
        i.member.voice.channel,
        i.member,
        { number: i.fields.getTextInputValue("number") }
      );

  await i.safeReply({
    embeds: [
      new EmbedBuilder().setTheme(data.Theme).setDescription(responses[res]),
    ],
    ephemeral: true,
  });
};

/**@type {import("./index.mjs").BasicParamHandler} */
export const JTC_CoreHandler = async (i, data, task) => {
  if (!task) {
    if (!i.customId.toLowerCase().startsWith("jtc:")) return;
    task = i.customId.split(":")[1];
  }
  const isInteraction = !i.author;
  const { member, guild, client } = i;
  const userChannel = member.voice.channel;
  const validation = JTC_Validate(i, task);

  const responses = {
    Ok: "!{star} Successfully Done",
    Error: "!{i} Got an error",
    InvalidTask: "!{i} Unable to perfrom that task",
    NoTempChannel: `^{handler.jtc.no_temp_channel}.`,
    NoVoiceChannel: `^{handler.jtc.no_temp_channel}.`,
  };

  if (validation !== "Ok") {
    return await i.safeReply({
      embeds: [
        new EmbedBuilder()
          .setTheme(data.Theme)
          .setColor("Red")
          .setDescription(responses[validation]),
      ],
      ephemeral: true,
    });
  }

  const Cache = cache.get(VoiceMaster.Key(member, userChannel));
  if (!Cache) return;

  const [channelId, panelId] = Cache.split(":");

  const JTC = data.JoinToCreate.find((x) => x.PanelNum === panelId);

  if (!JTC?.Enable || !JTC?.Channel)
    return await i.safeReply({
      embeds: [
        new EmbedBuilder()
          .setTheme(data.Theme)
          .setColor("Red")
          .setDescription(
            "!{i} JoinToCreate is has been **Disabled** for this server"
          ),
      ],
      ephemeral: true,
    });


    if (isInteraction && !i.isButton()) {
      return await JTC_ActionsWithRes(i, data, responses);
    }


  if (tasksWithRes.includes(task)) {
    // * this will only work from panel. not from prefix cmds
    if (task === "Rename") {
      const Modal = new ModalBuilder()
        .setCustomId("jtc:Rename:Modal")
        .setTitle("Rename Channel");
      const Name = new TextInputBuilder()
        .setStyle(1)
        .setLabel("THE NEW NAME")
        .setMaxLength(50)
        .setCustomId("name")
        .setRequired(true);
      const Row = new ActionRowBuilder().addComponents(Name);
      Modal.addComponents(Row);
      await i.safeShowModal(Modal);
    } else if (task === "Permit") {
      //* permit button
      const Modal = new ModalBuilder()
        .setCustomId("jtc:Permit:Modal")
        .setTitle("Customize Users Limit");
      const Number = new TextInputBuilder()
        .setStyle(1)
        .setLabel("The Number")
        .setMaxLength(2)
        .setCustomId("number")
        .setRequired(true);
      const Row = new ActionRowBuilder().addComponents(Number);
      Modal.addComponents(Row);

      await i.safeShowModal(Modal);
    } else if (task === "Ban") {
      const User = new UserSelectMenuBuilder()
        .setPlaceholder("Select the User")
        .setCustomId("btn:Ban:Menu")
        .setMaxValues(1);

      const Row = new ActionRowBuilder().addComponents(User);
      await i.safeReply({
        components: [Row],
        ephemeral: true,
      });
    } else if (task === "Users") {
      const Row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("jtc:Users:Menu")
          .setMaxValues(1)
          .setPlaceholder("Select Something")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Mute")
              .setValue("Mute")
              .setEmoji("1085177845065728062"),
            new StringSelectMenuOptionBuilder()
              .setLabel("UnMute")
              .setValue("UnMute")
              .setEmoji("1085177849322946612"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Deafen")
              .setValue("Deafen")
              .setEmoji("1085177846911221770"),
            new StringSelectMenuOptionBuilder()
              .setLabel("UnDeafen")
              .setValue("UnDeafen")
              .setEmoji("1085177842016452698")
          )
      );
      await i.safeReply({
        fetchReply: true,
        components: [Row],
        ephemeral: true,
      });
    }
  } else {
    try {
      if (isInteraction)
        await i.deferReply({
          ephemeral: true,
        });

      const response = await client.voiceMaster[task](userChannel, member);

      let toRes = {
        embeds: [
          new EmbedBuilder()
            .setTheme(data.Theme)
            .setDescription(responses[response]),
        ],
        ephemeral: true,
      };

      if (isInteraction) await i.safeEdit(toRes);
      else await i.safeReply(toRes);
    } catch (e) {
      await i[isInteraction ? "editReply" : "reply"]({
        embeds: [
          new EmbedBuilder()
            .setTheme(data.Theme)
            .setColor("Red")
            .setDescription(responses["InvalidTask"]),
        ],
        ephemeral: true,
      });
    }
  }


};
