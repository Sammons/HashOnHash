var crypto = require('crypto');
var net = require('net');
var master_ip = process.env.MASTER_IP;
var master_port = process.env.MASTER_PORT;
var password = '' + process.env.PASS + '';
var credentials = 'password=' + password + ':';

if (process.env.I_AM_MASTER === 'true') {
    // set up credentials
    var zero_thresh = 1;
    var server = net.createServer();
    server.listen(3000);
    server.on('connection', function (socket) {
        // we unsafely assume every chunk is an entire message =)
        socket.on('data', function (chunk) {
            chunk = chunk + '';// imply encoding =P
            if (chunk.match(/^password=/) 
                && chunk.match(/password=(.*?)\:/)[1] === password) {
                chunk = chunk.slice(9 + password.length + 1);
                try {
                    var message = JSON.parse(chunk);
                    if (message.subject === "configuration") {
                        console.log('configuration');
                        socket.write(credentials + JSON.stringify({
                            'seed' : '' + Math.random(),
                            'zero_minimum': zero_thresh
                        }), 'utf8')
                        // send seed, min_threshold
                    }
                    if (message.subject === "report") {
                        if (message.zero_count > zero_thresh) {
                            console.log(message);
                            zero_thresh = message.zero_count;
                        } else {
                            socket.write(credentials + JSON.stringify({
                                'zero_minimum': zero_thresh
                            }), 'utf8')
                        }
                        // recieve report
                    }
                } catch (e) {
                    console.log('malformed chunk', chunk, e);
                }
            }
        })
        socket.on('error', function () { /*ignore errors*/ });
    });
    
    server.on('error', function () { /* ignore errors */ });
}
else {

    var seed = "123.123gcr1";
    var prev;
    var zero_minimum = 5;

    var report_socket = net.connect(master_port, master_ip, function () {
        report_socket.write(credentials+'{"subject": "configuration"}', 'utf8');
    });

    report_socket.on('data', function (chunk) {
        chunk += '';
        if (new RegExp('^' + credentials).test(chunk)) {
            chunk = chunk.slice(credentials.length);
            try {
                var message = JSON.parse(chunk);
                if (message.seed) seed = message.seed;
                if (message.zero_minimum) zero_minimum = message.zero_minimum;
                console.log('current zero thresh',zero_minimum);
            } catch (e) { 
                console.log('malformed message', message, e);
            }
            
        }
    })

    report_socket.on('error', function () {
        // todo dirty
        report_socket.end();
        console.log('died,retrying');
        report_socket = net.connect(master_port, master_ip, function () {
            report_socket.write(credentials + '{"subject": "configuration"}', 'utf8');
        });
    })

    report_socket.send_report = function (hash,zero_count) {
        var report_object = {};
        report_object.subject = "report";
        report_object.seed = prev;
        report_object.hash = hash;
        report_object.zero_count = zero_count;
        console.log('sending', JSON.stringify(report_object));
        report_socket.write(credentials + JSON.stringify(report_object));
    };
    
    var count;
    function analyze_hash(hash) {
        count = 0;
        while (count < hash.length) if ((hash[count++] / 1) !== 0) break;
        if (count > zero_minimum) report_socket.send_report(hash, count);
    }

    function crypt() {
        var hasher = crypto.createHash('sha512');
        hasher.update(seed, "utf8");
        prev = seed;
        seed = hasher.digest('hex');
        setImmediate(crypt);
        process.nextTick(function () { 
            analyze_hash( seed );
        })
    }
    crypt();
}