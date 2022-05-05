// Place your server entry point code here
/* 
    SETTING UP 
*/
// Require http module
const http = require('http');

// Require fs
const fs = require('fs');

// Require morgan
const morgan = require('morgan');

// Require minimist module
// Use minimist to process one argument `--port=` on the command line after `node server.js`.
const args = require('minimist')(process.argv.slice(2));

// Require exports from database.js
const db = require('./src/services/database.js');

// Require Express.js
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static HTML files
app.use(express.static('./public'));

// Define allowed argument name 'port'.
args['port'];

// Define a const `port` using the argument from the command line.
const port = args.port || process.env.PORT || 5555;


/*
    LOGS
*/
// If --log == false, don't make a log file
if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log");
} else {
    // Use morgan for logging to files
    // Create a write stream to append to an access.log file
    const accessLog = fs.createWriteStream('access.log', { flags: 'a' });

    // Set up the access logging middleware
    app.use(morgan('combined', { stream: accessLog }));
}


/*
    HELP
*/
// Define help constant
const help = (`
server.js [options]
--port, -p	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug, -d If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help, -h	Return this message and exit.
`);

// If --help is called, print help and exit
if (args.help || args.h) {
    console.log(help);
    process.exit(0);
}


/* 
    COIN FUNCTIONS 
*/
// Coin flip
function coinFlip() {
    return (Math.floor(Math.random() * 2) == 0) ? "heads" : "tails";
}

// Coin flips
function coinFlips(flips) {
    let results = [];
    for (let i = 0; i < flips; i++) {
      results.push(coinFlip());
    }
    return results;
}

// Count flips
function countFlips(array) {
    const result = {
      tails: 0,
      heads: 0
    };
    if (array.length == 1) {
      if (array[0] ==  "heads") {
         return { heads: 1 };
      }
      else {
        return { tails: 1 };
      }
    }
    else {
      for (let i = 0; i < array.length; i++) {
        if (array[i] ==  "heads") {
          result.heads++;
        }
        else {
          result.tails++;
        }
      }
    }
    return result;
}

// Flip a coin
function flipACoin(call) {
  let flip = coinFlip();
  const result = {
    call: call,
    flip: flip,
    result: ((flip == call) ? "win" : "lose")
  };
  return result;
}


/* 
    ENDPOINTS 
*/
// Define database endpoint
app.use( (req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    console.log(logdata);
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent);
    next();
});

// Check if appropriate to run error and log access endpoints
if (args.debug || args.d) {
    // Define log access endpoint
    app.get('/app/log/access/', (req, res, next) => {
        const stmt = db.prepare("SELECT * FROM accesslog").all();
	    res.status(200).json(stmt);
    })

    // Define error endpoint
    app.get('/app/error', (req, res) => {
        throw new Error('Error test successful.');
    })
}


// Define check endpoint
app.get('/app/', (req, res) => {
    // Respond with status 200
        res.statusCode = 200;
    // Respond with status message "OK"
        res.statusMessage = 'OK';
        res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
        res.end(res.statusCode+ ' ' +res.statusMessage)
});

// Define flip endpoint
app.get('/app/flip/', (req, res) => {
	res.status(200).json({'flip': coinFlip()});
});

// Define number endpoint
app.get('/app/flips/:number', (req, res) => {
    const flips = coinFlips(req.params.number);
	res.status(200).json( {'raw' : flips, 'summary' : countFlips(flips)});
});

// Define heads endpoint
app.get('/app/flip/call/heads', (req, res) => {
	const flip = flipACoin('heads');
    res.status(200).json({ 'call' : flip.call, 'flip': flip.flip, 'result': flip.result});
});

// Define tails endpoint
app.get('/app/flip/call/tails', (req, res) => {
	const flip = flipACoin('tails');
    res.status(200).json({ 'call' : flip.call, 'flip': flip.flip, 'result': flip.result});
});


/* 
    SERVER 
*/
// Start an app server
app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

// Default response for any other request
app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});