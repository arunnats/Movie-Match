import requests
import gzip
from io import BytesIO

# Step 1: Download IMDb Dataset
url = "https://datasets.imdbws.com/title.basics.tsv.gz"
response = requests.get(url)

# Check if the request was successful (status code 200)
if response.status_code == 200:
    # Step 2: Extract the compressed TSV file
    with gzip.open(BytesIO(response.content), 'rt', encoding='utf-8') as file:
        # Now 'file' contains the content of the extracted TSV file
        # You can perform further processing with 'file' as needed
        print("File downloaded and extracted successfully.")

else:
    print("Failed to download the file. Check the URL or try again later.")
