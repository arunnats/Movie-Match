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

app.use(express.json());

const mongoConnectionString = config.mongo_connection_string;
const dbName = config.mongo_database_name;

const client = new MongoClient(mongoConnectionString);

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
				year: item.Year,
				posteralt: item.PosterAlt,
				language: item.Language,
				genre: item.Genre,
				imdb: item.IMDBRating,
				rt: item.RottenTomatoesRating,
				streaming: item.StreamingService[0]?.StreamingService,
				streamingLogo: item.StreamingService[0]?.LogoPath,
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

app.post("/adv-search", async (req, res) => {
	try {
		const { genre, language, ott, rating } = req.body.options;

		console.log("Received options:", req.body.options);

		let filteredMovies = cachedMovies;

		// Apply genre filter if options are selected
		if (genre.length > 0) {
			filteredMovies = filteredMovies.filter((movie) => {
				const movieGenres = movie.Genre.split(", ").map((g) => g.trim());
				return (
					genre.includes("All") || genre.some((g) => movieGenres.includes(g))
				);
			});
		}

		// Apply language filter if options are selected
		if (language.length > 0) {
			filteredMovies = filteredMovies.filter((movie) => {
				return language.includes("All") || language.includes(movie.Language);
			});
		}

		// Apply OTT filter if options are selected
		if (ott.length > 0) {
			filteredMovies = filteredMovies.filter((movie) => {
				return (
					ott.includes("All") ||
					(movie.StreamingService &&
						ott.some((o) =>
							movie.StreamingService.some(
								(service) => service.StreamingService === o
							)
						))
				);
			});
		}

		// Apply rating filter if options are selected
		if (rating.length > 0) {
			filteredMovies = filteredMovies.filter((movie) => {
				return (
					rating.includes("All") ||
					rating.includes(movie.Rated) ||
					(rating.includes("18+") &&
						(movie.Rated === "18" || movie.Rated === "R"))
				);
			});
		}

		// Sort by rating with specified weightage
		const sortedMovies = filteredMovies
			.map(
				({
					tconst,
					Title,
					Poster,
					PosterAlt,
					Language,
					Genre,
					IMDBRating,
					RottenTomatoesRating,
					StreamingService,
					Year,
				}) => {
					// Convert ratings to numeric values, replacing '%' in Rotten Tomatoes Rating
					const rtRating = RottenTomatoesRating
						? parseFloat(RottenTomatoesRating.replace("%", ""))
						: 0;
					const imdbRating = IMDBRating ? parseFloat(IMDBRating) : 0;

					// Calculate weighted average rating
					const weightedRating = (2 * rtRating + 1.5 * imdbRating) / 3.5;

					return {
						tconst,
						title: Title,
						poster: Poster,
						posteralt: PosterAlt,
						language: Language,
						genre: Genre,
						imdb: IMDBRating,
						rt: RottenTomatoesRating,
						streaming: StreamingService[0]?.StreamingService,
						streamingLogo: StreamingService[0]?.LogoPath,
						year: Year,
						weightedRating,
					};
				}
			)
			.filter((movie) => !(movie.poster === "N/A" && movie.posteralt === ""))
			.sort((a, b) => b.weightedRating - a.weightedRating) // Sort by descending weighted rating
			.slice(0, 100); // Limit the responses to the first 100

		console.log("Search Results:", sortedMovies);

		const searchId =
			sortedMovies.length > 0 ? crypto.randomBytes(8).toString("hex") : "0";

		req.session[searchId] = sortedMovies;

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

app.get("/adv-results", (req, res) => {
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

app.get("/advanced-search", (req, res) => {
	res.render("advanced-search.ejs");
});

app.get("/recommendations", (req, res) => {
	res.render("recommendations.ejs");
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
