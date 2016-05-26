(function() {
    'use strict';

    /*
    * Module dependencies.
    */
    var EventEmitter = require('events').EventEmitter;
    var hooks        = require('hooks-fixed');
    //var utils        = require('./utils');


    class Entity extends EventEmitter {
        constructor(data, id) {
            super();

            this.setMaxListeners(0);
            this.schema = this.constructor.schema;

            // Adding 'pre', 'post' and 'hooks' method to our Entity (hooks-fixed)
            Object.keys(hooks).forEach((k) => {
                this[k] = hooks[k];
            });

            init(this, data, id);

            registerHooksFromSchema(this);
        }
    }

    // Private
    // -------
    function init(self, data, id) {
        self.entityData = buildEntityData(data);

        if (self.schema.paths.hasOwnProperty('modifiedOn')) {
            self.entityData.modifiedOn = new Date();
        }

        if (id) {
            id  = isNaN(parseInt(id, 10)) ? id : parseInt(id, 10);
            self.entityKey = self.constructor.ds.key([self.constructor.entityName, id]);
        } else {
            self.entityKey = self.constructor.ds.key(self.constructor.entityName);
        }
    }

    function buildEntityData(data) {
        var entityData = {};

        if (data) {
            Object.keys(data).forEach(function (k) {
                entityData[k] = data[k];
            });
        }

        return entityData;
    }

    function registerHooksFromSchema(self) {
        var queue = self.schema && self.schema.callQueue;
        if (!queue.length) {
            return self;
        }

        var toWrap = queue.reduce(function(seed, pair) {
            var args = [].slice.call(pair[1]);
            var pointCut = pair[0] === 'on' ? 'post' : args[0];

            if (!(pointCut in seed)) {
                seed[pointCut] = {post: [], pre: []};
            }

            if (pair[0] === 'on') {
                seed.post.push(args);
            } else {
                seed[pointCut].pre.push(args);
            }

            return seed;
        }, {post: []});

        // 'post' hooks
        toWrap.post.forEach(function(args) {
            self.on.apply(self, args);
        });
        delete toWrap.post;

        Object.keys(toWrap).forEach(function(pointCut) {

            if (!self[pointCut]) {
                return;
            }
            toWrap[pointCut].pre.forEach(function(args) {
                args[0] = pointCut;
                self.pre.apply(self, args);
            });
        });

        return self;
    }

    module.exports = exports = Entity;
})();