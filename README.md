### Multi-player space shooter!

```
$ git clone git@github.com:ingar/nfold.git
$ cd nfold
$ npm install
$ node app.js
```

### Browserify
[Browserify](http://browserify.org) is used to build the client.
```
npm install -g browserify
browserify js/client/pageinit.js -o js/build/nfold_client.js
```