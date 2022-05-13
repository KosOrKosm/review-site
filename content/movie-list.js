
async function loadMovieList() {

    // Get movies
    const movies = JSON.parse(await doRequest('GET', '/api/movie'))

    // Generate HTML list from template
    buildList(
        'templates/movie.handlebars',
        movies,
        movie => {

            let viewReviewsBtn = movie.getElementsByClassName('btn-view-reviews')[0]

            viewReviewsBtn.addEventListener('click', function(ev) {
                ev.preventDefault()

                // The movieID is stored in the button's href attribute
                const movieID = ev.target.getAttribute('href')
                window.movieIDToShow = movieID

                // Load the appropriate HTML+scripts for the movie-review-list
                loadContent('content/content-list.html', [
                    'content/content-list.js', 
                    'content/movie-review-list.js'
                ])

            })

    })

}

loadMovieList()
