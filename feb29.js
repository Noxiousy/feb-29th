const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;

//  mongodb stuff
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION }
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${username}:${password}@cluster0.lmwzjwi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

process.stdin.setEncoding("utf-8");
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(__dirname + "/templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (req, res) => {
    res.render("index");
});

app.post("/results", (req, res) => {
    (async () => {
        let date = req.body.date;
        let year = date.substring(0, 5);
        let variables = {
            date: date,
            answer: "",
            count: 1,
            holiday: `It isn't even a holiday. Pretty boring if you ask me.`
        };
        let entry = {
            date: date,
            count: 1
        };
        try {
            await client.connect();
            let filter = { date: date }
            const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne(filter);
            if (result) {
                entry.count = result.count + 1
                await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).replaceOne(filter, entry);
            }
            else {
                await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(entry);
            }

            variables.count = entry.count;

            if (!date.includes("02-29")) {
                variables.answer = "not";
                fetch(`https://api.api-ninjas.com/v1/holidays?country=us&year=${year}`, { 
                    headers: {
                        'X-Api-Key': '5/tCIQc+7SX8RA9P3idONg==tf0Olzga4JPAyvD8'
                    }})
                    .then(res => res.json())
                    .then(json => {
                        for (holiday of json) {
                            if (holiday.date == date) {
                                variables.holiday = `However, ${date} is apparently <em>${holiday.name}</em> though...`;
                            }
                        }
                        res.render("results", variables);
                    });
            }
            else {
                variables.holiday = `Congrats?`;
                res.render("results", variables);
            }
        } catch (e) {
            console.error(e);
        } finally {
            client.close();
        }
    })();
});

app.listen(port);
console.log(`Web server started and running at http://localhost:${port}`)

const prompt = "Stop to shut down the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
    let input = process.stdin.read();
    if (input !== null) {
        let command = input.trim();
        if (command === "stop") {
            process.stdout.write("Shutting down the server");
            process.exit(0);
        } else {
            process.stdout.write(`Invalid Command: ${input}`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});