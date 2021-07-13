const mongoose = require("mongoose")
require("dotenv").config()

const DB_KEY = "mongodb+srv://" + process.env.MONGODB_URL + "?retryWrites=true&w=majority"

// To avoid Mongoose deprecation warnings
mongoose.set('useFindAndModify', false)

function setupDatabaseConnection(callback) {
    mongoose.connect(DB_KEY, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
        callback(err)
    })
}

module.exports.setupDatabaseConnection = setupDatabaseConnection