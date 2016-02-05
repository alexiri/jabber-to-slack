var xmpp = require('simple-xmpp');
var request = require('request');
var Slack = require('slack-client');
var util = require('util');

var jid = process.env.XMPP_JID;
var password = process.env.XMPP_PASSWORD;
var host = process.env.XMPP_HOST;
var port =  process.env.XMPP_PORT;
var conferenceserver = process.env.XMPP_CONFERENCESERVER;
var botname = process.env.BOTNAME;
var slacktoken = process.env.SLACK_TOKEN;
var rooms = process.env.ROOMS;
rooms = rooms ? rooms.split(',') : [];

var channels = [];

/*var fs = require('fs');
var dir = '/home/alex/jabber-to-slack';
var log_file = fs.createWriteStream(dir + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;
console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};*/

function debug(e) {
  console.log("DEBUG ");
  try {
    console.log("js " + util.inspect(e, { showHidden: false, depth: 3 }));
    /*var cache = [];
    console.log("js " + JSON.stringify(e, function(key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          console.log("filter: " + value)
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    }));*/
  } catch(err) {
    console.log("Error: " + err);
    /*if(e !=) {
      console.log(e);
    }*/
  }
  console.log("DEBUG END");
}

console.log("Trying to connect");

slack = new Slack(slacktoken, true, true);

slack.on('open', function() {
  console.log("Connected to " + slack.team.name + " as " + slack.self.name);

  for (var i in slack.channels) {
    var channel = slack.channels[i];
    if (channel.is_member) {
      channels.push("#" + channel.name);
    }
  }
  console.log("channels");
  debug(channels);

});

slack.on('message', function(message) {
  var channel = slack.getChannelGroupOrDMByID(message.channel);
  var user = slack.getUserByID(message.user);
  var type = message.type;
  var subtype = message.subtype;
  var ts = message.ts;
  var text = message.text;

  var channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
  channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');

  var userName = (user != null ? user.name : void 0) != null ? "@" + user.name : "UNKNOWN_USER";

  console.log("Slack Received: " + type + " (" + subtype +") " + channelName + " " + userName + " " + ts + " \"" + text + "\"");

  if (channel.is_im) {
    console.log('Not interesting - DM');
  } else {
    if (subtype == 'channel_join' || subtype == 'channel_leave') {
      console.log('Not interesting - join or leave');
    } else if (subtype == 'bot_message') {
      console.log('Not interesting - bot message');
    } else if (typeof subtype === "undefined") {
      console.log('Interesting! - Send to XMPP');

      var xmpp_message = "[" + user.real_name + "] " + text;
      var to = channel.name + "@" + conferenceserver;
      console.log(to, xmpp_message);
      xmpp.send(to, xmpp_message, true);
    } else {
      console.log("I don't know!");
      debug(message);
    }
  }

});

slack.on('error', function(error) {
  console.error("Error: ", error);
});

slack.login();

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
  console.log('Connected to XMPP with JID: ' + data.jid.user);
  for (var i in rooms) {
    join_room(rooms[i]);
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
  var channel = room;
  console.log("XMPP Received: " + conference + " (" + channel + ") from: " + from + " stamp: " + stamp);
  if (!stamp && channel && from != botname) {
    // Only log non hitory messages
    send('chat.postMessage', {
      channel: "#" + channel,
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
  console.log("Sending: ");
  debug(args);
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
