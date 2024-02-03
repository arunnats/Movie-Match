const express = require("express");
const path = require("path");
const Fuse = require("fuse.js");
const { MongoClient } = require("mongodb");
const config = require("./config.json");
const session = require("express-session");
const crypto = require("crypto");
const OpenAI = require("openai");

const openai_key = config.openai_key;
const openai = new OpenAI({ apiKey: openai_key });

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

async function updateCache() {
	const database = client.db(dbName);
	const collection = database.collection("movies");

	const totalMovies = await collection.countDocuments();
	const batchSize = 100;
	const batches = Math.ceil(totalMovies / batchSize);
	const fetchPromises = [];

	for (let i = 0; i < batches; i++) {
		const skip = i * batchSize;
		const limit = batchSize;

		fetchPromises.push(collection.find().skip(skip).limit(limit).toArray());
	}

	try {
		const batchResults = await Promise.all(fetchPromises);
		cachedMovies = batchResults.flat();

		console.log("Cache updated successfully");
	} catch (error) {
		console.error("Error updating cache:", error);
	}
}

const fuseOptions = {
	keys: ["Title"],
};

async function initialize() {
	try {
		console.log("Connecting to Mongo");
		await client.connect();
		console.log("Updating cache");
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
		// Ensure ott, language, genre, and rating are not empty, if empty, set them to ["All"]
		const options = req.body.options;
		const ott = options.ott?.length > 0 ? options.ott : ["All"];
		const language = options.language?.length > 0 ? options.language : ["All"];
		const genre = options.genre?.length > 0 ? options.genre : ["All"];
		const rating = options.rating?.length > 0 ? options.rating : ["All"];

		console.log("Received options:", options);

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

		// Rest of your code remains unchanged

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
					// Check if StreamingService is an array and has length
					const streamingService =
						Array.isArray(StreamingService) && StreamingService.length > 0
							? StreamingService[0]?.StreamingService
							: "All";

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
						streaming: streamingService,
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

app.get("/genres", async (req, res) => {
	try {
		const genres = [
			"Comedy",
			"Action",
			"Thriller",
			"Horror",
			"Adventure",
			"Fantasy",
			"Mystery",
			"Crime",
			"Animation",
			"Documentary",
		];
		const genreResults = {};

		for (const genre of genres) {
			const url = "http://localhost:3000/adv-search";
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					options: {
						genre: [genre],
						language: [],
						ott: ["All"],
						rating: [],
					},
				}),
			});

			const { searchId } = await response.json();

			const searchResults = req.session[searchId];

			const sortedMovies = searchResults
				.filter((movie) => !(movie.poster === "N/A" && movie.posteralt === ""))
				.slice(0, 30); // Limit to the top 30 movies for each genre

			// Shuffle and take 6 random movies for each genre
			const randomMovies = shuffleArray(sortedMovies).slice(0, 6);

			genreResults[genre] = randomMovies;
		}

		res.render("genres.ejs", { genreResults });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

app.post("/getrecommendations", async (req, res) => {
	try {
		const { movie1, movie2, movie3, movie4, keyword1, keyword2 } = req.body;

		const prompt = `Recommend movies similar to ${movie1}, ${movie2}, ${movie3}, ${movie4} with keywords ${keyword1} and ${keyword2}.`;

		const response = await openai.chat.completions.create({
			model: "gpt-4-0125-preview",
			messages: [
				{
					role: "system",
					content:
						"You are a movie recommendation generator. Tou will always outpur 10 movies based on the prompt and your format will be a json file in this format: {'movienames':['movie1','movie2','movie3','movie4','movie5','movie6','movie7','movie8','movie9','movie10',]}. You will replace the movie1 to movie 10 with your recommendations. Your ouput should always strcitly be as specified. You will generate movies recs based on the similar language, actors, cinematic universe, genre and themes along with other factors",
				},
				{
					role: "user",
					content: prompt,
				},
			],
		});

		const movieNames = response.data.choices[0].message.content
			.trim()
			.split("\n");

		console.log(movieNames);

		res.json(movieNames);
	} catch (error) {
		console.error(error);
		res.status(500).send("An error occurred while getting recommendations.");
	}
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
