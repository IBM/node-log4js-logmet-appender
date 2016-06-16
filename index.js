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
    util = require('util'),
    logmetConnection = require('./lib/logmet-connection-singleton'),
    logmet = require('@logmet-clients/logmet-client');

module.exports = {
    appender: appender,
    configure: configure
};

function sendData(level, options, tlsOpts, log) {
    var event = buildEvent(log, options);
    logmetConnection.producer.sendData(event, log.categoryName, options.space_id, function(error, status) {
        if (error) {
            util.log('Logmet Appender: Logmet client rejected the data, dropping message. ERROR: ' + error);
        }
        else {
            if (!status.connectionActive) {
                util.log('Logmet Appender: Logmet client not connected to Logmet, placing message in data buffer.')
            }
        }
    });
}

function getNetworkInterfacesString() {
    var networkInterfaces = require('os').networkInterfaces();

    var networkInterfacesString = '';
    for (var networkInterface of Object.keys(networkInterfaces)) {
        for (var specificNetworkInterface of networkInterfaces[networkInterface]) {
            // only record external ipv4 ips.
            if (specificNetworkInterface.family === 'IPv4' &&
              specificNetworkInterface.internal === false) {
                networkInterfacesString += networkInterfacesString !== '' ? ', ': '';
                networkInterfacesString += networkInterface + ': '  + specificNetworkInterface.address;
            }
        }
    }

    return networkInterfacesString;
};


function buildEvent(log, options) {
    // build up message to send
    var logData = log.data.join(' | ');
    var networkInterfacesString = getNetworkInterfacesString();

    var currentTime = Math.floor(Date.now() / 1000);

    var event = {
        message: logData,
        component: options.component,
        from: 'logmet-appender',
        timestamp: currentTime,
        host_ip: networkInterfacesString
    };

    return event;
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
};

function configure(config) {
    if (process.env.log4js_logmet_enabled !== 'true') return function() {};

    const options = {
        component: process.env.log4js_logmet_component || config.options && config.options.component,
        logging_token: process.env.log4js_logmet_logging_token || config.options && config.options.logging_token,
        space_id: process.env.log4js_logmet_space_id || config.options && config.options.space_id
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
};

