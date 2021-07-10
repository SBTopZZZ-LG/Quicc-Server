// Third-party require
const express = require('express')
const CryptoJS = require('crypto-js')
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
const SENDER = 0, RECEIVER = 1, SENDER_ACCEPTED = 2, RECEIVER_ACCEPTED = 3
//

// Functions
/**
 * Generates a random String of length 30
 * @returns A 30-char random string
 */
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
/**
 * Generates a random String of length 50
 * @returns A 50-char random string
 */
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
/**
 * Encodes a string with CryptoJS/Base64 encoder
 * @param {String} str The string to encode
 * @returns Base64 encoded string
 */
function encode(str) {
    const encodedWord = CryptoJS.enc.Utf8.parse(str);
    const encoded = CryptoJS.enc.Base64.stringify(encodedWord);
    return encoded;
}

function unionArrays(x, y) {
    var obj = {};
    for (var i = x.length - 1; i >= 0; --i)
        obj[x[i]] = x[i];
    for (var i = y.length - 1; i >= 0; --i)
        obj[y[i]] = y[i];
    var res = []
    for (var k in obj) {
        if (obj.hasOwnProperty(k))  // <-- optional
            res.push(obj[k]);
    }
    return res;
}

async function searchUsersByName(name) {
    const results = await DatabaseUser.find({ name: { $regex: name, $options: "i" } }, "uid name email")

    return results
}
async function searchUsersByEmail(name) {
    const results = await DatabaseUser.find({ email: { $regex: name, $options: "i" } }, "uid name email") // [a-zA-Z]+

    return results
}
async function searchUsersByNameAndEmail(name) {
    const results = unionArrays(await DatabaseUser.find({ name: { $regex: name, $options: "i" } }, "uid name email"),
        await DatabaseUser.find({ email: { $regex: name, $options: "i" } }), "uid name email") // [a-zA-Z]+

    return results
}
/**
 * Finds and Returns User where the Uid matches
 * @param {String} uid The uid to refer
 * @returns User with the Uid
 */
async function getUserByUid(uid) {
    const result = await DatabaseUser.findOne({ uid: uid })
    return result
}
/**
 * Finds and Returns User where the Email matches
 * @param {String} uid The email to refer
 * @returns User with the Email
 */
async function getUserByEmail(email) {
    const result = await DatabaseUser.findOne({ email: email })
    return result
}
/**
 * Creates a new DatabaseUser schema object
 * @param {String} email The email of the user
 * @param {String} password The password of the user (unencoded)
 * @returns The DatabaseUser schema object of the User
 */
function createUser(email, password) {
    var newUser = new DatabaseUser({
        uid: generateUid(),
        email: email,
        hash: encode(password),
        friends: [],
        loginTokens: []
    })

    return newUser
}

/**
 * Finds and Returns List of Events where Uid is present in the members list
 * @param {String} uid The uid to refer
 * @param {Boolean} isActive true; if the event is not expired and exclusive; false; otherwise
 * @returns List of Events
 */
async function getEventsWhereUidIsAMember(memberUid, isActive = false) {
    if (isActive) {
        const now = Number(new Date().getTime().toString())
        const events = await DatabaseEvent.find({ members: memberUid }).where("startDate").lt(now.toString()).where("endDate").gt(now.toString())
        return events
    }
    const events = await DatabaseEvent.find({ members: memberUid })
    return events
}
/**
 * Finds and Returns List of Events of a specified host user
 * @param {String} uid The uid to refer
 * @param {Boolean} isActive true; if the event is not expired and exclusive; false; otherwise
 * @returns List of Events
 */
async function getEventsByHostUid(hostUid, isActive = false) {
    if (isActive) {
        const now = Number(new Date().getTime().toString())
        const events = await DatabaseEvent.find({ host: hostUid }).where("startDate").lt(now.toString()).where("endDate").gt(now.toString())
        return events
    }

    const events = await DatabaseEvent.find({ host: hostUid })
    return events
}
/**
 * Finds and Returns Event where the Uid matches
 * @param {String} uid The uid to refer
 * @returns Event with the Uid
 */
