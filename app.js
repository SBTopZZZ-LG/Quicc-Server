// Third-party require
const express = require('express')
const CryptoJS = require('crypto-js');
//

// My packages
const databaseConnection = require("./Database/connection")
//

// Database Schemas
const DatabaseUser = require("./Database/Schemas/User")
//

// Middleware
const app = express()
app.use(express.json())

require("dotenv").config()
//

// Constants
const PORT = process.env.PORT || 3000 // Default port is 3000
//

// Functions
function generateUid() {
    const LENGTH = 30
    var result = '';

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    var charactersLength = characters.length;
    for (var i = 0; i < LENGTH; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }

    return result;
}
function generateToken() {
    const LENGTH = 50
    var result = '';

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    var charactersLength = characters.length;
    for (var i = 0; i < LENGTH; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }

    return result;
}
function encode(str) {
    const encodedWord = CryptoJS.enc.Utf8.parse(str); // encodedWord Array object
    const encoded = CryptoJS.enc.Base64.stringify(encodedWord); // string: 'NzUzMjI1NDE='
    return encoded;
}

async function getUserByEmail(email) {
    const result = await DatabaseUser.findOne({ email: email })
    return result
}
function createUser(email, password) {
    var newUser = new DatabaseUser({
        uid: generateUid(),
        email: email,
        hash: encode(password)
    })

    return newUser
}
//

databaseConnection.setupDatabaseConnection((err) => {
    if (err)
        return console.error(err)

    console.log("Connected to mongo database")

    app.listen(PORT, () => {
        console.log("Express server running on port", PORT)
    })
})

app.post("/signIn", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]

        if (loginToken) {
            const user = await getUserByEmail(email)

            if (user == null)
                return res.status(404).send("emailNotFound")

            if (user["loginTokens"].includes(loginToken)) {
                // Valid token

                return res.status(200).send(user)
            }
            return res.status(403).send("invalidToken");
        }

        const password = body["password"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (user["hash"] == encode(password)) {
            // Password match

            const loginToken = generateToken()

            user["loginTokens"].push(loginToken)
            user.save()

            return res.status(200).send(loginToken)
        }
        return res.status(403).send("passwordMismatch")
    } catch (e) {
        return res.status(500).send(e)
    }
})
app.post("/signOut", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (user["loginTokens"].includes(loginToken)) {
            user["loginTokens"] = user["loginTokens"].filter((item) => {
                return item != loginToken
            })

            user.save()

            return res.status(200).send("signedOut")
        }
        return res.status(403).send("invalidToken")
    } catch (e) {
        return res.status(500).send(e)
    }
})

app.post("/register", async (req, res) => {
    try {
        const body = req.body
        const email = body["email"]
        const password = body["password"]

        if (await getUserByEmail(email) != null)
            return res.status(403).send("emailAlreadyExists")

        const newUser = createUser(email, password)
        newUser.save()

        return res.status(200).send(newUser)
    } catch (e) {
        return res.status(500).send(e)
    }
})