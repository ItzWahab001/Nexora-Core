const warningsSchema = {
    User: {
        type: String,
    },
    Guild: {
        type: String,
    },
    Warnings: {
        type: Number,
        default: 0,
    },
    Strikes: {
        type: Number,
        default: 0,
    },
}

export default warningsSchema;
