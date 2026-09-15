import en from "./en.mjs";
export default {
  ...en,
  common: {
    ...en.common,
    requestedBy: "Angefordert von",
    error: "!{i} Beim Ausführen dieses Befehls ist ein Fehler aufgetreten",
    success: "!{i} Aufgabe erfolgreich durchgeführt",
    noResult: "!{i} Kein Ergebnis gefunden",
    loading: "!{l} Lade…",
    no_user_perm:
      "!{i} Sie haben keine Berechtigung, diesen Befehl zu verwenden",
    no_bot_perm: "!{i} Ich habe keine Berechtigung, diesen Befehl auszuführen",
    cooldown:
      "!{i} Sie befinden sich im Abklingzeitraum, bitte versuchen Sie es später erneut in ",
    no_args: "!{i} Bitte geben Sie folgende Argumente ein",
    timeout: "!{skull} **Time-out!** Führen Sie den Befehl erneut aus.",
    pageContent:
      "__***Klicken Sie auf die Schaltfläche, um zur Seite zu springen***__",
    enable: "Aktivieren",
    enabled: "Aktiviert",
    click_here: "Hier klicken",
    disable: "Deaktivieren",
    disabled: "Deaktiviert",
    reset: "Zurücksetzen",
    current_config: "Derzeitige Konfiguration",
    not_set: "Nicht eingestellt",
    home_page: "Startseite",
    updated: "!{y} Erfolgreich aktualisiert",
    invalid_number: "!{skull} Geben Sie bitte eine gültige Zahl ein",
    invalid_hex:
      "Geben Sie bitte einen gültigen Hex-Code ein. zB: 00ffaa, ffffff",
    invalid_image_url: "Geben Sie bitte eine gültige Bild-URL ein",
    no_auth_components:
      "!{i} Sie haben keine Berechtigung, diese Menüelemente/Schaltflächen zu verwenden",
    bot_selected: "!{skull} Bot ausgewählt",
    need_admin_perm:
      "!{i} Vergeben Sie mir zunächst die **Admin**-Berechtigung!",
  },

  command: {
    ...en.command,
    help: {
      description: "!{star} **Denke dir deinen Server auf der nächsten Stufe**",
      no_role_command:
        "Dieser Server hat keine benutzerdefinierten Befehle für Rollen.",
      no_custom_command: "Dieser Server hat keine benutzerdefinierten Befehle.",
    },
    prefix: {
      title: "!{star} Mein Präfix für diesen Server",
    },
    avatar: {
      title: "!{star} Avatar",
      button: {
        label: "Avatar anzeigen",
      },
    },
    ping: {
      title: "Latenz und Antwortzeit zurückgeben",
    },
    membercount: {
      title: "!{star} Gesamtanzahl Mitglieder",
    },
    serverinfo: {
      title: "!{star} Server Informationen",
      description:
        "```yml  Hier findest du alle Informationen, die du über den Community-Discord-Server brauchst.```",
    },
    userinfo: {
      title: "!{star} Nutzer Informationen",
      botSelected:
        "!{i} Im Moment kann ich leider keine Angaben zum Bot machen.",
      buttons: {
        avatar: "Avatar anzeigen",
        banner: "Banner anzeigen",
      },
      fields: {
        booster: "Booster",
        created: "Erstellt am",
        joined: "Beigetreten am",
        id: "Nutzer ID",
        roles: "Oberste Rollen",
      },
    },

    //* Sonstige Befehle
    birthday: {
      title: "Geburtstagsystem",
      guide_message:
        "Verwende das folgende Menü, um deinen Geburtstag für diesen Server zu verwalten.",
      disabled: "!{i} Das Geburtstagsystem ist deaktiviert.",
      no_upcoming: "!{i} Keine Geburtstage in den nächsten 10 Tagen.",
      invalid_date:
        "!{skull} Bitte gib ein gültiges Datum im Format JJJJ-MM-TT ein.",
      no_channel:
        "!{skull} Der Kanal für Geburtstagsbenachrichtigungen wurde noch nicht eingerichtet.",
      author_birthday: "!{dot} Dein Geburtstag:",
      modal: {
        title: "Geburtstag",
        set: {
          label: "Dein Geburtstag",
          ph: "YYYY-MM-DD",
        },
      },
      menu: {
        ph: "Wähle eine Option aus",
        list: {
          label: "Geburtstagsliste",
          description:
            "Sehe die kommenden Geburtstage in den nächsten 10 Tagen",
        },
        set: {
          label: "Geburtstag festlegen",
          description: "Festlege deinen Geburtstag",
        },
        remove: {
          label: "Lösche deinen Geburtstag",
          description: "Lösche deinen Geburtstag",
        },
      },
    },
    set_prefix: {
      limit_exceeded: "!{i} Die maximale Länge eines Präfixes ist 2.",
      success: "!{y} Der Serverpräfix wurde erfolgreich geändert.",
    },
    rank: {
      noxp: "!{skull} Dieser Nutzer hat noch keinen Rang.",
      disabled: "!{i} Das Rangsystem ist für diesen Server **deaktiviert**.",
      no_channel:
        "!{skull} Der Kanal für Rangbenachrichtigungen wurde noch nicht eingerichtet.",
    },
    levels: {
      no_user_data:
        "!{i} Der Nutzer verfügt noch über keine Daten oder es trat ein Fehler auf.",
      success: "!{y} Erledigt!",
    },
    top: {
      title: "Highscore-Liste des Servers",
      no_type:
        "^i Du musst einen Typ (Text/Sprache) auswählen, damit die Filterfunktion genutzt werden kann.",
      no_data: "!{i} Keine Daten vorhanden.",
      top_5: "Top 5",
    },
    snipe: {
      nothing: "!{i} Nichts zum Rückgängigmachen vorhanden.",
    },
    snipe_clear: {
      success: "!{y} Highscores erfolgreich zurückgesetzt.",
      nothing: "!{i} Nichts zum Zurücksetzen vorhanden.",
    },
    notes: {
      not_found: "!{i} **Notiz** nicht gefunden!",
      added: "!{y} Neue Notiz hinzugefügt.",
      deleted: "!{y} Alte Notiz gelöscht.",
    },
    giveaway: {
      not_found: "!{i} Kein Gewinnspiel mit diesem Namen gefunden!",
      already: "!{i} Das Gewinnspiel läuft bereits.",
      rerolled: "!{i} Das Gewinnspiel wurde neu gestartet.",
      paused: "!{i} Das Gewinnspiel wurde pausiert.",
      ended: "!{i} Das Gewinnspiel wurde beendet.",
      unpaused: "!{i} Das Gewinnspiel wurde fortgesetzt.",
      started: "!{y} Gewinnspiel startet in ",
    },

    language: {
      already: "!{i} Die Sprache wurde bereits auf gesetzt ",
      success: "!{y} Erfolgreich aktualisierte Serversprache!",
    },
    role_command: {
      title: "Rollenbefehle",
      already: "!{i} Der Auslöser ist bereits ein Rollenbefehl.",
      bot_role:
        "!{i} Ich kann keine Rollen vom Botrolle oder mir selbst hinzufügen/entfernen.",
      roles_panel_des:
        "!{star} **Wählen Sie bis zu 6 Rollen aus der folgenden Liste aus, um sie dem Benutzer hinzuzufügen/zu entfernen.**",
      bot_roles:
        "!{i} Ich kann keine Rollen vom Botrolle hinzufügen/entfernen.",
      high_roles:
        "!{i} Ich kann keine Rolle von den ausgewählten Rollen hinzufügen/entfernen.",
      added: "!{y} Rollenbefehl erfolgreich erstellt.",
      not_found: "!{i} Rollenbefehl nicht gefunden",
      removed: "!{y} Rolle erfolgreich gelöscht.",
      prefix:
        "!{y} Präfix für Rollenbefehle aktualisiert und auf alle Rollenbefehle angewendet.",
      reset: "!{y} Alle Rollenbefehle wurden erfolgreich entfernt.",
    },
    ticket: {
      title: "Einrichten des Tickets",
      description:
        "*Verwenden Sie das folgende Menü und Schaltflächen zum Einrichten eines Tickets.*",
      ticket_panel: {
        title: "Ticketsystem",
        description: "!{dot} **Klicken Sie unten, um ein Ticket zu öffnen**",
      },
      buttons: {
        send_panel: "Ticketpanel senden",
        open: "Öffne Ticket",
        channels: "Kanäle",
      },
    },
    react_role: {
      title: "Reaktionsrollen",
      description:
        "Wählen Sie eine Rolle aus, um sie einer Reaktionsrolle hinzuzufügen oder daraus zu entfernen",
      bot_role: "!{i] Die von Ihnen ausgewählte Rolle ist eine Botrolle.",
      high_role:
        "!{i} Die von Ihnen ausgewählte Rolle wird nicht von mir verwaltet werden können.",
      limit_exceeded:
        "!{i} Sie haben die maximale Anzahl von Rollen in dieser Panel überschritten.",
      invalid_emoji:
        "!{i} Das von Ihnen bereitgestellte Emoticon ist ungültig!",
      two_roles_required:
        "!{i} Um mehrere Rollen auszuwählen, müssen mindestens zwei Rollen im Panel vorhanden sein.",
      error_while_panel: "!{i} Beim Senden der Panel trat ein Fehler auf!",
      panel_success: "!{y} Die Panel wurde erfolgreich gesendet!",
      modal: {
        title: {
          label: "Rollentitel",
          value: "Der Titel der Rolle",
        },
        des: {
          label: "Beschreibung der Rolle",
          value: "Die Beschreibung der Rolle",
        },
        emoji: {
          label: "Emoji-Rolle",
          value: "!{y}",
        },

        embed_title: {
          label: "Überschrift",
          value: "Überschrift des Embeds",
        },
        embed_des: {
          label: "Beschreibung des Embeds",
          value: "Beschreibung des Embeds",
        },
        embed_c: {
          label: "Farbcode des Embeds",
          ph: "Geben Sie einen gültigen Hex-Code ein",
        },
        embed_image: {
          label: "URL des Bildes",
          ph: "Bild des Embeds",
        },
        embed_thumb: {
          label: "Vorschaubild",
          ph: "Vorschau des Embeds",
        },
      },
      buttons: {
        multi_select_role: {
          enable: "Mehrfachauswahl von Rollen aktivieren",
          disable: "Deaktiviere Mehrfachauswahl von Rollen",
        },
        send_panel: "Panel senden",
      },
    },
    setup_rank: {
      title: "Rangsystem",
      variables:
        "## Verfügbare Variablen   - `{user:username}` - Gibt den Nutzernamen zurück eg: uoaio   - `{user:mention}` - Erwähnt den Nutzer   - `{user:level}` - Gibt das Niveau des Nutzers zurück eg: 5   - `{user:xp}` - Gibt die XP des Nutzers zurück eg: 100",
      roles_guide_msg:
        "*Wählen Sie eine Rolle aus, um diese als RangUp-Rolle festzulegen oder zu aktualisieren*  ### Bitte lesen Sie Folgendes, bevor Sie eine Rolle hinzufügen:  - Die Position der Rolle sollte unterhalb meiner/meiner Rolle liegen!  - Stellen Sie sicher, dass die Rolle hinzugefügt/entfernt werden kann!  - Überprüfen Sie, ob die Rolle keine Admin-Berechtigung hat!",
      description:
        "**Wählen Sie eine Option aus der folgenden Liste aus, um mit der Einrichtung zu beginnen!",
      bot_role:
        "!{i] Ich habe bemerkt, dass die von Ihnen gewählte Rolle eine Botrolle ist.",
      high_role:
        "!{i} Die von Ihnen gewählte Rolle kann nicht von mir verwaltet werden.",
      already_role_set: "!{i} Diese Rolle ist bereits als festgelegt: ",
      menu: {
        main: {
          channel: "Textkanal für RankUp",
          message: "Nachricht beim Aufsteigen",
          rewards: "Belohnungen für RankUp",
          rank_card: "Rangkarte",
          levelup_card: "Level Up Karte",
        },
      },
      modal: {
        image_url_label: "URL des Bildes",
        image_url_ph: "Geben Sie eine gültige Bild-URL ein",
        hex_label: "Hexadezimalfarbe",
        hex_ph: "Geben Sie einen gültigen Hexadezimalcode ein",
        levelup_label: "Tragen Sie die Nachricht zum Aufsteigen ein",
      },
    },
    mod_log: {
      title: "Mod-Log",
      description:
        "Wählen Sie eine Option aus der folgenden Liste aus, um loszulegen!",
    },
    message_modes: {
      title: "Nachrichtenmodi",
      description:
        "Wählen Sie eine Option aus der folgenden Liste aus, um loszulegen!",
      list: "!{dot} **Liste der Nachrichtenmodi**",
      select_channel:
        "!{dot} Wählen Sie einen Kanal aus der folgenden Liste aus!",
      select_mode: "!{dot} Wählen Sie Nachrichtenmodus aus",
      limit_exceeded:
        "!{i} Sie haben die Nachrichtenmodusgrenze überschritten.",
      channel_already:
        "!{i} Der ausgewählte Kanal ist bereits für den Nachrichtenmodus eingerichtet:",
      select_number:
        "!{dot} Wählen Sie eine Nummer aus der folgenden Liste aus!",
      select_mode: "!{dot} Wählen Sie einen Modus aus",
      buttons: {
        add: "Neuer Modus hinzufügen",
        remove: "Modus entfernen",
      },
    },
    custom_commands: {
      title: "Benutzerdefinierte Befehle",
      description:
        "!{dot} Wählen Sie eine Option aus der folgenden Liste aus, um loszulegen!",
      list: "!{dot} Liste benutzerdefinierter Befehle",
      footer: [
        "Benutzerdefiniertes Kommando-Präfix:",
        "Gesamtanzahl der Befehle:",
      ],
      added: "!{y} Neuer Befehl erfolgreich hinzugefügt",
      select_to_remove:
        "!{dot} **Wählen Sie den Befehl aus der folgenden Liste aus, um ihn zu entfernen**!",
      select_res_type: "!{dot} Wählen Sie einen Antworttyp aus",
      enable_first:
        "!{i} Bitte aktivieren Sie zunächst benutzerdefinierte Befehle",
      already_exists: "!{i} Ein Befehl mit demselben Trigger existiert bereits",
      select_roles: "!{dot} Wählen Sie bis zu 6 Rollen aus",
      buttons: {
        add: "Neuen Befehl hinzufügen",
        remove: "Entfernen",
        update_prefix: "Präfix aktualisieren",
        with_embed: "Mit Einbettung",
        without_embed: "Ohne Einbettung",
        variables: "Variablen",
        set_trigger: "Trigger festlegen",
        set_response: "Antwort festlegen",
        set_roles: "Rollen festlegen",
        save: "Speichern",
      },

      modal: {
        prefix: "Prefx eingeben",
        prefix_ph: "Präfix wie: ! , . : ;",
        trigger: "Eingebe Trigger",
        trigger_ph: "Befehlstriger ohne Leerzeichen eingeben",
        response: "Antwort eingeben",
        response_ph: "Antwort eingeben",
        embed_title: "Eingabe Titelleiste",
        embed_title_ph: "Platzhalter für Titelleiste",
        embed_des: "Eingabe Beschreibungsleiste",
        embed_des_ph: "Platzhalter für Beschreibungsleiste",
        embed_image: "Eingabe Bild-URL",
        embed_image_ph: "Bild-URL eingeben",
        embed_thumb: "Eingabe Miniaturansicht-URL",
        embed_thumb_ph: "Miniaturansicht-URL eingeben",
        embed_c: "Eingabe Farbcodes",
        embed_c_ph: "Gültiger Hex-Farbwert eingeben",
      },
    },
    setup_birthday: {
      buttons: {
        message: "Geburtstagsnachricht",
      },
      modal: {
        message_value: "Alles Gute zum Geburtstag {user}!",
        message: "Geburtstagsnachricht eingeben",
        message_ph: "Geburtstagsnachricht eingeben",
      },
      title: `Geburtstagseinstellungen`,
      description: `Wählen Sie eine Option aus der folgenden Liste aus, um zu beginnen!`,
    },
    autorole: {
      limit_exceeded:
        "!{i} Sie haben die Auto-Rollen-Obergrenze überschritten.",
      enable_first: "!{i} Bitte aktivieren Sie zunächst Auto-Rollen.",
      high_role:
        "!{i} Die ausgewählte Rolle kann nicht von mir verwaltet werden.",
      bot_role:
        "!{i} Die ausgewählte Rolle kann nicht von mir verwaltet werden.",
      title: "Auto-Rollen",
      description:
        "**Wählen Sie eine Rolle aus, um sie hinzuzufügen oder zu entfernen aus Auto-Rollen!**  *Diese Funktion fügt Rollen zu Benutzern (Mitgliedern) hinzu, wenn sie dem Server beitreten.*",
    },
    auditlog: {
      title: "Protokollierung von Änderungen",
      description: `Wählen Sie eine Option aus der folgenden Liste aus, um loszulegen!`,
    },
    auto_announce: {
      title: "Automatische Ankündigungen",
      description:
        "Wählen Sie eine Option aus der folgenden Liste aus, um zu beginnen Diese Funktion sendet automatisch Mitteilungen an bestimmte Kanäle.",
      list: "!{dot} Liste automatischer Ankündigungen",
      select_to_remove:
        "!{dot} **Wählen Sie die Ankündigung aus dem folgenden Menü aus, um sie zu entfernen**!",
      invalid_timezone:
        "!{i} Ungültige Zeitzone. Geben Sie bitte eine gültige Zeitzone ein. Beispiel: Asia/Kolkata, America/New_York, etc",
      select_time:
        "!{star} **Wählen Sie Zeit (Std.) aus der folgenden Liste aus** *Die Ankündigung wird zur ausgewählten Stunde basierend auf Ihrer Zeitzone gesendet.*",
      select_channel:
        "!{dot} Wählen Sie einen Kanal aus der folgenden Liste aus!",
      buttons: {
        add: "Neue Ankündigung hinzufügen",
        remove: "Ankündigung entfernen",
        timezone: "Zeitzone festlegen",

        set_channel: "Kanal festlegen",
        set_message: "Nachricht festlegen",
        set_time: "Zeit festlegen",
        save: "Speichern",
      },
      modal: {
        timezone: "Zeitzone eingeben",
        timezone_ph: "Ihre Zeitzone wie: Asia/Kolkata, America/New_York, etc",
        message: "Nachricht eingeben",
        message_ph: "Nachricht zum Ankündigen eingeben!",
      },
    },
    autofeed: {
      limit_exceeded:
        "!{i} Sie haben die Obergrenze für Auto-Feeds überschritten.",
      enable_first: "!{i} Bitte aktivieren Sie zunächst Auto-Feeds.",
      already: "!{i} Feed schon vorhanden.",
      variables:
        "!{star} **Bitte legen Sie die Feed-Nachricht fest**  - `{url}` : Die URL des neuen Feeds.  - `{author}` : Der Autor des neuen Feeds.  - `{title}` : Der Titel des neuen Feeds.",
      title: "Auto Sozial Media Leads",
      description:
        "!{dot} Die Funktion sendet automatisch Leads sozialer Medien an spezifizierte Kanäle *Klicken Sie auf die folgenden Knöpfe, um fortzufahren!*",
      list: "!{star} Liste Auto Sozial Media Leads",
      select_to_remove:
        "!{dot} **Wählen Sie den Lead aus der folgenden Liste aus, um ihn zu entfernen**",
      select_social_media:
        "!{dot} **Wählen Sie die sozialen Medien aus der folgenden Liste aus**",
      select_channel:
        "!{dot} **Wählen Sie den Kanal aus der folgenden Liste aus**",
      invalid_id: "!{i} Ungültige ID",
      must_contain_url:
        "!{i} Die Feed-Nachricht muss die {url}-Variable enthalten",
      buttons: {
        add: "Lead hinzufügen",
        remove: "Lead entfernen",
      },
      modal: {
        message: "Nachricht eingeben",
        message_ph: "Neues Feed : {title} - {author} - {url}",
      },
    },
    automod: {
      title: "Auto Mod",
      description:
        "**Benutzen Sie die folgenden Buttons oder das Menü, um loszulegen!**    **!{star} Status**  ",
      select_action:
        "!{star} Was möchten Sie tun, wenn ein Benutzer die maximale Anzahl an Streiks erreicht hat. Verbannen, Ausschließen, Timeout für 1 Tag?",
      menu: {
        strikes: {
          label: "Streiks",
          description:
            "Maximale Anzahl von Streiks, die ein Benutzer erhalten kann, bevor Maßnahmen ergriffen werden.",
        },
        action: {
          label: "Maßnahme",
          description:
            "Maßnahme, die ergriffen wird, wenn ein Benutzer die maximale Anzahl an Streiks erreicht hat.",
        },
        debug: {
          label: "Debugging",
          description:
            "Schaltet Automod für Nachrichten von Administratoren und Moderatoren ein bzw. aus.",
        },
        whitelist: {
          label: "Weißliste",
          description:
            "Fügen Sie Benutzer, Kanäle und Rollen der Weißliste hinzu.",
        },
        logs: {
          label: "Protokollierung",
          description:
            "Aktivieren/Deaktivieren der Protokollierung für Automod.",
        },
      },
      modal: {
        strikes: {
          label: "Streiks",
          ph: "[Standardthreshold beträgt 5 Erwähnungen] Minimum 5 und Maximum 20",
        },
        mass_mention: {
          label: "Massenerwähnung",
          ph: "[Standardthreshold beträgt 5] Standardthreshold ausschalten durch Angabe von 0.",
        },
      },
    },
  },

  handler: {
    ...en.handler,
    command: {
      mention: "!{y} **Um meine Befehlsliste anzuzeigen, gib Folgendes ein:",
      owner_only:
        "!{skull} Dieser Befehl steht nur dem Botbesitzer zur Verfügung",
      disabled: "!{skull} Dieser Befehl wurde deaktiviert",
      no_user_perms: "!{skull} Dir fehlen folgende Berechtigungen:",
      no_bot_perms: "!{skull} Mir fehlen folgende Berechtigungen:",
      cooldown: "!{skull} Du bist noch im Abklingzeitraum",
      invalid_args: "!{skull} Ungültige Argumente",
      invalid_usage: "!{skull} Unzulässiger Gebrauch",
      amoung_number: "!{skull} Gib eine Nummer zwischen",
      params_format: "Erforderliche Parameter: < > Optionale Parameter: []",
      syntax_error: "Stelle sicher, dass du die korrekte Syntax verwendet hast",
    },
    custom_command: {
      roles_added: "!{y} Erfolgreich Hinzugefügt",
      roles_removed: "!{y} Erfolgreich Entfernt",
      roles_missing:
        "Sie benötigen mindestens eine der folgenden Rollen, um diesen Befehl nutzen zu können:",
    },
    birthday: {
      message: "Alles Gute zum Geburtstag",
    },
    ticket: {
      title: "Ticket",
      open_msg: "Willkommen bei deinem Ticket!",
      already: "!{i} Du hast bereits ein offenes Ticket.",
      error:
        "!{i} Ein Fehler ist während der Erstellung deines Tickets aufgetreten!",
      not_ticket: "!{i} Das ist kein Ticket!",
      disabled: "!{i} Das Ticketsystem wurde für diesen Server deaktiviert!",
      missing_role:
        "!{i} Sie verfügen nicht über die entsprechende Rolle, um diese Buttons nutzen zu können.",
      claimed: "!{y} Ticket beansprucht!",
      claimed_by: "!{dot} Beansprucht von",
      opened_by: "!{dot} Erstellt von",
      closed_by: "!{dot} Geschlossen von",
      channel: "!{dot} Ticketkanal",
      deleted: "Ticket gelöscht!",
      deleted_msg: "Es wurde ein Ticket gelöscht!",
      will_be_deleted:
        "!{l} Das Ticket wird innerhalb weniger Sekunden gelöscht",
      reopened: "!{y} Ticket neu geöffnet!",
      closed: "!{y} Ticket geschlossen!",
      created: "!{y} Ihr Ticket wurde erstellt!",

      buttons: {
        close: "Schließen",
        reopen: "Neu öffnen",
        claim: "Beanspruchen",
        delete: "Löschen",
      },
    },
  },
};
