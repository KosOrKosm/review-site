
async function loadFullReview(reviewID) {

    // Get review
    const data = JSON.parse(await doRequest('GET', `/api/review?id=${reviewID}`))
    const review = data.reviews[0]

    console.log(data)

    // Get movie
    const movies = JSON.parse(await doRequest('GET', `/api/movie?id=${review.movie}`))
    const movie = movies.movies[0]

    review.movieName = movie.name

    // Load full review template and frame
    const template = Handlebars.compile(await doRequest('GET', 'templates/full-review.handlebars'))
    content.innerHTML = template(review)

}

loadFullReview(window.reviewIDtoLoad)