/**
 * Licensed Materials - Property of IBM
 * (c) Copyright IBM Corporation 2016, 2017. All Rights Reserved.
 *
 * Note to U.S. Government Users Restricted Rights:
 * Use, duplication or disclosure restricted by GSA ADP Schedule
 * Contract with IBM Corp.
 */
'use strict';

var log4js = require('log4js'),
    util = require('util'),
    logmetConnection = require('./lib/logmet-connection-singleton'),
    logmet = require('logmet-client');

module.exports = {
    appender: appender,
    configure: configure,
    shutdown: shutdown
};

function sendData(options, tlsOpts, log) {
    var event = buildEvent(log, options);
    logmetConnection.producer.sendData(event, log.categoryName, options.space_id, function(/*error, status*/) {
        // message is dropped if an error is returned, errors already logged by logmet client
    });
}

function buildEvent(log, options) {
    // build up message to send
    let event = {};
    let fields = options.fields;

    if (fields.level_field_name) { 
        event[fields.level_field_name] = log.level && log.level.levelStr; 
    }
    if (fields.timestamp_field_name) { 
        event[fields.timestamp_field_name] = log.startTime && log.startTime.toISOString();
    }
    if (fields.data_field_augment && log.data && log.data.length === 1 && typeof log.data[0] === 'object') {
        let customDynamicFields = log.data[0];
        for (let customDynamicFieldName in customDynamicFields) {
            event[customDynamicFieldName] = customDynamicFields[customDynamicFieldName];
        }
    } else if (fields.data_field_name) {
        event[fields.data_field_name] = log.data && log.data.join(' | ');
    }
    for (let staticFieldName in fields.static_fields) {
        event[staticFieldName] = fields.static_fields[staticFieldName];
    }
    for (let processFieldName in fields.process_fields) {
        event[processFieldName] = process[fields.process_fields[processFieldName]];
    }
    for (let envFieldName in fields.env_fields) {
        event[envFieldName] = process.env[fields.env_fields[envFieldName]];
    }

    return event;
}

function appender(options, tlsOpts) {
    logmetConnection.producer = new logmet.LogmetProducer(tlsOpts.host, tlsOpts.port, options.space_id, options.logging_token, false, {bufferSize: logmetConnection.BUFFER_SIZE});
    logmetConnection.producer.connect(function(error, status) {
        if (error) {
            util.log('Logmet Appender: Connection with Logmet failed. ERROR: ' + error);
        } else if (status.handshakeCompleted) {
            util.log('Logmet Appender: LogmetClient is ready to send data.'); 
        }
    });
    return sendData.bind(this, options, tlsOpts);
}

function configure(config) {
    if (process.env.log4js_logmet_enabled !== 'true') return function() {};

    const defaultFields = {
        'level_field_name': 'loglevel',
        'timestamp_field_name': 'logtime',
        'data_field_name': 'message',

        'static_fields': {
            'component': process.env.log4js_logmet_component || config.options && config.options.component
        },
        'env_fields': {
            'host-ip': 'CF_INSTANCE_IP',
            'instance-id': 'CF_INSTANCE_INDEX'
        }
    };

    const options = {
        logging_token: process.env.log4js_logmet_logging_token || config.options && config.options.logging_token,
        space_id: process.env.log4js_logmet_space_id || config.options && config.options.space_id,
        fields: (config.options && config.options.fields) || defaultFields
    };

    const tlsOpts = {
        host: process.env.log4js_logmet_logging_host || config.options && config.options.logging_host,
        port: process.env.log4js_logmet_logging_port || config.options && config.options.logging_port,
        secureProtocol: logmetConnection.DEFAULT_SECURE_PROTOCOL,
        rejectUnauthorized: logmetConnection.DEFAULT_REJECT_UNAUTHORIZED
    };

    var optionsInvalid = false;

    for (var i in options) {
        if (!options[i]) {
            util.log('Logmet Appender: ' + i + ' not specified');
            optionsInvalid = true;
        }
    }

    if (optionsInvalid) return function() {};

    if (config.appender) {
        log4js.loadAppender(config.appender.type);
        config.actualAppender = log4js.appenderMakers[config.appender.type](config.appender);
    }

    util.log('Logmet Appender configured');
    return appender(options, tlsOpts);
}

function shutdown(callback) {
    if (logmetConnection.producer) {
        logmetConnection.producer.terminate(callback);
    }
    else {
        callback();
    }
}

