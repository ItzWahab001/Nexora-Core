export default {
  common: {
    requestedBy: "Requested By",
    error: "!{i} Got An Error While Executing This Command",
    success: "!{i} Successfully Performed The Task",
    noResult: "!{i} No Result Found",
    loading: "!{l} Loading...",
    no_user_perm: "!{i} You Don't Have Permission To Use This Command",
    no_bot_perm: "!{i} I Don't Have Permission To Use This Command",
    cooldown: "!{i} You Are On Cooldown, Try Again In {{time}}",
    no_args: "!{i} Please Provide Following Arguments",
    timeout: "!{skull} **Timeout!** Run Command Again.",
    pageContent: "__***Click on the button to jump to the page***__",
    enable: "Enable",
    enabled: "Enabled",
    click_here: "Click Here",
    disable: "Disable",
    disabled: "Disabled",
    reset: "Reset",
    current_config: "Current Configuraion",
    not_set: "Not Set",
    home_page: "Home Page",
    updated: "!{y} Successfully Updated",
    invalid_number: "!{skull} Kindly provide a valid number",
    invalid_hex: "Kindly provide a valid hex code. eg: 00ffaa, ffffff",
    invalid_image_url: "Kindly provide a valid image url",
    no_auth_components:
      "!{i} You dont have permission to use these menu/buttosn",
    bot_selected: "!{skull} Bot Selected",
    need_admin_perm: "!{i} Give me **Admin** Permission first!",
  },

  command: {
    //* info commands
    help: {
      description: "!{star} **Imagine your server to next level**",
      no_role_command: "This Server dont have any custom role command",
      no_custom_command: "This server dont have any custom command",
    },
    prefix: {
      title: "!{star} My Prefix for this server",
    },
    avatar: {
      title: "!{star} Avatar",
      button: {
        label: "View Avatar",
      },
    },
    ping: {
      title: "Returns Latency And API Ping",
    },
    membercount: {
      title: "!{star} Total Members",
    },
    serverinfo: {
      title: "!{star} Server Info",
      description:
        "```yml   Here you will find all the information you need about the community discord server.```",
    },
    userinfo: {
      title: "!{star} User Info",
      botSelected: "!{i} At this moment bot info is not available",
      buttons: {
        avatar: "View Avatar",
        banner: "View Banner",
      },
      fields: {
        booster: "Booster",
        created: "Created",
        joined: "Joined",
        id: "User ID",
        roles: "Top Roles",
      },
    },

    //* Misc commands
    birthday: {
      title: "Birthday System",
      guide_message:
        "Use the following menu to manage your birthday for this server",
      disabled: "!{i} Birthday System is Disabled",
      no_upcoming: "!{i} No upcoming birthdays in next 10 days",
      invalid_date: "!{skull} Kindly a valid date. Example: 2000-01-01",
      no_channel: "!{skull} Birthday Announce Channel is not set",
      author_birthday: "!{dot} Your Birthday:",
      modal: {
        title: "Birthday",
        set: {
          label: "Your Birthday",
          ph: "YYYY-MM-DD",
        },
      },
      menu: {
        ph: "Select an option",
        list: {
          label: "Birthday List",
          description: "Check upcoming brithdays in next 10 days",
        },
        set: {
          label: "Set Birthday",
          description: "Set your birthday",
        },
        remove: {
          label: "Remove Your Brithday",
          description: "Reset your birthday",
        },
      },
    },
    set_prefix: {
      limit_exceeded: "!{i} Prefix Length Should Be 2",
      success: "!{y} Successfully updated server prefix",
    },
    rank: {
      noxp: "!{skull} User has no rank",
      disabled: "!{i} Rank System is **Disabled** for this server",
      no_channel: "!{skull} Rank Announce Channel is not set",
    },
    levels: {
      no_user_data:
        "!{i} The user does not have any data yet! or there is an error",
      success: "!{y} Successfully Done!",
    },
    top: {
      title: "Server Leaderboard Score",
      no_type: "^{i} You must have to select type (text/voice) to set filter",
      no_data: "!{i} Data Not Found",
      top_5: "Top 5",
    },
    snipe: {
      nothing: "!{i} Nothing to snipe",
    },
    snipe_clear: {
      success: "!{y} Successfully Cleared",
      nothing: "!{i} Nothing to clear",
    },
    notes: {
      not_found: "!{i} **Note** not found!",
      added: "!{y} Successfully add note",
      deleted: "!{y} Successfully delete note",
    },
    giveaway: {
      not_found: "!{i} Giveaway not found!",
      already: "!{i} Giveaway is already ",
      rerolled: "!{i} Giveaway Rerolled",
      paused: "!{i} Giveaway Pused",
      ended: "!{i} Giveaway Ended",
      unpaused: "!{i} Giveaway unpaused",
      started: "!{y} Giveaway started in ",
    },

    //* setup commands
    language: {
      already: "!{i} Language is already set to ",
      success: "!{y} Successfully Updated Server Language!",
    },
    role_command: {
      title: "Role Commands",
      already: "!{i} Given trigger is already a role command.",
      bot_role: "!{i} i can't add/remove reols from bot role or myself",
      roles_panel_des:
        "!{star} **Select roles from the following list to add/remove them to/from the user.**",
      mod_roles_panel_des:
        "!{star} **Select roles from the following list as mod roles**.",
      bot_roles:
        "!{i} I cant remove/add bot role from some of the selected role.",
      high_roles: "!{i} I cant remove/add role from some of the selected role.",
      added: "!{y} Succefully created role command.",
      not_found: "!{i} Role command not found",
      removed: "!{y} Role command removed.",
      prefix:
        "!{y} Roles command Prefix updated. And applied to all roles command",
      reset: "!{y} Successfully removed all role commands",
    },
    ticket: {
      title: "Setup Ticket ",
      description: "*Use the following menu and buttons to setup Ticket*",
      ticket_panel: {
        title: "Ticket Sytem",
        description: "!{dot} **Click the below to open a ticket**",
      },
      buttons: {
        send_panel: "Send Ticket panel",
        open: "Open Ticket",
        channels: "Channels",
      },
    },
    react_role: {
      title: "Reaction Roles",
      description: "Select an role to add or remove into reaction role panel",
      bot_role: "!{i] I noticed that the role you selected is a bot role.",
      high_role: "!{i} The role you selected is not mangeable by me",
      limit_exceeded: "!{i} You exceeded role limit in this panel",
      invalid_emoji: "!{i} Emoji you provided is invalid!",
      two_roles_required:
        "!{i} To enable multi select roles, You have to add atleast two roles in panel",
      error_while_panel: "!{i} Got an error while sending panel!",
      panel_success: "!{y} Successfully sent the panel!",
      modal: {
        title: {
          label: "Role Tile",
          value: "Title fo role",
        },
        des: {
          label: "Role Description",
          value: "Description of role",
        },
        emoji: {
          label: "Role Emoji",
          value: "!{y}",
        },

        embed_title: {
          label: "Title",
          value: "Title of embed",
        },
        embed_des: {
          label: "Description",
          value: "Description of embed",
        },
        embed_c: {
          label: "Embed Color",
          ph: "Enter a vlaid hex color",
        },
        embed_image: {
          label: "Image URL",
          ph: "Image of embed",
        },
        embed_thumb: {
          label: "Thumbnail",
          ph: "Thumbnail of embed",
        },
      },
      buttons: {
        multi_select_role: {
          enable: "Enable Multi select roles",
          disable: "Disable Multi select roles",
        },
        send_panel: "Send Panel",
      },
    },
    setup_rank: {
      title: "Ranking System",
      variables:
        "## Avaliable  Variables    - `{user:username}` - Returns username eg: uoaio    - `{user:mention}` - Will Mention User    - `{user:level}` - Retruns User's Level eg: 5    - `{user:xp}` - Returns Users XP eg: 100",
      roles_guide_msg:
        "*Select a Role from to set or update role as LevelUp Role*   ### Must Read Before Adding Role   - The Role Postion lower than Me/My Role!   - The Role Must Addable/Removeable   - Make sure role does not has admin permission!",
      description: "**Select an option from the following list to get started!",
      bot_role: "!{i] I noticed that the role you selected is a bot role.",
      high_role: "!{i} The role you selected is not mangeable by me",
      already_role_set: "!{i} That role is already set for level: ",
      menu: {
        main: {
          channel: "Channel for text rankup",
          message: "Level up message",
          rewards: "Level up rewards",
          rank_card: "Rank Card",
          levelup_card: "Level Up card",
        },
      },
      modal: {
        image_url_label: "Image URL",
        image_url_ph: "Enter a valid image url",
        hex_label: "Hex Color",
        hex_ph: "Enter a valid hex color",
        levelup_label: "Enter level up message",
      },
    },
    mod_log: {
      title: "Mod Log",
      description: "Select an option from the following list to get started!",
    },

    message_modes: {
      title: "Message Modes",
      description: "Select an option from the following list to get started!",
      list: "!{dot} **List of message modes**",
      select_channel: "!{dot} Select a channel from the following list!",
      select_mode: "!{dot} Select Message Mode",
      limit_exceeded: "!{i} You exceeded message modes limit.",
      channel_already:
        "!{i} The channe you selected is already set for message mode:",
      select_number: "!{dot} Select a number from the following list!",
      select_mode: "!{dot} Select a mode",
      buttons: {
        add: "Add New Mode",
        remove: "Remove Mode",
      },
    },
    custom_commands: {
      title: "Custom Commands",
      description:
        "!{dot} Select an option from the following list to get started!",
      list: "!{dot} List of Custom Commands",
      footer: ["Custom command Prefix:", "Total Commands:"],
      added: "!{y} Successfully added a new command",
      select_to_remove:
        "!{dot} **Select command from following menu to remove**!",
      select_res_type: "!{dot} Select a response type",
      enable_first: "!{i} Please enable custom commands first",
      already_exists: "!{i} Command with same trigger already exists",
      select_roles: "!{dot} Select upto 6 roles",
      buttons: {
        add: "Add new Command",
        remove: "Remove",
        update_prefix: "Update Prefix",
        with_embed: "With Embed",
        without_embed: "No Embed",
        variables: "Variables",
        set_trigger: "Set Trigger",
        set_response: "Set Response",
        set_roles: "Set Roles",
        save: "Save",
      },

      modal: {
        prefix: "Enter Prefx",
        prefix_ph: "Prefix like: ! , . : ;",
        trigger: "Enter trigger",
        trigger_ph: "Enter command trigger (Dont Use Spaces)",
        response: "Enter response",
        response_ph: "Enter response",
        embed_title: "Enter embed title",
        embed_title_ph: "Enter embed title",
        embed_des: "Enter embed description",
        embed_des_ph: "Enter embed description",
        embed_image: "Enter embed image",
        embed_image_ph: "Enter embed image",
        embed_thumb: "Enter embed thumbnail",
        embed_thumb_ph: "Enter embed thumbnail",
        embed_c: "Enter embed color",
        embed_c_ph: "Enter embed color",
      },
    },
    setup_birthday: {
      buttons: {
        message: "Birthday Message",
      },
      modal: {
        message_value: "Happy Birthday {user}!",
        message: "Enter birthday message",
        message_ph: "Enter birthday message",
      },
      title: `Birthday Setup`,
      description: `Select an option from the following list to get started!`,
    },
    autorole: {
      limit_exceeded: "!{i} You exceeded auto role limit.",
      enable_first: "!{i} Please enable auto roles first",
      high_role: "!{i} The role you selected is not mangeable by me",
      bot_role: "!{i} The role you selected is not mangeable by me",
      title: "Auto Roles",
      description:
        "**Select an role to add or remove into Auto Roles!**   *This Feature Add roles to users (members) when they join server*",
    },
    auditlog: {
      title: "Audit Log",
      description:
        "Select an option from the following list to get started! This feature logs server events like message delete, channel edit/create/delete, member join/leave, role edit/create/delete and so on.",
    },
    auto_announce: {
      title: "Auto Announcements",
      description:
        "Select an option from the following list to get started This feature automatically sends messages to specified channels.",
      list: "!{dot} List of Auto Announcements",
      select_to_remove:
        "!{dot} **Select announcement from following menu to remove**!",
      invalid_timezone:
        "!{i} Invalid Timezone. Provide a valid timezone. Example: Asia/Kolkata, America/New_York, etc",
      select_time:
        "!{star} **Select Time (hour) from the following list** *Announcement will be sent at that hour based on your timezone*",
      select_channel: "!{dot} Select a channel from the following list!",
      buttons: {
        add: "Add New Announcement",
        remove: "Remove Announcement",
        timezone: "Set Timezone",

        set_channel: "Set Channel",
        set_message: "Set Message",
        set_time: "Set Time",
        save: "Save",
      },
      modal: {
        timezone: "Enter Timezone",
        timezone_ph: "Your Timezone like: Asia/Kolkata, America/New_York, etc",
        message: "Enter message",
        message_ph: "Enter message to announce!",
      },
    },
    autofeed: {
      limit_exceeded: "!{i} You exceeded auto feed limit.",
      enable_first: "!{i} Please enable auto feeds first",
      already: "!{i} Feed already exists",
      variables:
        "!{star} **Please Set The Feed Message**   - `{url}` : The Url Of The new feed.   - `{author}` : The Author Of The new feed.   - `{title}` : The Title Of The new feed.",
      title: "Auto Soical Media Leads",
      description:
        "!{dot} The feature automatically sends leads of social media to specified channels *Click the following buttons to get started!*",
      list: "!{star} List of Auto Social Media Leads",
      select_to_remove:
        "!{dot} **Select lead from the following list to remove.**",
      select_social_media:
        "!{dot} **Select social media from the following list**",
      select_channel: "!{dot} **Select channel from the following list**",
      invalid_id: "!{i} Invalid ID",
      must_contain_url: "!{i} The feed message must contain {url} variable",
      buttons: {
        add: "Add New Lead",
        remove: "Remove Lead",
      },
      modal: {
        message: "Enter message",
        message_ph: "New Feed : {title} - {author} - {url}",
      },
    },
    automod: {
      title: "Auto Mod",
      description:
        "**Use following button or menu to get started!**      **!{star} Status**   ",
      select_action:
        "!{star} What you want me to perform, When User hit max Strikes. Ban, Kick, Timeout for 1 day?",
      menu: {
        strikes: {
          label: "Strikes",
          description:
            "Max number of strikes a user can get before taking an action",
        },
        action: {
          label: "Action",
          description: "Action to take when a user reaches max strikes",
        },
        debug: {
          label: "Debug",
          description:
            "Turns on/off automod for messages sent by admins and mod",
        },
        whitelist: {
          label: "Whitelist",
          description: "White list user, channel and roles.",
        },
        logs: {
          label: "Logs",
          description: "Enable/Disable automod logs",
        },
      },
      modal: {
        strikes: {
          label: "Strikes",
          ph: "Min 5 and Max 20 [default threshold is 5 mentions]",
        },
        mass_mention: {
          label: "Mass Mention",
          ph: "set 0 to disable [default threshold is 5]",
        },
      },
    },

    //* moderation commands
    mod: {
      noReason: "Reason Not Provided",
      inValidRole: "!{i} Invalid Role.",
    },
    ban: {
      success: "!{y} Succcessfully Banned",
      botPerm: "!{i} I dont have permission to ban the target",
      userPerm: "!{i} You dont have permission to ban the target",
      self: "!{i} You cant ban yourself",
      error: "!{i} Failed to ban the target",
    },
    kick: {
      success: "!{y} Succcessfully Kicked",
      botPerm: "!{i} I dont have permission to kick the target",
      userPerm: "!{i} You dont have permission to kick the target",
      self: "!{i} You cant kick your self",
      error: "!{i} Failed to kick the target",
    },
    defean: {
      self: "!{i} You cant defeaned yourself",
      success: "!{y} Succcessfully Defeaned",
      error: "!{i} Failed to defean the target",
      botPerm: "!{i} I dont have permission to defean the target",
      userPerm: "!{i} You dont have permission to defean the target",
      noVoice: "!{i} the target is not in a voice channel",
      already: "!{i} The user is already defeaned",
    },
    disconect: {
      success: "!{y} Succcessfully Disconected",
      botPerm: "!{i} I dont have permission to disconect the target",
      userPerm: "!{i} You dont have permission to disconect the target",
      self: "!{i} You cant disconect your self",
      error: "!{skull} Failed to disconect the target",
      noVoice: "!{i} the target is not in a voice channel",
    },
    move: {
      success: "!{y} Succcessfully Moved",
      botPerm: "!{i} I dont have permission to move the target",
      userPerm: "!{i} You dont have permission to move the target",
      self: "!{i} You cant move your self",
      error: "!{skull} Failed to move the target",
      noVoice: "!{i} the target is not in a voice channel",
      already: "!{i} The user is already moved",
      targetPerm: "!{i} The taget dont have permisson to join that channel",
    },
    nickname: {
      success: "!{y} Succcessfully Changed Nickname",
      botPerm: "!{i} I dont have permission to change the nickname",
      userPerm: "!{i} You dont have permission to change the nickname",
      yourSelf: "!{i} You cant change your nickname",
      error: "!{skull} Failed to change the nickname",
    },
    purge: {
      success: "!{y} Succcessfully Purged",
      botPerm: "!{i} I dont have permission to purge the messages",
      userPerm: "!{i} You dont have permission to purge the messages",
      noMessage: "!{skull} No message found to purge",
      error: "!{skull} Failed to purge the messages",
    },
    roleAdd: {
      success: "!{y} Succcessfully Added",
      botPerm: "!{i} I dont have permission to add the role",
      userPerm: "!{i} You dont have permission to add the role",
      yourSelf: "!{i} You cant add role to your self",
      error: "!{skull} Failed to add the role",
      already: "!{skull} The role is already added",
    },
    roleColor: {
      success: "!{y} Succcessfully Changed Color",
      botPerm: "!{i} I dont have permission to change the color",
      userPerm: "!{i} You dont have permission to change the color",
      error: "!{skull} Failed to change the color",
    },
    roleDelete: {
      success: "!{y} Succcessfully Deleted",
      botPerm: "!{i} I dont have permission to delete the role",
      userPerm: "!{i} You dont have permission to delete the role",
      error: "!{skull} Failed to delete the role",
    },
    roleRemove: {
      success: "!{y} Succcessfully Removed",
      botPerm: "!{i} I dont have permission to remove the role",
      userPerm: "!{i} You dont have permission to remove the role",
      error: "!{skull} Failed to remove the role",
      already: "!{skull} The role is already removed",
    },
    forceNickname: {
      success: "!{y} Succcessfully Changed Nickname",
      error: "!{skull} Failed to change the nickname",
      botPerm: "!{i} I dont have permisson to change nickname",
      userPerm: "!{i} You dont have permisson to change nickname",
    },
    timeout: {
      success: "!{y} Succcessfully Timed Out",
      botPerm: "!{i} I dont have permission to timeout the target",
      userPerm: "!{i} You dont have permission to timeout the target",
      error: "!{skull} Faild to timeout the target",
      self: "!{i} You cant timeout your self",
      already: "!{i} The user is already timed out",
      invalid_duration:
        "!{skull} Kindly provide a valid time. Example: 1d/1h/1m/1s",
    },
    unban: {
      noUser: "!{skull} No user found",
      success: "!{y} Succcessfully Unbanned",
      error: "!{skull} Failed to unban the target",
      menu: {
        content: "**Select a user to unban**",
        ph: "Choose a user to unban",
      },
    },
    undefean: {
      success: "!{y} Succcessfully Undefeaned",
      error: "!{skull} Failed to undefean the target",
      botPerm: "!{i} I dont have permisson ",
      userPerm: "!{i} You dont have permisson ",
      self: "!{skull} You cant undefean your self",
      noVoice: "!{i} The target is not in a voice channel",
      noDefean: "!{i} The user is not defeaned",
    },
    untimeout: {
      success: "!{y} Succcessfully Untimed Out",
      error: "!{skull} Failed to untimeout the target",
      noTimeout: "!{skull} Target has not timeout",
      botPerm: "!{i} I dont have permisson to untimeout the target",
      userPerm: "!{i} You dont have permisson to untimeout the target",
    },
    warn: {
      success: "!{y} Succcessfully Warned",
      error: "!{skull} Failed to warn the target",
      botPerm: "!{i} I dont have permisson to warn the target",
      userPerm: "!{i} You dont have permisson to warn the target",
      yourSelf: "!{skull} You cant warn your self",
      bot: "!{skull} You cant warn the bot",
    },
    warnings: {
      noUser: "!{skull} No user found",
      bot: "!{skull} You cant view warnings of the bot",
      noWarn: "!{skull} No warnings found",
      footer: "Format: Warning Number | Reason | Moderator",
    },
    unwarn: {
      noUser: "!{skull} No user found",
      bot: "!{skull} You cant unwarn the bot",
      success: "!{y} Succcessfully Unwarned",
      noWarn: "!{skull} No warnings found",
      error: "!{skull} Failed to unwarn the target",
    },
  },

  handler: {
    jtc: {
      no_temp_channel: "!{i} You dont have any temp channel",
    },
    command: {
      mention: "!{y} **To see my commands list type: ",
      owner_only: "!{skull} This command is owner only",
      disabled: "!{skull} This command is disabled",
      no_user_perms:
        "!{skull} You are missing some of the following permissions",
      no_bot_perms: "!{skull} I am missing some of the following permissions",
      cooldown: "!{skull} You are on cooldown",
      invalid_args: "!{skull} Invalid arguments",
      invalid_usage: "!{skull} Invalid usage",
      amoung_number: "!{skull} Provide a number amoung",
      params_format: "Required Params: < > Optional Params: [ ]",
      syntax_error: "Make sure you have used the correct syntax",
    },
    custom_command: {
      roles_added: "!{y} Successfully Added",
      roles_removed: "!{y} Successfully Removed",
      roles_missing: "You need one of the following roles to use this command.",
    },
    birthday: {
      message: "Happy Birthday",
    },
    ticket: {
      title: "Ticket",
      open_msg: "Welcome to your ticket!",
      already: "!{i} You already have an open ticket.",
      error: "!{i} an error occured while creating your ticket!",
      not_ticket: "!{i} This is not a Ticket!",
      disabled: "!{i} Ticket system has beed disabled for this server!",
      missing_role:
        "!{i} You are missing the following role to use these buttons.",
      claimed: "!{y} Ticket Claimed!",
      claimed_by: "!{dot} Claimed By",
      opened_by: "!{dot} Opened By",
      closed_by: "!{dot} Closed By",
      channel: "!{dot} Ticket Channel",
      deleted: "Ticket Deleted!",
      deleted_msg: "A ticket has been deleted!",
      will_be_deleted: "!{l} Ticket will be deleted within few seconds",
      reopened: "!{y} Ticket has been reopened!",
      closed: "!{y} Ticket has been closed!",
      created: "!{y} Your ticket has been created!",

      buttons: {
        close: "Close",
        reopen: "Reopen",
        claim: "Claim",
        delete: "Delete",
      },
    },
  },
};
