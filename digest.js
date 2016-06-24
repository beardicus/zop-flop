// connects to redis and slurps queued tweets into rethinkdb and sets
// delayed task (redis zset) to update favorite_count

var moment = require('moment'),
  Redis = require('redis'),
  redis = Redis.createClient(),
  rethink = require('rethinkdbdash')({db:'twitter'});


redis.on('connect', function() {
  console.log('connected to redis');
});

redis.on("error", function (err) {
  console.error("redis error: " + err);
});

function gobble() {
  redis.brpop('grub:ingest', 0, function(err, response){
    var tweet = JSON.parse(response[1]);

    console.log('digested: ' + tweet.id_str);

    // dump into database
    rethink.table('tweets').insert(tweet).run(function(err, result) {
      if (err) throw err;
    });

    redis.zadd(
      'grub:delayset',
      moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY')
        .add(1, 'minute')
        .unix(),
      tweet.id_str
    );

    gobble();
  });
}

gobble();