async function getEventByUid(uid) {
    const result = await DatabaseEvent.findOne({ uid: uid })
    return result
}
/**
 * Creates a new DatabaseEvent schema object
 * @param {String} hostUid The Uid of the host user
 * @param {String} title Title of the event
 * @param {Array} members Invited members of the event
 * @param {Number} startDate Start date of the event
 * @param {Number} endDate Expiry date of the event
 * @returns The DatabaseEvent schema object of the User
 */
function createEvent(hostUid, title, members, startDate, endDate) {
    var newEvent = new DatabaseEvent({
        uid: generateUid(),
        host: hostUid,
        title: title,
        startDate: startDate,
        endDate: endDate,
        members: members
    })

    return newEvent
}
//

/**
 * Connect to Database and start the Express server
 */
databaseConnection.setupDatabaseConnection((err) => {
    if (err) {
        console.error(err)
        // Exit program
        console.log("[Server] TERMINATING PROCESS DUE TO ERRORS")
        process.exit()
    }

    console.log("[Server] CONNECTED TO MONGO DATABASE")

    app.listen(PORT, () => {
        console.log("[Server] EXPRESS RUNNING ON PORT", PORT)
    })
})

// User-related handles
/**
 * Endpoint to handle User sign-in
 */
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

            return res.status(200).send({
                "loginToken": loginToken,
                "user": user
            })
        }
        return res.status(403).send("passwordMismatch")
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User sign-out
 */
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

/**
 * Endpoint to handle get User
 */
