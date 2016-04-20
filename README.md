# node-log4js-logmet-appender
Logmet appender for node-log4js

## Configuring
 * Set the following environment variables:
 ```
log4js_logmet_enabled = true
log4js_logmet_component = otc-api-local-test
log4js_logmet_logging_token = <secureToken>
log4js_logmet_space_id = <yourSpaceId>
log4js_logmet_logging_host = 'logs.stage1.opvis.bluemix.net'
log4js_logmet_logging_port = 9091
```
 * To get the secure token and space id see the instructions here: https://pages.github.ibm.com/alchemy-logmet/getting-started/authentication.html
 * Any Node apps using this library must have checked in an `.npmrc` file configured
 with the private IBM npm registry as follows:
 ```
 @alchemy-kms:registry=http://173.192.225.82:8080
 @alchemy-kms:always-auth=true
 //173.192.225.82:8080/:_authToken=${IBM_REGISTRY_NPM_TOKEN}
 ```
  * Instructions on how to get a `IBM_REGISTRY_NPM_TOKEN` token above are [here](https://github.ibm.com/fed/npm#setting-up-for-private-npm-modules)

## Usage
 * You must be using [log4js-node](https://github.com/nomiddlename/log4js-node) and must call `log4js.configure('/path/to/log4js.json')`
somewhere in your code.
 * You must add the following to the list of appenders in your `log4js.json` file:
 ```
 {
            "type": "node-log4js-logmet-appender",
            "options": {
                "level": "INFO"
            }
}
 ```
  * You may substitute `INFO` with your own level above (for ex: `WARN`, `ERROR`, etc)
  * You may optionally override the level above by setting the environment variable `log4js_logmet_level`

## Outstanding Issues
 * https://github.ibm.com/Alchemy-Key-Protect/logmet-client/issues/16
