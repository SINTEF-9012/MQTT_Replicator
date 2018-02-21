import log from './logger.js';
import newMatcher from './matcher.js';
import get from 'lodash.get';

function latestSelector(a, b) {
    return a.receivedTimestamp > b.receivedTimestamp ? a : b;
}

function biggestBinarySelector(a, b) {
    return Buffer.compare(a.payload, b.payload) > 0 ? a : b;
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

    const valueA = get(jsonA, path, -Number.MAX_VALUE);
    const valueB = get(jsonB, path, -Number.MAX_VALUE);

    if (valueA > valueB) {
        return a;
    } else if (valueA < valueB) {
        return b;
    }

    return latestSelector(a, b);
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

    geobufbiggest(settings, diff) {
        return biggest(diff);
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