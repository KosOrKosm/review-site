
// Express server settings
const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()

app.set('port', 3111)
app.use(express.json()) // Allow JSON data
app.use(express.urlencoded( { extended: true } )) // Allow HTML form POST
app.use(cookieParser()) // Handle cookies 
const sessionDuration = 1.8e+6

function hostFile(path, alias) {
    app.get('/' + (alias ? alias : path), function(req, res) { res.sendFile(__dirname + '/' + path) })
}

function hostFolder(folder) {
    app.use(folder, express.static(__dirname + folder + '/'))
}

// Log API calls
app.use(function(req, res, next) {

    if (req.path.startsWith('/api/')) {
        console.log('\nRecieved API request: ' + req.method + ' ' + req.path)
        console.log('\tSESSION: ' + req.cookies.session)
    }

    next()

})

// MongoDB settings
const mongo = require('mongodb')
const MongoClient = mongo.MongoClient
const dbURL = 'mongodb://localhost:27017'

// =================== SESSION MANAGEMENT ===================

let userSessions = []

function deleteSession(id) {
    userSessions = userSessions.filter(function(_session) {
        return id != _session._ID
    })
}

function deleteSessionUser(user) {
    userSessions = userSessions.filter(function(_session) {
        return user !== _session.username
    })
}

function findSession(sessionID) {
    
    if (sessionID == undefined || sessionID == null)
        return undefined

    const session = userSessions.find(function(_session) {
        return sessionID == _session._ID
    })

    if(session == undefined)
        return undefined

    return session
}

function makeSessionTimeout(sessionID) {
    return {
        uid: sessionID,
        timeout: setTimeout(() => {
            console.log('ending session %s due to inactivity', this.uid)
            deleteSession(this.uid)
        }, sessionDuration),
        reset: function () {
            clearTimeout(this.timeout)
            this.timeout = setTimeout(() => {
                console.log('ending session %s due to inactivity', this.uid)
                deleteSession(this.uid)
            }, sessionDuration)
        }
    }
}

function touchSession(sessionID) {

    const session = userSessions.find(function(_session) {
        return sessionID == _session._ID
    })

    if(!session)
        return

    session._timeout.reset()

}

// =================== PUBLIC API ===================

