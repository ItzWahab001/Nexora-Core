export default {
  User: {
    type: String,
  },
  Guild: {
    type: String,
  },
  InvitedBy: String, // user invited by
  Invites: {
    Count: {
      type: Number,
      default: 0,
    },

    // users invites
    List: [String],
  },
  Birthday: {
    type: String,
    default: null,
  },
  Ticket: {
    Channel: {
      type: String,
      default: null,
    },
    Date: {
      type: Date,
      default: null,
    },
  },
};
