import EventEmitter from "events";
import qlobber from 'qlobber';

// Kill the topic when its TTL expires

export default class LaMort {
    constructor() {
        this.timeoutsMap = new Map();

        // "Caveman" bind
        this.watch = this.watch.bind(this);

        this.events = new EventEmitter();

        this.ttlMatcher = new qlobber.Qlobber({
            separator: '/',
            wildcard_one: '+',
            wildcard_some: '#'
        });
    }

    registerTopicTTl(topic, ttl) {
        this.ttlMatcher.add(topic, ttl);
    }

    watch(name) {

        // We use the highest TTL specified for the topic
        const maxTTL = this.ttlMatcher.match(name)
            .reduce((a, b) => Math.max(a, b), 0);

        // Ignore topics with immortal messages
        if (maxTTL === 0) {
            return;
        }

        const previousTimeout = this.timeoutsMap.get(name);
        if (previousTimeout) {
            clearTimeout(previousTimeout);
        }
        const newTimeout = setTimeout(this.deathHandler.bind(this, name), maxTTL);
        this.timeoutsMap.set(name, newTimeout);
    }

    deathHandler(name) {
        this.events.emit('death', name);
    }
}