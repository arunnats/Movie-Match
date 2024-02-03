const express = require("express");
const path = require("path");
const Fuse = require("fuse.js");
const { MongoClient } = require("mongodb");
const config = require("./config.json");
const session = require("express-session");
const crypto = require("crypto");

const app = express();
const port = 3000;

app.use(
	session({
		secret: "iamsocoolomgg",
		resave: false,
		saveUninitialized: true,
	})
);

// Replace bodyParser middleware with express.json()
app.use(express.json());

const mongoConnectionString = config.mongo_connection_string;
const dbName = config.mongo_database_name;

const client = new MongoClient(mongoConnectionString, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

let cachedMovies = [];

const updateCache = async () => {
	const database = client.db(dbName);
	const collection = database.collection("movies");
	cachedMovies = await collection.find().toArray();
};

const fuseOptions = {
	keys: ["Title"],
};

async function initialize() {
	try {
		await client.connect();
		await updateCache();
		app.listen(port, () => {
			console.log(`Server is running at http://localhost:${port}`);
		});
	} catch (error) {
		console.error("Error initializing server:", error);
		process.exit(1);
	}
}

initialize();

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

		const fuse = new Fuse(
			cachedMovies.filter((movie) => !movie.Genre.includes("Adult")),
			fuseOptions
		);

		const searchResults = fuse.search(query).slice(0, 100);

		const result = searchResults
			.map(({ item }) => ({
				tconst: item.tconst,
				title: item.Title,
				poster: item.Poster,
				posteralt: item.PosterAlt,
			}))
			.filter((movie) => !(movie.poster === "N/A" && movie.posteralt === ""));

		console.log("Search Results:", result);

		const searchId = crypto.randomBytes(8).toString("hex");

		req.session[searchId] = result;

		res.json({ searchId });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.post("/searchCall", async (req, res) => {
	try {
		const { query } = req.body;
		console.log("Received query:", query);

		const fuse = new Fuse(cachedMovies, fuseOptions);

		const searchResults = fuse.search(query).slice(0, 100);

		const result = searchResults
			.map(({ item }) => ({
				tconst: item.tconst,
				title: item.Title,
				poster: item.Poster,
				posteralt: item.PosterAlt,
			}))
			.filter((movie) => !(movie.poster === "N/A" && movie.posteralt === ""));

		console.log("Search Results:", result);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.get("/results", (req, res) => {
	try {
		const { searchId } = req.query;

		console.log("Received searchId:", searchId);

		const searchResults = req.session[searchId];

		console.log("Retrieved search results from session:", searchResults);

		res.render("results.ejs", { searchResults });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.get("/view-info/:tconst", (req, res) => {
	try {
		const { tconst } = req.params;

		const movieDetails = findMovieDetailsInLocalCache(tconst);

		res.render("movie-details.ejs", { movieDetails });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

function findMovieDetailsInLocalCache(tconst) {
	const cachedMovie = cachedMovies.find((movie) => movie.tconst === tconst);

	return cachedMovie;
}
