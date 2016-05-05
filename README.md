# node-log4js-logmet-appender
Logmet appender for node-log4js

## Configuring
 * Set the following environment variables:

 ```
    export log4js_logmet_enabled=true
    export log4js_logmet_component=otc-api-local-test
    export log4js_logmet_logging_token=<secureToken>
    export log4js_logmet_space_id=<yourSpaceId>
    export log4js_logmet_logging_host=logs.stage1.opvis.bluemix.net
    export log4js_logmet_logging_port=9091
```

 * You may also optionally set one of the following env vars for info and debug level logging:
```
 export log4js_logmet_info=true
 export log4js_logmet_debug=true
```
 * To get the secure token and space id see the instructions here: https://pages.github.ibm.com/alchemy-logmet/getting-started/authentication.html
 * Any Node apps using this library must have checked in an `.npmrc` file configured
 with the private IBM npm registry as follows:

 ```
   @logmet-clients:registry=${IBM_NPM_REGISTRY}
   @logmet-clients:always-auth=true
   //173.192.225.82:8080/:_authToken=${IBM_NPM_REGISTRY_TOKEN}
 ```

  * Instructions on how to get a `IBM_REGISTRY_NPM_TOKEN` token above are [here](https://github.ibm.com/fed/npm#setting-up-for-private-npm-modules)

   * After you run the `npm login` command described in the link above, this will create a `.npmrc` file in your home directory. Next do:
     * `cat ~/.npmrc`
     * Now set the following two environment variables on your system & delivery pipeline:

```
IBM_NPM_REGISTRY: http://173.192.225.82:8080
IBM_NPM_REGISTRY_TOKEN: <token from `cat ~/.npmrc`>
```

You should now be set for running `npm install` in this repo.

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

## Pending work
 * No automated tests currently
