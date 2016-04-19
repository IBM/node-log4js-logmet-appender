/**
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2016. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 */
'use strict';

var util = require('util');

module.exports = {
    appender: appender,
    configure: configure
};

function appender(level, options) {
    return function(log) {
        if (log && log.level && log.level.level && log.level.level >= level &&
            log.startTime && log.data && log.data.length > 0) {

            const LogmetClient = require('@alchemy-kms/logmet-client').LogmetClient;

            const group_id = options.group_id;
            const logging_token = process.options.logging_token;
            const space_id = process.options.space_id;
            const logging_host = options.logging_host;
            const metrics_host = options.metrics_host;
            const logging_port = options.logging_port;
            const metrics_port = options.metrics_port;
             // 
            const logging_client = LogmetClient.getLoggingClient(
                null,                               //  client options
                logging_host,
                logging_port,
                space_id,                           //  space id
                5,                                  //  batch send period in seconds
                1,                                  //  batch send count
                space_id,                           //  tenant id
                logging_token,                      //  password
                false,                              //  is super tenant
                100                                 //  queue size
            );

            const metrics_client = LogmetClient.getMetricsClient(
                null,
                metrics_host,
                metrics_port,
                space_id,
                5,
                2,
                space_id,
                logging_token,
                false,
                100
            );

            const metric_type = 'otc-api-test-local-service';
            const low_value = 5;
            const high_value = 100;
            const metrics = [];

            for (var sample = 0; sample < 10; sample++) {
                setTimeout(function () {
                    let value = Math.floor(Math.random() * (high_value - low_value) + low_value);

                    let new_metric = new Map();
                    new_metric.set('metric_path', [group_id, metric_type, 'count']);
                    metrics.push(new_metric);
                }, sample * 30000);
            }

            metrics_client.addMetricMessages(metrics);

            var message = log.data.join(' | ');
            const log_entry = new Map();
            log_entry.set('component', options.group_id);
            log_entry.set('type', metric_type);
            log_entry.set('line', 'Life is good...');
            log_entry.set('message', message);

            const logs = [];

            for (let msg_count = 0; msg_count < 10; msg_count++) {
                logs.push(new Map(log_entry));
            }
        }
    };
};

function configure() {
    const options = {
        group_id: 'otc-api-test',
        logging_token: 'cyD6RSQK3SX4',
        space_id: '7283c612-efc3-4930-98df-2a60952a7920',
        logging_host: 'logs.opvis.bluemix.net',
        metrics_host: 'metrics.opvis.bluemix.net',
        logging_port: 9091,
        metrics_port: 9095
    };

    const optionsInvalid = false;

    for (var i in options) {
        if (!options[i]) {
            util.log(options[i] + ' not specified');
            optionsInvalid = true;
        }
    }

    if (optionsInvalid) return function() {};

    if (config.appender) {
        log4js.loadAppender(config.appender.type);
        config.actualAppender = log4js.appenderMakers[config.appender.type](config.appender);
    }

    const level = log4js.levels[config.options.level] && log4js.levels[config.options.level].level || Number.MIN_VALUE;
    
    util.log('Logmet appender configured');
    return appender(level, options);
};

