
const economyModelSchema = {
    Guild: {
        type: String,
        default: '',
    },
    User: {
        type: String,
        default: '',
    },
    Money: {
        type: Number,
        default: 0,
    },
    Bank: {
        type: Number,
        default: 0,
    },
}

export default economyModelSchema;
