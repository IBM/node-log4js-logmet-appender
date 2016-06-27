# node-log4js-logmet-appender
Logmet appender for node-log4js


## Installation / upgrade
* Installation:
```
npm install git+https://github.ibm.com/org-ids/node-log4js-logmet-appender#<LatestTag> --save
```
 * If you use shrinkwrap then `npm shrinkwrap` after.
* Upgrade:

```
npm uninstall @org-ids/log4js-logmet-appender --save
npm install git+https://github.ibm.com/org-ids/node-log4js-logmet-appender#<LatestTag> --save
```
  * If you use shrinkwrap then `npm shrinkwrap` after.

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

## Pipeline configuration
* You must shrinkwrap your dependencies using `npm shrinkwrap` if you want
  to use this appender. Shrinkwrapping dependencies will not only lock down the
  direct dependencies of your node app but also your dependencies' dependencies
  (such as logmet-client for nodejs).
* At the time of this writing, the default npm version in the pipeline is 2.x. 
  However, in order for a pipeline build with this appender to be successful 
  you must use at least npm `v3.5.2`. Below is an example script that should  
  be run in your build stage prior to any `npm install`.

 ```
  #!/bin/bash

 set +x

 # install dependencies (node 4.2.x, npm 3.5.2)
 npmPath=$(which npm)

 if [[ $? = 0 ]]; then
   npmPath=$(dirname "$npmPath")
 else
   echo "No npm, something must seriously be wrong."
   exit 1
 fi
 npm install -g npm@3.5.2

 # Set up path for dependencies.
 export PATH="$npmPath":/opt/IBM/node-v4.2/bin:"$PATH"

 npm -v
 ```
* Now that the right npm version is installed, we must configure a GitHub Whitewater
 Enterprise user and their access token as part of the pipeline env vars so that we 
 can inject auth into the package.json and shrinkwrap using those credentials.
 Many pipelines do this by using the idsorg user id and access token (for example:
 `IDS_USER=idsorg` and `IDS_PASS=<idsorg's access token in GHE Whitewater>`). Use
 the credentials in the build stage by adding the following after the above scriptlet 
 (the script we run below can be examined
 [here](https://github.ibm.com/org-ids/otc-deploy/blob/master/cf-apps/common/pipeline.build.sh)):

 ```
 git clone "https://$IDS_USER:$IDS_PASS@github.ibm.com/org-ids/otc-deploy"
 bash -x otc-deploy/cf-apps/otc-api/pipeline.build.sh
 ```
* Now your build stage should finally pass. In case your deploys to cf are now failing,
 you may need to modify the `engines` statement in your package.json to include an npm engine
 version of `3.8.0` or later.

## Usage
 * You must be using [log4js-node](https://github.com/nomiddlename/log4js-node) and must call `log4js.configure('/path/to/log4js.json')`
somewhere in your code.
 * You must add the following to the list of appenders in your `log4js.json` file:

 ```
 {
            "type": "@org-ids/log4js-logmet-appender",
            "options": {
                "level": "INFO"
            }
}
 ```

  * You may substitute `INFO` with your own level above (for ex: `WARN`, `ERROR`, etc)
  * You may optionally override the level above by setting the environment variable `log4js_logmet_level`

## Pending work
 * No automated tests currently
