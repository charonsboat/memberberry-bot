var TwitterBot = require('@drm2/twitterbot');
var dotenv = require('dotenv');
var HumanDate = require('date.js');

// load our environment variables
dotenv.config();

// initialize the TwitterBot
var bot = new TwitterBot({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var keyword = '#remindme';
var months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', ];

var format_date = function (date)
{
    var month = months[date.getMonth()];
    var day = date.getDate();
    var year = date.getFullYear();
    var hour = ('0' + date.getHours()).slice(-2);
    var minute = ('0' + date.getMinutes()).slice(-2);

    return month + ' ' + day + ', ' + year + ' @ ' + hour + ':' + minute;
};

var stream = bot.filteredStream(keyword);

stream.on('tweet', function (tweet) {
    // build the link to the original (if one exists)
    var status = tweet.in_reply_to_screen_name ? `\n\nhttps://twitter.com/${tweet.in_reply_to_screen_name}/status/${tweet.in_reply_to_status_id_str}` : '';

    // find the reminder delay (provided in the #remindme Tweet)
    var reminder_time = HumanDate(tweet.text.substring(tweet.text.indexOf(keyword) + keyword.length, tweet.text.length));

    // build the formatted date to use in the initial acknowledgement reply
    var formatted_date = format_date(reminder_time);

    // build our initial acknowledgement reply
    var message = `Hi there! I'm here to help you 'member things. I will remind you of this soon (${formatted_date}).${status}`;

    // send the initial acknowledgement reply
    bot.reply(message, { screen_name: tweet.user.screen_name, tweet_id: tweet.id_str });

    // schedule the actual reminder reply
    bot.schedule(function () {
        var message = `Hey! 'Member this?${status}`;

        bot.reply(message, { screen_name: tweet.user.screen_name, tweet_id: tweet.id_str });
    }, reminder_time);
});
