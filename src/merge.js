import log from './logger.js';
import newMatcher from './matcher.js';
import get from 'lodash.get';
import msgpack from 'msgpack-lite';
import geobuf from 'geobuf';
import Pbf from 'pbf';

function latestSelector(a, b) {
    return a.receivedTimestamp > b.receivedTimestamp ? a : b;
}

function biggestBinarySelector(a, b) {
    return Buffer.compare(a.payload, b.payload) > 0 ? a : b;
}

function biggestObjectSelector(path, a, b, objectA, objectB) {
    const valueA = get(objectA, path, -Number.MAX_VALUE);
    const valueB = get(objectB, path, -Number.MAX_VALUE);

    if (valueA > valueB) {
        return a;
    } else if (valueA < valueB) {
        return b;
    }

    return latestSelector(a, b);
}

function biggestJsonSelector(path, a, b) {
    let jsonA = {};
    let jsonB = {};

    try {
        jsonA = JSON.parse(a.payload);
    } catch (e) { }

    try {
        jsonB = JSON.parse(b.payload);
    } catch (e) { }

    return biggestObjectSelector(path, a, b, jsonA, jsonB);
}

function biggestMsgpackSelector(path, a, b) {
    let msgpackA = {};
    let msgpackB = {};

    try {
        msgpackA = msgpack.decode(a.payload);
    } catch (e) { }

    try {
        msgpackB = msgpack.decode(b.payload);
    } catch (e) { }

    return biggestObjectSelector(path, a, b, msgpackA, msgpackB);
}

function biggestGeobufSelector(path, a, b) {
    let geobufA = {};
    let geobufB = {};

    try {
        geobufA = geobuf.decode(new Pbf(a.payload));
    } catch (e) { }

    try {
        geobufB = geobuf.decode(new Pbf(b.payload));
    } catch (e) { }

    return biggestObjectSelector(path, a, b, geobufA, geobufB);
}


function selectPacket(diff, selector) {
    // TODO empty payloads that are more recents than all other messages ?
    let selectedPacked;

    diff.forEach(([packet, clients]) => {
        if (packet && packet.payload) {
            if (selectedPacked) {
                selectedPacked = selector(packet, selectedPacked);
            } else {
                selectedPacked = packet;
            }
        }
    });

    return selectedPacked;
}

export default class Merge {
    constructor(topics) {
        const mergeMatcher = this.mergeMatcher = newMatcher();

        topics.forEach((topic) => {
            const mergeInfos = topic.merge.split(':');
            const algorithm = mergeInfos[0];
            const settings = mergeInfos[1];

            mergeMatcher.add(topic.topic, {
                algorithm,
                settings,
            });
        });
    }

    identifyAlgorithm(topic) {
        const match = this.mergeMatcher.match(topic);

        // Sometimes, the match returns more than one value so we convert everything to a map
        const matchMap = new Map(match.map(mergeInfos => [mergeInfos.algorithm, mergeInfos.settings]));

        // We then check the values in this order, giving more importance to algorithms
        // tested first
        if (matchMap.has('jsonbiggest')) return this.jsonbiggest.bind(this, matchMap.get('jsonbiggest'));
        if (matchMap.has('msgpackbiggest')) return this.msgpackbiggest.bind(this, matchMap.get('msgpackbiggest'));
        if (matchMap.has('geobufbiggest')) return this.geobufbiggest.bind(this, matchMap.get('geobufbiggest'));
        if (matchMap.has('biggest')) return this.biggest;
        if (matchMap.has('lastwin')) return this.lastwin;
        if (matchMap.has('random')) return this.random;

        // We use the lastwin algorithm as a fallback
        return this.lastwin;
    }



    // Biggest can be useful to compare two values
    // The bigger one is prioritized
    // This can be useful with data containing a timestamp or a
    // counter that is incremented
    // Should not be used for temperatures or similar
    biggest(diff) {
        return selectPacket(diff, biggestBinarySelector)
    }

    jsonbiggest(settings, diff) {
        return selectPacket(diff, biggestJsonSelector.bind(null, settings));
    }

    msgpackbiggest(settings, diff) {
        return selectPacket(diff, biggestMsgpackSelector.bind(null, settings));
    }

    geobufbiggest(settings, diff) {
        return selectPacket(diff, biggestGeobufSelector.bind(null, settings));
    }

    lastwin(diff) {
        return selectPacket(diff, latestSelector);
    }

    // Chaos
    // Should probably not be used
    random(diff) {
        const packets = diff.map(([packet, clients]) => packet).filter(packet => !!packet);
        return packets[Math.floor(Math.random() * packets.length)];
    }

    process(topic, diff) {

        const algorithm = this.identifyAlgorithm(topic);
        const selectedPacked = algorithm(diff);

        log.debug(`Synchronizing "${topic}" with "${selectedPacked.payload}"`);

        return selectedPacked;
    }
}