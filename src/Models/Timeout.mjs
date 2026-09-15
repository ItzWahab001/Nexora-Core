const userActivityModelSchema = {
    Guild: {
        type: String,
        default: ''
    },
    User: {
        type: String,
        default: ''
    },
    Beg: {
        type: Date,
        default: 0
    },
    Crime: {
        type: Date,
        default: 0
    },
    Daily: {
        type: Date,
        default: 0
    },
    Weekly: {
        type: Date,
        default: 0
    },
    Monthly: {
        type: Date,
        default: 0
    },
    Hourly: {
        type: Date,
        default: 0
    },
    Work: {
        type: Date,
        default: 0
    },
    Rob: {
        type: Date,
        default: 0
    },
    Fish: {
        type: Date,
        default: 0
    },
    Hunt: {
        type: Date,
        default: 0
    },
    Yearly: {
        type: Date,
        default: 0
    },
    Present: {
        type: Date,
        default: 0
    },
    Heist: {
        type: Date,
        default: 0
    },
    Rep: {
        type: Date,
        default: 0
    },
    Partner: {
        type: Date,
        default: 0
    }
}

export default userActivityModelSchema;
