
const gameStatsModelSchema = {
    User: {
        type: String,
    },
    Guild: {
        type: String,
    },
    SaveUsed: {
        type: Number,
        default: 0,
    },
    Score: {
        type: Number,
        default: 0,
    },
    Count: {
        type: Object,
        default: {
            right: 0,
            rong: 0,
        },
    },
}

export default gameStatsModelSchema;
