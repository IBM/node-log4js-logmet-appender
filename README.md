# node-log4js-logmet-appender [![Build Status](https://travis-ci.org/IBM/node-log4js-logmet-appender.svg?branch=master)](https://travis-ci.org/IBM/node-log4js-logmet-appender)
Logmet appender for node-log4js

## Installation
```
npm i log4js-logmet-appender --save
```

## Configuration
Set the following environment variables:
```
export log4js_logmet_enabled=true
export log4js_logmet_component=otc-api-local-test
export log4js_logmet_logging_token=<secureToken>
export log4js_logmet_space_id=<yourSpaceId>
export log4js_logmet_logging_host=logs.stage1.opvis.bluemix.net
export log4js_logmet_logging_port=9091
```
To get the secure token and space id see the instructions here: https://pages.github.ibm.com/alchemy-logmet/getting-started/authentication.html

## Usage
 You must be using [log4js-node](https://github.com/nomiddlename/log4js-node) and must call `log4js.configure('/path/to/log4js.json')`
somewhere in your code.

You must add the following to the list of appenders in your `log4js.json` file:

```
{
  "type": "log4js-logmet-appender",
  "options": {
    "level": "INFO"
  }
}
 ```
 You may substitute `INFO` with your own level above (for ex: `WARN`, `ERROR`, etc). Please check [log4js](https://www.npmjs.com/package/log4js) documentation for level based filtering since there might be some differences between versions.  

To use custom fields to send logmet, you should define `eventMap` object under `options`. If it is not defined then default mapping is used. 

Default Event object (object sending to Logmet) consists of `component`, `host-ip`, `instance-id`, `loglevel`, `logtime`, `message` values. 

For custom fields, values can be map are given below:
- `component`: The name of your component / service. 
- `host-ip`: The cloudfoundary ip defined as environmental variable CF_INSTANCE_IP
- `instance-id`: The cloudfounrday index defined as environmental variable CF_INSTANCE_INDEX
- `loglevel`: Logging level string. (exp. TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
- `logtime`: Logging time as ISO string format (exp. 2011-10-05T14:48:00.000Z)
- `message`: Log message based on log4js configuration. If log data is multiple string, then is is merged with ` | ` delimiter. 
- `process.*` : To reach variables from `process` within two layer. (exp. process.pid, process.env.USER)
- `data.*` : To reach variables from optional `object` type from log data within two layer. This is useful, if you want to pass a custom object and use the value in your logs withing a custom field. (exp. You can pass `{clientId: '123'}` object to log and map it as `CLIENT_ID: data.clientId`)

Example `log4js.json` file given below (for log4js version 0.6.38 and below).
```
{
  "appenders": [
    {
      "type": "console",
      "layout": { "type": "coloured" }
    },
    { 
      "type": "logLevelFilter", 
      "level": "INFO", 
      "appender": {
        "type": "log4js-logmet-appender",
        "options": {
          "eventMap": {
            "TIMESTAMP": "logtime",
            "PRIORITY": "loglevel",
            "MESSAGE": "message",
            "SERVICE": "component",
            "_PID": "process.pid",
            "USER": "process.env.USER",
            "CUSTOM_ENV": "process.env.CUSTOM_VARIABLE"
            "TEST": "data.test",
            "TEST12": "data.test1.test2"
          }
        }
     }
   }
  ],
  "replaceConsole": true
}
```
And example `debug` logging call;
```
var log4js = require('log4js');
log4js.configure('/path/to/log4js.json');
var logger = log4js.getLogger();
logger.level = 'debug';
const objectToTest = { test: 'test 1 is good', test1: { test2: 'test 2 is better' } };
logger.debug("Some debug messages", objectToTest);
```
This example prints coloured console log and filters `INFO` levels for `log4js-logmet-appender` appender. 
`eventMap` determines the custom mapping for the object sending logmet. Values will be replaced based on event mapping and will send to logmet. 

Example data to be sent to logmet based on given `log4js.json`
```
{
    "TIMESTAMP": "2011-10-05T14:48:00.000Z",
    "PRIORITY": "INFO",
    "MESSAGE": "Your log message",
    "SERVICE": "name of your component",
    "_PID": 1234,
    "USER": "Username of the process",
    "CUSTOM_ENV": "Environmental value defined as CUSTOM_VARIABLE",
    "TEST": "test 1 is good",
    "TEST12": "test 2 is better"
}
```

## Pending work
No automated tests currently

## License

[The MIT License (MIT)](LICENSE.txt)

## Contributing

Contributions are welcome via Pull Requests. Please submit your very first Pull Request against the [Developer's Certificate of Origin](DCO.txt), adding a line like the following to the end of the file... using your name and email address of course!

```
Signed-off-by: John Doe <john.doe@example.org>
```