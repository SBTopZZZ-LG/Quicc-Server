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
    startDate: {
        type: Number,
        required: true
    },
    endDate: {
        type: Number,
        required: true
    },
    members: {
        type: Array,
        default: []
    },
    visitedMembers: {
        type: Array,
        default: []
    }
})

module.exports = mongoose.model("Events", schema)