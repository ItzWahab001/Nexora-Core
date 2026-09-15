const Enable = {
  type: Boolean,
  default: false,
};

export default {
  Guild: { type: String },

  Theme: {
    type: String,
    default: "Yellow",
  },

  Language: {
    type: String,
    default: "en",
  },

  Prefix: {
    type: String,
    default: "!",
  },

  AI: {
    Enable: { type: Boolean, default: false },
    Channel: { type: String, default: "" },
    Data: { type: Object, default: {} },
  },

  Modlog: {
    type: Object,
    default: { Enable: false, WebHook: {} },
  },

  MaxWarn: {
    type: Object,
    default: { Action: "Kick", Limit: 5 },
  },

  StickyRoles: {
    type: Object,
    default: { Enable: false, Roles: [] },
  },

  StickyMessages: {
    type: Object,
    default: { Enable: false, List: [] },
  },

  WordReact: {
    type: Object,
    default: { Enable: false, List: [] },
  },

  Blacklist: {
    type: Array,
    default: [],
  },

  AutoRoles: {
    type: Object,
    default: { Enable: false, Roles: [] },
  },

  Counter: {
    type: Object,
    default: {
      Insta: { Enable: false, ID: "", Channel: "", ChannelName: "" },
      Online: { Enable: false, Channel: "", ChannelName: "" },
      Total: { Enable: false, Channel: "", ChannelName: "" },
      X: { Enable: false, ID: "", Channel: "", ChannelName: "" },
    },
  },

  AuditLog: {
    type: Object,
    default: {
      Channel: "",
      Message: false,
      Threads: false,
      ServerEvents: false,
      Roles: false,
      Voice: false,
      Channels: false,
      Guild: false,
      StickerAndEmotes: false,
      AutoMod: false,
      Member: false,
    },
  },

  AutoMod: {
    type: Object,
    default: {
      Enable: false,
      Strikes: 5,
      Action: "Kick",
      Debug: false,
      Whitelist: { Channels: [], Roles: [], Users: [] },
      Anti: {
        Invite: false,
        Links: false,
        Spam: false,
        Ghostping: false,
        MassMention: 0,
        MaxLines: false,
      },
    },
  },

  Reddit: {
    type: Object,
    default: { Enable: false, List: [] },
  },

  AutoDelete: {
    type: Object,
    default: { Enable: false, List: [{ Channel: "", Time: "" }] },
  },

  TOD: {
    type: Object,
    default: {
      Enable: true,
      Nsfw: { Enable: false, Channels: [] },
      Classic: { Enable: true, Channels: [] },
      Funny: { Enable: true, Channels: [] },
    },
  },

  Count: {
    type: Object,
    default: { Enable: false, Channel: "" },
  },

  AutoAnnounce: {
    Enable,
    Timezone: {
      type: String,
      default: "Asia/Karachi",
    },

    List: {
      type: Array,
      default: [],
      // enums: [
      //     {
      //         Type: String, // daily, weekly, monthly
      //         Channel: String, // channel to announce
      //         Message: String, // message to announce
      //         Time: String, // time of announcement
      //     }
      // ]
    },
  },

  Sticky: {
    // TODO
    Enable: {
      type: Boolean,
      default: false,
    },
    Messages: {
      type: Array,
      default: [],
    },
  },

  JoinToCreate: [
    {
      PanelNum: String,
      Enable: {
        type: Boolean,
        default: false,
      },
      Parent: {
        type: String,
        default: "",
      },
      Channel: {
        type: String,
        default: "",
      },
      Panel: {
        Message: {
          type: String,
          default: "",
        },
        Channel: {
          type: String,
          default: "",
        },
      },
    },
  ],

  // like image only channels, text only url only
  MessageModes: {
    Enable,
    List: {
      type: Array,
      default: [],
      // what i can put in list
      enums: [
        {
          Type: String,
          Channel: String,
        },
      ],
    },
  },

  Ticket: {
    Enable,
    Category: {
      type: String,
      default: "",
    },
    LogChannel: {
      type: String,
      default: "",
    },
    Message: {
      type: String,
      default: "",
    },
    Role: {
      type: String,
      default: "",
    },
  },

  // social media auto feeds
  AutoFeed: {
    List: {
      type: Array,
      default: [],
      enums: [
        {
          Type: String, // type like youtube, x
          ID: String, // id of youtube...
          Message: String, // message to send

          Channel: String, // discord channel where auto feed will send
        },
      ],
    },
  },

  Birthday: {
    Enable,
    Channel: { type: String, default: "" },
    Message: { type: String, default: "Happy Birthday {user:mention} 🎉" },
  },

  CustomCommands: {
    type: Object,
    default: { Enable: false, Prefix: "!", List: [] },
  },

  RolesCommands: {
    type: Object,
    default: { Enable: false, Prefix: "!", List: [] },
  },

  Welcome: {
    type: Object,
    default: {
      Enable: false,
      Channel: "",
      Card: false,
      Content: "{user:mention}",
      Embed: false,
      Message: "Welcome {user:mention} to {guild:name}",
    },
  },

  Farewell: {
    type: Object,
    default: {
      Enable: false,
      Card: false,
      Embed: false,
      Content: "{user:mention}",
      Channel: "",
      Message: "{user:name} left server :(",
    },
  },

  WelcomeCard: {
    type: Object,
    default: { Type: "" },
  },

  Suggestion: {
    type: Object,
    default: { Enable: false, Channel: "" },
  },

  FarewellCard: {
    type: Object,
    default: { Type: "" },
  },

  Levels: { type: Boolean, default: true },
  LevelupChannel: { type: String, default: "" },
  VoiceLevelupChannel: { type: String, default: "" },
  LevelupMessage: {
    type: String,
    default: "**GG** {user:mention}, you are now level **{user:level}**",
  },
  VoiceLevelupMessage: {
    type: String,
    default:
      "**GG** {user:mention}, you are now level **{user:level}** in voice",
  },
  Cards: { type: Object, default: { RankUp: false } },
  RankCard: {
    type: Object,
    default: { Background: "", BarColor: "", BoderColor: "" },
  },
  LevelupCard: {
    type: Object,
    default: { Background: "", BoderColor: "", AvatarBoderColor: "" },
  },
};
