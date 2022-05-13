
async function loadReviewList() {

    // Get reviews
    const data = JSON.parse(await doRequest('GET', '/api/review'))

    // Load movie names into reviews
    for(let review of data.reviews) {
        const movieData = JSON.parse(await doRequest('GET', `/api/movie?id=${review.movie}`))
        review.movieName = movieData.movies[0].name
    }

    // Generate HTML list from template
    buildList(
        'templates/review.handlebars',
        data,
        review => {

            let viewReviewBtn = review.getElementsByClassName('btn-view-full')[0]
            let viewMovieBtn = review.getElementsByClassName('btn-view-movie')[0]

            viewReviewBtn.addEventListener('click', function(ev) {
                ev.preventDefault()

                // The reviewID is stored in the button's href attribute
                const reviewID = ev.target.getAttribute('href')
                window.reviewIDtoLoad = reviewID

                // Load the appropriate HTML+scripts for the full review UI
                loadContent(undefined, [
                    'content/full-review.js'
                ])

            })

            viewMovieBtn.addEventListener('click', function(ev) {
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

loadReviewList()
