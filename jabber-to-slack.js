var xmpp = require('simple-xmpp');
var request = require('request');
var config = require('config');

var jid = process.env.XMPP_JID;
var password = process.env.XMPP_PASSWORD;
var host = process.env.XMPP_HOST;
var port =  process.env.XMPP_PORT;
var conferenceserver = process.env.XMPP_CONFERENCESERVER;
var botname = process.env.BOTNAME;
var slacktoken = process.env.SLACK_TOKEN;
var rooms = process.env.ROOMS.split(',');

xmpp.connect({
            jid: jid,
            password: password,
            host: host,
            port: port
});

xmpp.on('error', function(err) {
        console.error(err);
});

xmpp.on('online', function(data) {
    console.log('Connected with JID: ' + data.jid.user);
    for (var roomname in rooms){
        join_room(roomname);
    }
});

function join_room(roomname) {
    var room = roomname + '@' + conferenceserver;
    var to = room + '/' + botname;
    xmpp.join(to);
    console.log('Joined channel "%s"', room);
}

xmpp.on('groupchat', function(conference, from, message, stamp) {
        var parts = conference.split('@', 1);
        var room = parts[0];
        var channel = rooms[room];
        if (!stamp && channel) {
            // Only log non hitory messages
            send('chat.postMessage', {
                channel: channel,
                text: message,
                username: from,
                parse: 'full',
                link_names: 0,
                unfurl_links: 1
            });
        }
});


function send (method, args) {
    args = args || {} ;
    args.token = slacktoken,
    request.post({
        url: 'https://slack.com/api/' + method,
        json: true,
        form: args
    }, function (error, response, body) {
        if (error || !body.ok) {
            console.log('Error:', error || body.error);
        }
    });
};
