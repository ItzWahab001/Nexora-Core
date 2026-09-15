const userRolesModelSchema = {
    User: {
        type: String,
    },
    Guild: {
        type: String,
    },
    Roles: {
        type: Array,
        default: [],
    },
}

export default userRolesModelSchema;
