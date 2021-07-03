const mongoose = require("mongoose")
const Schema = mongoose.Schema

const schema = new Schema({
    uid: {
        type: String,
        required: true
    },
    name: {
        type: String,
        default: "Unspecified"
    },
    email: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    loginTokens: {
        type: Array,
        default: []
    }
})

module.exports = mongoose.model('Users', schema)