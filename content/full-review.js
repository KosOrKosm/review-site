
currentEditCallback = ev => ev.preventDefault()
currentSubmitCallback = ev => ev.preventDefault()
currentCancelCallback = ev => ev.preventDefault()

async function loadFullReview(reviewID) {

    let review = undefined
    let createNew = false

    // Load the given review
    if (reviewID) {

        // Get review
        const data = JSON.parse(await doRequest('GET', `/api/review?id=${reviewID}`))
        review = data.reviews[0]
    
        // Get movie
        const movies = JSON.parse(await doRequest('GET', `/api/movie?id=${review.movie}`))
        const movie = movies.movies[0]
    
        review.movieName = movie.name

    } else {

        // Get movie
        const movies = JSON.parse(await doRequest('GET', `/api/movie?id=${window.movieIDtoLoad}`))
        const movie = movies.movies[0]

        // Construct blank review
        review = { 
            _id: 0,
            score: 10,
            text: '',
            movie: movie._id,
            movieName: movie.name
        }

        createNew = true

    }

    // Load full review template and frame
    const template = Handlebars.compile(await doRequest('GET', 'templates/full-review.handlebars'))
    content.innerHTML = template(review)

    let editing = false

    // Hide edit button if this account doesn't own this review
    if (createNew) {
        document.getElementById('btn-edit-review').style.display = 'none'
        editing = true
    } else {
        const owns = JSON.parse(await doRequest('GET', `/api/review/isOwner?id=${reviewID}`)).isOwner == 'true'
        if (!owns)
            document.getElementById('btn-edit-review').style.display = 'none'
    }

    // Load the initial, non-editing mode UI
    updateFullReviewUI(editing, createNew)

}

function updateFullReviewUI(editing, createNew) {

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

        if (createNew) {

            // Create new review callback
            currentSubmitCallback = (ev) => {
                ev.preventDefault()
    
                // post review
                doRequest('POST', '/api/review',
                    `movie=${ev.target.getAttribute('href')}&` +
                    `score=${document.getElementById('score').value}&` +
                    `text=${document.getElementById('review-text').value}`
                ).then(response => {

                    // Try to parse the response
                    response = JSON.parse(response)
                    if (response.acknowledged) {

                        // Success!
                        // Load the ID of the newly created review and go to edit mode
                        document.getElementById('btn-edit-review').setAttribute('href', response.insertedId)
                        document.getElementById('btn-edit-review').style.display = 'flex'
                        updateFullReviewUI(false, false)

                    } else {
                        // Huh... something went wrong.
                        alert('Failed to post your review due to an internal server error. Please try again later.')
                    }

                })
                .catch(err => {
                    // Database is probably down.
                    alert('Failed to post your review due to an internal server error. Please try again later.')
                })

            }

            // Return to home callback
            currentCancelCallback = (ev) => {
                ev.preventDefault()
    
                // Reloading the window to return to home
                window.location.reload()
            }

        } else {

            // Modify existing review callback
            currentSubmitCallback = (ev) => {
                ev.preventDefault()
    
                // update review
                doRequest('PUT', `/api/review?id=${document.getElementById('btn-edit-review').getAttribute('href')}`, 
                    `score=${document.getElementById('score').value}&text=${document.getElementById('review-text').value}`
                )
    
                updateFullReviewUI(false, false)
            }
            
            currentCancelCallback = (ev) => {
                ev.preventDefault()

                // restore old values
                doRequest('GET', `/api/review?id=${document.getElementById('btn-edit-review').getAttribute('href')}`)
                .then(data => {
                    const review = JSON.parse(data).reviews[0]
                    document.getElementById('score').value = review.score
                    document.getElementById('review-text').value = review.text
                })
                .catch(err => {

                })

                updateFullReviewUI(false, false)
            }

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

        // Begin editing callback
        currentEditCallback = (ev) => {
            ev.preventDefault()

            updateFullReviewUI(true, false)
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