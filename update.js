// slurps work queue by the 100s to update favorite_count in rethinkdb

var moment = require('moment'),
  Redis = require('redis'),
  redis = Redis.createClient(),
  rethink = require('rethinkdbdash')({db:'twitter'}),
  Twitter = require('twitter'),
  twitter = new Twitter({
    consumer_key: process.env.CONSUMERKEY,
    consumer_secret: process.env.CONSUMERSECRET,
    access_token_key: process.env.TOKENKEY,
    access_token_secret: process.env.TOKENSECRET,
  });


redis.on('connect', function() {
  console.log('connected to redis');
});

redis.on("error", function (err) {
  console.error("redis error: " + err);
});

function trigger() {
  redis.brpop('grub:updatetrigger', 0, function(err, response){
    update();
    trigger();
  });
}

trigger();


function update() {
  redis.multi()
    .lrange('grub:updatelist', 0, 99, function(err, response) {
      if (err) {
        console.error(err);
      }
      else {
        if (response.length == 100) update(); // run again if more in queue

        var now = moment();

        twitter.post('statuses/lookup', {id: response.join(',')}, function(err, toots, response) {
          toots.forEach(function(toot) {
            rethink.db('twitter').table('tweets')
              .getAll(toot.id_str, {index: 'id_str'})
              .update({
                favorite_count: toot.favorite_count,
                updated_at: now.utc().format('ddd MMM DD HH:mm:ss Z YYYY')
              }).run(function(err, result) {
                if (err) {
                  console.error(err);
                } else {
                  console.log('updated: ' + toots.length + ', rate limit: ' + response.headers['x-rate-limit-remaining']);
                }
              });
          });


        });
      }
    })
    .ltrim('grub:updatelist', 100, -1)
    .exec();
}
