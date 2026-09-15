const panelModelSchema = {
    Guild: {
        type: String,
    },
    Panel: {
        type: String,
    },
    Channel: {
        type: String,
    },
    MessageID: {
        type: String,
    },
    MultiSelect: {
        type: Boolean,
        default: true,
    },
    Roles: [{
        RoleID: { type: String },
        Emoji: { type: String },
        Description: { type: String },
        Title: { type: String },
    }],
}

export default panelModelSchema;
