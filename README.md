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

You may substitute `INFO` with your own level above (for ex: `WARN`, `ERROR`, etc)

## Pending work
No automated tests currently

## License

[The MIT License (MIT)](LICENSE.txt)

## Contributing

Contributions are welcome via Pull Requests. Please submit your very first Pull Request against the [Developer's Certificate of Origin](DCO.txt), adding a line like the following to the end of the file... using your name and email address of course!

```
Signed-off-by: John Doe <john.doe@example.org>
```