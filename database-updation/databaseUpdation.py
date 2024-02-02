import requests
import gzip
import pandas as pd
from io import BytesIO
from pymongo import MongoClient
import json

# Load configuration from config.json
print("Started Process")
with open('dbConfig.json') as config_file:
    config = json.load(config_file)

# Extract MongoDB connection string from the configuration
mongo_connection_string = config.get('mongo_connection_string', '')
mongo_database_name = config.get('mongo_database_name', '')
mongo_collection_name = config.get('mongo_collection_name', '')
omdb_api_key = config.get('omdb_api_key', '')  # Make sure to replace this with your actual OMDB API key

if not mongo_connection_string:
    print("MongoDB connection string not found in config.json.")
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
            
            omdb_url = f"http://www.omdbapi.com/?i={row['tconst']}&apikey={omdb_api_key}"
            # print(f"API URL for {row['tconst']}: {omdb_url}")
            omdb_response = requests.get(omdb_url)

            if omdb_response.status_code == 200:
                omdb_data = omdb_response.json()

                movie_document.update({
                    "Title": omdb_data.get("Title", ""),
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

        client.close()

else:
    print("Failed to download the file. Check the URL or try again later.")
