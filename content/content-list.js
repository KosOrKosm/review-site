document.getElementById('btn-return-home').addEventListener('click', function(ev) {
    ev.preventDefault()
    loadContent('content/home.html', ['content/home.js'])
})

function setContentListContent(html) {
    document.getElementById('content-list').innerHTML = html
}


async function buildList(templatePath, data, forEachGenerated) {

    // Load the template and build it
    const template = Handlebars.compile(await doRequest('GET', templatePath))
    const finalHTML = template(data)
    setContentListContent(finalHTML)

    // Iterate over the generated elements
    const children = document.getElementById('content-list').children
    for(let i = 0; i < children.length; ++i) {
        let child = children[i]
        if(child.tagName === "DIV")
            forEachGenerated(child)
    }

}