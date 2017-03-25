[![Build Status](https://travis-ci.org/kartotherian/demultiplexer.svg?branch=master)](https://travis-ci.org/kartotherian/demultiplexer)

# @kartotherian/demultiplexer
Tile source that directs tile requests to different tile sources depending on the zoom level

## Usage examples

Scenario: There are two different tile sources, one with the low-zoom earth imagery, and another with the detailed vector-based high-zoom data. Demultiplexer would allow us to return low zoom tiles (e.g. before zoom 6) from one source, and high zoom tiles from another.

```
storeLow:
  uri: cassandra://...

storeHigh:
  uri: cassandra://...

mix:
  uri: demultiplexer://
  params:
    source1: {ref: storeLow}
    from1: 0
    before1: 6
    source2: {ref: storeHigh}
    from2: 6
    before2: 18
```

fromN is inclusive, beforeN is exclusive. Configuration must specify a non-duplicate source for every zoom level between minimum and maximum, but minimum may be non-zero.

See https://github.com/kartotherian/kartotherian
