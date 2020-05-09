

// express
const fs = require('fs').promises
const fsOriginal = require('fs')
const path = require('path')

const ncp = require('ncp').ncp;
const express = require('express')
const bodyParser = require('body-parser')
const CleanCSS = require('clean-css')

const blog = require('./render/blog.html')

const app = express()
app.use(express.static('dist', { extensions: [ 'html' ] }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use((req, res) => res.status(404).sendFile(path.resolve(__dirname, '../dist/404.html')))

const PORT = process.env.PORT || 3000

const ncpPromise = (from, to, options = {}) => new Promise(res => ncp(from, to, options, res)); 


Promise.resolve()
    .then(() => fs.mkdir('./dist',      { recursive: true }))                      // make sure dirs exist
    .then(() => fs.mkdir('./dist/blog', { recursive: true }))
    .then(() => ncpPromise('./src/static', './dist'))                              // copy statics
    .then(() => {                                                                  // bundle and minify CSS
        const bundleName = '_all.css';
        let allCSS = ``;

        ['article.css', 'base.css', 'utils.css', 'variables.css', 'fragments/bio.css', 
         'fragments/home-link.css', 'fragments/icons.css', 
         'fragments/post-preview.css', 'fragments/prism.css', 'pages/about.css',
         'pages/index.css'].forEach(file => {
            if(file !== bundleName) {
                const fullPath = path.resolve(`./dist/css`, file);
                allCSS += fsOriginal.readFileSync(fullPath);
            }
        })

        fsOriginal.rmdirSync(`./dist/css`, { recursive: true });
        fsOriginal.mkdirSync(`./dist/css`);

        allCSS = new CleanCSS({}).minify(allCSS).styles;

        return fs.writeFile(path.resolve(`./dist/css`, bundleName), allCSS);
    })
    .then(() => Promise.all(                                                       // generate plain pages
        [ '404', 'about', 'contact', 'index' ].map(pageName =>
            require(`./render/${pageName}.html.js`)()
                .then(html => fs.writeFile(`./dist/${pageName}.html`, html)))))
    .then(() =>                                                                    // generate blog pages
        fs.readdir(`./src/blog`).then(files => Promise.all(
            files
                .filter(fileName => fileName.includes('.md'))
                .map(file => file.substr(0, file.length - 3))
                .map(post => 
                    blog(post)
                        .then(html => fs.writeFile(`./dist/blog/${post}.html`, html))))))
    .then(() =>                                                                    // start server
        app.listen(PORT, () => console.log(`Website listening on port ${PORT}!`)))

/*
.catch(err => {
    console.error(err)
    res.status(500).send(err)
}))

app.post('/contact', (req, res) => 
    res.send(req.body))
*/

