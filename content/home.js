document.getElementById('show-reviews').addEventListener('click', function(ev) {
    ev.preventDefault()
    loadContent('content/content-list.html', [
        'content/content-list.js', 
        'content/user-review-list.js'
    ])
})
document.getElementById('show-movies').addEventListener('click', function(ev) {
    ev.preventDefault()
    loadContent('content/content-list.html', [
        'content/content-list.js', 
        'content/movie-list.js'
    ])
})
document.getElementById('logout').addEventListener('click', function(ev) {
    doRequest('DELETE', '/api/login').then(function(response) {
        window.location.replace('/login')
    })
})