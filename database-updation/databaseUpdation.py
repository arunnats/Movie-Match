import requests
import gzip
import pandas as pd
from io import BytesIO
from pymongo import MongoClient
from bson import ObjectId
import json

print("Started process.")

# Load configuration from config.json
with open('dbConfig.json') as config_file:
    config = json.load(config_file)

# Extract MongoDB connection string from the configuration
mongo_connection_string = config.get('mongo_connection_string', '')
mongo_database_name = config.get('mongo_database_name', '')
mongo_collection_name = config.get('mongo_collection_name', '')

if not mongo_connection_string:
    print("MongoDB connection string not found in config.json.")
    exit()

# Step 1: Download IMDb Dataset
url = "https://datasets.imdbws.com/title.basics.tsv.gz"
response = requests.get(url)

# Check if the request was successful (status code 200)
if response.status_code == 200:
    # Step 2: Extract the compressed TSV file
    with gzip.open(BytesIO(response.content), 'rt', encoding='utf-8') as file:
        df = pd.read_csv(file, delimiter='\t')

        # Step 3: Filter for the first 100 items with titleType as "movie"
        movie_df = df[df['titleType'] == 'movie'].head(100)

        # Step 4: Connect to MongoDB using the connection string from config.json
        client = MongoClient(mongo_connection_string)
        db = client[mongo_database_name]
        collection = db[mongo_collection_name]

        # Step 5: Insert documents into MongoDB
        for _, row in movie_df.iterrows():
            movie_document = {
                "tconst": row['tconst'],
                "titleType": row['titleType'],
            }
            collection.insert_one(movie_document)

        print("Documents inserted into MongoDB successfully.")

        # Step 6: Close the MongoDB connection
        client.close()

else:
    print("Failed to download the file. Check the URL or try again later.")
