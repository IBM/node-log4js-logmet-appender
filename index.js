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
    tls = require('tls'),
    _ = require('lodash');

module.exports = {
    appender: appender,
    configure: configure
};

function appender(level, options, tlsOpts) {
    return function(log) {
        if (!logmetConnection.connection && !logmetConnection.connecting) {
            logmetConnection.connecting = true;
            logmetConnection.connection = tls.connect(tlsOpts, connected.bind(this, log, options));
            logmetConnection.connection.setEncoding('binary');
            logmetConnection.connection.on('error', function(err) {
                console.error('error in connection. Error: ' + JSON.stringify(err, null, 2));
                logmetConnection.connection = null;
            });
            logmetConnection.connection.on('close', function(err) {
                console.warn('Connection closed. Error: ' + JSON.stringify(err, null, 2));
                logmetConnection.connection = null;
            });
            logmetConnection.connection.on('end', function(err) {
                console.warn('Connection ended. Error: ' + JSON.stringify(err, null, 2));
                logmetConnection.connection = null;
            });
        }
        else {
            logMessage(log, options);
        }
       


    };
};

function connected(message, options) {
    _identify(function(err) {
        if (err) {
            console.error('Failed to send identity to Logmet: ' + JSON.stringify(err, null, 2));
            logmetConnection.connection = null;
        }
        else {
            _authenticate(options, function() {
                logmetConnection.connecting = false;
                logMessage(message, options);
            });
            
        }
    });
};

function formatMessage(message) {
    const buffer_size = 2  //  '1W'
        + 4                //  Number of messages, 32 Uint BE
        + 2 + 4            //  Msg delimiter + sequence
        + message.length;


        var payload = new Buffer(buffer_size);
        var offset = 0;

        payload.write(logmetConnection.WINDOW_DELIMITER, offset, logmetConnection.WINDOW_DELIMITER.length, 'binary');
        offset += logmetConnection.WINDOW_DELIMITER.length;

        payload.writeUInt32BE(1, offset);
        offset += 4;

        var message_delimiter = logmetConnection.LOG_DELIMITER;

        payload.write(message_delimiter, offset, message_delimiter.length, 'binary');
        offset += message_delimiter.length;

        payload.writeUInt32BE(logmetConnection.sequence, offset);
        offset += 4;


        payload.write(message.toString(), offset, message.length, 'binary');

        offset += message.length;

        logmetConnection.sequence += 1;
        return payload;
};

function logMessage(log, options) {
    if (!logmetConnection.connection || logmetConnection.connecting == true) {
        return setTimeout(logMessage.bind(this, log, options), 100);
    }
    var logData = log.data.join(' | ');
    const log_entry = new Map();
    log_entry.set('component', options.component);
    log_entry.set('type', log.categoryName);
    log_entry.set('message', logData);
    var currentTime = Math.floor(Date.now() / 1000);
    log_entry.set('timestamp', currentTime);
    log_entry.set('ALCH_TENANT_ID', options.space_id);

    var logBuffer = _formatToLogBuffer(log_entry);

    var logWhitelist = process.env.log4js_syslog_appender_whitelist;
    var categoriesToSend = logWhitelist && logWhitelist.split(',');

    if (logWhitelist && categoriesToSend.indexOf(log.categoryName) === -1) return;

    var formattedMessage = formatMessage(logBuffer);

    if (isOpen()) {
            logmetConnection.connection.pause();
            logmetConnection.connection.write(formattedMessage, 'binary', function onSendMessagesWriteCallback() {
                    console.log('Messages sent to Logmet...' + formattedMessage);

                    logmetConnection.connection.once('data', function handleSendMessagesReply(reply) {

                        console.log('Received data from Logmet [' + reply + ']');

                        if (reply.slice(0, logmetConnection.SUCCESS.length) === (logmetConnection.SUCCESS)) {
                            var replyBuffer = new Buffer(reply);
                            console.log('Logmet received '
                                + replyBuffer.readUInt32BE(logmetConnection.SUCCESS.length, 6) + ' messages.');
                            console.log('message sent');
                            } else {
                                console.error('Logmet rejected messages - failed to send messages.');
                        }
                    });
            });
            logmetConnection.connection.resume();
        }
};

