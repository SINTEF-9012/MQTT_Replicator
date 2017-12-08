import shortid from 'shortid';
import sillyid from 'sillyid';
import mqtt from 'mqtt';
import Emittery from 'emittery';

import Packet from './packet.js';

export default class Client {

    constructor(name, path, mqttOptions) {
        this.name = name;
        this.path = path;
        this.mqttOptions = mqttOptions || {};

        // Generating a beautiful clientId
        if (!mqttOptions.clientId) {
            const sid = new sillyid(undefined, '_');
            this.mqttOptions.clientId = `${name.toLowerCase()}_${sid.generate().toLowerCase()}_mqttreplicator_${shortid.generate()}`;
        }

        // The cache is used to store incomming packets
        this.cache = new Map();

        this.events = new Emittery();

        this.lastConnectionTimestamp = 0;
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
        this.mqttClient.subscribe(topic, { qos });
    }

    publish(packet, retain = false, ignoreCache = false) {
        if (!this.mqttClient) return;

        const topic = packet.topic;
        if (!ignoreCache) {
            const previousPacket = this.cache.get(topic);
            if (previousPacket && Packet.equals(previousPacket, packet)) {
                //console.log(previousPacket.payload.toString(), packet.payload.toString())
                console.log("ignored duplicate", topic, this.name);
                return;
            }
        }

        //console.log("Message on " + packet.topic + ": " + packet.payload.toString());
        this.mqttClient.publish(packet.topic, packet.payload, {
            qos: this.mqttOptions.maxQos ? Math.min(packet.qos, this.mqttOptions.maxQos) : packet.qos,
            retain,
        });

        this.cache.set(topic, packet);
    }

    onConnect() {
        console.log(`${this.name} has connected.`);
        this.lastConnectionTimestamp = +new Date();
    }

    onMessage(topic, message, packet) {
        console.log(`${this.name}|${topic}|${message}|${packet.qos}|${packet.retain}`);

        // We ignore system packets 
        if (topic.startsWith("$SYS/") || topic.startsWith("ActiveMQ/")) {
            console.log("sys");
            return;
        }

        const previousPacketOnThisTopic = this.cache.get(topic);

        // If it's a duplicate
        if (previousPacketOnThisTopic && Packet.equals(previousPacketOnThisTopic, packet)) {
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
        console.log(`${this.name} has encountered an error: ${error}`);
    }

    onClose() {
        console.log(`${this.name} has closed.`);
    }

    getPacketFromTopic(topic) {
        return this.cache.get(topic);
    }
}