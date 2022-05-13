
async function loadMovieReviewList(movieID) {

    // Get reviews
    const movies = JSON.parse(await doRequest('GET', `/api/movie?id=${movieID}`))
    const data = JSON.parse(await doRequest('GET', `/api/movie/reviews?id=${movieID}`))

    // Load movie template and frame
    const movieTemplate = Handlebars.compile(await doRequest('GET', 'templates/movie.handlebars'))
    setContentListLeftContent(movieTemplate(movies))

    // Change movie template layout to columns
    const movieTemplateResult = document.getElementsByClassName('movie')[0]
    movieTemplateResult.className = movieTemplateResult.className.replace('vert-group', 'group')

    // Remove useless button from template
    movieTemplateResult.getElementsByClassName('btn-view-reviews')[0].remove()

    // Load movie names into reviews
    const movie = movies.movies[0]
    for(let review of data.reviews) {
        review.movieName = movie.name
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
                console.log(reviewID)

                // TODO: load content

            })

            viewReviewBtn.style.width = '100%'
            viewMovieBtn.remove()

    })

}

loadMovieReviewList(window.movieIDToShow)