import starter from './starter.js';
import Concierge from './concierge.js';

const { clients, mergeFrequencyHz, topics } = starter();

const concierge = new Concierge(clients, (1.0 / mergeFrequencyHz) * 1000.0);

function broadcast(packet, clientToIgnore = null) {
    clients.forEach((client) => {
        if (client !== clientToIgnore) {
            client.publish(packet);
        }
    });
}



clients.forEach((client) => {

    client.connect();

    const topicsPublishBlacklist = [];
    const topicsPublishRetainList = [];
    const topicsPublishQosList = [];
    const topicsPublishTTLList = [];

    topics.forEach((topic) => {
        // Subscribe if whitelisted or not blacklisted,
        // and that subscription is not disabled
        if (!topic.no_sub &&
            !((topic.subscribeWhitelist && !topic.subscribeWhitelist.has(client.name)) ||
                (topic.subscribeBlacklist && topic.subscribeBlacklist.has(client.name)))) {
            client.subscribe(topic.topic, topic.qos);
        }

        // Generate list of blacklist topics to publish in
        if ((topic.publishWhitelist && !topic.publishWhitelist.has(client.name)) ||
            (topic.publishBlacklist && topic.publishBlacklist.has(client.name))) {
            topicsPublishBlacklist.push(topic);
        } else {
            topicsPublishQosList.push(topic);
            topicsPublishTTLList.push(topic);
            if (topic.retain) {
                topicsPublishRetainList.push(topic);
            }
        }

    });

    client.setTopicsQos(topicsPublishQosList);
    client.setTopicsTTL(topicsPublishTTLList);
    client.setTopicsBlacklist(topicsPublishBlacklist);
    client.setTopicsRetain(topicsPublishRetainList);

    //client.subscribe("#", 2);
    /*client.events.on('message', (packet) => {
        console.log(`Broadcasting from ${client.name}: ${packet.topic}/${packet.payload}`);
        broadcast(packet, client);
    });*/
});

concierge.events.on('merge', (merge) => {
    console.log(`Broadcasting: ${merge.topic}/${merge.payload}`);
    broadcast(merge);
})