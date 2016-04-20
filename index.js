/**
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2016. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 */
'use strict';

var log4js = require('log4js'),
    util = require('util');

module.exports = {
    appender: appender,
    configure: configure
};

function appender(level, options) {
    return function(log) {
        if (log && log.level && log.level.level && log.level.level >= level &&
            log.startTime && log.data && log.data.length > 0) {

            const LogmetClient = require('@alchemy-kms/logmet-client').LogmetClient;

            const logging_token = options.logging_token;
            const space_id = options.space_id;
            const logging_host = options.logging_host;
            const logging_port = options.logging_port;
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

            const message = log.data.join(' | ');
            const log_entry = new Map();
            log_entry.set('component', options.component);
            log_entry.set('type', log.categoryName);
            log_entry.set('message', message);

            logging_client.addLogMessages([new Map(log_entry)]);
        }
    };
};

function configure(config) {
	if (process.env.log4js_logmet_enabled !== 'true') return function() {};

    const options = {
        component: process.env.log4js_logmet_component || config.options && config.options.component,
        logging_token: process.env.log4js_logmet_logging_token || config.options && config.options.logging_token,
        space_id: process.env.log4js_logmet_space_id || config.options && config.options.space_id,
        logging_host: process.env.log4js_logmet_logging_host || config.options && config.options.logging_host,
        logging_port: process.env.log4js_logmet_logging_port || config.options && config.options.logging_port,
    };

    var optionsInvalid = false;

    for (var i in options) {
        if (!options[i]) {
            util.log('Logmet appender: ' + i + ' not specified');
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

