
const inviteModelSchema = {
    User: {
        type: String,
    },
    Guild: {
        type: String,
    },
    Inviter: {
        type: String,
    },
    Code: {
        type: String,
    },
    Tracked: {
        type: Number,
        default: 0,
    },
    Fake: {
        type: Number,
        default: 0,
    },
    Left: {
        type: Number,
        default: 0,
    },
    Added: {
        type: Number,
        default: 0,
    },
}

export default inviteModelSchema;