function _formatToLogBuffer(log_data) {
    const buffer_size = sizeof_map(log_data)
        + 4                      //  1 unsigned int for message size
        + log_data.size * 8;     //  2 unsigned ints for each key and value pair (their size)

    const log_message = new Buffer(buffer_size);
    let offset = 0;

    //  Write the number of pairs
    log_message.writeUInt32BE(log_data.size, offset);
    offset += 4;    //  skip 4 bytes for the UInt32

    log_data.forEach(function processKeyValuePair(value, key) {
        //key = _.toString(key).toLowerCase();
        key = _.toString(key);
        value = _.toString(value);

        log_message.writeUInt32BE(key.length, offset);
        offset += 4;

        log_message.write(key, offset, key.length, 'binary');
        offset += key.length;

        log_message.writeUInt32BE(value.length, offset);
        offset += 4;

        log_message.write(value, offset, value.length, 'binary');
        offset += value.length;
    });

    return log_message;
}

function sizeof_map(map) {
    if ( !(map instanceof Map) ) {
        throw new TypeError('object must be a Map');
    }

    let size = 0;

    map.forEach(function processKeyValuePair(value, key) {
        size += _.toString(key).length;
        size += _.toString(value).length;
    });

    return size;
}

function isOpen() {
    return logmetConnection.connection && logmetConnection.connection.readyState === 'open';
}


var _identify = function(on_identify_callback) {
    if (isOpen()) {
        const IDENTIFIER_PREFIX = '1I';
        const identifier = logmetConnection.connection.localAddress;
        const identification_message = new Buffer(IDENTIFIER_PREFIX.length + 1 + identifier.length);

        let offset = 0;
        identification_message.write(IDENTIFIER_PREFIX, offset, IDENTIFIER_PREFIX.length, 'binary');
        offset += IDENTIFIER_PREFIX.length;

        identification_message.writeUInt8(identifier.length, offset);
        offset += 1;

        identification_message.write(identifier, offset, identifier.length, 'binary');

        logmetConnection.connection.write(identification_message, 'binary');

        on_identify_callback(null);
    } else {
        console.warn('Socket connection to logmet closed while attempting to identify.');

        on_identify_callback(new Error('Socket connection is closed, unable to identify'));
    }
};

var _authenticate = function(options, on_authenticate_callback) {
    if (isOpen()) {
        var tenant_type = '2T'; // not a super tenant.
        var tenant_id = options.space_id;
        var tenant_password = options.logging_token;

        var authentication_message = new Buffer(
            tenant_type.length
            + tenant_id.length + 1
            + tenant_password.length + 1
            );

        let offset = 0;

        authentication_message.write(tenant_type, offset, tenant_type.length, 'binary');
        offset += tenant_type.length;

        authentication_message.writeUInt8(tenant_id.length, offset);
        offset += 1;

        authentication_message.write(tenant_id, offset,
            tenant_id.length, 'binary');
        offset += tenant_id.length;

        authentication_message.writeUInt8(tenant_password.length, offset);
        offset += 1;

        authentication_message.write(tenant_password, offset,
            tenant_password.length, 'binary');

        logmetConnection.connection.write(authentication_message, 'binary', function onAuthenticationWriteCallback() {
            logmetConnection.connection.once('data', function handleAuthenticationReply(reply) {
                    if (reply.slice(0, 2) === logmetConnection.SUCCESS) {
                        logmetConnection.sequence = 1;

                        console.log('Authenticated...', reply);

                        on_authenticate_callback();
                    } else {
                        console.error('Invalid tenant authentication, check tenant id or logging token');

                        on_authenticate_callback(new Error('Failed to authenticate'));
                    }
            });
        });
    }
    else {
        console.warn('Socket closed while attempting to authenticate.');

        on_authenticate_callback(new Error('Socket connection is closed, unable to authenticate'));
    
    }
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
    return appender(level, options, tlsOpts);
};

