import Emittery from 'emittery';

import diff from './diff.js';
import merge from './merge.js';

export default class Concierge {

    constructor(clients = [], watchInterval = 250) {
        this.dirtyTopics = new Set();
        this.clients = clients;
        clients.forEach(this._registerClient.bind(this));

        setInterval(this.watch.bind(this), watchInterval);

        this.events = new Emittery();
    }

    // Register a client
    // This is a privaty method that shouldn't be called outside this class
    _registerClient(client) {
        client.events.on('message', (packet) => {
            this.notify(packet.topic);
        });
    }

    // Notify that some activity did happen on a topic
    notify(topic) {
        this.dirtyTopics.add(topic);
    }

    // Watch arround about what's happening
    watch() {
        const nbDirtyTopics = this.dirtyTopics.size;
        if (nbDirtyTopics === 0) {
            return;
        }

        //console.log(Array.from(this.dirtyTopics.keys()));
        for (let topic of this.dirtyTopics.keys()) {
            console.log("topic: " + topic);
            const d = diff(this.clients, topic);
            console.log(d.length);
            if (d.length < 2) continue;
            const m = merge(d);
            //console.log(m);
            this.events.emit('merge', m);
        }
        this.dirtyTopics.clear();
    }

}