const moderationLogModelSchema = {
    User: {
        type: String,
    },
    Guild: {
        type: String,
    },
    Reason: {
        type: String,
        default: 'Reason Not Specified',
    },
    Admin: {
        type: Object,
    },
    Content: {
        type: String,
    },
    Strikes: {
        type: Number,
    },
    Type: {
        type: String,
    },
}

export default moderationLogModelSchema;
