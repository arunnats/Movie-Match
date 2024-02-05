from pymongo import MongoClient

def update_readme():
    client = MongoClient(os.environ['MONGO_CONNECTION_STRING'])
    db = client[os.environ['MONGO_DATABASE_NAME']]
    collection = db[os.environ['MONGO_COLLECTION_NAME']]
    
    num_movies = collection.count_documents({})  
    
\    with open("README.md", "r") as readme_file:
        readme_content = readme_file.read()

    updated_readme_content = readme_content.replace(
        "Number of Movies: X", f"Number of Movies: {num_movies}"
    )

    with open("README.md", "w") as readme_file:
        readme_file.write(updated_readme_content)

if __name__ == "__main__":
    update_readme()
