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

const messageSeperator = " | ";
const defaultEventMap = {
    'component': 'component',
    'host-ip':  'host-ip',
    'instance-id':'instance-id',
    'loglevel': 'loglevel',
    'logtime': 'logtime',
    'message': 'message'
};

function sendData(level, options, tlsOpts, log) {
    var event = buildEvent(log, options);
    logmetConnection.producer.sendData(event, log.categoryName, options.space_id, function(/*error, status*/) {
        // message is dropped if an error is returned, errors already logged by logmet client
    });
}

function buildEvent(log, options) {
    // build up message to send
    var event = {};
    if(options && options.event_map){
        for (var key in options.event_map) {
            if (!options.event_map.hasOwnProperty(key)) continue;
            var value = options.event_map[key];
            event[key] = getValueForMapping(value, options, log);
        }
    }
    return event;
}

function getValueForMapping(key, options, log){
    var valueMapped;
    if(key === 'component'){
        valueMapped = options.component;
    } else if(key === 'host-ip'){
        valueMapped = process.env.CF_INSTANCE_IP;
    } else if(key === 'instance-id'){
        valueMapped = process.env.CF_INSTANCE_INDEX;
    } else if(key === 'loglevel'){
        valueMapped = log.level && log.level.levelStr;
    } else if(key === 'logtime'){
        valueMapped = log.startTime && log.startTime.toISOString();
    } else if(key === 'message'){
        valueMapped = log.data && log.data.reduce(function (a, b) {
            return ((typeof(a)==="object" && JSON.stringify(a)) || a) + messageSeperator + ((typeof(b)==="object" && JSON.stringify(b)) || b);
        });
    } else if(key.startsWith('process.') && key.length > 8){
        var processValue = key.substring(8).split('.');
        if(processValue.length == 1){
            valueMapped = process[processValue[0]];
        } else if (processValue.length == 2){ 
            valueMapped = process[processValue[0]] && process[processValue[0]][processValue[1]];
        }
        else{
            //do nothing - currently only support for 2 layer process information
        }
    } else if(key.startsWith('data.') && key.length > 5){ //Custom data parsing using log data array's first `object` type element
        var logDataObject = log.data && log.data.find(function(element) {
            return (typeof(element)==="object");
        });
        if(logDataObject){
            var dataValue = key.substring(5).split('.');
            if(dataValue.length == 1){
                valueMapped = logDataObject[dataValue[0]];
            } else if (dataValue.length == 2){ 
                valueMapped = logDataObject[dataValue[0]] && logDataObject[dataValue[0]][dataValue[1]];
            } else {
                 //do nothing - currently only support for 2 layer data information
            }
        }
        else{
            //do nothing - there is no data object
        }
    } else {
        // No valid mapping found for given key.
    }
    return valueMapped;
}

function appender(level, options, tlsOpts) {
    logmetConnection.producer = new logmet.LogmetProducer(tlsOpts.host, tlsOpts.port, options.space_id, options.logging_token, false, {bufferSize: logmetConnection.BUFFER_SIZE});
    logmetConnection.producer.connect(function(error, status) {
        if (error) {
            util.log('Logmet Appender: Connection with Logmet failed. ERROR: ' + error);
        } else if (status.handshakeCompleted) {
            util.log('Logmet Appender: LogmetClient is ready to send data.'); 
        }
    });
    return sendData.bind(this, level, options, tlsOpts);
}

function configure(config) {
    if (process.env.log4js_logmet_enabled !== 'true') return function() {};

    const options = {
        component: process.env.log4js_logmet_component || config.options && config.options.component,
        logging_token: process.env.log4js_logmet_logging_token || config.options && config.options.logging_token,
        space_id: process.env.log4js_logmet_space_id || config.options && config.options.space_id,
        event_map: (config.options && config.options.eventMap) || defaultEventMap
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

    const level = log4js.levels[config.options.level] && log4js.levels[config.options.level].level || Number.MIN_VALUE;

    util.log('Logmet Appender configured');
    return appender(level, options, tlsOpts);
}

function shutdown(callback) {
    if (logmetConnection.producer) {
        logmetConnection.producer.terminate(callback);
    }
    else {
        callback();
    }
}

