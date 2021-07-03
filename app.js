// Third-party require
const express = require('express')
const CryptoJS = require('crypto-js');
//

// My packages
const databaseConnection = require("./Database/connection")
//

// Database Schemas
const DatabaseUser = require("./Database/Schemas/User")
const DatabaseEvent = require("./Database/Schemas/Event")
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
    const encodedWord = CryptoJS.enc.Utf8.parse(str);
    const encoded = CryptoJS.enc.Base64.stringify(encodedWord);
    return encoded;
}

async function getUserByUid(uid) {
    const result = await DatabaseUser.findOne({ uid: uid })
    return result
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

async function getEventsWhereUidIsAMember(memberUid) {
    const events = await DatabaseEvent.find({ members: memberUid })
    return events
}
async function getEventsByHostUid(hostUid) {
    const events = await DatabaseEvent.find({ host: hostUid })
    return events
}
async function getEventByUid(uid) {
    const result = await DatabaseEvent.findOne({ uid: uid })
    return result
}
function createEvent(hostUid, title, members) {
    var newEvent = new DatabaseEvent({
        uid: generateUid(),
        host: hostUid,
        title: title,
        members: members
    })

    return newEvent
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

app.post("/createEvent", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]

        const event = body["event"]
        const title = event["title"]
        const members = event["members"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        const newEvent = createEvent(user["uid"], title, members || [])
        newEvent.save()

        return res.status(200).send(newEvent)
    } catch (e) {
        return res.status(500).send(e)
    }
})
app.post("/deleteEvent", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const eventUid = body["eventUid"]

        var user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        if (await getEventByUid(eventUid) == null)
            return res.status(404).send("eventNotFound")

        await DatabaseEvent.findOneAndDelete({ uid: eventUid })

        return res.status(200).send("eventDeleted")
    } catch (e) {
        return res.status(500).send(e)
    }
})
app.post("/updateEvent", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const eventUid = body["eventUid"]

        const event = body["event"]
        const title = event["title"]
        const members = event["members"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        var dbEvent = await getEventByUid(eventUid)

        if (dbEvent == null)
            return res.status(404).send("eventNotFound")

        if (title)
            dbEvent["title"] = title
        if (members)
            dbEvent["members"] = members

        dbEvent.save()

        return res.status(200).send(dbEvent)
    } catch (e) {
        return res.status(500).send(e)
    }
})

app.get("/invitedEvents", async (req, res) => {
    try {
        const queries = req.query
        const uid = queries["id"]

        if (await getUserByUid(uid) == null)
            return res.status(404).send("userNotFound")

        return res.status(200).send(await getEventsWhereUidIsAMember(uid))
    } catch (e) {
        return res.status(500).send(e)
    }
})
app.get("/events", async (req, res) => {
    try {
        const queries = req.query
        const hostUid = queries["hostId"]

        if (await getUserByUid(hostUid) == null)
            return res.status(404).send("userNotFound")

        return res.status(200).send(await getEventsByHostUid(hostUid))
    } catch (e) {
        return res.status(500).send(e)
    }
})
app.get("/event", async (req, res) => {
    try {
        const queries = req.query
        const eventUid = queries["event"]

        const event = await getEventByUid(eventUid)

        if (event == null)
            return res.status(404).send("eventNotFound")

        return res.status(200).send(event)
    } catch (e) {
        return res.status(500).send(e)
    }
})