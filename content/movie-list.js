
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
                console.log(movieID)

                // TODO: load content

            })

    })

}

loadMovieList()
