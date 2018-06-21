'use strict';

const amqplib = require('amqplib');

function rabbitmqAppender(config, layout) {
  const host = config.host || '127.0.0.1';
  const port = config.port || 5672;
  const username = config.username || 'guest';
  const password = config.password || 'guest';
  const exchange = config.exchange || '';
  const type = config.mq_type || '';
  const durable = config.durable || false;
  const routingKey = config.routing_key || 'logstash';
  const con = {
    protocol: 'amqp',
    hostname: host,
    port: port,
    username: username,
    password: password,
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 0,
    vhost: '/',
    routing_key: routingKey,
    exchange: exchange,
    mq_type: type,
    durable: durable,
  };
  const client = amqplib.connect(con);
  const publish = (message) => {
    client.then((conn) => {
      const rn = conn.createChannel().then((ch) => {
        const ok = ch.assertExchange(exchange, type, { durable: durable });
        return ok.then(() => {
          ch.publish(exchange, routingKey, Buffer.from(message));
          return ch.close();
        });
      });
      return rn;
    }).catch(e => console.error(e)); //eslint-disable-line
  };

  const appender = loggingEvent => publish(layout(loggingEvent));

  appender.shutdown = function (done) {
    client.close().then(done);
  };
  return appender;
}

function configure(config, layouts) {
  let layout = layouts.messagePassThroughLayout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }

  return rabbitmqAppender(config, layout);
}

module.exports.configure = configure;
