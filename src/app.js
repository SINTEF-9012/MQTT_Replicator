import starter from './starter.js';
import Concierge from './concierge.js';
import LaMort from './lamort.js';
import Merge from './merge.js';
import log from './logger.js';

log.info("Started");

const { clients, mergeFrequencyHz, topics } = starter();

const lamort = new LaMort();
const merge = new Merge(topics);
const concierge = new Concierge(clients, merge, lamort, (1.0 / mergeFrequencyHz) * 1000.0);

topics.forEach(topic => {
    lamort.registerTopicTTl(topic.topic, topic.ttl);
});

clients.forEach((client) => {

    client.connect();

    const topicsPublishBlacklist = [];
    const topicsPublishRetainList = [];
    const topicsPublishQosList = [];

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
            if (topic.retain) {
                topicsPublishRetainList.push(topic);
            }
        }

    });

    client.setTopicsQos(topicsPublishQosList);
    client.setTopicsBlacklist(topicsPublishBlacklist);
    client.setTopicsRetain(topicsPublishRetainList);
});

concierge.events.on('sync', (merge) => {
    log.debug(`Broadcasting message "${merge.topic}" with payload "${merge.payload}"`);

    clients.forEach(client => {
        client.publish(merge);
    });
});