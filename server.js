const express = require("express");
const path = require('path');
const traceroute = require("nodejs-traceroute");
const socketIo = require('socket.io');
const http = require('http');
const { type } = require("os");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const counterFilePath = './counter.txt';

let counter = 0;

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,"public")));
app.use('/build/',express.static(path.join(__dirname,"node_modules/three/build")));
app.use('/controls/',express.static(path.join(__dirname,"node_modules/three/examples/jsm/controls")));

app.get('/', (req, res) => {
    res.render('index.ejs');
})

var tracer;

// problem:
// ips in the server code are obviously generated in order, but they are emitted
// over the socket to the client who is responsible for calling the API which gives them
// the API key, and also allows the possibility of them rendering the ips in the wrong
// order. also some browsers/plugins prevent the client from making the API call
// fix: 
// as we get each IP, call the geolocating API from the server then simply pass
// the lat/lng to the client so they can render

// Read the counter from the file when the server starts

fs.readFile(counterFilePath, 'utf8', (err, data) => {
    if (!err && !isNaN(parseInt(data, 10))) {
        counter = parseInt(data, 10);
    }
});

const API_KEY = "bd89924fb0004515ad776b73189bc523";

io.on('connection', (socket)  => {
    console.log('A user connected');
    socket.emit('counterUpdate', counter);

    socket.on('formSubmit', (data) => {
        console.log("starting traceroute: ")
        try {
            let timed_out = 0;
            let ID = Math.random();
            socket.emit('newTraceroute', {id: ID});
            tracer = new traceroute();
            tracer
                .on('pid', (pid) => {
                    console.log(`pid: ${pid}`);
                    counter += 1;
                    io.emit('counterUpdate', counter);
                })
                .on('destination', (destination) => {
                    console.log(`destination: ${destination}`);
                })
                .on('hop', async (hop) => {
                    console.log(`hop: ${JSON.stringify(hop)}`);

                    // if hop.ip is valid
                    if(hop.ip !== '*' && hop.ip !== '' && hop.ip !== 'Request timed out.' && hop.ip !== '192.168.0.1'){
                        let url = "https://api.ipgeolocation.io/ipgeo?apiKey=" + API_KEY + "&ip=" + hop.ip;
                        await fetch(url)
                            .then(r => r.json())
                            .then(r => {
                                //console.log(r)
                                let lat = parseInt(r.latitude);
                                let lng = parseInt(r.longitude);
                                console.log(lat + " " + lng + " " + r.city + " " + r.country_name);
                                socket.emit('newTracerouteHop', {lat: lat, lng: lng, id: ID, hop: hop.hop})
                        })
                        //socket.emit('newTracerouteHop', hop.ip);
                    // else hop.ip is invalid
                    } else {

                    }
                })
                .on('close', (code) => {
                    console.log(`close: code ${code}`);
                });
            
            tracer.trace(data.domain);
        } catch (err) {
            console.log("trace route error");
            console.log(err);
        }
    })

    socket.on('disconnect', () => {
        console.log("a user disconnected");
    })

})

function shutdown() {
    console.log("Shutting down...");
    fs.writeFileSync(counterFilePath, counter.toString(), (err) => {
        if (err) console.error("Error saving counter: ", err);
    });
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception: ', err);
    shutdown();
})


server.listen(5000, () => {
    console.log("listening on port 5000");
});