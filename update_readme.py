from pymongo import MongoClient
import os

def update_readme():
    # Fetch MongoDB connection details from GitHub secrets
    mongo_connection_string = os.environ['MONGO_CONNECTION_STRING']
    mongo_database_name = os.environ['MONGO_DATABASE_NAME']
    mongo_collection_name = os.environ['MONGO_COLLECTION_NAME']

    client = MongoClient(mongo_connection_string)
    db = client[mongo_database_name]
    collection = db[mongo_collection_name]
    
    num_movies = collection.count_documents({})  
    
    with open("README.md", "r") as readme_file:
        readme_content = readme_file.read()

    updated_readme_content = readme_content.replace(
        "**Number of movies currently:** (updated daily)", f"**Number of movies currently:** {num_movies} (updated daily)"
    )

    with open("README.md", "w") as readme_file:
        readme_file.write(updated_readme_content)

    print(f"Number of movies currently: {num_movies}")

if __name__ == "__main__":
    update_readme()
