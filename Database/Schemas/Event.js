const mongoose = require("mongoose")
const Schema = mongoose.Schema

const schema = new Schema({
    uid: {
        type: String,
        required: true
    },
    host: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    members: {
        type: Array,
        default: []
    }
})

module.exports = mongoose.model("Events", schema)