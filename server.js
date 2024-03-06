const express = require("express");
const path = require('path');
const traceroute = require("traceroute");
const app = express();
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,"public")));
app.use('/build/',express.static(path.join(__dirname,"node_modules/three/build")));
app.use('/controls/',express.static(path.join(__dirname,"node_modules/three/examples/jsm/controls")));

app.get('/', (req, res) => {
    traceroute.trace('www.twitter.com', function(err,hops) {
        if (!err) {
            //console.log(hops);
            hops = hops.slice(3)
            for(x in hops){
                hops[x] = hops[x].slice(32);
                hops[x] = hops[x].slice(0,-2);
            }
            //console.log(hops);
            var results = { results: hops ? hops : null };
            res.render('index.ejs', results);
        } else {
            console.log("trace route error");
            res.send("trace route error");
        }

    });
    
})



app.listen(5000);