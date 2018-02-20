import log from './logger.js';
import newMatcher from './matcher.js';

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

        // TODO empty payloads that are more recents than all other messages ?
        let selectedPacked;

        diff.forEach(([packet, clients]) => {
            if (packet && packet.payload) {
                if (selectedPacked) {
                    let diff = Buffer.compare(packet.payload, selectedPacked.payload);
                    if (diff > 0) {
                        selectedPacked = packet;
                    }
                } else {
                    selectedPacked = packet;
                }
            }
        });

        return selectedPacked;
    }

    jsonbiggest() {

    }

    geobufbiggest() {

    }

    lastwin(diff) {
        let maxT = 0;
        let selectedPacked;

        diff.forEach(([packet, clients]) => {
            let t = packet && packet.receivedTimestamp || 0;
            if (t > maxT) {
                selectedPacked = packet;
                maxT = t;
            }
        });

        return selectedPacked;
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