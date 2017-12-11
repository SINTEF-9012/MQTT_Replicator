import Emittery from 'emittery';
import EventEmitter from 'events';

import diff from './diff.js';
import merge from './merge.js';

export default class Concierge {

    constructor(clients = [], mort, watchInterval = 250) {
        // Set of all the active topics (were we received messages)
        // Reset after every watch
        this.activeTopics = new Set();

        // Set of all the dirty topics
        // (were we received messages with different values)
        // Reset after every watch
        this.dirtyTopics = new Set();

        // Topics that died
        // Reset after every watch
        this.deadTopics = new Set();

        // Manage the MQTT clients to watch
        this.clients = clients;
        clients.forEach(this._registerClient.bind(this));

        // Event handler, using emittery for no good reason
        //this.events = new Emittery();
        this.events = new EventEmitter();

        // La mort (the death) is responsible to kill and destroy
        // inactive topics when their time to live (ttl) is finished.
        this.mort = mort;
        this.mort.events.on('death', (topic) => {
            this.deadTopics.add(topic);
        });

        // Start the watch interval
        setInterval(this.watch.bind(this), watchInterval);

    }

    // Register a client
    // This is a privaty method that shouldn't be called outside this class
    _registerClient(client) {
        client.events.on('message', (packet) => {
            // Notify that some activity did happen on a topic
            this.activeTopics.add(packet.topic);
            this.dirtyTopics.add(packet.topic);
        });

        // Duplicate messages do not have a message event.
        client.events.on('duplicate', (packet) => {
            if (packet.payload !== undefined && packet.payload.length !== 0) {
                this.activeTopics.add(packet.topic);
                // We do not register it as a dirty topic though
            }
        });
    }

    // Watch arround about what's happening
    watch() {
        if (this.activeTopics.size !== 0) {

            this.activeTopics.forEach(topic => {
                this.mort.watch(topic);

                // Unlikely case when we just received a message
                // in a dead topic
                this.deadTopics.delete(topic);
            });

            this.activeTopics.clear();
        }

        if (this.deadTopics.size !== 0) {
            this.deadTopics.forEach(topic => {
                this.events.emit('sync', {
                    receivedTimestamp: +new Date(),
                    topic,
                    payload: '',
                    qos: 1,
                    retain: true,
                });
            });
            this.deadTopics.clear();
        }

        if (this.dirtyTopics.size !== 0) {
            this.dirtyTopics.forEach(topic => {
                console.log("topic: " + topic);

                const d = diff(this.clients, topic);
                console.log("==================", d.length);
                console.log(d);
                if (d.length < 2) return;
                const m = merge(d);
                console.log("++++++++++++++++++");
                console.log("++++++++++++++++++", m);
                //console.log(m);
                this.events.emit('sync', m);


            })
            this.dirtyTopics.clear();
        }
    }

}