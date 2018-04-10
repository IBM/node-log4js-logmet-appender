/**
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2016, 2018. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 */

'use strict';

const LogmetProducer = require('logmet-client').LogmetProducer;

function logmetAppender(logmetClientProducer, spaceId, layout, timezoneOffset) {

    const appender = (loggingEvent) => {
        logmetClientProducer.sendData(layout(loggingEvent, timezoneOffset), spaceId);
    };

    appender.shutdown = (callback) => {
        if (logmetClientProducer) {
            logmetClientProducer.terminate(callback);
        }
        else {
            callback();
        }
    };
    return appender;
}

function configure(config, layouts) {
    if (process.env.log4js_logmet_enabled !== 'true') { return () => {}; }

    const options = {};

    options.host = process.env.log4js_logmet_logging_host || config.logging_host;
    options.port = process.env.log4js_logmet_logging_port || config.logging_port;
    options.spaceId = process.env.log4js_logmet_space_id || config.space_id;
    options.loggingToken = process.env.log4js_logmet_logging_token || config.logging_token;

    for (let option in options) {
        if (!options[option]) {
            console.log(`Logmet appender: ${ option } not specified`);
            return () => {};
        }
    }

    let layout = (logEvent) => {
        let instanceId = process.env.CF_INSTANCE_INDEX || require('os').hostname().replace(/^.*-([a-zA-Z0-9]+-[a-zA-Z0-9]+)$/g,'$1');
        let logmetEvent = {
            'component': process.env.log4js_logmet_component || config.component,
            'host-ip': process.env.CF_INSTANCE_IP,
            'instance-id': instanceId,
            'loglevel': logEvent.level.levelStr,
            'msg_timestamp': logEvent.startTime.toISOString(),
            'message': logEvent.data.join(' | '),
            'type': logEvent.categoryName
        };
        return logmetEvent;
    };
    if (config.layout) {
        layout = layouts.layout(config.layout.type, config.layout);
    }

    console.log('Logmet appender configured');

    const logmetClientProducer = new LogmetProducer(options.host, options.port, options.spaceId, options.loggingToken, false, 
        {bufferSize: process.env.log4js_logmet_buffer_size || 10000});

    logmetClientProducer.connect((error, status) => {
        if (error) {
            console.error(`Logmet appender: Connection with Logmet failed. Details: ${ error }`);
        } else if (status.handshakeCompleted) {
            console.log('Logmet appender: LogmetClient is ready to send data.'); 
        }
    });
    return logmetAppender(logmetClientProducer, options.spaceId, layout, config.timezoneOffset);
}

module.exports.configure = configure;

