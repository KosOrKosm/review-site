
async function loadMovieList() {

    // Get movies
    const movies = JSON.parse(await doRequest('GET', '/api/movie'))

    // Generate HTML list from template
    buildList(
        'templates/movie.handlebars',
        movies,
        movie => {

            let createReviewBtn = movie.getElementsByClassName('btn-review-this')[0]
            let viewReviewsBtn = movie.getElementsByClassName('btn-view-reviews')[0]

            createReviewBtn.addEventListener('click', function(ev) {
                
                ev.preventDefault()

                // The movieID is stored in the button's href attribute
                const movieID = ev.target.getAttribute('href')
                window.reviewIDtoLoad = undefined
                window.movieIDtoLoad = movieID

                // Load the appropriate HTML+scripts for the full review UI
                loadContent(undefined, [
                    'content/full-review.js'
                ])

            })

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
