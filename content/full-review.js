
let editing = false
let currentEditCallback = ev => ev.preventDefault()
let currentSubmitCallback = ev => ev.preventDefault()
let currentCancelCallback = ev => ev.preventDefault()

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

    // Load the initial, non-editing mode UI
    updateFullReviewUI(reviewID)

}

function updateFullReviewUI(reviewID) {

    const editBtn = document.getElementById('btn-edit-review')
    const submitBtn = document.getElementById('btn-view-movie')
    const cancelBtn = document.getElementById('btn-home')
    const score = document.getElementById('score')
    const text = document.getElementById('review-text')

    // Remove old callbacks
    editBtn.removeEventListener('click', currentEditCallback)
    submitBtn.removeEventListener('click', currentSubmitCallback)
    cancelBtn.removeEventListener('click', currentCancelCallback)

    // Update buttons to reflect current mode
    if (editing) {

        console.log('switching to editing mode!')

        // Disable readonly
        score.readOnly = false
        text.readOnly = false

        // Update labels on buttons
        editBtn.innerHTML = 'DEL'
        submitBtn.innerHTML = 'Submit'
        cancelBtn.innerHTML = 'Cancel'

        currentEditCallback = (ev) => {
            ev.preventDefault()

            // delete review
            doRequest('DELETE', `/api/review?id=${ev.target.getAttribute('href')}`)

            // Return to home
            window.location.reload()
        } 

        currentSubmitCallback = (ev) => {
            ev.preventDefault()

            // update review
            doRequest('PUT', `/api/review?id=${document.getElementById('btn-edit-review').getAttribute('href')}`, 
                `score=${document.getElementById('score').value}&text=${document.getElementById('review-text').value}`
            )

            editing = false
            updateFullReviewUI(document.getElementById('btn-edit-review').getAttribute('href'))
        }

        currentCancelCallback = (ev) => {
            ev.preventDefault()

            editing = false
            updateFullReviewUI(document.getElementById('btn-edit-review').getAttribute('href'))
        }

        editBtn.addEventListener('click', currentEditCallback)
        submitBtn.addEventListener('click', currentSubmitCallback)
        cancelBtn.addEventListener('click', currentCancelCallback)

    } else {

        // Enable readonly
        score.readOnly = true
        text.readOnly = true

        // Update labels on buttons
        editBtn.innerHTML = 'EDIT'
        submitBtn.innerHTML = 'View All Reviews for this Movie'
        cancelBtn.innerHTML = 'Return to Home'

        console.log('switching to viewing mode!')

        // Begin editing callback
        currentEditCallback = (ev) => {
            ev.preventDefault()

            editing = true
            updateFullReviewUI(ev.target.getAttribute('href'))
        } 

        // View all review movies callback
        currentSubmitCallback = (ev) => {
            ev.preventDefault()
        
            // Retrieve the movie ID from the button's href
            const movieID = ev.target.getAttribute('href')
            window.movieIDToShow = movieID
    
            // Load the appropriate HTML+scripts for the movie-review-list
            loadContent('content/content-list.html', [
                'content/content-list.js', 
                'content/movie-review-list.js'
            ])

        }

        // Return to home callback
        currentCancelCallback = (ev) => {
            ev.preventDefault()

            // Reloading the window to return to home
            window.location.reload()
        }

        editBtn.addEventListener('click', currentEditCallback)
        submitBtn.addEventListener('click', currentSubmitCallback)
        cancelBtn.addEventListener('click', currentCancelCallback)

    }
}

loadFullReview(window.reviewIDtoLoad)