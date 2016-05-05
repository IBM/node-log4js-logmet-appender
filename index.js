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

function connectCircuit() {
    util.log('Logmet Appender: Re-connecting the circuit. So far we have dropped ' + 
        logmetConnection.droppedMessages + ' messages.');
    logmetConnection.circuitBreak = false;
}

function retryLogic(retryFunction, tries) {
    // initialize (or increment if already initialized) tries
    if (!tries) {
        tries = 1;
    }
    else {
        tries++;
    }

    if (tries >= 10) {
        util.log('Logmet Appender: Tried sending a message 10 times but ' + 
            'the client was not connected. Initiating circuit breaker protocol. ' + 
            'For the next hour, we will not attempt to send any messages to Logmet.');
        // circuit breaker logic - if detected bad connection, stop trying
        // to send log messages to logmet for 1 hour.

        logmetConnection.droppedMessages++;
        logmetConnection.circuitBreak = true;
        setTimeout(connectCircuit.bind(logmetConnection.circuitBreak), 60 * 60 * 1000);
        return;
    }
    setTimeout(retryFunction.bind(this, tries), 100);
    return;
}

function sendData(event, type, spaceId, tries) {

    // we are in circuit break mode. There is something wrong with the logmet connection. We won't try to
    // send any log messages to logmet until the circuit is connected again.
    if (logmetConnection.circuitBreak) {
        logmetConnection.droppedMessages++;
        return;
    }

    if (logmetConnection.connecting || !logmetConnection.connected) {
        retryLogic(sendData.bind(this, event, type, spaceId), tries);
    }
    else {
        logmetConnection.producer.sendData(event, type, spaceId, function(error, status) {
            if (error) {
                if (!status.isDataAccepted) {
                    util.log('Logmet Appender: Logmet client rejected the data. Retrying. ERROR: ' + error);
                }
                else {
                    util.log('Logmet Appender: Unknown error: ' + JSON.stringify(error));
                }
                retryLogic(sendData.bind(this, event, type, spaceId), tries);
            }
        });
    }
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

function logMessage(level, options, tlsOpts, log, tries) {
    // we are in circuit break mode. There is something wrong with the logmet connection. We won't try to
    // send any log messages to logmet until the circuit is connected again.
    if (logmetConnection.circuitBreak) {
        logmetConnection.droppedMessages++;
        return;
    }

    var event = buildEvent(log, options);

    if (!logmetConnection.connected && !logmetConnection.connecting) {
        logmetConnection.connecting = true;
        var logmetProducer = new logmet.LogmetProducer(tlsOpts.host, tlsOpts.port, options.space_id, options.logging_token, false, {bufferSize: 1000});

        logmetProducer.connect(function(error, status) {
            logmetConnection.connecting = false;
            if (error) {
              util.log('Logmet Appender: Connection with Logmet failed. ERROR: ' + error);
              retryLogic(logMessage.bind(this, level, options, tlsOpts, log), tries);
            } else if (status.handshakeCompleted) {
                util.log('Logmet Appender: LogmetClient is ready to send data.'); 
                // we are now connected.
                logmetConnection.producer = logmetProducer;
                logmetConnection.connected = true;

                sendData(event, log.categoryName, options.space_id);
            }
        });
        
    }
    else {
        sendData(event, log.categoryName, options.space_id);
    }
};

function appender(level, options, tlsOpts) {
    return logMessage.bind(this, level, options, tlsOpts);
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