app.post("/user", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const targetEmail = body["targetEmail"]
        const targetUserId = body["targetUserId"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        var targetUser = targetEmail ? await getUserByEmail(targetEmail) : await getUserByUid(targetUserId)
        delete targetUser["hash"]
        delete targetUser["loginTokens"]

        return res.status(200).send(targetUser)
    } catch (e) {
        console.log(e)
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User details updating
 */
app.post("/update", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]

        const user = body["user"]
        const name = user["name"]

        var dbUser = await getUserByEmail(email)

        if (dbUser == null)
            return res.status(404).send("emailNotFound")

        if (!dbUser["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        if (name)
            dbUser["name"] = name

        dbUser.save()

        return res.status(200).send(dbUser)
    } catch (e) {
        return res.status(500).send(e)
    }
})

/**
 * Endpoint to handle User registrations
 */
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

/**
 * Endpoint to handle User adding/accepting new friends
 */
app.post("/user/friends/add", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const targetEmail = body["targetEmail"]

        var user = await getUserByEmail(email)
        var targetUser = await getUserByEmail(targetEmail)

        if (user == null || targetUser == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        if (user["friends"].filter(item => { return item["userUid"] == targetUser["uid"] })[0]["status"] == RECEIVER
            && targetUser["friends"].filter(item => { return item["userUid"] == user["uid"] })[0]["status"] == SENDER) {
            // Accept friend request

            user["friends"] = user["friends"].filter(item => { return item["userUid"] != targetUser["uid"] })
            targetUser["friends"] = targetUser["friends"].filter(item => { return item["userUid"] != user["uid"] })

            const data1 = {
                userUid: targetUser["uid"],
                status: RECEIVER_ACCEPTED
            }
            const data2 = {
                userUid: user["uid"],
                status: SENDER_ACCEPTED
            }

            user["friends"].push(data1)
            targetUser["friends"].push(data2)
        } else {
            // Create friend request

            const data1 = {
                userUid: targetUser["uid"],
                status: SENDER
            }
            const data2 = {
                userUid: user["uid"],
                status: RECEIVER
            }

            if (user["friends"].filter(item => { return item["userUid"] == targetUser["uid"] }).length == 0)
                user["friends"].push(data1)

            if (targetUser["friends"].filter(item => { return item["userUid"] == user["uid"] }).length == 0)
                targetUser["friends"].push(data2)
        }

        user.save()
        targetUser.save()

        return res.status(200).send("friendRequestCommitted")
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User removing friends
 */
app.post("/user/friends/remove", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const targetEmail = body["targetEmail"]

        var user = await getUserByEmail(email)
        var targetUser = await getUserByEmail(targetEmail)

        if (user == null || targetUser == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        user["friends"] = user["friends"].filter(item => {
            return item["userUid"].toString() != targetUser["uid"].toString()
        })
        targetUser["friends"] = targetUser["friends"].filter(item => {
            return item["userUid"].toString() != user["uid"].toString()
        })

        user.save()
        targetUser.save()

        return res.status(200).send("friendRemoved")
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User viewing friends
 */
app.post("/user/friends", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        return res.status(200).send(user["friends"])
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User viewing friend
 */
app.post("/user/friends/one", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const targetEmail = body["targetEmail"]

        const user = await getUserByEmail(email)
        const targetUser = await getUserByEmail(targetEmail)

        if (user == null || targetUser == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        const result = user["friends"].filter(item => {
            return item["userUid"] == targetUser["uid"]
        })

        return res.status(200).send(result.length > 0 ? result[0] : {})
    } catch (e) {
        return res.status(500).send(e)
    }
})

/**
 * Endpoint to handle User searches by Name
 */
app.post("/user/search/name", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const expression = body["expression"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        return res.status(200).send(await searchUsersByName(expression))
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User searches by Email
 */
app.post("/user/search/email", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const expression = body["expression"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        return res.status(200).send(await searchUsersByEmail(expression))
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle User searches by Name or Email
 */
app.post("/user/search", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const expression = body["expression"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        return res.status(200).send(await searchUsersByNameAndEmail(expression))
    } catch (e) {
        return res.status(500).send(e)
    }
})
//

// Event-related handles
/**
 * Endpoint to handle Event creation
 */
app.post("/createEvent", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]

        const event = body["event"]
        const title = event["title"]
        const members = event["members"]
        const startDate = Number(event["startDate"])
        const endDate = Number(event["endDate"])

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        const newEvent = createEvent(user["uid"], title, members || [], startDate, endDate)
        newEvent.save()

        return res.status(200).send(newEvent)
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle Event deletion
 */
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
/**
 * Endpoint to handle Event updating
 */
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
        const startDate = event["startDate"]
        const endDate = event["endDate"]

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
        if (startDate)
            dbEvent["startDate"] = Number(startDate)
        if (endDate)
            dbEvent["endDate"] = Number(endDate)

        dbEvent.save()

        return res.status(200).send(dbEvent)
    } catch (e) {
        return res.status(500).send(e)
    }
})

/**
 * Endpoint to handle and return Events where the user is invited (where his uid exists in the members list)
 */
app.get("/invitedEvents", async (req, res) => {
    try {
        const queries = req.query
        const uid = queries["id"]
        const active = queries["active"] == null ? false : (queries["active"].toString() == "true" ? true : false)

        if (await getUserByUid(uid) == null)
            return res.status(404).send("userNotFound")

        return res.status(200).send(await getEventsWhereUidIsAMember(uid, active))
    } catch (e) {
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle and return Events where the user is the host (where his uid matches with the host)
 */
app.get("/events", async (req, res) => {
    try {
        const queries = req.query
        const hostUid = queries["hostId"]
        const active = queries["active"] == null ? false : (queries["active"].toString() == "true" ? true : false)

        if (await getUserByUid(hostUid) == null)
            return res.status(404).send("userNotFound")

        return res.status(200).send(await getEventsByHostUid(hostUid, active))
    } catch (e) {
        console.log(e)
        return res.status(500).send(e)
    }
})
/**
 * Endpoint to handle and return Event where the Uid matches
 */
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

/**
 * Endpoint to handle Event joining (joined member uids are pushed to visitedMembers list)
 */
app.post("/joinEvent", async (req, res) => {
    try {
        const headers = req.headers
        const loginToken = headers["authorization"]

        const body = req.body
        const email = body["email"]
        const key = body["key"]

        const user = await getUserByEmail(email)

        if (user == null)
            return res.status(404).send("emailNotFound")

        if (!user["loginTokens"].includes(loginToken))
            return res.status(403).send("invalidToken")

        const userUid = key.split(':')[0]
        const eventUid = key.split(':')[1]

        if (userUid == user["uid"]) {
            var event = await getEventByUid(eventUid)

            if (event != null && event["uid"] == eventUid && event["members"].includes(userUid)) {
                if (event["visitedMembers"].includes(userUid))
                    return res.status(403).send("eventAlreadyVisited")

                event["visitedMembers"].push(userUid)

                event.save()

                return res.status(200).send("eventVisited")
            }
        }

        return res.status(403).send("invalidKey")
    } catch (e) {
        console.log(e)
        return res.status(500).send(e)
    }
})
//