// checks for tasks to do in the redis zset, pushes to work queue

var moment = require('moment'),
  Redis = require('redis'),
  redis = Redis.createClient();

redis.on('connect', function() {
  console.log('connected to redis');
});

redis.on("error", function (err) {
  console.error("redis error: " + err);
});


function timePopper() {
  var now = moment().unix();

  redis.zrangebyscore('grub:delayset', 0, now, function(err, response) {
    if (response.length > 0) {
      redis.multi()
        .lpush('grub:updatelist', response)
        .lpush('grub:updatetrigger', 'GO!')
        .zremrangebyscore('grub:delayset', 0, now)
        .exec();

      console.log('pushed ' + response.length + ' toots to work queue');
    }
  });

}

setInterval(timePopper, 60 * 1000);