app.post('/api/createAccount', function(req, res) {

    console.log('Trying to create account request for user: ' + req.body.username)

    const user = req.body.username
    const pass = req.body.password

    if(!user || !pass || user.length < 1 || pass.length < 1) {
        res.status(400).send('Please specify both a username and password')
        return
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const coll = db.collection('accounts')
        coll.findOne({
            username: user
        })
        .then(account => {
            if(account) {
                console.log('\tAccount already exists')
                res.status(400).send('User already exists')
                conn.close()
            } else {
                console.log('\tCreating an account for user')
                coll.insertOne({
                    username: user,
                    password: pass
                })
                .then(record => {
                    console.log('\tAccount successfully created')
                    if(req.query.target)
                        res.redirect(req.query.target)
                    else
                        res.status(200).send('Success')
                })
                .catch(err => {
                    console.log('Failed to insert a record: ' + err)
                    res.status(500).send('Internal server error')
                })
                .finally(() => {
                    conn.close()
                })
            }
        })
        .catch(err => {
            console.log('Failed to search for a record: ' + err)
            res.status(500).send('Internal server error')
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

app.post('/api/login', function(req, res) {

    console.log('login request for user: ' + req.body.username)

    const user = req.body.username
    const pass = req.body.password

    // Log out the user if they are already logged in
    deleteSessionUser(user)

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const coll = db.collection('accounts')
        coll.findOne({
            username: user,
            password: pass
        })
        .then(account => {

            if(account) {

                const uid = parseInt(Math.ceil(Math.random() * Date.now()).toPrecision(16).toString().replace(".", ""))
        
                userSessions.push({
                    username: user,
                    userid: account._id,
                    _ID: uid,
                    _timeout: makeSessionTimeout(uid)
                })
            
                console.log('\tLogging in user ' + user + ' as session ' + uid)

                res.cookie('session', uid, { maxAge: sessionDuration })
                touchSession(uid)
                if(req.query.target)
                    res.redirect(req.query.target)
                else
                    res.status(200).send('Success')

            } else
                res.status(400).send('Invalid Credentials')

        })
        .catch(err => {
            console.log('Failed to search for a record: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() => {
            conn.close()
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

app.delete('/api/login', function(req, res) {

    console.log('logout request for session: ' + req.cookies.session)

    if (!req.cookies.session || !findSession(req.cookies.session)) {
        res.status(400).send('Invalid session ID provided')
        return
    }

    console.log('\t logging out session ' + req.cookies.session)
    deleteSession(req.cookies.session)

    res.status(200).send('Success')

})

// =================== PUBLIC ASSETS ===================

// Bare minimum of files needed to render the login screen
hostFile('content/login.html')
hostFile('content/login.js')
hostFile('content.js')
hostFile('style/container.css')
hostFile('style/login.css')
hostFile('index-login.js')

// The login screen
app.get('/login', function(req, res) {
    if (req.cookies.session && findSession(req.cookies.session)) {
        res.redirect('/')
    } else {
        res.sendFile(__dirname + '/index-login.html')
    }
})

// =================== AUTHENTICATION PROTECTED ===================
// All URLS beyond this point are protected by authentication

// Middleware to force authentication
app.use(function(req, res, next) {

    // If session is expired, invalid, or missing, direct to login
    if (!req.cookies.session || !findSession(req.cookies.session)) {
        return res.redirect('/login')
    }

    // Refresh the session
    res.cookie('session', req.cookies.session, { maxAge: sessionDuration })
    touchSession(req.cookies.session)

    next()
})

// ======================= API Urls =======================

/**
 * Checks if the currently logged in user owns a review
 * 
 * USAGE: GET /api/review/isOwner?id=**someID**
 * 
 * PARAMS:
 *      id: ID of the review to check
 */
app.get('/api/review/isOwner', function(req, res) {
    
    const sessionRecord = findSession(req.cookies.session)

    if (!sessionRecord) {
        res.status(403).send('Please log in.')
        return
    }
    
    const filter = { 
        _id: new mongo.ObjectId(req.query.id),
        owner: sessionRecord.userid
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const reviews = db.collection('reviews')
        reviews.find(filter).toArray()
        .then(records => {
            if(records != undefined && records.length != undefined) {
                if(records.length > 0)
                    res.status(200).json({ isOwner: 'true' })
                else
                    res.status(200).json({ isOwner: 'false' })
            } else {
                res.status(400).send('Internal server error')
            }
        })
        .catch(err => {
            console.log('Error while retrieving reviews: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() => {
            conn.close()
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })


})

/**
 * Create a review for a given movie
 * 
 * USAGE: POST /api/review
 *        pass the contents of an HTML form. 
 *        ie. doRequest('POST', '/api/review', formData)
 * 
 * PARAMS:
 *      movie: MongoDB ObjectID corresponding to a movie in the database
 *      score: the review score
 *      text: the review text
 */
app.post('/api/review', function(req, res) {

    const sessionRecord = findSession(req.cookies.session)

    if (!sessionRecord) {
        res.status(403).send('Please log in.')
        return
    }

    const reviewRecord = {
        owner: sessionRecord.userid,
        movie: new mongo.ObjectId(req.body.movie),
        score: req.body.score,
        text: req.body.text
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')

        // Make sure the review is for a valid movie
        const movies = db.collection('movies')
        movies.findOne({
            "_id": reviewRecord.movie
        })
        .then(movie => {

            if (movie == undefined) {
                conn.close()
                res.status(400).send('Review refers to an invalid movie')
            } else {

                const reviews = db.collection('reviews')

                // Prevent duplicate reviews
                reviews.findOne({
                    owner: reviewRecord.owner,
                    movie: reviewRecord.movie
                }).then(similarReview => {

                    if(similarReview) {
                        res.status(400).send('You have already reviewed this movie.')
                        conn.close()
                    } else {

                        // Finally actually insert the record
                        reviews.insertOne(reviewRecord)
                        .then(record => {
                            res.status(200).json(record)
                        })
                        .catch(err => {
                            console.log('Error while creating a review: ' + err)
                            res.status(500).send('Internal server error')
                        })
                        .finally(() =>{
                            conn.close()
                        })

                    }

                })
                .catch(err =>{
                    conn.close()
                    console.log('Error while retrieving reviews: ' + err)
                    res.status(500).send('Internal server error')
                })
            
            }

        })
        .catch(err => {
            conn.close()
            console.log('Error while retrieving movies: ' + err)
            res.status(500).send('Internal server error')
        })

    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

/**
 * Edit a review
 * 
 * USAGE: PUT /api/review?id=**someID**
 *        pass the contents of an HTML form in the body. 
 *        ie. doRequest('PUT', '/api/review?id=**someID**', formData)
 * 
 * PARAMS:
 *      score: the new review score
 *      text: the new review text
 */
app.put('/api/review', function(req, res) {

    const sessionRecord = findSession(req.cookies.session)

    if (!sessionRecord) {
        res.status(403).send('Please log in.')
        return
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const reviews = db.collection('reviews')

        reviews.updateOne({
            owner: sessionRecord.userid,
            _id: new mongo.ObjectId(req.query.id)
        }, {
            $set: {
                score: req.body.score,
                text: req.body.text
            }
        })
        .then(record => {
            if(record && record.modifiedCount > 0)
                res.status(200).json(record)
            else
                res.status(400).send('No such review found')
        })
        .catch(err => {
            console.log('Error while searching for review: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() => {
            conn.close()
        })

    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

/**
 * Deletes a review
 * 
 * USAGE: DELETE /api/review?id=**someID**
 * 
 */
app.delete('/api/review', function(req, res) {

    const sessionRecord = findSession(req.cookies.session)

    if (!sessionRecord) {
        res.status(403).send('Please log in.')
        return
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const reviews = db.collection('reviews')

        reviews.findOneAndDelete({
            owner: sessionRecord.userid,
            "_id": new mongo.ObjectId(req.query.id)
        })
        .then(result => {
            if(result.value)
                res.status(200).send("Success")
            else
                res.status(400).send("No such review found")
        })
        .catch(err => {
            console.log('Error while trying to find and delete a review: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() => {
            conn.close()
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

/**
 * Gets reviews associated to the current user's account,
 * or gets any review given its ID.
 * 
 * USAGE: GET /api/review
 *              OR
 *        GET /api/review?id=**someID**
 * 
 * PARAMS:
 *      id: ID of review to return (optional)
 * 
 */
app.get('/api/review', function(req, res) {

    const sessionRecord = findSession(req.cookies.session)

    if (!sessionRecord) {
        res.status(403).send('Please log in.')
        return
    }

    const filter = { }

    if (req.query.id)
        filter._id = new mongo.ObjectId(req.query.id)
    else {
        filter.owner =  sessionRecord.userid
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const reviews = db.collection('reviews')
        reviews.find(filter).toArray()
        .then(records => {
            res.status(200).json({
                reviews: records
            })
        })
        .catch(err => {
            console.log('Error while retrieving reviews: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() => {
            conn.close()
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

/**
 * Create a review a movie. Only the user named "admin" can do this.
 * 
 * USAGE: POST /api/movie
 *        pass the contents of an HTML form. 
 *        ie. doRequest('POST', '/api/review', formData)
 * 
 * PARAMS:
 *      name: the name of the movie being created
 */
app.post('/api/movie', function(req, res) {

    const sessionRecord = findSession(req.cookies.session)

    if (!sessionRecord) {
        res.status(403).send('Please log in.')
        return
    } else if (sessionRecord.username !== "admin") {
        res.status(403).send('Admins only.')
        return
    }

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const movies = db.collection('movies')
        movies.insertOne({
            name: req.body.name
        })
        .then(record => {
            res.status(200).json(record)
        })
        .catch(err => {
            console.log('Error while creating a movie: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() =>{
            conn.close()
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

/**
 * Get a movie, given its name or ID
 * 
 * USAGE: GET /api/movie?id=**someID**
 *                OR
 *        GET /api/movie?name=**someName**
 * 
 * PARAMS:
 *      name: name of movie to return
 *              OR
 *      id: ID of movie to return
 */
app.get('/api/movie', function(req, res) {

    const filter = { }

    if (req.query.id)
        try {
            filter._id = new mongo.ObjectId(req.query.id)
        } catch (excp) {
            filter._id = req.query.id
        }

    if (req.query.name)
        filter.name = req.query.name

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const movies = db.collection('movies')
        movies.find(filter).toArray()
        .then(records => {
            res.status(200).json({
                movies: records
            })
        })
        .catch(err => {
            console.log('Couldn\'t connect to server: ' + err)
            res.status(500).send('Internal server error')
        })
        .finally(() => {
            conn.close()
        })
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

/**
 * Gets reviews associated to a given movie.
 * 
 * USAGE: GET /api/movie/reviews?id=**someID**
 *                OR
 *        GET /api/movie/reviews?name=**someName**
 * 
 * PARAMS:
 *      name: name of movie to find reviews for
 *              OR
 *      id: ID of movie to find reviews for
 * 
 */
app.get('/api/movie/reviews', function(req, res) {

    const filter = { }

    if (req.query.id)
        filter._id = new mongo.ObjectId(req.query.id)

    if (req.query.name)
        filter.name = req.query.name

    MongoClient.connect(dbURL)
    .then(conn => {
        const db = conn.db('jnf-review')
        const movies = db.collection('movies')

        movies.find(filter).toArray()
        .then(movies => {

            if (movies.length > 1) {
                conn.close()
                res.status(400).send('Query parameters too vague: '
                    + 'there are multiple movies meeting the criteria!')
            } else if (movies.length < 1) {
                conn.close()
                res.status(400).send('No such movie found')
            } else {

                const movie = movies[0]
                const reviews = db.collection('reviews')
                reviews.find({
                    movie: movie._id
                }).toArray()
                .then(results => {
                    res.status(200).json({
                        reviews: results
                    })
                })
                .catch(err => {
                    console.log('Error while retrieving reviews: ' + err)
                    res.status(500).send('Internal server error')
                })
                .finally(() => {
                    conn.close()
                })

            }

        }).catch(err => {
            conn.close()
            console.log('Error while retrieving movies: ' + err)
            res.status(500).send('Internal server error')
        })
        
    })
    .catch(err => {
        console.log('Couldn\'t connect to server: ' + err)
        res.status(500).send('Internal server error')
    })

})

// Front-end URLs
hostFolder('/style')
hostFolder('/content')
hostFolder('/templates')
hostFile('index.js')
app.get('/', function(req, res) { res.sendFile(__dirname + '/index.html') })

function sample(items) {
    return items[Math.floor(Math.random()*items.length)]
}

async function loadTestData() {

    const conn = await MongoClient.connect(dbURL)
    const db = conn.db('jnf-review')
    const movies = db.collection('movies')
    const reviews = db.collection('reviews')
    const accounts = db.collection('accounts')

    console.log('Dropping old tables')

    // Drop old tables
    await movies.drop().catch(err => {})
    await reviews.drop().catch(err => {})
    await accounts.drop().catch(err => {})

    console.log('Creating test accounts')

    adminAccount = (await accounts.insertOne({
        username: "admin",
        password: "admin"
    })).insertedId

    reviewerAccount = (await accounts.insertOne({
        username: "reviewer",
        password: "reviewer"
    })).insertedId

    console.log('Creating test movies')

    test_movies = [{
        name: "Test Movie 1",
        desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    },{
        name: "Test Movie 2",
        desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    },{
        name: "Test Movie 3",
        desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    }]
    
    await movies.insertMany(test_movies)

    console.log('Creating test reviews')

    test_reviews = await reviews.insertMany([{
        owner: reviewerAccount,
        movie: sample(test_movies)._id,
        score: Math.round(Math.random()*10),
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    },{
        owner: reviewerAccount,
        movie: sample(test_movies)._id,
        score: Math.round(Math.random()*10),
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    },{
        owner: reviewerAccount,
        movie: sample(test_movies)._id,
        score: Math.round(Math.random()*10),
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    },{
        owner: reviewerAccount,
        movie: sample(test_movies)._id,
        score: Math.round(Math.random()*10),
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu elementum est. Vivamus sed ex quis orci viverra pharetra at ac velit. Morbi suscipit accumsan turpis, eget interdum sem finibus nec. Proin pharetra nulla eget efficitur tristique. Suspendisse sapien dolor, egestas vitae porttitor sed, hendrerit vitae nibh. Pellentesque nec ipsum ut ligula aliquet condimentum. Quisque ut fermentum massa. Donec imperdiet, risus vel fermentum venenatis, dui libero finibus ipsum, eget faucibus eros nisl at libero. Nunc sodales scelerisque sem non accumsan. Curabitur a porttitor nisl."
    }])

    conn.close()

}

app.listen(app.get('port'), function() {
    console.log('Express server active on port %d', app.get('port'))
    console.log('Visit http://localhost:%d', app.get('port'))

    // Load some dummy movies and reviews for testing purposes
    loadTestData()

})