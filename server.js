const express = require("express");
const path = require('path');
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

var tracer;

io.on('connection', (socket)  => {
    console.log('A user connected');

    socket.on('formSubmit', (data) => {
        console.log("starting traceroute: ")
        try {
            let timed_out = 0;
            socket.emit('newTraceroute');
            tracer = new traceroute();
            tracer
                .on('pid', (pid) => {
                    console.log(`pid: ${pid}`);
                })
                .on('destination', (destination) => {
                    console.log(`destination: ${destination}`);
                })
                .on('hop', (hop) => {
                    console.log(`hop: ${JSON.stringify(hop)}`);
                    if(hop.ip !== '' && hop.ip !== 'Request timed out.' && hop.ip !== '192.168.0.1'){
                        socket.emit('newTracerouteHop', hop.ip);
                    }
                    if(hop.ip == "Request timed out.") {
                        timed_out += 1;
                        if(timed_out == 1) {
                            tracer.emit('close');
                        }
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



server.listen(5000, () => {
    console.log("listening on port 5000");
});