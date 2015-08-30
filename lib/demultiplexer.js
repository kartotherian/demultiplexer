'use strict';

var BBPromise = require('bluebird');
var _ = require('underscore');
var core = require('kartotherian-core');
var Err = core.Err;


function Demultiplexer(uri, callback) {
    var self = this;
    BBPromise.try(function () {
        var query = core.normalizeUri(uri).query;
        var sources = [];
        // process sourceN, fromN, beforeN - parse them into [{source:..., from:..., before:...}, ...]
        _.each(query, function (val, key) {
            _.each(['source', 'from', 'before'], function (type) {
                if (key.substr(0, type.length) === type) {
                    var ind = core.strToInt(key.substr(type.length));
                    // Assume that there can't be more than maxZoom different sources
                    if (!core.isValidZoom(ind)) {
                        throw new Err('Unexpected key "%s"', key);
                    }
                    if (type !== 'source') {
                        val = core.strToInt(val);
                        if (!core.isValidZoom(val)) {
                            throw new Err('Invalid zoom "%s"', val);
                        }
                    }
                    if (!sources[ind]) {
                        sources[ind] = {};
                    }
                    sources[ind][type] = val;
                }
            });
        });

        sources = _.sortBy(_.filter(sources), function (v) {
            return v.from;
        });
        var lastZoom;
        _.each(sources, function (v) {
            if (v.source === undefined || v.from === undefined || v.before === undefined) {
                throw new Err('All three values must be present - "source", "from", and "before"', key);
            }
            if (v.from >= v.before) {
                throw new Err('source\'s "from" must be less than "before"');
            }
            if (lastZoom === undefined) {
                lastZoom = v.before;
            } else if (v.from !== lastZoom) {
                throw new Err('Not all zoom levels are covered, or there is an overlap"');
            }
        });

        self.sources = sources;
        return core.mapSequentialAsync(sources, function (src) {
            return core.loadSource(src.source, Demultiplexer._tilelive).then(function (handler) {
                src.handler = handler;
            });
        });
    }).return(this).nodeify(callback);
}

Demultiplexer.prototype.getTile = function(z, x, y, callback) {
    var self = this;
    return BBPromise.try(function () {
        if (z < self.sources[0].from || z >= self.sources[self.sources.length - 1].before) {
            core.throwNoTile();
        }
        var srcInd = _.sortedIndex(self.sources, {from: z}, function (v) {
            return v.from;
        });
        return self.sources[srcInd - 1].handler.getTileAsync(z, x, y);
    }).nodeify(callback, {spread: true});
};

Demultiplexer.prototype.getInfo = function(callback) {
    return this.sources[0].handler.getInfo(callback);
};


Demultiplexer.registerProtocols = function(tilelive) {
    Demultiplexer._tilelive = tilelive;
    tilelive.protocols['demultiplexer:'] = Demultiplexer;
};

module.exports = Demultiplexer;
