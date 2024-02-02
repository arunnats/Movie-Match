const express = require("express");
const path = require("path");
const Fuse = require("fuse.js");
const { MongoClient } = require("mongodb");
const config = require("./config.json");

const app = express();
const port = 3000;

// Replace bodyParser middleware with express.json()
app.use(express.json());

const mongoConnectionString = config.mongo_connection_string;
const dbName = config.mongo_database_name;

const client = new MongoClient(mongoConnectionString, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});
client.connect();

const fuseOptions = {
	keys: ["Title"],
};

let cachedMovies = []; // In-memory cache

const updateCache = async () => {
	const database = client.db(dbName);
	const collection = database.collection("movies");
	cachedMovies = await collection.find().toArray();
};

// Update the cache on startup
updateCache();

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public", "views"));

app.get("/", (req, res) => {
	res.render("index.ejs");
});

app.post("/search", async (req, res) => {
	try {
		const { query } = req.body;
		console.log("Received query:", query);

		const fuse = new Fuse(cachedMovies, fuseOptions);

		const searchResults = fuse.search(query).slice(0, 50);

		const result = searchResults.map(({ item }) => ({
			tconst: item.tconst,
			title: item.Title,
		}));

		res.json({ result });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
