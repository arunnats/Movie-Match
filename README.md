# Movie-Match: Revolutionizing Your Movie-Watching Experience

Welcome to Movie-Match, the ultimate platform reshaping the landscape of movie discovery. Movie-Match leverages cutting-edge technology, an extensive movie database, advanced AI capabilities, and seamless search features to deliver a personalized and streamlined cinematic experience for users.

<img width="950" alt="Screenshot 2024-02-05 160511" src="https://github.com/arunnats/movie-match/assets/118368673/d99d002d-6178-479d-9c62-88c56137ba3b">

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation and Usage](#installation-and-usage)
  - [Deployment](#deployment)
  - [Database functions](#database-functions)
- [Authors](#authors)

<a name="description"></a>
## Description
### Extensive Movie Database
Movie-Match boasts an extensive  movie database, housing a vast collection of films from various genres, languages, and eras. The database is updated daily using a python script and gets the daily dataset released by IMDB, uses api calls to OMDB and TMDB (movie data aggregaion sites) and updates the MongoDB database everyday. Thus, the database has the potential to host every single movie present on IMDB. The database hosts, all the details of the movie, the posters and the streaming service information.


(As of 05-02-2024 - Databse has data from 1975 to mid 2010s)

Number of movies currently: 211,555.

### Advanced AI Recommendations
Unleashing the power of OpenAI's GPT-4-turbo, Movie-Match offers an  AI recommendation engine. This system analyzes user preferences and deliver tailor-made movie suggestions. Experience a new era of personalized content curation, ensuring every film recommendation resonates with your unique taste.

<img width="952" alt="Screenshot 2024-02-05 161410" src="https://github.com/arunnats/movie-match/assets/118368673/d761e74b-d638-4365-9982-c29473e23020">
(Search)

<img width="951" alt="Screenshot 2024-02-05 163912" src="https://github.com/arunnats/movie-match/assets/118368673/4cc879e6-bf09-4bb8-aaaf-2580ea6484fc">
(Results)

### Intuitive Search Functionality
Navigating the extensive cinematic landscape is simplified with Movie-Match's intuitive search functionality. Users can effortlessly explore movies, whether searching by genre, language, or release year. Our platform empowers users to effortlessly identify the perfect movie for any mood. Using our advanced search function the user can choose movies based on all parameters and the resutls are returned taking the weighted average of their IMDB and RT ratings.

<img width="960" alt="Screenshot 2024-02-05 160550" src="https://github.com/arunnats/movie-match/assets/118368673/d5b0bd34-a9d0-45ad-a120-54efe3090a23">

### Regular Database Updates
Our commitment to providing up-to-date movie data remains steadfast. Daily updates, facilitated by a Python script, ensure that Movie-Match's database reflects the dynamic changes in the film industry.

<img width="758" alt="Screenshot 2024-02-05 163435" src="https://github.com/arunnats/movie-match/assets/118368673/4505bfd3-9089-4bf8-866c-4ed4690cf267">

### Sorting based on Genre and Streaming servive 
Our code randomizes the top 200 movies in each Genre and Streaming Service so you can get a new pick every single day! 

<img width="951" alt="Screenshot 2024-02-05 163235" src="https://github.com/arunnats/movie-match/assets/118368673/87e345c4-11f1-44be-889b-4187657fb33e">

<img width="959" alt="Screenshot 2024-02-05 163246" src="https://github.com/arunnats/movie-match/assets/118368673/463da9a1-d7c0-4c71-8a92-91f850db0487">


### Movie Info pages
Each movie has its own info page with all the details, a review carousel, buttons redirecting them to their IMDB page, information about the streaming service and the intricate details of hte movie found from IMDB, TMDB and OMDB. 

<img width="951" alt="Screenshot 2024-02-05 163615" src="https://github.com/arunnats/movie-match/assets/118368673/5043e499-98a8-4dec-ad2d-194968b09981">

<a name="features"></a>
## Features

- Extensive movie database spanning various genres, languages and OTTs
- AI recommendation engine powered by OpenAI's GPT-4-turbo
- Daily updates to the movie database to reflect the latest information using python scripts
- Light/dark mode toggle for personalized viewing preferences
- Preview for a quick glimpse of movie details
- In depth list of all movie details for a particular movie
- IMDB and Rotten Tomatoes ratings
- Sorting based on OTT and filtering family friendly content
- Sorted and randomized movies based on genre and streaming service, which are sorted by a - weighted average of RT and IMDB scores
- Movie information page with all details about each movie
## Tech Stack

- Database: MongoDB
- Backend: Javascript, Python
- Framworks: NodeJS, FuseJS
- AI Engine: OpenAI's GPT-4-turbo
- API Integration: IMDB, OMDB, TMDB

<a name="installation-and-usage"></a>
## Installation and Usage

<a name="deployment"></a>
### Deployment

- Install Nodemon/Node

- Clone the repository
```bash
  git clone https://github.com/arunnats/movie-match
```

- Install NodeJs packages
```bash
  npm i mongodb openai crypto express express--session fuse.js 
```

- Navigate to the Web App location
```bash
cd web-app
```

- Create a config.json with your OpenAI key and MongoDB collection information
```bash
  {
	"mongo_connection_string": <Your MongoDB connection string>,
	"mongo_database_name": "Your MongoDB database name",
	"mongo_collection_name": "Your MongoDB collection name",
	"openai_key": "Your OpenAi key"
}
```
(We have not provided the database key due to security risks, please contact for acces)

- Run app
```bash
node app.js
```

<a name="database-functions"></a>
### Database functions

- Navigate to the Database Scripts location
```bash
cd database-updation
```

- Create a dbConfig.json with your TMDB, OMDB keys and MongoDB collection information
```bash
  {
	"mongo_connection_string": <Your MongoDB connection string>,
	"mongo_database_name": "Your MongoDB database name",
	"mongo_collection_name": "Your MongoDB collection name",
	"omdb_api_key": "Your OMDB key",
	"tmdb_api_key": "Your TMDB key"
}
```

- You can now run the various python scripts after installing the dependencies 

```bash
    pip3 i pymongo
    py <nameofscript>.py
```

<a name="authors"></a>
## Authors

- [@arunnats](https://www.arunnats.com/)
- [@Hafeez-hm](https://github.com/Hafeez-hm)



[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

