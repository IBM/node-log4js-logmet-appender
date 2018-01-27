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
  "type": "log4js-logmet-appender"
}
 ```

Using this configuration log messages to logmet will contain the following fields:
- `component`: value of the environment variable `log4js_logmet_component`
- `host-ip`: value of the environmental variable `CF_INSTANCE_IP`
- `instance-id`: value of the environmental variable `CF_INSTANCE_INDEX`
- `loglevel`: logging level (eg. `INFO`)
- `logtime`: time message was logged in ISO string format (eg. `2011-10-05T14:48:00.000Z`)
- `message`: log message/data, data array elements are concatenated with ` | ` delimeter

### Custom Fields

To use custom fields, you should define an `options.fields` object.
Note: If a `fields` object is defined, none of the default fields will be sent.

You can choose names for the log level (`"level_field_name"`), timestamp (`"timestamp_field_name"`) and data/message (`"data_field_name"`) fields. You may also add more custom static fields (under the `"static_fields"` object), fields that have node `process` object properties as values (under the `"process_fields"` object), and fields that have environment variables as values (under the `"env_fields"` object).

Example with custom fields:
```
{ 
  "type": "log4js-logmet-appender",
  "options": {
    "fields": {
      "level_field_name": "PRIORITY",
      "timestamp_field_name": "TIMESTAMP",
      "data_field_name": "MESSAGE"

      "static_fields": {
        "COMPONENT": "otc-api"
      },

      "process_fields": {
        "PROCESS_ID": "pid"
      },

      "env_fields": {
        "INSTANCE_INDEX": "CF_INSTANCE_INDEX"
      }
    }
  }
}
```

You may also define custom dynamic fields by setting `options.fields` `"data_field_augment"` to `true` and passing a single object argument to the logger. Object keys will be mapped to field names.

Example: `logger.info({ MESSAGE: "hello", FLAG: "urgent" });`

Note: If `"data_field_augment"` is set to `true` and a single object argument is NOT passed to the logger, the log message/data will still be sent as a regular field if `"data_field_name"` is also set.

## Pending work
No automated tests currently

## License

[The MIT License (MIT)](LICENSE.txt)

## Contributing

Contributions are welcome via Pull Requests. Please submit your very first Pull Request against the [Developer's Certificate of Origin](DCO.txt), adding a line like the following to the end of the file... using your name and email address of course!

```
Signed-off-by: John Doe <john.doe@example.org>
```
