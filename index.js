var TwitterBot = require('@drm2/twitterbot');
var dotenv = require('dotenv');
var HumanDate = require('date.js');
var Store = require('jfs');

// load our environment variables
dotenv.config();

// initialize the TwitterBot
var bot = new TwitterBot({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var db = new Store('./storage/data.json');

var keyword = '#remindme';
var months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', ];

var format_date = function (date)
{
    var month = months[date.getMonth()];
    var day = date.getDate();
    var year = date.getFullYear();
    var hour = ('0' + date.getHours()).slice(-2);
    var minute = ('0' + date.getMinutes()).slice(-2);
    var date_str = date.toString();
    var timezone_abbr = date_str.substring(date_str.indexOf('(') + 1, date_str.indexOf(')'));

    return month + ' ' + day + ', ' + year + ' @ ' + hour + ':' + minute + ' ' + timezone_abbr;
};

var format_status = function (tweet)
{
    return tweet.in_reply_to_screen_name ? `\n\nhttps://twitter.com/${tweet.in_reply_to_screen_name}/status/${tweet.in_reply_to_status_id_str}` : '';
};

var schedule_reminder = function (tweet, reminder_time)
{
    var status = format_status(tweet);

    // schedule the actual reminder reply
    bot.schedule(function () {
        var message = `Hey! 'Member this?${status}`;

        bot.reply(message, { screen_name: tweet.user.screen_name, tweet_id: tweet.id_str });
    }, reminder_time)
        .then(function () {
            // // remove reminder from filesystem
            // storage.removeItem(tweet.id_str);
            db.delete(tweet.id_str, function () {});
        });
};

var stream = bot.filteredStream(keyword);

db.all(function (err, reminders) {
    for (var id in reminders)
    {
        if (reminders.hasOwnProperty(id))
        {
            schedule_reminder(reminders[id].tweet, new Date(reminders[id].reminder_time));
        }
    }
});

stream.on('tweet', function (tweet) {
    // build the link to the original (if one exists)
    var status = format_status(tweet);

    // find the reminder delay (provided in the #remindme Tweet)
    var reminder_time = HumanDate(tweet.text.substring(tweet.text.indexOf(keyword) + keyword.length, tweet.text.length));

    // build the formatted date to use in the initial acknowledgement reply
    var formatted_date = format_date(reminder_time);

    // build our initial acknowledgement reply
    var message = `Hi there! I'm here to help you 'member things. I will remind you of this soon (${formatted_date}).${status}`;

    // send the initial acknowledgement reply
    bot.reply(message, { screen_name: tweet.user.screen_name, tweet_id: tweet.id_str });

    // store reminder on filesystem
    db.save(tweet.id_str, {
        tweet: tweet,
        reminder_time: reminder_time
    }, function () {});

    schedule_reminder(tweet, reminder_time);

    console.log(tweet);
});

stream.on('connect', function () {
    console.log('connecting...');
});

stream.on('connected', function () {
    console.log('connected!');
});
