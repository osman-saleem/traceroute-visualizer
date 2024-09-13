const express = require("express");
const path = require('path');

//const traceroute = require("traceroute");
const traceroute = require("nodejs-traceroute");

const socketIo = require('socket.io');
const http = require('http');
const { type } = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,"public")));
app.use('/build/',express.static(path.join(__dirname,"node_modules/three/build")));
app.use('/controls/',express.static(path.join(__dirname,"node_modules/three/examples/jsm/controls")));

app.get('/', (req, res) => {
    res.render('index.ejs');
})


io.on('connection', (socket)  => {
    console.log('A user connected');



    // socket.on('formSubmit', (data) => {
    //     console.log("starting traceroute: ")
    //     traceroute.trace(data.domain, function(err,hops) {
    //         if (!err) {
    //             console.log("ending traceroute")
    //             //hops = hops.slice(3)
    //             for(x in hops){
    //                 hops[x] = hops[x].slice(32);
    //                 hops[x] = hops[x].slice(0,-2);
    //             }
    //             console.log(hops)
    //             hops = hops.filter(hop => hop !== '' && hop !== 'Request timed out' && hop !== '192.168.0.1');
                
    //             var results = { results: hops ? hops : null };
    //             console.log(results)
    //             socket.emit('tracerouteData', results);
    //         } else {
    //             console.log("trace route error");
    //             console.log(err);
    //         }
    
    //     });
    // })

    socket.on('formSubmit', (data) => {
        console.log("starting traceroute: ")
        try {
            var hops = []
            const tracer = new traceroute();
            tracer
                .on('pid', (pid) => {
                    console.log(`pid: ${pid}`);
                })
                .on('destination', (destination) => {
                    console.log(`destination: ${destination}`);
                })
                .on('hop', (hop) => {
                    console.log(`hop: ${JSON.stringify(hop)}`);
                    console.log(hops)
                    if(hop.ip !== '' && hop.ip !== 'Request timed out.' && hop.ip !== '192.168.0.1'){
                        hops.push(hop.ip)
                    }
                    var results = { results: hops ? hops : null };
                    socket.emit('tracerouteData', results);
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



server.listen(5000, () => {
    console.log("listening on port 5000");
});