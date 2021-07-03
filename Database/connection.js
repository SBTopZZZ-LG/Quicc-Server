const mongoose = require("mongoose")

const DB_KEY = "mongodb+srv://default:5NoKTr9nbAsUocbz@quicccluster1.fxvot.mongodb.net/quiccCluster1?retryWrites=true&w=majority"

// To avoid Mongoose deprecation warnings
mongoose.set('useFindAndModify', false)

function setupDatabaseConnection(callback) {
    mongoose.connect(DB_KEY, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
        if (err)
            return callback(err)

        callback()
    })
}

module.exports.setupDatabaseConnection = setupDatabaseConnection