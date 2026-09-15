
const userXPModelSchema = {
    User: {
        type: String,
    },
    Guild: {
        type: String,
    },
    xp: {
        type: Number,
        default: 0,
    },
    level: {
        type: Number,
        default: 0,
    },
    lastUpdated: {
        type: Date,
        default: new Date(),
    },
    userTag: {
        type: String,
    },
    userAvatar: {
        type: String,
    },
    Timestamp: {
        type: Array,
        default: [],
    },
    Voice: {
        type: Object,
        default: {
            level: 0,
            xp: 0,
            connections: 0,
            time: 0,
            Timestamp: [],
        },
    },
}

export default userXPModelSchema;
