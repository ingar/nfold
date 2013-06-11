Multi-player space shooter!

```
$ git clone git@github.com:ingar/nfold.git
$ cd nfold
$ npm install
$ node app.js
```

Responsibilities:
World - Contain Entities and answer queries about where they are
Simulation - Update Entity state, emit events about the Entities
Game - Insert Entities into the world based on Player input, main input, sim, render loop