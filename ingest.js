// connects to streaming twitter and dumps tweets into redis queue

var moment = require('moment'),
  Redis = require('redis'),
  redis = Redis.createClient(),
  Twitter = require('node-tweet-stream'),
  twitter = new Twitter({
    consumer_key: process.env.CONSUMERKEY,
    consumer_secret: process.env.CONSUMERSECRET,
    token: process.env.TOKENKEY,
    token_secret: process.env.TOKENSECRET,
  });

redis.on('connect', function() {
  console.log('connected to redis');
});

redis.on('error', function (err) {
  console.error('redis error: ' + err);
});

twitter.on('tweet', function (tweet) {
  if (tweet.retweeted_status) return; // skip retweets
  redis.lpush('grub:ingest', JSON.stringify(tweet));
  console.log('ingested: ' + tweet.id_str);
})

twitter.on('error', function (err) {
  console.error(err);
})

twitter.language('en');
twitter.track('github com');
