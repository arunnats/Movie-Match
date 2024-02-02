import requests
import gzip
import pandas as pd
from io import BytesIO
from pymongo import MongoClient
import json

print("Started Process")
with open('dbConfig.json') as config_file:
    config = json.load(config_file)

# Extract MongoDB connection string from the configuration
mongo_connection_string = config.get('mongo_connection_string', '')
mongo_database_name = config.get('mongo_database_name', '')
mongo_collection_name = config.get('mongo_collection_name', '')
tmdb_api_key = config.get('tmdb_api_key', '') 
omdb_api_key = config.get('omdb_api_key', '') 

if not (mongo_connection_string and tmdb_api_key and omdb_api_key):
    print("MongoDB connection string or API keys not found in config.json.")
    exit()

url = "https://datasets.imdbws.com/title.basics.tsv.gz"
response = requests.get(url)

if response.status_code == 200:
    with gzip.open(BytesIO(response.content), 'rt', encoding='utf-8') as file:
        df = pd.read_csv(file, delimiter='\t')

        client = MongoClient(mongo_connection_string)
        db = client[mongo_database_name]
        collection = db[mongo_collection_name]

        last_inserted_document = collection.find_one(sort=[("tconst", -1)])

        if last_inserted_document:
            last_inserted_tconst = last_inserted_document["tconst"]
        else:
            last_inserted_tconst = None

        if last_inserted_tconst:
            movie_df = df[df['tconst'] > last_inserted_tconst].head(50)
        else:
            movie_df = df[df['titleType'] == 'movie'].head(50)

        for _, row in movie_df.iterrows():
            movie_document = {
                "tconst": row['tconst'],
                "titleType": row['titleType'],
            }

            # Fetch TMDB ID using the IMDb ID
            tmdb_id_url = f"https://api.themoviedb.org/3/find/{row['tconst']}?api_key={tmdb_api_key}&external_source=imdb_id"
            tmdb_id_response = requests.get(tmdb_id_url)

            if tmdb_id_response.status_code == 200:
                tmdb_id_data = tmdb_id_response.json()
                tmdb_id_results = tmdb_id_data.get("movie_results", [])

                if tmdb_id_results:
                    tmdb_id = tmdb_id_results[0].get("id", None)

                    if tmdb_id:
                        # Fetch Keywords and Poster details using TMDB ID
                        keywords_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/keywords?api_key={tmdb_api_key}"
                        keywords_response = requests.get(keywords_url)

                        poster_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={tmdb_api_key}"
                        poster_response = requests.get(poster_url)

                        if keywords_response.status_code == 200 and poster_response.status_code == 200:
                            keywords_data = keywords_response.json().get("keywords", [])
                            poster_path = poster_response.json().get("poster_path", "")

                            movie_document.update({
                                "Title": row['originalTitle'],
                                "Keywords": [keyword['name'] for keyword in keywords_data],
                                "PosterAlt": f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else "",
                            })

                            # Update other fields as before
                            omdb_url = f"http://www.omdbapi.com/?i={row['tconst']}&apikey={omdb_api_key}"
                            omdb_response = requests.get(omdb_url)

                            if omdb_response.status_code == 200:
                                omdb_data = omdb_response.json()

                                movie_document.update({
                                    "Year": omdb_data.get("Year", ""),
                                    "Rated": omdb_data.get("Rated", ""),
                                    "Released": omdb_data.get("Released", ""),
                                    "Runtime": omdb_data.get("Runtime", ""),
                                    "Genre": omdb_data.get("Genre", ""),
                                    "Director": omdb_data.get("Director", ""),
                                    "Writer": omdb_data.get("Writer", ""),
                                    "Actors": omdb_data.get("Actors", ""),
                                    "Plot": omdb_data.get("Plot", ""),
                                    "Language": omdb_data.get("Language", ""),
                                    "Country": omdb_data.get("Country", ""),
                                    "Poster": omdb_data.get("Poster", ""),
                                    "RottenTomatoesRating": omdb_data["Ratings"][1]["Value"] if len(omdb_data.get("Ratings", [])) > 1 else "",
                                    "IMDBRating": omdb_data.get("imdbRating", ""),
                                })

                                collection.insert_one(movie_document)

                                print(f"Document for {row['tconst']} inserted into MongoDB successfully.")
                            else:
                                print(f"Failed to fetch OMDB data for {row['tconst']}.")
                        else:
                            print(f"Failed to fetch Keywords or Poster data for {row['tconst']}.")

                    else:
                        print(f"TMDB ID not found for {row['tconst']}.")

                else:
                    print(f"No TMDB results found for {row['tconst']}.")

            else:
                print(f"Failed to fetch TMDB ID for {row['tconst']}.")

        client.close()

else:
    print("Failed to download the file. Check the URL or try again later.")
