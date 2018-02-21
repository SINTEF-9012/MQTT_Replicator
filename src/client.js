import shortid from 'shortid';
import sillyid from 'sillyid';
import mqtt from 'mqtt';
import EventEmitter from 'events';

import Packet from './packet.js';
import log from './logger.js';
import newMatcher from './matcher.js';

export default class Client {

    constructor(name, path, mqttOptions) {
        this.name = name;
        this.path = path;
        this.mqttOptions = mqttOptions || {};
        this.nbConnections = 0;
        this.nbDisconnections = 0;

        // Generating a beautiful clientId
        if (!mqttOptions.clientId) {
            const sid = new sillyid(undefined, '_');
            this.mqttOptions.clientId = `${name.toLowerCase()}_${sid.generate().toLowerCase()}_mqttreplicator_${shortid.generate()}`;
        }

        // The cache is used to store incomming packets
        this.cache = new Map();

        this.events = new EventEmitter();

        this.lastConnectionTimestamp = 0;

        this.qosMatcher = newMatcher();
        this.blacklistMatcher = newMatcher();
        this.retainMatcher = newMatcher();
    }

    connect() {
        this.mqttClient = mqtt.connect(this.path, this.mqttOptions);
        this.mqttClient.on('connect', this.onConnect.bind(this));
        this.mqttClient.on('message', this.onMessage.bind(this));
        this.mqttClient.on('close', this.onClose.bind(this));
        this.mqttClient.on('error', this.onError.bind(this));
    }

    subscribe(topic, qos = 1) {
        if (!this.mqttClient) return;
        this.mqttClient.subscribe(topic, {
            qos: this.mqttOptions.maxQos ? Math.min(qos, this.mqttOptions.maxQos) : qos,
        });
    }

    publish(packet, ignoreCache = false) {
        if (!this.mqttClient) return;

        const topic = packet.topic;

        if (this.blacklistMatcher.test(topic, true)) {
            log.debug(`Blacklisted topic "${topic}" for ${this.name}`);
            return;
        }

        if (!ignoreCache) {
            const previousPacket = this.cache.get(topic);
            if (previousPacket && Packet.equals(previousPacket, packet)) {
                log.debug(`Ignored duplicate on topic "${topic}" for ${this.name}`);
                return;
            }
        }

        let retain = this.retainMatcher.test(topic, true);

        log.debug(`Publishing message on topic "${topic}" with payload "${packet.payload}" for ${this.name}`)
        this.mqttClient.publish(packet.topic, packet.payload, {
            qos: this.mqttOptions.maxQos ? Math.min(packet.qos, this.mqttOptions.maxQos) : packet.qos,
            retain,
        });

        this.cache.set(topic, packet);
    }

    onConnect() {
        log.info(`Client ${this.name} has connected.`)
        this.lastConnectionTimestamp = +new Date();
        ++this.nbConnections;
    }

    onMessage(topic, message, packet) {
        log.debug(`Received message on topic "${topic}" with payload "${message}",${packet.retain ? ' retained' : ''} and qos ${packet.qos} for ${this.name}`);

        // We ignore system packets 
        if (topic.startsWith("$") || topic.startsWith("ActiveMQ/")) {
            return;
        }

        const previousPacketOnThisTopic = this.cache.get(topic);

        // If it's a duplicate
        if (previousPacketOnThisTopic && Packet.equals(previousPacketOnThisTopic, packet)) {
            this.events.emit('duplicate', packet);
            return;
        }

        // Create a new packet with only the clean required information
        let cleanPacket = {
            receivedTimestamp: +new Date(),
            qos: packet.qos,
            topic: packet.topic,
            payload: packet.payload,
        };

        // Set the cache
        this.cache.set(topic, cleanPacket);

        // Broadcast the events
        this.events.emit('message', cleanPacket);
        this.events.emit(previousPacketOnThisTopic ? 'update' : 'new', cleanPacket);

    }

    onError(error) {
        log.error(`Client ${this.name} has encountered an error: ${error}.`);
    }

    onClose() {
        ++this.nbDisconnections;
        log.warn(`Client ${this.name} has disconnected ${this.nbDisconnections} times.`);

        // Increment the client ID because some Message Broker refuses new connections with existing
        // clients IDs
        if (!this.mqttOptions._clientId) {
            this.mqttOptions._clientId = this.mqttOptions.clientId;
        }

        this.mqttOptions.reconnectPeriod = 1000 * Math.min(this.nbDisconnections, 15);
        this.mqttOptions.clientId = this.mqttOptions._clientId + '-' + this.nbDisconnections;
    }

    getPacketFromTopic(topic) {
        return this.cache.get(topic);
    }

    setTopicsQos(topics) {
        topics.forEach((topic) => {
            this.qosMatcher.add(topic.topic, topic.qos);
        });
    }

    setTopicsBlacklist(topics) {
        topics.forEach((topic) => {
            this.blacklistMatcher.add(topic.topic, true);
        });
    }

    setTopicsRetain(topics) {
        topics.forEach((topic) => {
            this.retainMatcher.add(topic.topic, true);
        });
    }
}