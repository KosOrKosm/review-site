
async function loadReviewList() {

    // Load the template and reviews
    const templateSource = await doRequest('GET', 'templates/review-short-summary.html')
    const data = JSON.parse(await doRequest('GET', '/api/review'))

    // Load movie names into reviews
    for (let review of data.reviews) {
        const movieData = JSON.parse(await doRequest('GET', '/api/movie?id=' + review.movie))
        review.movieName = movieData.name
    }

    // Build the HTML from the template + review data and load it
    const template = Handlebars.compile(templateSource)
    const finalHTML = template(data)
    setContentListContent(finalHTML)

    // Attach button listeners to each review
    for (let review of document.getElementsByClassName('review-short-summary')) {

        let viewReviewBtn = review.getElementsByClassName('btn-view-full')[0]
        let viewMovieBtn = review.getElementsByClassName('btn-view-movie')[0]

        viewReviewBtn.addEventListener('click', function(ev) {
            ev.preventDefault()

            // The reviewID is stored in the button's href attribute
            const reviewID = ev.target.getAttribute('href')
            console.log(reviewID)

            // TODO: load content

        })

        viewMovieBtn.addEventListener('click', function(ev) {
            ev.preventDefault()

            // The movieID is stored in the button's href attribute
            const movieID = ev.target.getAttribute('href')
            console.log(movieID)

            // TODO: load content

        })

    }

}

loadReviewList()
